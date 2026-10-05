// Compatibilidade de saves.
// Decisão: saves anteriores à v3 (sem `league` nos clubes, ou seja, o mundo de uma liga só)
// NÃO são convertidos. `isCompatible(w)` diz se o save pode ser carregado e `migrateWorld(w)`
// lança `IncompatibleSaveError` para eles; a UI deve pedir uma nova carreira.
// Saves v3 são levados à v4 (olheiros, empréstimos, negociações, histórico…) e v4 à v5
// (atributos, habilidades novas, batedor de faltas e finanças por clube); v5 é idempotente.
import { CLUBS, TICKET_PRICES, injuryLabel } from './data';
import { ATTR_KEYS } from './data';
import { capFor, clubWages, sponsorValue, wageCapFor } from './finance';
import { makeGoals } from './goals';
import { startMonth } from './ceremonies';
import { refreshVacancies } from './jobs';
import { offerSponsors } from './sponsors';
import { refreshScoutMarket, scoutStaff, seedScoutStaff } from './scouts';
import { MIN_COMPATIBLE_VERSION, WORLD_VERSION, youthWage, meanSquadOvr, rollAttrs, rollStar, rollTraits, seedMissingClubs, valueOf } from './gen';
import { DIVISIONS, LEAGUES } from './leagues';
import { pickCaptain, pickFkTaker, pickPenTaker } from './squad';
import { DEFAULT_INSTRUCTIONS } from './tactics';
import type { Club, Player, World } from './types';
import { pushMessage, rebalanceDivisions, startSeason } from './world';

/** Save de uma versão antiga (sem ligas) ou malformado. */
export class IncompatibleSaveError extends Error {
  readonly version: number | null;
  constructor(version: number | null) {
    super(`Save incompatível (versão ${version ?? '?'}); é preciso começar uma nova carreira.`);
    this.name = 'IncompatibleSaveError';
    this.version = version;
  }
}

/** Visão "talvez incompleta" de um objeto salvo por uma versão antiga. */
type Loose<T> = { [K in keyof T]?: T[K] };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/** Corrige os mandos ainda não disputados de saves criados pelo calendário antigo. */
function repairRemainingMandos(w: World): void {
  const last = new Map<string, { home: boolean; streak: number; homes: number; aways: number }>();
  const firstHome = new Map<string, string>();
  const pairKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;
  const update = (clubId: string, home: boolean) => {
    const prev = last.get(clubId);
    last.set(clubId, {
      home, streak: prev?.home === home ? prev.streak + 1 : 1,
      homes: (prev?.homes ?? 0) + (home ? 1 : 0),
      aways: (prev?.aways ?? 0) + (home ? 0 : 1),
    });
  };
  const penalty = (clubId: string, home: boolean) => {
    const prev = last.get(clubId);
    if (!prev) return 0;
    const streak = prev.home === home ? prev.streak : 0;
    const imbalance = (prev.homes + (home ? 1 : 0)) - (prev.aways + (home ? 0 : 1));
    return (streak >= 2 ? 100 : streak === 1 ? 8 : 0) + Math.abs(imbalance) * 0.3;
  };
  for (const week of w.weeks) {
    if (!week || week.type !== 'league') continue;
    for (const match of week.matches) {
      if (!(match.comp in DIVISIONS)) continue;
      const a = match.h, b = match.a, key = pairKey(a, b);
      const previousHome = firstHome.get(key);
      if (!match.played) {
        if (previousHome) {
          if (match.h === previousHome) [match.h, match.a] = [match.a, match.h];
        } else if (penalty(a, true) + penalty(b, false) > penalty(a, false) + penalty(b, true)) {
          [match.h, match.a] = [match.a, match.h];
        }
      }
      if (!previousHome) firstHome.set(key, match.h);
      update(match.h, true);
      update(match.a, false);
    }
  }
  w.scheduleRevision = 1;
}

/** O save pode ser carregado por esta versão do motor (v3+, todos os clubes com liga e divisão válidas)? */
export function isCompatible(w: unknown): w is World {
  if (!isObj(w) || !isObj(w.clubs) || !isObj(w.players) || typeof w.userClub !== 'string') return false;
  if (typeof w.version === 'number' && w.version < MIN_COMPATIBLE_VERSION) return false;
  const clubs = Object.values(w.clubs);
  if (!clubs.length || !(w.userClub in w.clubs)) return false;
  return clubs.every((c) => isObj(c) && typeof c.league === 'string' && c.league in LEAGUES && typeof c.div === 'string' && c.div in DIVISIONS);
}

function migrateClub(w: World, c: Club): void {
  const lc = c as Loose<Club>;
  const stat = CLUBS.find((x) => x.id === c.id);
  if (typeof lc.nickname !== 'string') c.nickname = stat ? stat.nickname : c.name;
  if (typeof lc.mascot !== 'string') c.mascot = stat ? stat.mascot : '';
  if (typeof lc.stadium !== 'string') c.stadium = stat ? stat.stadium : `Estádio de ${c.city}`;
  if (typeof lc.rival !== 'string') c.rival = stat ? stat.rival : '';
  if (typeof lc.fans !== 'number' || !Number.isFinite(lc.fans)) c.fans = 60;
  if (!lc.ticketPrice || !(lc.ticketPrice in TICKET_PRICES)) c.ticketPrice = 'normal';
  if (lc.loan === undefined) c.loan = null;
  if (lc.captain === undefined || (c.captain && !c.squad.includes(c.captain))) c.captain = null;
  if (lc.penTaker === undefined || (c.penTaker && !c.squad.includes(c.penTaker))) c.penTaker = null;
  if (!lc.lineup) c.lineup = [];
  if (!lc.bench) c.bench = [];
  if (!lc.trophies) c.trophies = [];
  if (typeof lc.scouting !== 'number') c.scouting = Math.min(5, Math.max(1, Math.round(c.rep / 25)));
  if (!lc.academyFocus) c.academyFocus = 'balanced';
  if (!c.captain && c.squad.length) pickCaptain(w, c);
  if (!c.penTaker && c.squad.length) pickPenTaker(w, c);
  if (lc.fkTaker === undefined || (c.fkTaker && !c.squad.includes(c.fkTaker))) c.fkTaker = null;
  if (!c.fkTaker && c.squad.length) pickFkTaker(w, c);
  if (!lc.instr) c.instr = { ...DEFAULT_INSTRUCTIONS };
  // Finanças v5: o caixa é mantido; patrocínio e teto salarial passam a existir.
  if (typeof lc.sponsor !== 'number' || !(lc.sponsor > 0)) c.sponsor = sponsorValue(c);
  if (typeof lc.wageCap !== 'number' || !(lc.wageCap > 0)) c.wageCap = Math.max(wageCapFor(w, c), Math.round((clubWages(w, c) * 1.08) / 10000) * 10000);
}

function migratePlayer(w: World, p: Player): void {
  const lp = p as Loose<Player>;
  if (!Array.isArray(lp.traits)) p.traits = rollTraits(p.pos, p.ovr, !!p.star);
  if (!Array.isArray(lp.at) || lp.at.length !== ATTR_KEYS.length) p.at = rollAttrs(p.pos, p.traits);
  if (typeof lp.star !== 'boolean') p.star = rollStar();
  if (lp.injType === undefined) p.injType = p.inj > 0 ? injuryLabel(p.inj) : null;
  if (!lp.nat || !(lp.nat in LEAGUES)) p.nat = p.clubId && w.clubs[p.clubId] ? w.clubs[p.clubId].league : 'bra';
  if (!lp.start) p.start = { season: w.season, ovr: Math.round(p.ovr * 10) / 10 };
  if (lp.loan === undefined) p.loan = null;
  if (typeof lp.releaseClause !== 'number') {
    p.releaseClause = p.clubId && p.contract > 0 ? Math.max(100000, Math.round((valueOf(p) * 2.5) / 10000) * 10000) : 0;
  }

}

/**
 * Prepara um save para esta versão do motor. Lança IncompatibleSaveError para saves sem ligas (v1/v2).
 * Leva v3 → v4 completando os campos novos; em saves v4 só completa o que está ausente ou inválido (idempotente). Muta e devolve o próprio objeto.
 */
export function migrateWorld(w: World): World {
  if (!isCompatible(w)) {
    const v = isObj(w) && typeof (w as Loose<World>).version === 'number' ? (w as Loose<World>).version ?? null : null;
    throw new IncompatibleSaveError(v);
  }
  const lw = w as Loose<World>;
  if (typeof lw.day !== 'number' || lw.day < 0 || lw.day > 6) w.day = 0;
  if (lw.scheduleRevision !== 1 && Array.isArray(w.weeks)) repairRemainingMandos(w);
  if (!lw.finWeek) w.finWeek = {};
  if (!lw.finSeason) w.finSeason = {};
  if (!lw.finance) w.finance = [];
  if (!lw.history) w.history = [];
  if (!lw.inbox) w.inbox = [];
  if (!lw.free) w.free = [];
  if (!lw.cups) w.cups = {};
  if (lw.contNext === undefined) w.contNext = null;
  if (!lw.scouting) w.scouting = {};
  if (!lw.scoutQueue) w.scoutQueue = [];
  if (!lw.negotiations) w.negotiations = {};
  if (!lw.payables) w.payables = [];
  if (!lw.watchlist) w.watchlist = [];
  if (!lw.watchState) w.watchState = {};
  if (!lw.transfers) w.transfers = [];
  const board = (lw.board || {}) as Loose<World['board']>;
  w.board = { conf: typeof board.conf === 'number' ? board.conf : 60, target: board.target ?? 0, label: board.label ?? '', ...(Array.isArray(board.goals) ? { goals: board.goals } : {}) };
  for (const p of Object.values(w.players)) migratePlayer(w, p);
  for (const c of Object.values(w.clubs)) migrateClub(w, c);
  if (!lw.econ) w.econ = { baseOvr: Math.round(meanSquadOvr(w) * 100) / 100, drift: 0 };
  if ((lw.version ?? 0) < 7 && Object.keys(w.clubs).length < CLUBS.length) {
    if (w.week === 0) {
      seedMissingClubs(w);
      startSeason(w);
      pushMessage(w, { kind: 'info', title: 'Sete novas ligas disponíveis', body: 'Alemanha, França, Holanda, Bélgica, Turquia, Escócia e Grécia já fazem parte da temporada.' });
    } else {
      pushMessage(w, { kind: 'info', title: 'Sete novas ligas a caminho', body: 'Alemanha, França, Holanda, Bélgica, Turquia, Escócia e Grécia entram no calendário quando começar a próxima temporada. Sua carreira atual continua normalmente.' });
    }
  }
  // v8: olheiros contratados no lugar do departamento por níveis, várias peneiras por temporada e
  // salários maiores na base.
  if (!Array.isArray(lw.scoutStaff)) {
    const u = w.clubs[w.userClub];
    if (u) {
      seedScoutStaff(w, u.scouting || 1);
      u.scouting = 0;
      const ids = scoutStaff(w).map((s) => s.id);
      w.scoutQueue.forEach((job, i) => { job.scoutId = ids[i % ids.length]; });
    }
  }
  if (!Array.isArray(lw.scoutMarket)) refreshScoutMarket(w);
  if (typeof lw.trialsUsed !== 'number') w.trialsUsed = lw.trialUsed ? 1 : 0;
  if ((lw.version ?? 0) < 8) {
    for (const c of Object.values(w.clubs)) for (const id of c.youth) { const p = w.players[id]; if (p) p.wage = Math.max(p.wage, youthWage(p.ovr, c.league)); }
  }
  // v9: 20 clubes por divisão, mais divisões e temporada de 38 rodadas. Na pré-temporada a expansão entra já;
  // no meio da temporada, a atual termina no calendário antigo e a próxima começa com as ligas novas.
  if ((lw.version ?? 0) < 9 && Object.keys(w.clubs).length < CLUBS.length) {
    if (w.week === 0 && !w.pendingSeason) {
      seedMissingClubs(w);
      rebalanceDivisions(w);
      startSeason(w);
      const u = w.clubs[w.userClub];
      pushMessage(w, { kind: 'info', title: 'As ligas cresceram', body: `Agora cada divisão tem 20 clubes (38 rodadas) e várias ligas ganharam uma divisão a mais. ${u ? `O ${u.name} começa a temporada na ${DIVISIONS[u.div]?.name ?? u.div}.` : ''}` });
    } else {
      pushMessage(w, { kind: 'info', title: 'As ligas vão crescer', body: 'Na próxima temporada cada divisão passa a ter 20 clubes (38 rodadas) e várias ligas ganham uma divisão a mais. A temporada atual continua como começou.' });
    }
  }
  // v10: supercopas, estaduais, copas da liga, continentais por região e Intercontinental; teto salarial fixo
  // por liga; patrocínio escolhido; metas da diretoria; vagas de treinador.
  if ((lw.version ?? 0) < 10) {
    const legacyCal = (w.weeks ?? []).some((wk) => wk && wk.type !== 'league' && !wk.comps);
    if (legacyCal && w.week === 0 && !w.pendingSeason) {
      startSeason(w);
      pushMessage(w, { kind: 'info', title: 'Novas competições', body: 'Supercopas, estaduais, Copa do Nordeste, copas da liga, Liga dos Campeões e Liga Europa (Europa), Libertadores e Sul-Americana (Brasil e Argentina) e a Copa Intercontinental entram no calendário desta temporada.' });
    } else if (legacyCal) {
      pushMessage(w, { kind: 'info', title: 'Novas competições na próxima temporada', body: 'Supercopas, estaduais, Copa do Nordeste, copas da liga, continentais por região (Liga dos Campeões, Liga Europa, Libertadores e Sul-Americana) e a Copa Intercontinental começam na próxima temporada. Teto salarial da liga, patrocínio e metas da diretoria já valem agora.' });
    }
    const u = w.clubs[w.userClub];
    if (u && !w.playerCareer) {
      u.wageCap = capFor(w, u);
      if (!w.board.goals) w.board.goals = makeGoals(w);
      if (!u.sponsorDeal && !w.sponsorOffers) offerSponsors(w);
      if (!w.vacancies) refreshVacancies(w);
    }
  }
  // v11: Jogador do Mês (a contagem começa na migração) e cerimônias.
  if ((lw.version ?? 0) < 11 && !w.playerCareer && !w.month && w.clubs[w.userClub]) startMonth(w);
  if (!(typeof lw.version === 'number' && lw.version >= WORLD_VERSION)) w.version = WORLD_VERSION;
  return w;
}

// Temporada: calendário de todas as ligas, resultados, tabelas, copas, semana a semana e virada de ano.
import { TICKET_PRICES, TRAINING, injuryLabel, injuryPhrase, weeksText } from './data';
import { contByRep, contQualifiers } from './competitions';
import { Sim, isDerbyClubs } from './engine';
import { FREE_MAX, FREE_MIN, assignNumbers, makeFreeAgent, makeYouth, newPlayer, rollNat, wageFor } from './gen';
import {
  CONT_PRIZE, CONT_WEEKS, CUP_PRIZE, CUP_WEEKS, DIVISIONS, DIVISION_IDS, LEAGUES, LEAGUE_IDS, LEAGUE_PRIZE_BASE,
  LEAGUE_ROUNDS, PROMOTION_SPOTS, TOTAL_WEEKS, TV_BASE, competitionName, compLeague, cupId, cupRoundName,
  divisionFullName, firstDivisions, isKnockout,
} from './leagues';
import { aiOffersToUser, aiTransfers, promoteYouth, transfer } from './market';
import { autoLineup, ensureLineup, teamRating } from './squad';
import type {
  Club, Competition, DivisionId, DivisionMove, FinanceCategory, Fixture, FormResult, GateForecast, HistoryEntry,
  KnockoutId, Match, MatchResult, MessageInput, Player, Position, ScorerEntry, SeasonSummary, SimOptions, TableRow,
  TicketPrice, Week, WeekReport, World,
} from './types';
import { chance, clamp, gauss, pick, rand, randi, shuffle } from './util';

// Arredondamentos para manter o JSON do World enxuto.
const round2 = (v: number): number => Math.round(v * 100) / 100;
const round3 = (v: number): number => Math.round(v * 1000) / 1000;

export const WINDOWS: [number, number][] = [[0, 4], [15, 19]];
export const windowOpen = (w: World): boolean => WINDOWS.some(([a, b]) => w.week >= a && w.week <= b);
export const nextWindow = (w: World): number | null => {
  const nx = WINDOWS.find(([a]) => a > w.week);
  return nx ? nx[0] : null;
};

// Clássicos, torcida e DM
const DERBY_INCOME = 1.4;
const DERBY_MORALE = 8;
const DERBY_BOARD = 3;
const FANS_RESULT = 4;
const FANS_START = 60;
/** Puxão semanal da torcida de volta ao patamar inicial (evita saturar em 0 ou 100). */
const FANS_DRIFT = 0.03;
/** Variação de reputação por posição na tabela, por nível de divisão. */
const REP_BY_POS = [0.35, 0.25, 0.2];
/** Máximo de garotos na base de um clube da CPU após a nova safra. */
const AI_YOUTH_MAX = 8;

/** Semanas de lesão após a redução pelo nível do CT (1 → 100%, 5 → 80%). */
export const injuryWeeks = (weeks: number, trainingLvl: number): number =>
  Math.max(1, Math.round(weeks * (1.05 - 0.05 * clamp(trainingLvl, 1, 5))));

// ---------- Mensagens ----------
/** Adiciona uma mensagem à caixa de entrada (era M.msg). */
export function pushMessage(w: World, m: MessageInput): void {
  w.inbox.unshift({ id: w.nextMsg++, season: w.season, week: w.week, read: false, kind: 'info', ...m });
  if (w.inbox.length > 80) w.inbox.length = 80;
}

export const user = (w: World): Club => w.clubs[w.userClub];
export const clubPlayers = (w: World, club: Club): Player[] => club.squad.map((id) => w.players[id]);

/** Movimenta o caixa de um clube; registra em finWeek/finSeason se for o clube do usuário (era M.money). */
export function addMoney(w: World, clubId: string, amount: number, cat: FinanceCategory): void {
  w.clubs[clubId].money += amount;
  if (clubId === w.userClub) {
    w.finWeek[cat] = (w.finWeek[cat] || 0) + amount;
    w.finSeason[cat] = (w.finSeason[cat] || 0) + amount;
  }
}

/** Fator econômico da liga do clube. */
export const wealthOf = (w: World, clubId: string): number => LEAGUES[w.clubs[clubId].league].wealth;

/** Prêmio por vencer a fase `round` de uma copa. */
export function knockoutPrize(comp: KnockoutId, round: number): number {
  if (comp === 'cont') return CONT_PRIZE[round] || 0;
  const lg = compLeague(comp);
  return Math.round((CUP_PRIZE[round] || 0) * (lg ? LEAGUES[lg].wealth : 1));
}

// ---------- Calendário ----------
type Pair = [string, string];
function roundRobin(ids: string[]): Pair[][] {
  const n = ids.length, arr = ids.slice(), rounds: Pair[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Pair[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      pairs.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop() as string);
  }
  return rounds.concat(rounds.map((r) => r.map(([a, b]): Pair => [b, a])));
}

let mid = 1;
const mkMatch = (h: string, a: string, comp: Competition): Match => ({ id: 'm' + Date.now().toString(36) + mid++, h, a, comp, hs: null, as: null, pens: null, played: false, goals: [] });

/** Ids dos clubes de uma divisão. */
export const divClubs = (w: World, div: DivisionId): string[] => Object.values(w.clubs).filter((c) => c.div === div).map((c) => c.id);
/** Clubes (objetos) de uma divisão. */
export const clubsByDivision = (w: World, div: DivisionId): Club[] => Object.values(w.clubs).filter((c) => c.div === div);

export function startSeason(w: World): void {
  const schedules = DIVISION_IDS.map((div) => ({ div, rounds: roundRobin(shuffle(divClubs(w, div))) }));
  w.weeks = [null];
  let li = 0;
  for (let wk = 1; wk <= TOTAL_WEEKS; wk++) {
    if (CUP_WEEKS.includes(wk)) {
      w.weeks.push({ type: 'cup', round: CUP_WEEKS.indexOf(wk), matches: [] });
    } else if (CONT_WEEKS.includes(wk)) {
      w.weeks.push({ type: 'cont', round: CONT_WEEKS.indexOf(wk), matches: [] });
    } else {
      const ms: Match[] = [];
      for (const { div, rounds } of schedules) for (const [h, a] of rounds[li] || []) ms.push(mkMatch(h, a, div));
      w.weeks.push({ type: 'league', round: li + 1, matches: ms });
      li++;
    }
  }
  // Copas Nacionais: as duas primeiras divisões de cada liga.
  w.cups = {};
  for (const lg of LEAGUE_IDS) {
    const divs = LEAGUES[lg].divisions.slice(0, 2);
    const entrants = Object.values(w.clubs).filter((c) => divs.includes(c.div)).map((c) => c.id);
    w.cups[cupId(lg)] = { entrants, alive: shuffle(entrants.slice()), champion: null };
  }
  // Copa dos Campeões: classificados da temporada anterior (ou os de maior reputação na 1ª temporada).
  const valid = (w.contNext || []).filter((id) => w.clubs[id]);
  const cont = valid.length >= 2 ? valid : contByRep(w);
  w.cups.cont = { entrants: cont.slice(), alive: shuffle(cont.slice()), champion: null };
  w.contNext = null;

  for (const p of Object.values(w.players)) p.s = { apps: 0, goals: 0, assists: 0, rsum: 0 };
  w.finSeason = {};
  w.finWeek = {};
  w.trialUsed = false;
  setObjective(w);
  const u = user(w);
  pushMessage(w, {
    kind: 'board',
    title: `Temporada ${w.season}: objetivo da diretoria`,
    body: `A diretoria do ${u.name} espera: ${w.board.label} na ${divisionFullName(u.div)}. A janela de transferências está aberta até a semana ${WINDOWS[0][1]}.`,
  });
}

/** Sorteia os confrontos da semana de copa (todas as Copas Nacionais ou a Copa dos Campeões). */
function drawKnockouts(w: World, week: Week): void {
  const comps: KnockoutId[] = week.type === 'cont' ? ['cont'] : LEAGUE_IDS.map(cupId);
  for (const comp of comps) {
    const cup = w.cups[comp];
    if (!cup || cup.alive.length < 2) continue;
    const alive = shuffle(cup.alive.slice());
    const final = alive.length === 2;
    for (let i = 0; i + 1 < alive.length; i += 2) {
      const m = mkMatch(alive[i], alive[i + 1], comp);
      if (final) m.neutral = true;
      week.matches.push(m);
    }
  }
}

/** Vencedor de um jogo eliminatório já disputado. */
export function knockoutWinner(m: Match): string {
  const hs = m.hs as number, as = m.as as number;
  if (hs !== as) return hs > as ? m.h : m.a;
  return m.pens && m.pens[0] > m.pens[1] ? m.h : m.a;
}

export const currentWeek = (w: World): Week | null => w.weeks[w.week] || null;

export function userMatch(w: World): Match | null {
  const wk = currentWeek(w);
  if (!wk) return null;
  return wk.matches.find((m) => (m.h === w.userClub || m.a === w.userClub) && !m.played) || null;
}

/** Próximo jogo do usuário a partir da semana atual (antes em views.js). */
export function nextFixture(w: World): Fixture | null {
  for (let i = Math.max(1, w.week); i <= TOTAL_WEEKS; i++) {
    const wk = w.weeks[i];
    if (!wk) continue;
    const m = wk.matches.find((x) => !x.played && (x.h === w.userClub || x.a === w.userClub));
    if (m) return { m, week: i, wk };
  }
  return null;
}

/** Rótulo da semana: "Rodada 3 de 30", "Copa Nacional • Oitavas de final", "Copa dos Campeões • Final". */
export function weekLabel(w: World): string {
  if (w.week === 0) return 'Pré-temporada';
  const wk = currentWeek(w);
  if (!wk) return 'Fim de temporada';
  if (wk.type === 'cup') return `Copa Nacional • ${cupRoundName(cupId(user(w).league), wk.round)}`;
  if (wk.type === 'cont') return `${competitionName('cont')} • ${cupRoundName('cont', wk.round)}`;
  return `Rodada ${wk.round} de ${LEAGUE_ROUNDS}`;
}

// ---------- Tabela ----------
export function table(w: World, div: DivisionId): TableRow[] {
  const rows: Record<string, TableRow> = {};
  for (const id of divClubs(w, div)) rows[id] = { id, p: 0, j: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, form: [] };
  for (const wk of w.weeks) {
    if (!wk || wk.type !== 'league') continue;
    for (const m of wk.matches) {
      if (m.comp !== div || !m.played || !rows[m.h] || !rows[m.a]) continue;
      const hs = m.hs as number, as = m.as as number;
      const h = rows[m.h], a = rows[m.a];
      h.j++; a.j++; h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
      if (hs > as) { h.v++; h.p += 3; a.d++; h.form.push('V'); a.form.push('D'); }
      else if (hs < as) { a.v++; a.p += 3; h.d++; h.form.push('D'); a.form.push('V'); }
      else { h.e++; a.e++; h.p++; a.p++; h.form.push('E'); a.form.push('E'); }
    }
  }
  return Object.values(rows).sort((x, y) => y.p - x.p || y.v - x.v || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || w.clubs[x.id].name.localeCompare(w.clubs[y.id].name));
}

/** Posição do clube na tabela da sua divisão. */
export const position = (w: World, clubId: string): number => table(w, w.clubs[clubId].div).findIndex((r) => r.id === clubId) + 1;

export function topScorers(w: World, div: DivisionId, n = 10): Player[] {
  return Object.values(w.players)
    .filter((p) => p.clubId && w.clubs[p.clubId] && w.clubs[p.clubId].div === div && p.s.goals > 0)
    .sort((a, b) => b.s.goals - a.s.goals || b.s.assists - a.s.assists)
    .slice(0, n);
}

export function userForm(w: World, n = 5): FormResult[] {
  const res: FormResult[] = [];
  for (let i = w.week; i >= 1 && res.length < n; i--) {
    const wk = w.weeks[i];
    if (!wk) continue;
    const m = wk.matches.find((x) => x.played && (x.h === w.userClub || x.a === w.userClub));
    if (!m) continue;
    const home = m.h === w.userClub;
    const gf = (home ? m.hs : m.as) as number, ga = (home ? m.as : m.hs) as number;
    let r: FormResult = gf > ga ? 'V' : gf < ga ? 'D' : 'E';
    if (m.pens) r = (home ? m.pens[0] > m.pens[1] : m.pens[1] > m.pens[0]) ? 'V' : 'D';
    res.push(r);
  }
  return res.reverse();
}

// ---------- Diretoria ----------
/** Objetivo pelo ranking de reputação dentro da divisão (rótulos genéricos). */
export function objectiveFor(w: World, club: Club): { target: number; label: string } {
  const info = DIVISIONS[club.div];
  const peers = Object.values(w.clubs).filter((c) => c.div === club.div);
  const n = peers.length;
  const rank = peers.sort((a, b) => b.rep - a.rep).findIndex((c) => c.id === club.id) + 1;
  const safe = n - PROMOTION_SPOTS; // última posição fora da zona de rebaixamento
  if (!info.up) {
    if (rank <= 3) return { target: 3, label: 'brigar pelo título (top 3)' };
    if (rank <= 8) return { target: 8, label: 'terminar entre os 8 primeiros' };
    if (rank <= 12) return { target: 12, label: 'fazer uma campanha tranquila (top 12)' };
    return { target: safe, label: 'evitar o rebaixamento' };
  }
  if (rank <= 5) return { target: PROMOTION_SPOTS, label: `conquistar o acesso (top ${PROMOTION_SPOTS})` };
  if (rank <= 10) return { target: 9, label: 'terminar entre os 9 primeiros' };
  if (info.down) return { target: safe, label: 'evitar o rebaixamento' };
  return { target: n - 2, label: `fazer uma campanha digna (top ${n - 2})` };
}

function setObjective(w: World): void {
  const o = objectiveFor(w, user(w));
  w.board.target = o.target;
  w.board.label = o.label;
}

function expectedPoints(w: World, m: Match): number {
  const home = m.h === w.userClub;
  const me = w.clubs[w.userClub], op = w.clubs[home ? m.a : m.h];
  const d = teamRating(w, me) - teamRating(w, op) + (m.neutral ? 0 : home ? 2 : -2);
  return clamp(1.35 + d * 0.09, 0.65, 2.4);
}

// ---------- Clássicos e bilheteria ----------
/** Verdadeiro se um clube tem o outro como rival (em qualquer direção). */
export const isDerby = (w: World, m: Pick<Match, 'h' | 'a'>): boolean => isDerbyClubs(w, m.h, m.a);

/** Público e renda previstos para o mandante (0/0 em campo neutro). */
export function expectedGate(w: World, m: Match): GateForecast {
  const derby = isDerby(w, m);
  if (m.neutral) return { attendance: 0, income: 0, derby };
  const hc = w.clubs[m.h], ac = w.clubs[m.a];
  const tp = TICKET_PRICES[hc.ticketPrice] || TICKET_PRICES.normal;
  const fans = typeof hc.fans === 'number' ? hc.fans : FANS_START;
  const occ = derby ? 1 : clamp(0.35 + hc.rep / 200 + ac.rep / 400 + (isKnockout(m.comp) ? 0.1 : 0) + tp.occ + (fans - FANS_START) / 250, 0.2, 1);
  const income = Math.round(hc.cap * occ * (15 + hc.rep * 0.3) * tp.mult * (derby ? DERBY_INCOME : 1));
  return { attendance: Math.round(hc.cap * occ), income, derby };
}

export function setTicketPrice(w: World, price: TicketPrice): void {
  user(w).ticketPrice = price;
}

// ---------- Resultados ----------
export function applyResult(w: World, m: Match, res: MatchResult): void {
  m.hs = res.hs; m.as = res.as; m.pens = res.pens; m.played = true;
  m.goals = res.goals.map((g) => [g.pid, g.side, g.min, g.assist || 0, g.pen ? 1 : 0]);
  const clubsIds = [m.h, m.a];
  const winner = res.winner;
  const derby = isDerby(w, m);
  const playedSet = new Set(res.played[0].concat(res.played[1]));

  // Suspensões cumpridas
  for (const cid of clubsIds) {
    for (const pid of w.clubs[cid].squad) {
      const p = w.players[pid];
      if (p.susp > 0 && !playedSet.has(pid)) p.susp--;
    }
  }
  res.played.forEach((list, s) => {
    for (const pid of list) {
      const p = w.players[pid];
      if (!p) continue;
      p.s.apps++; p.c.apps++;
      p.s.rsum = round2(p.s.rsum + (res.ratings[pid] || 6));
      p.played = true;
      if (res.fat[pid] != null) p.fitness = Math.round(res.fat[pid]);
      const dm = derby ? DERBY_MORALE : 5;
      const mor = winner === s ? dm : winner === 1 - s ? -dm : 0;
      p.morale = clamp(p.morale + mor, 10, 100);
    }
  });
  for (const g of res.goals) {
    const p = w.players[g.pid];
    if (p) { p.s.goals++; p.c.goals++; }
    const a = g.assist ? w.players[g.assist] : undefined;
    if (a) { a.s.assists++; a.c.assists++; }
  }
  for (const c of res.cards) {
    const p = w.players[c.pid];
    if (!p) continue;
    if (c.type === 'yellow') { p.yc++; if (p.yc >= 3) { p.susp = 1; p.yc = 0; } }
    else if (c.type === 'red') p.susp = 2;
    else p.susp = 1;
  }
  for (const inj of res.injuries) {
    const p = w.players[inj.pid];
    if (!p) continue;
    const club = p.clubId ? w.clubs[p.clubId] : undefined;
    const weeks = injuryWeeks(inj.weeks, club ? club.training : 1);
    if (weeks >= p.inj) p.injType = inj.type || injuryLabel(inj.weeks);
    p.inj = Math.max(p.inj, weeks);
    p.injNew = true;
    if (club && club.id === w.userClub) {
      pushMessage(w, { kind: 'medical', title: `${p.name} lesionado`, body: `${p.name} sofreu ${injuryPhrase(p.injType || injuryLabel(inj.weeks))} e fica fora por ${weeksText(p.inj)}.` });
    }
  }

  // Bilheteria para o mandante
  if (!m.neutral) {
    const g = expectedGate(w, m);
    m.attendance = g.attendance;
    addMoney(w, m.h, g.income, 'tickets');
  }
  // Torcida
  const fanDelta = FANS_RESULT * (derby ? 2 : 1);
  [m.h, m.a].forEach((cid, s) => {
    const c = w.clubs[cid];
    const base = typeof c.fans === 'number' ? c.fans : FANS_START;
    c.fans = clamp(base + (winner === s ? fanDelta : winner === 1 - s ? -fanDelta : 0), 0, 100);
  });
  if (isKnockout(m.comp)) {
    const wk = currentWeek(w);
    const winId = winner === 0 ? m.h : m.a;
    if (wk) addMoney(w, winId, knockoutPrize(m.comp, wk.round), 'prize');
  }

  // Confiança da diretoria
  if (clubsIds.includes(w.userClub) && !isKnockout(m.comp)) {
    const s = m.h === w.userClub ? 0 : 1;
    const pts = winner === s ? 3 : winner === -1 ? 1 : 0;
    w.board.conf = clamp(w.board.conf + (pts - expectedPoints(w, m)) * 2.4, 0, 100);
  } else if (clubsIds.includes(w.userClub)) {
    const s = m.h === w.userClub ? 0 : 1;
    w.board.conf = clamp(w.board.conf + (winner === s ? 2.5 : -2.5), 0, 100);
  }
  if (derby && clubsIds.includes(w.userClub)) {
    const s = m.h === w.userClub ? 0 : 1;
    w.board.conf = clamp(w.board.conf + (winner === s ? DERBY_BOARD : winner === 1 - s ? -DERBY_BOARD : 0), 0, 100);
  }
}

export function simMatch(w: World, m: Match, opts: SimOptions = {}): Sim {
  const sim = new Sim(w, m.h, m.a, { knockout: isKnockout(m.comp), neutral: !!m.neutral, ...opts });
  sim.runToEnd();
  applyResult(w, m, sim.result());
  return sim;
}

/** Simula todos os jogos pendentes da semana (inclusive o do usuário, se houver). */
export function simulateWeek(w: World): void {
  const wk = currentWeek(w);
  if (!wk) return;
  for (const m of wk.matches) if (!m.played) simMatch(w, m);
}

// ---------- Evolução ----------
function develop(p: Player, club: Club | undefined): void {
  const trainLvl = club ? club.training : 2;
  const intensity = club ? TRAINING[club.trainingInt].dev : 1;
  let g = 0;
  if (p.ovr < p.pot) {
    const gap = p.pot - p.ovr;
    const rate = p.age <= 18 ? 0.0085 : p.age <= 21 ? 0.007 : p.age <= 24 ? 0.0048 : p.age <= 27 ? 0.002 : 0.0005;
    g = gap * rate * (0.75 + 0.1 * trainLvl) * intensity * (p.played ? 1.3 : p.youth ? 1.1 : 0.85) * rand(0.5, 1.5);
  }
  if (p.age >= 31) g -= (p.age - 30) * 0.03 * rand(0.5, 1.5);
  p.ovr = round3(clamp(p.ovr + g, 25, 99));
}

/** Atualiza as copas ao fim de uma semana de mata-mata. */
function closeKnockoutWeek(w: World, wk: Week): void {
  const u = user(w);
  const comps: KnockoutId[] = wk.type === 'cont' ? ['cont'] : LEAGUE_IDS.map(cupId);
  for (const comp of comps) {
    const cup = w.cups[comp];
    const ms = wk.matches.filter((m) => m.comp === comp);
    if (!cup || !ms.length) continue;
    const inMatch = new Set<string>();
    for (const m of ms) { inMatch.add(m.h); inMatch.add(m.a); }
    // Quem não jogou (número ímpar de vivos) passa direto.
    const winners = ms.map(knockoutWinner).concat(cup.alive.filter((id) => !inMatch.has(id)));
    const userOut = cup.alive.includes(u.id) && !winners.includes(u.id);
    cup.alive = winners;
    const name = competitionName(comp);
    if (userOut) pushMessage(w, { kind: 'info', title: `Eliminados da ${name}`, body: `O ${u.name} caiu na ${cupRoundName(comp, wk.round).toLowerCase()} da ${name}.` });
    if (winners.length === 1) {
      cup.champion = winners[0];
      const champ = w.clubs[winners[0]];
      champ.trophies.push({ season: w.season, comp: name });
      const mine = champ.id === u.id;
      if (mine || comp === 'cont' || comp === cupId(u.league)) {
        pushMessage(w, { kind: mine ? 'trophy' : 'info', title: `${champ.name} é campeão da ${name}!`, body: mine ? 'Título! A torcida está em festa e a diretoria, radiante.' : `O ${champ.name} levantou a taça da ${name}.` });
      }
      if (mine) w.board.conf = clamp(w.board.conf + (comp === 'cont' ? 20 : 15), 0, 100);
    }
  }
}

export function endWeek(w: World): WeekReport {
  const wk = currentWeek(w);
  const u = user(w);
  const report: WeekReport = { news: [] };

  if (wk && (wk.type === 'cup' || wk.type === 'cont')) closeKnockoutWeek(w, wk);

  // Jogadores
  const ownerOf: Record<string, Club> = {};
  for (const c of Object.values(w.clubs)) {
    for (const id of c.squad) ownerOf[id] = c;
    for (const id of c.youth) ownerOf[id] = c;
  }
  for (const p of Object.values(w.players)) {
    const club: Club | undefined = ownerOf[p.id];
    if (p.inj > 0) {
      if (p.injNew) delete p.injNew;
      else {
        p.inj--;
        if (p.inj === 0) {
          p.injType = null;
          if (club === u) pushMessage(w, { kind: 'medical', title: `${p.name} recuperado`, body: `${p.name} está liberado pelo departamento médico.` });
        }
      }
    }
    const tr = club ? TRAINING[club.trainingInt] : TRAINING.mid;
    p.fitness = clamp(p.fitness + tr.recover, 0, 100);
    develop(p, club);
    if (club && !p.youth) {
      if (!p.played && !p.inj) p.morale = clamp(p.morale - 1.2, 10, 100);
      p.morale = round2(p.morale + (65 - p.morale) * 0.04);
      if (!p.inj && chance(0.0035 * tr.injury)) {
        const sev = randi(1, 3);
        p.inj = injuryWeeks(sev, club.training);
        p.injType = injuryLabel(sev);
        if (club === u) pushMessage(w, { kind: 'medical', title: `${p.name} machucado no treino`, body: `${p.name} sofreu ${injuryPhrase(p.injType)} no treino e fica fora por ${weeksText(p.inj)}.` });
      }
    }
    p.played = false;
  }

  // Finanças semanais
  for (const c of Object.values(w.clubs)) {
    let wages = 0;
    for (const id of c.squad) wages += w.players[id].wage;
    for (const id of c.youth) wages += w.players[id].wage;
    addMoney(w, c.id, -wages, 'wages');
    addMoney(w, c.id, Math.round(c.rep * 3000), 'sponsor');
    addMoney(w, c.id, Math.round((TV_BASE[DIVISIONS[c.div].level - 1] ?? TV_BASE[TV_BASE.length - 1]) * LEAGUES[c.league].wealth), 'tv');
    if (c.loan) {
      addMoney(w, c.id, -c.loan.weekly, 'loan');
      c.loan.weeksLeft--;
      if (c.loan.weeksLeft <= 0) {
        c.loan = null;
        if (c.id === w.userClub) pushMessage(w, { kind: 'board', title: 'Empréstimo quitado', body: 'A última parcela do empréstimo bancário foi paga.' });
      }
    }
    const fans = typeof c.fans === 'number' ? c.fans : FANS_START;
    c.fans = round2(clamp(fans + (FANS_START - fans) * FANS_DRIFT, 0, 100));
  }
  w.finance.push({ season: w.season, week: w.week, balance: u.money, ...w.finWeek });
  if (w.finance.length > 60) w.finance.shift();
  w.finWeek = {};

  if (windowOpen(w)) {
    aiTransfers(w);
    aiOffersToUser(w);
  }
  // Propostas expiradas
  for (const m of w.inbox) {
    if (m.offer && !m.offer.done && (m.offer.expires < w.week || m.season !== w.season)) {
      m.offer.done = true; m.offer.expired = true;
    }
  }
  if (u.money < 0) {
    w.board.conf = clamp(w.board.conf - 2, 0, 100);
    if (w.week % 4 === 0) pushMessage(w, { kind: 'board', title: 'Caixa no vermelho', body: 'A diretoria está preocupada com as finanças negativas. Venda jogadores ou reduza a folha salarial.' });
  }
  if (w.week === WINDOWS[1][0] - 1) pushMessage(w, { kind: 'info', title: 'Janela do meio do ano', body: `A janela de transferências abre na próxima semana e vai até a semana ${WINDOWS[1][1]}.` });

  if (w.week >= 8 && w.board.conf <= 4) {
    w.fired = { reason: 'A sequência de maus resultados custou o seu emprego.' };
  }

  w.week++;
  if (w.week > TOTAL_WEEKS) {
    report.seasonEnd = seasonEnd(w);
  } else {
    const next = currentWeek(w);
    if (next && next.type !== 'league' && !next.matches.length) drawKnockouts(w, next);
    for (const c of Object.values(w.clubs)) if (c.id !== w.userClub) autoLineup(w, c);
  }
  return report;
}

// ---------- Fim de temporada ----------
const scorerEntry = (p: Player | null): ScorerEntry | null => (p ? { name: p.name, club: p.clubId || '', goals: p.s.goals } : null);

export function seasonEnd(w: World): SeasonSummary {
  const u = user(w);
  const tables = {} as Record<DivisionId, TableRow[]>;
  for (const div of DIVISION_IDS) tables[div] = table(w, div);
  const userPos = tables[u.div].findIndex((r) => r.id === u.id) + 1;

  const moves: DivisionMove[] = [];
  const champions = {} as Record<DivisionId, string>;
  for (const div of DIVISION_IDS) {
    const t = tables[div], info = DIVISIONS[div];
    if (!t.length) continue;
    const wealth = LEAGUES[info.league].wealth;
    const base = LEAGUE_PRIZE_BASE[info.level - 1] ?? LEAGUE_PRIZE_BASE[LEAGUE_PRIZE_BASE.length - 1];
    t.forEach((r, i) => addMoney(w, r.id, Math.max(0, Math.round((17 - (i + 1)) * base * wealth)), 'prize'));
    champions[div] = t[0].id;
    w.clubs[t[0].id].trophies.push({ season: w.season, comp: competitionName(div) });
    if (info.down) for (const r of t.slice(-PROMOTION_SPOTS)) moves.push({ club: r.id, from: div, to: info.down });
    if (info.up) for (const r of t.slice(0, PROMOTION_SPOTS)) moves.push({ club: r.id, from: div, to: info.up });
  }
  for (const mv of moves) {
    const c = w.clubs[mv.club];
    const up = DIVISIONS[mv.to].level < DIVISIONS[mv.from].level;
    c.rep = clamp(c.rep + (up ? 3 : -4), 30, 95);
  }
  for (const div of DIVISION_IDS) {
    const k = REP_BY_POS[DIVISIONS[div].level - 1] ?? REP_BY_POS[REP_BY_POS.length - 1];
    tables[div].forEach((r, i) => { const c = w.clubs[r.id]; c.rep = round2(clamp(c.rep + (8.5 - (i + 1)) * k, 30, 95)); });
  }

  const scorers: Partial<Record<DivisionId, Player | null>> = {};
  for (const div of DIVISION_IDS) scorers[div] = topScorers(w, div, 1)[0] ?? null;
  const best = Object.values(w.players)
    .filter((p) => p.clubId && p.s.apps >= 15)
    .sort((a, b) => b.s.rsum / b.s.apps - a.s.rsum / a.s.apps)[0] ?? null;

  const success = userPos <= w.board.target;
  const delta = success ? 20 + (w.board.target - userPos) * 2 : -(userPos - w.board.target) * 7;
  w.board.conf = clamp(w.board.conf + delta, 0, 100);
  const fired = w.board.conf < 20;

  const cups: Record<string, string | null> = {};
  for (const [comp, cup] of Object.entries(w.cups)) cups[comp] = cup ? cup.champion : null;
  const entryScorers: HistoryEntry['scorers'] = {};
  for (const div of firstDivisions()) entryScorers[div] = scorerEntry(scorers[div] ?? null);
  const entry: HistoryEntry = {
    season: w.season,
    champions,
    cups,
    scorers: entryScorers,
    best: best ? { name: best.name, club: best.clubId || '', avg: best.s.rsum / best.s.apps } : null,
    user: { club: u.id, league: u.league, div: u.div, pos: userPos, objective: w.board.label, success },
  };
  w.history.push(entry);

  const contNext = contQualifiers(w, tables);
  w.contNext = contNext;
  const lvl = (d: DivisionId): number => DIVISIONS[d].level;
  const mine = moves.filter((mv) => DIVISIONS[mv.from].league === u.league);
  const summary: SeasonSummary = {
    entry, tables, moves,
    promoted: mine.filter((mv) => lvl(mv.to) < lvl(mv.from)).map((mv) => mv.club),
    relegated: mine.filter((mv) => lvl(mv.to) > lvl(mv.from)).map((mv) => mv.club),
    userPos, success, fired, scorers, best, contNext,
  };
  if (fired) w.fired = { reason: `Objetivo não cumprido: a meta era ${w.board.label}, e o time terminou em ${userPos}º.` };
  else if (userPos <= Math.max(1, w.board.target - 3) || (DIVISIONS[u.div].up && userPos <= PROMOTION_SPOTS)) {
    const bigger = Object.values(w.clubs).filter((c) => c.rep > u.rep + 4 && c.id !== u.id);
    const near = bigger.filter((c) => c.rep <= u.rep + 15);
    const pool = near.length ? near : bigger;
    if (pool.length && chance(0.6)) summary.offer = pick(pool).id;
  }
  w.pendingSeason = summary;
  return summary;
}

export function newSeason(w: World): void {
  const u = user(w);
  const news: string[] = [];
  const ps = w.pendingSeason;
  if (ps) {
    for (const mv of ps.moves) if (w.clubs[mv.club]) w.clubs[mv.club].div = mv.to;
    if (ps.contNext && ps.contNext.length) w.contNext = ps.contNext;
  }
  w.pendingSeason = null;
  // Envelhecimento e aposentadoria
  for (const p of Object.values(w.players)) {
    p.age++;
    if (p.age >= 25) p.pot = Math.max(Math.round(p.ovr), Math.min(p.pot, Math.round(p.ovr) + 2));
    const retireP = p.age >= 38 ? 1 : p.age >= 34 ? (p.age - 33) * 0.22 : 0;
    if (!p.youth && chance(retireP)) {
      if (p.clubId === u.id) news.push(`${p.name} (${p.age} anos) se aposentou.`);
      removePlayer(w, p);
    }
  }
  // Contratos
  for (const c of Object.values(w.clubs)) {
    for (const id of c.squad.slice()) {
      const p = w.players[id];
      p.contract--;
      p.renewAsk = null;
      if (p.contract > 0) continue;
      if (c.id === u.id) {
        news.push(`${p.name} encerrou o contrato e deixou o clube.`);
        toFree(w, p);
      } else if (chance(0.75)) {
        p.contract = randi(1, 3);
        p.wage = wageFor(p.ovr);
      } else toFree(w, p);
    }
  }
  // Base: 19+ anos sobe ou sai
  for (const c of Object.values(w.clubs)) {
    for (const id of c.youth.slice()) {
      const p = w.players[id];
      if (p.age < 19) continue;
      const keep = c.id === u.id ? c.squad.length < 32 : p.pot >= 50 + c.rep * 0.3 && c.squad.length < 30;
      if (keep) {
        promoteYouth(w, id, true);
        if (c.id === u.id) news.push(`${p.name} completou 19 anos e subiu para o profissional.`);
      } else {
        if (c.id === u.id) news.push(`${p.name} completou 19 anos e foi dispensado da base.`);
        removePlayer(w, p);
      }
    }
  }
  // Clubes da CPU completam o elenco
  for (const c of Object.values(w.clubs)) if (c.id !== u.id) aiMaintain(w, c);
  // Nova safra da base
  const intake: Player[] = [];
  for (const c of Object.values(w.clubs)) {
    const n = randi(2, 2 + c.academy);
    for (let k = 0; k < n; k++) {
      const y = makeYouth(w, c, randi(15, 16));
      if (c.id === u.id) intake.push(y);
    }
  }
  // Base da CPU: no máximo AI_YOUTH_MAX garotos (dispensa os de menor potencial) para o World não crescer sem limite.
  for (const c of Object.values(w.clubs)) {
    if (c.id === u.id || c.youth.length <= AI_YOUTH_MAX) continue;
    const extra = c.youth.map((id) => w.players[id]).sort((a, b) => b.pot - a.pot).slice(AI_YOUTH_MAX);
    for (const p of extra) removePlayer(w, p);
  }
  // Agentes livres: mantém entre FREE_MIN e FREE_MAX (descarta os piores).
  w.free = w.free.filter((id) => w.players[id]);
  if (w.free.length > FREE_MAX) {
    const sorted = w.free.map((id) => w.players[id]).sort((a, b) => a.ovr - b.ovr);
    for (const p of sorted.slice(0, w.free.length - FREE_MAX)) removePlayer(w, p);
  }
  while (w.free.length < FREE_MIN) makeFreeAgent(w);

  w.season++;
  w.week = 0;
  w.board.conf = 50 + (w.board.conf - 50) * 0.5;
  startSeason(w);
  for (const c of Object.values(w.clubs)) ensureLineup(w, c);
  if (news.length) pushMessage(w, { kind: 'info', title: 'Movimentações de fim de temporada', body: news.join('\n') });
  if (intake.length) {
    const best = intake.slice().sort((a, b) => b.pot - a.pot)[0];
    pushMessage(w, { kind: 'youth', title: `Nova safra da base: ${intake.length} garotos`, body: `Chegaram à base: ${intake.map((p) => `${p.name} (${p.pos}, ${p.age})`).join(', ')}. Destaque para ${best.name}, que os olheiros acham promissor.` });
  }
}

/** Mantém o elenco de um clube da CPU entre 23 e 30 jogadores. */
export function aiMaintain(w: World, c: Club): void {
  while (c.squad.length > 30) {
    const worst = clubPlayers(w, c).sort((a, b) => a.ovr - b.ovr)[0];
    toFree(w, worst);
  }
  while (c.squad.length < 23) {
    const need = neededPos(w, c);
    const fa = w.free.map((id) => w.players[id]).filter((p) => p.pos === need).sort((a, b) => b.ovr - a.ovr)[0];
    if (fa && fa.ovr > 45 + c.rep * 0.25) transfer(w, fa.id, c.id, 0, true);
    else {
      const base = 48 + c.rep * 0.32;
      const age = randi(19, 30);
      const p = newPlayer(w, { pos: need, age, ovr: clamp(base - 3 + gauss() * 4, 40, 90), pot: base + rand(0, 8), clubId: c.id, contract: randi(1, 4), nat: rollNat(c.league) });
      c.squad.push(p.id);
    }
  }
  assignNumbers(w, c);
}

const NEED_TEMPLATE: Record<Position, number> = { GOL: 3, ZAG: 4, LAT: 4, VOL: 3, MEI: 4, ATA: 4 };

/** Posição mais carente do elenco em relação ao modelo. */
export function neededPos(w: World, c: Club): Position {
  const count: Partial<Record<Position, number>> = {};
  for (const p of clubPlayers(w, c)) count[p.pos] = (count[p.pos] || 0) + 1;
  let best: Position = 'MEI', gap = -99;
  for (const pos of Object.keys(NEED_TEMPLATE) as Position[]) { const g = NEED_TEMPLATE[pos] - (count[pos] || 0); if (g > gap) { gap = g; best = pos; } }
  return best;
}

/** Tira o jogador do clube (elenco, base, escalação, banco) e da lista de livres. */
export function detach(w: World, p: Player): void {
  if (p.clubId && w.clubs[p.clubId]) {
    const c = w.clubs[p.clubId];
    c.squad = c.squad.filter((id) => id !== p.id);
    c.youth = c.youth.filter((id) => id !== p.id);
    c.lineup = c.lineup.map((id) => (id === p.id ? null : id));
    c.bench = c.bench.filter((id) => id !== p.id);
    if (c.captain === p.id) c.captain = null;
    if (c.penTaker === p.id) c.penTaker = null;
  }
  w.free = w.free.filter((id) => id !== p.id);
}

export function toFree(w: World, p: Player): void {
  detach(w, p);
  p.clubId = null;
  p.contract = 0;
  p.listed = false;
  p.num = 0;
  p.youth = false;
  w.free.push(p.id);
}

export function removePlayer(w: World, p: Player): void {
  detach(w, p);
  delete w.players[p.id];
}

/** Demissão: propostas de clubes menores, de qualquer liga (preferindo reputação até 20 pontos abaixo). */
export function jobOffers(w: World): string[] {
  const u = user(w);
  const others = Object.values(w.clubs).filter((c) => c.id !== u.id);
  let pool = others.filter((c) => c.rep < u.rep - 3 && c.rep >= u.rep - 20);
  if (pool.length < 3) pool = others.filter((c) => c.rep < u.rep - 3);
  if (pool.length < 3) pool = others;
  return shuffle(pool.slice()).slice(0, 3).map((c) => c.id);
}

export function switchClub(w: World, clubId: string): void {
  const old = w.clubs[w.userClub];
  w.userClub = clubId;
  aiMaintain(w, old);
  autoLineup(w, old);
  w.fired = null;
  w.board.conf = 55;
  setObjective(w);
  ensureLineup(w, w.clubs[clubId]);
  const c = w.clubs[clubId];
  pushMessage(w, { kind: 'board', title: `Bem-vindo ao ${c.name}!`, body: `A diretoria do ${c.name} (${divisionFullName(c.div)}) confia no seu trabalho. Objetivo: ${w.board.label}.` });
}

// Geração do mundo: clubes, elencos, jogadores, base e agentes livres.
import { ACADEMY_FOCUS, ATTR_INDEX, fit, ATTR_KEYS, ATTR_PROFILE, CLUBS, FOCUS_WEIGHT, NAMES_BY_NAT, POS, STAR_CHANCE, TRAIT_ATTR, TRAIT_WEIGHTS } from './data';
import { LEAGUES, LEAGUE_IDS, clubBaseOvr, qualityBonus } from './leagues';
import { initClubFinances } from './finance';
import { DEFAULT_INSTRUCTIONS } from './tactics';
import { pickCaptain, pickFkTaker, pickPenTaker } from './squad';
import type { AttrKey, Club, FormationKey, LeagueId, NewPlayerOptions, Player, Position, TraitKey, World } from './types';
import { chance, clamp, gauss, pick, rand, randi, weighted } from './util';

const SQUAD_TEMPLATE: Record<Position, number> = { GOL: 3, ZAG: 4, LAT: 4, VOL: 4, MEI: 5, ATA: 4 };

/** Salário semanal de referência para um overall; `league` aplica o nível salarial da liga (padrão: Brasil). */
export const wageFor = (ovr: number, league?: LeagueId): number =>
  Math.round((1500 * Math.pow(1.155, ovr - 50) * (league ? LEAGUES[league].wages : 1)) / 100) * 100;
/** Salário de referência no clube `clubId` (nível salarial da liga dele). */
export const clubWage = (w: World, clubId: string | null | undefined, ovr: number): number =>
  wageFor(ovr - (w.econ?.drift ?? 0), clubId && w.clubs[clubId] ? w.clubs[clubId].league : undefined);

/** Overall médio dos elencos profissionais (base do índice salarial). */
export function meanSquadOvr(w: World): number {
  let sum = 0, n = 0;
  for (const c of Object.values(w.clubs)) for (const id of c.squad) { const p = w.players[id]; if (p) { sum += p.ovr; n++; } }
  return n ? sum / n : 65;
}

/** Versão atual do formato do World. */
export const WORLD_VERSION = 7;
/** Saves a partir desta versão podem ser migrados. */
export const MIN_COMPATIBLE_VERSION = 3;

/** Fração de jogadores do próprio país nos elencos. */
export const DOMESTIC_SHARE = 0.85;
/** Faixa de agentes livres mantida entre temporadas. */
export const FREE_MIN = 100;
export const FREE_MAX = 200;

/**
 * Nacionalidade para um jogador de um clube da liga `league`: a parcela de locais varia por liga
 * (Brasil quase só local; Inglaterra e Portugal importam muito). Os estrangeiros vêm, em maior número,
 * dos países que mais formam talentos (Brasil, Argentina, França…).
 */
export function rollNat(league: LeagueId, domestic = LEAGUES[league].domestic): LeagueId {
  if (chance(domestic)) return league;
  const abroad = LEAGUE_IDS.filter((l) => l !== league);
  return weighted(abroad, (l) => Math.pow(LEAGUES[l].talent, 4)) ?? pick(abroad);
}

export const valueOf = (p: Pick<Player, 'pot' | 'ovr' | 'age' | 'contract'> & { star?: boolean }): number => {
  const growth = Math.max(0, p.pot - p.ovr) * clamp((25 - p.age) / 10, 0, 0.6);
  const eff = p.ovr + growth;
  let v = 100000 * Math.pow(1.18, eff - 50);
  if (p.age > 29) v *= Math.pow(0.85, p.age - 29);
  if (p.contract <= 0) v *= 0.4;
  if (p.star) v *= 1.3;
  return Math.max(10000, Math.round(v / 10000) * 10000);
};

/** Multa rescisória nova: 2 a 3× o valor (0 para agentes livres). */
export function releaseClauseFor(p: Player): number {
  if (!p.clubId || p.contract <= 0) return 0;
  return Math.max(100000, Math.round((valueOf(p) * rand(2, 3)) / 10000) * 10000);
}

/** Máximo de habilidades para um overall (craques ganham uma a mais). */
export function traitCap(ovr: number, star = false): number {
  const base = ovr < 55 ? 1 : ovr < 66 ? 2 : 3;
  return Math.min(3, base + (star && ovr >= 60 ? 1 : 0));
}

/** Sorteia uma habilidade nova para a posição (sem repetir). */
export function rollTrait(pos: Position, have: TraitKey[]): TraitKey | null {
  const table = TRAIT_WEIGHTS[pos];
  const keys = (Object.keys(table) as TraitKey[]).filter((x) => !have.includes(x));
  return (weighted(keys, (x) => table[x] || 0) as TraitKey | undefined) ?? null;
}

/** Sorteia as habilidades iniciais: jogadores melhores têm mais (0-3). */
export function rollTraits(pos: Position, ovr = 65, star = false): TraitKey[] {
  const r = Math.random();
  let n = ovr < 55 ? (r < 0.45 ? 1 : 0) : ovr < 65 ? (r < 0.25 ? 2 : 1) : ovr < 75 ? (r < 0.05 ? 3 : r < 0.5 ? 2 : 1) : r < 0.3 ? 3 : 2;
  if (star) n++;
  n = Math.min(n, traitCap(ovr, star));
  const out: TraitKey[] = [];
  for (let k = 0; k < n; k++) {
    const t = rollTrait(pos, out);
    if (t) out.push(t);
  }
  return out;
}

/** Reforço do atributo ligado a uma habilidade. */
const traitBoost = (): number => Math.round(rand(9, 14));

/** Desvios dos atributos em relação ao overall: perfil da posição + variação individual + habilidades. */
export function rollAttrs(pos: Position, traits: TraitKey[]): number[] {
  const at = ATTR_PROFILE[pos].map((m) => Math.round(m + gauss() * 5));
  for (const t of traits) {
    const k = TRAIT_ATTR[t];
    if (!k) continue;
    const i = ATTR_INDEX[k];
    at[i] = Math.max(at[i] + traitBoost(), ATTR_PROFILE[pos][i] + 8);
  }
  return at.map((v) => clamp(v, -60, 16));
}

/** Aprende uma habilidade (reforçando o atributo ligado a ela). */
export function learnTrait(p: Player, t: TraitKey): void {
  if (p.traits.includes(t)) return;
  p.traits.push(t);
  const k = TRAIT_ATTR[t];
  if (k && p.at) {
    const i = ATTR_INDEX[k];
    p.at[i] = clamp(Math.max(p.at[i] + traitBoost(), ATTR_PROFILE[p.pos][i] + 8), -60, 16);
  }
}

/** Valor de um atributo (1-99): overall + desvio. */
export function attr(p: Pick<Player, 'ovr' | 'at' | 'pos'>, k: AttrKey): number {
  const i = ATTR_INDEX[k];
  const off = p.at && p.at.length === ATTR_KEYS.length ? p.at[i] : ATTR_PROFILE[p.pos][i];
  return clamp(Math.round(p.ovr + off), 1, 99);
}

/** Rendimento fora da posição: o Coringa nunca cai abaixo de 90% (exceto no gol). */
export function playerFit(p: Pick<Player, 'pos' | 'traits'>, slot: Position): number {
  const f = fit(p.pos, slot);
  if (f >= 0.9 || p.pos === 'GOL' || slot === 'GOL' || !hasTrait(p, 'coringa')) return f;
  return 0.9;
}

/** Overall efetivo numa posição (fora da de origem, o jogador perde pontos). */
export const slotOvr = (p: Pick<Player, 'ovr' | 'pos' | 'traits'>, slot: Position): number => Math.round(p.ovr * playerFit(p, slot));

/** Todos os atributos de um jogador. */
export const attrs = (p: Pick<Player, 'ovr' | 'at' | 'pos'>): Record<AttrKey, number> =>
  Object.fromEntries(ATTR_KEYS.map((k) => [k, attr(p, k)])) as Record<AttrKey, number>;

export const rollStar = (): boolean => chance(STAR_CHANCE);

/** O jogador tem a característica? (tolerante a saves sem `traits`). */
export const hasTrait = (p: Pick<Player, 'traits'>, t: TraitKey): boolean => !!p.traits && p.traits.includes(t);

export function makeName(nat: LeagueId = 'bra'): string {
  const n = NAMES_BY_NAT[nat] || NAMES_BY_NAT.bra;
  if (n.NICK.length && chance(nat === 'bra' ? 0.18 : 0.04)) return pick(n.NICK);
  return pick(n.FIRST) + ' ' + pick(n.LAST);
}

export function newPlayer(w: World, o: NewPlayerOptions): Player {
  const id = 'p' + w.nextId++;
  const nat: LeagueId = o.nat || (o.clubId && w.clubs[o.clubId] ? rollNat(w.clubs[o.clubId].league) : rollNat(pick(LEAGUE_IDS), 0));
  const p: Player = {
    id,
    name: o.name || makeName(nat),
    age: o.age,
    pos: o.pos,
    ovr: o.ovr,
    pot: Math.max(Math.round(o.pot), Math.round(o.ovr)),
    clubId: o.clubId || null,
    youth: !!o.youth,
    contract: o.contract != null ? o.contract : randi(1, 4),
    fitness: 100,
    morale: 70,
    inj: 0, susp: 0, yc: 0,
    listed: false,
    num: 0,
    s: { apps: 0, goals: 0, assists: 0, rsum: 0 },
    c: { apps: 0, goals: 0, assists: 0 },
    played: false,
    wage: 0,
    injType: null,
    traits: [],
    at: [],
    star: rollStar(),
    nat,
    start: { season: w.season, ovr: Math.round(o.ovr * 10) / 10 },
    loan: null,
    releaseClause: 0,
  };
  // `joined` só importa para o clube do usuário (conhecimento do potencial); sem ele, o clube já conhece o jogador.
  if (p.clubId && p.clubId === w.userClub && w.weeks.length > 0) p.joined = { season: w.season, week: w.week };
  p.traits = rollTraits(p.pos, p.ovr, p.star);
  p.at = rollAttrs(p.pos, p.traits);
  p.wage = o.youth ? 800 : clubWage(w, p.clubId, p.ovr) * rand(0.85, 1.15);
  p.wage = Math.round(p.wage / 100) * 100;
  p.releaseClause = releaseClauseFor(p);
  w.players[id] = p;
  return p;
}

function randomAge(): number {
  const r = Math.random();
  if (r < 0.2) return randi(18, 21);
  if (r < 0.75) return randi(22, 29);
  return randi(30, 34);
}

function seniorFor(w: World, club: Club, pos: Position, base: number, age: number): Player {
  let ovr = base + gauss() * 4.5;
  if (age < 22) ovr -= (22 - age) * 1.8;
  ovr = clamp(ovr, 40, 92);
  const pot = age < 25 ? clamp(ovr + rand(2, 16) * ((25 - age) / 5), ovr, 95) : ovr + rand(0, 2);
  return newPlayer(w, { pos, age, ovr, pot, clubId: club.id });
}

/** Quanto da qualidade da liga vai para o potencial médio dos garotos da base. */
const YOUTH_QUALITY_SHARE = 0.9;
const YOUTH_POS_W: Record<Position, number> = { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 2.5, ATA: 2.5 };

/** Opções de geração de um garoto (peneira regional/por posição). */
export interface YouthOptions {
  pos?: Position;
  nat?: LeagueId;
}

export function makeYouth(w: World, club: Club, age?: number, opts: YouthOptions = {}): Player {
  const lvl = club.academy;
  // O potencial médio da base acompanha o nível da liga (mantém a diferença entre países ao longo dos anos);
  // países que formam mais talentos (Brasil, Argentina, França…) produzem mais joias, que depois são exportadas.
  let pot = 48 + lvl * 6 + rand(-6, 18) + qualityBonus(club) * YOUTH_QUALITY_SHARE;
  if (chance(0.04 + lvl * 0.01 + (LEAGUES[club.league].talent - 1) * 0.12)) pot += rand(8, 14); // joia da base
  pot = clamp(pot, 45, 96);
  age = age || randi(15, 17);
  const ovr = clamp(pot * rand(0.52, 0.64) + (age - 15) * 2, 30, 70);
  const focus = ACADEMY_FOCUS[club.academyFocus] || ACADEMY_FOCUS.balanced;
  const pos = opts.pos || (weighted(POS, (p) => YOUTH_POS_W[p] * (focus.pos.includes(p) ? FOCUS_WEIGHT : 1)) as Position);
  const p = newPlayer(w, { pos, age, ovr, pot, clubId: club.id, youth: true, contract: 3, nat: opts.nat || rollNat(club.league, 0.95) });
  club.youth.push(p.id);
  return p;
}

const NUM_PREFS: Record<Position, number[]> = { GOL: [1, 12, 23], ZAG: [3, 4, 13, 14], LAT: [2, 6, 16], VOL: [5, 8, 15], MEI: [10, 8, 7, 11, 18], ATA: [9, 11, 7, 19, 20] };

export function assignNumbers(w: World, club: Club): void {
  const used = new Set<number>();
  const players = club.squad.map((id) => w.players[id]);
  for (const p of players) if (p.num) used.add(p.num);
  const next = (prefs: number[]): number => {
    for (const n of prefs) if (!used.has(n)) { used.add(n); return n; }
    for (let n = 2; n < 99; n++) if (!used.has(n)) { used.add(n); return n; }
    return 99;
  };
  for (const p of players) if (!p.num) p.num = next(NUM_PREFS[p.pos]);
}

/** Inclui clubes novos em carreiras existentes sem alterar elencos antigos. */
export function seedMissingClubs(w: World): number {
  const FORMATION_POOL: FormationKey[] = ['4-4-2', '4-3-3', '4-2-3-1', '4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '4-1-4-1', '4-3-1-2', '4-4-1-1', '3-4-3', '5-4-1', '4-3-2-1', '3-4-2-1'];
  const missing = CLUBS.filter((c) => !w.clubs[c.id]);
  missing.forEach((c) => {
    const club: Club = {
      ...c,
      colors: [c.colors[0], c.colors[1]],
      money: 0,
      sponsor: 0,
      wageCap: 0,
      academy: clamp(Math.round(c.rep / 25 + rand(-0.5, 0.8)), 1, 5),
      training: clamp(Math.round(c.rep / 25 + rand(-0.5, 0.8)), 1, 5),
      formation: pick(FORMATION_POOL),
      tactic: 'bal',
      trainingInt: 'mid',
      squad: [], youth: [], lineup: [], bench: [],
      trophies: [],
      fans: 60,
      ticketPrice: 'normal',
      captain: null,
      penTaker: null,
      fkTaker: null,
      instr: { ...DEFAULT_INSTRUCTIONS },
      loan: null,
      scouting: clamp(Math.round(c.rep / 25 + rand(-0.5, 0.8)), 1, 5),
      academyFocus: 'balanced',
    };
    w.clubs[c.id] = club;
    const base = clubBaseOvr(club);
    for (const pos of Object.keys(SQUAD_TEMPLATE) as Position[]) {
      for (let k = 0; k < SQUAD_TEMPLATE[pos]; k++) {
        const p = seniorFor(w, club, pos, base, randomAge());
        club.squad.push(p.id);
      }
    }
    // Dois craques por clube
    for (let k = 0; k < 2; k++) {
      const p = w.players[pick(club.squad)];
      p.ovr = clamp(p.ovr + rand(4, 9), 40, 93);
      p.pot = Math.max(p.pot, Math.round(p.ovr));
      p.wage = clubWage(w, club.id, p.ovr);
      if (p.traits.length < traitCap(p.ovr, p.star)) {
        const t = rollTrait(p.pos, p.traits);
        if (t) learnTrait(p, t);
      }
      p.releaseClause = releaseClauseFor(p);
    }
    for (let k = 0; k < 4; k++) makeYouth(w, club);
    assignNumbers(w, club);
    pickCaptain(w, club);
    pickPenTaker(w, club);
    pickFkTaker(w, club);
  });
  // Finanças depois de todos os clubes novos existirem (a cota depende da divisão inteira).
  for (const c of missing) initClubFinances(w, w.clubs[c.id]);
  return missing.length;
}

export function newWorld(managerName: string, clubId: string): World {
  const w: World = {
    version: WORLD_VERSION,
    manager: { name: managerName || 'Treinador' },
    userClub: clubId,
    season: 2026,
    week: 0,
    day: 0,
    scheduleRevision: 1,
    clubs: {},
    players: {},
    free: [],
    nextId: 1,
    weeks: [],
    cups: {},
    contNext: null,
    scouting: {},
    scoutQueue: [],
    negotiations: {},
    payables: [],
    watchlist: [],
    watchState: {},
    transfers: [],
    inbox: [],
    nextMsg: 1,
    history: [],
    board: { conf: 60, target: 0, label: '' },
    finance: [],
    finWeek: {},
    finSeason: {},
    trialUsed: false,
    started: false,
  };
  seedMissingClubs(w);
  w.econ = { baseOvr: Math.round(meanSquadOvr(w) * 100) / 100, drift: 0 };
  for (let k = 0; k < FREE_MIN; k++) makeFreeAgent(w);
  return w;
}

export function makeFreeAgent(w: World): Player {
  const age = randi(21, 34);
  const pos = pick(POS);
  const ovr = clamp(55 + gauss() * 7, 42, 80);
  const p = newPlayer(w, { pos, age, ovr, pot: ovr + (age < 24 ? rand(2, 8) : 0), contract: 0, nat: rollNat(pick(LEAGUE_IDS), 0) });
  w.free.push(p.id);
  return p;
}

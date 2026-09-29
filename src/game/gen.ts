// Geração do mundo: clubes, elencos, jogadores, base e agentes livres.
import { ACADEMY_FOCUS, CLUBS, FOCUS_WEIGHT, NAMES_BY_NAT, POS, STAR_CHANCE, TRAIT_WEIGHTS } from './data';
import { LEAGUE_IDS } from './leagues';
import { pickCaptain, pickPenTaker } from './squad';
import type { Club, FormationKey, LeagueId, NewPlayerOptions, Player, Position, TraitKey, World } from './types';
import { chance, clamp, gauss, pick, rand, randi, weighted } from './util';

const SQUAD_TEMPLATE: Record<Position, number> = { GOL: 3, ZAG: 4, LAT: 4, VOL: 4, MEI: 5, ATA: 4 };

export const wageFor = (ovr: number): number => Math.round((2600 * Math.pow(1.13, ovr - 50)) / 100) * 100;

/** Versão atual do formato do World. */
export const WORLD_VERSION = 4;
/** Saves a partir desta versão podem ser migrados. */
export const MIN_COMPATIBLE_VERSION = 3;

/** Fração de jogadores do próprio país nos elencos. */
export const DOMESTIC_SHARE = 0.85;
/** Faixa de agentes livres mantida entre temporadas. */
export const FREE_MIN = 100;
export const FREE_MAX = 200;

/** Nacionalidade para um jogador de um clube da liga `league` (85% do país, 15% estrangeiros). */
export function rollNat(league: LeagueId, domestic = DOMESTIC_SHARE): LeagueId {
  if (chance(domestic)) return league;
  return pick(LEAGUE_IDS.filter((l) => l !== league));
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

/** Sorteia 1-2 características distintas conforme a posição. */
export function rollTraits(pos: Position): TraitKey[] {
  const table = TRAIT_WEIGHTS[pos];
  const keys = Object.keys(table) as TraitKey[];
  const n = chance(0.4) ? 2 : 1;
  const out: TraitKey[] = [];
  for (let k = 0; k < n; k++) {
    const t = weighted(keys.filter((x) => !out.includes(x)), (x) => table[x] || 0);
    if (t) out.push(t);
  }
  return out;
}

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
  const nat: LeagueId = o.nat || (o.clubId && w.clubs[o.clubId] ? rollNat(w.clubs[o.clubId].league) : pick(LEAGUE_IDS));
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
    traits: rollTraits(o.pos),
    star: rollStar(),
    nat,
    start: { season: w.season, ovr: Math.round(o.ovr * 10) / 10 },
    loan: null,
    releaseClause: 0,
  };
  if (p.clubId) p.joined = { season: w.season, week: w.week };
  p.wage = o.youth ? 800 : wageFor(p.ovr) * rand(0.85, 1.15);
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

const YOUTH_POS_W: Record<Position, number> = { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 2.5, ATA: 2.5 };

/** Opções de geração de um garoto (peneira regional/por posição). */
export interface YouthOptions {
  pos?: Position;
  nat?: LeagueId;
}

export function makeYouth(w: World, club: Club, age?: number, opts: YouthOptions = {}): Player {
  const lvl = club.academy;
  let pot = 48 + lvl * 6 + rand(-6, 18);
  if (chance(0.04 + lvl * 0.01)) pot += rand(8, 14); // joia da base
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

export function newWorld(managerName: string, clubId: string): World {
  const w: World = {
    version: WORLD_VERSION,
    manager: { name: managerName || 'Treinador' },
    userClub: clubId,
    season: 2026,
    week: 0,
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
  const FORMATION_POOL: FormationKey[] = ['4-4-2', '4-3-3', '4-2-3-1', '4-3-3', '4-4-2', '3-5-2'];
  CLUBS.forEach((c) => {
    const club: Club = {
      ...c,
      colors: [c.colors[0], c.colors[1]],
      money: Math.round((2 + (c.rep * c.rep) / 200) * 1e6),
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
      loan: null,
      scouting: clamp(Math.round(c.rep / 25 + rand(-0.5, 0.8)), 1, 5),
      academyFocus: 'balanced',
    };
    w.clubs[c.id] = club;
    const base = 48 + c.rep * 0.32;
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
      p.wage = wageFor(p.ovr);
    }
    for (let k = 0; k < 4; k++) makeYouth(w, club);
    // O clube já conhece o próprio elenco no início da carreira.
    for (const id of club.squad) w.players[id].joined = { season: w.season - 1, week: 0 };
    assignNumbers(w, club);
    pickCaptain(w, club);
    pickPenTaker(w, club);
  });
  for (let k = 0; k < FREE_MIN; k++) makeFreeAgent(w);
  return w;
}

export function makeFreeAgent(w: World): Player {
  const age = randi(21, 34);
  const pos = pick(POS);
  const ovr = clamp(55 + gauss() * 7, 42, 80);
  const p = newPlayer(w, { pos, age, ovr, pot: ovr + (age < 24 ? rand(2, 8) : 0), contract: 0, nat: pick(LEAGUE_IDS) });
  w.free.push(p.id);
  return p;
}

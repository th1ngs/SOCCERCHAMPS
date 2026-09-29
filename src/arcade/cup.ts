// Copa arcade: mata-mata com 16 clubes (oitavas → final). Porta do antigo js/cup.js.
import { ARCADE_LEAGUES, ARCADE_TEAMS, firstDivisionTeams, teamById } from "./teams";

export const ROUND_NAMES = ["Oitavas de final", "Quartas de final", "Semifinal", "Final"];
const STORE_KEY = "scm.arcade.cup";

export interface CupMatch {
  a: string | null;
  b: string | null;
  sa: number | null;
  sb: number | null;
  w: string | null;
  /** Decidido na morte súbita. */
  ot: boolean;
}

export type CupStatus = "playing" | "out" | "champion" | "runnerUp";

/**
 * Sorteio dos participantes:
 * - "mixed": clubes das primeiras divisões das seis ligas, misturados;
 * - "league": os 16 clubes da divisão do time escolhido.
 */
export type CupScope = "mixed" | "league";

export interface ArcadeCup {
  player: string;
  /** Ausente em saves antigos (tratado como "league"). */
  scope?: CupScope;
  rounds: CupMatch[][];
  round: number;
  status: CupStatus;
  champion?: string | null;
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 15 adversários: misturando as primeiras divisões (rodízio entre ligas) ou da mesma divisão do jogador. */
function drawOpponents(playerId: string, scope: CupScope): string[] {
  const me = teamById(playerId);
  if (scope === "league" && me) {
    const sameDiv = shuffle(ARCADE_TEAMS.filter((t) => t.id !== playerId && t.club.div === me.club.div).map((t) => t.id));
    const rest = shuffle(ARCADE_TEAMS.filter((t) => t.id !== playerId && t.club.league === me.club.league && t.club.div !== me.club.div).map((t) => t.id));
    return [...sameDiv, ...rest].slice(0, 15);
  }
  // Rodízio entre ligas (em ordem sorteada) para a chave ficar bem misturada.
  const pools = shuffle(ARCADE_LEAGUES.slice()).map((lg) => shuffle(firstDivisionTeams().filter((t) => t.club.league === lg && t.id !== playerId).map((t) => t.id)));
  const out: string[] = [];
  for (let i = 0; out.length < 15 && pools.some((p) => p.length); i++) {
    const p = pools[i % pools.length];
    const id = p.pop();
    if (id) out.push(id);
  }
  return out;
}

export function newCup(playerId: string, scope: CupScope = "mixed"): ArcadeCup {
  const all = shuffle([playerId, ...drawOpponents(playerId, scope)]);
  const first: CupMatch[] = [];
  for (let i = 0; i < 8; i++) first.push({ a: all[i * 2], b: all[i * 2 + 1], sa: null, sb: null, w: null, ot: false });
  return { player: playerId, scope, rounds: [first], round: 0, status: "playing" };
}

export function playerMatch(cup: ArcadeCup): CupMatch | undefined {
  const r = cup.rounds[cup.round];
  return r && r.find((m) => m.a === cup.player || m.b === cup.player);
}

/** Gols simulados com base na força dos times (Poisson). */
function simGoals(r: number, opp: number): number {
  const exp = Math.max(0.3, 1.3 + (r - opp) / 12);
  let g = 0;
  const L = Math.exp(-exp);
  let p = 1;
  do { g++; p *= Math.random(); } while (p > L && g < 8);
  return g - 1;
}

function simulateMatch(m: CupMatch): void {
  const ra = teamById(m.a)?.rating ?? 75, rb = teamById(m.b)?.rating ?? 75;
  let sa = simGoals(ra, rb), sb = simGoals(rb, ra);
  if (sa === sb) {
    const pa = 1 / (1 + Math.pow(10, (rb - ra) / 20));
    if (Math.random() < pa) sa++; else sb++;
    m.ot = true;
  }
  m.sa = sa;
  m.sb = sb;
  m.w = sa > sb ? m.a : m.b;
}

function advance(cup: ArcadeCup): void {
  const r = cup.rounds[cup.round];
  for (const m of r) if (!m.w) simulateMatch(m);
  if (cup.round === 3) {
    cup.champion = r[0].w;
    if (r[0].w === cup.player) cup.status = "champion";
    else if (r[0].a === cup.player || r[0].b === cup.player) cup.status = "runnerUp";
    return;
  }
  const next: CupMatch[] = [];
  for (let i = 0; i < r.length; i += 2) next.push({ a: r[i].w, b: r[i + 1].w, sa: null, sb: null, w: null, ot: false });
  cup.rounds.push(next);
  cup.round++;
}

/** Registra o resultado da partida do jogador (placar do ponto de vista do jogador). */
export function applyPlayerResult(cup: ArcadeCup, myGoals: number, oppGoals: number, ot: boolean): boolean {
  const m = playerMatch(cup);
  if (!m) return false;
  if (m.a === cup.player) { m.sa = myGoals; m.sb = oppGoals; } else { m.sa = oppGoals; m.sb = myGoals; }
  m.ot = ot;
  m.w = myGoals > oppGoals ? cup.player : m.a === cup.player ? m.b : m.a;
  const won = m.w === cup.player;
  if (!won) cup.status = "out";
  advance(cup);
  // Eliminado: simula o resto do torneio para mostrar o campeão.
  while (cup.status === "out" && !cup.champion) advance(cup);
  return won;
}

export function opponentOf(cup: ArcadeCup): string | null {
  const m = playerMatch(cup);
  if (!m) return null;
  return m.a === cup.player ? m.b : m.a;
}

export function saveCup(cup: ArcadeCup): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(cup));
  } catch {
    /* sem armazenamento */
  }
}

/** Carrega a Copa salva; ignora saves corrompidos ou com times que não existem mais. */
export function loadCup(): ArcadeCup | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const cup = JSON.parse(raw) as ArcadeCup;
    if (!cup || !teamById(cup.player) || !Array.isArray(cup.rounds) || !cup.rounds.length) return null;
    const ok = cup.rounds.every((r) => Array.isArray(r) && r.every((m) => (m.a == null || teamById(m.a)) && (m.b == null || teamById(m.b))));
    return ok ? cup : null;
  } catch {
    return null;
  }
}

export function clearCup(): void {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* sem armazenamento */
  }
}

export const Cup = { ROUND_NAMES, newCup, playerMatch, opponentOf, applyPlayerResult, save: saveCup, load: loadCup, clear: clearCup };

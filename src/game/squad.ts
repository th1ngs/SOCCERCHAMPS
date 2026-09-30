// Escalação: disponibilidade, escalação automática e validação.
import { FORMATIONS, SECTOR } from './data';
import { assignNumbers, attr, hasTrait, newPlayer, playerFit } from './gen';
import { promoteYouth } from './market';
import { aiInstructions } from './tactics';
import type { Club, Player, Position, SectorStrength, World } from './types';
import { avg, rand, randi } from './util';
import { neededPos, pushMessage, user } from './world';

const SLOT_PRIORITY: Record<Position, number> = { GOL: 0, ATA: 1, MEI: 2, ZAG: 3, VOL: 4, LAT: 5 };
const BENCH_SIZE = 7;
const PEN_W: Record<Position, number> = { GOL: 0, ZAG: 0.5, LAT: 0.8, VOL: 1.1, MEI: 3, ATA: 6 };

/** Jogador apto a ser escalado (não lesionado, não suspenso, não é da base). */
export const available = (p: Player | null | undefined): p is Player => !!p && !p.inj && !p.susp && !p.youth;

const slotScore = (p: Player, slotPos: Position): number => p.ovr * playerFit(p, slotPos) * (0.85 + (0.15 * p.fitness) / 100);

function fillSlots(w: World, club: Club, lineup: (string | null)[]): (string | null)[] {
  const slots = FORMATIONS[club.formation];
  const used = new Set(lineup.filter((x): x is string => !!x));
  const pool = club.squad.map((id) => w.players[id]).filter((p) => available(p));
  const order = slots.map((s, i) => i).sort((a, b) => SLOT_PRIORITY[slots[a].pos] - SLOT_PRIORITY[slots[b].pos]);
  for (const i of order) {
    if (lineup[i]) continue;
    let best: Player | null = null, bs = -1;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const s = slotScore(p, slots[i].pos);
      if (s > bs) { bs = s; best = p; }
    }
    if (best) { lineup[i] = best.id; used.add(best.id); }
  }
  return lineup;
}

function fillBench(w: World, club: Club, lineup: (string | null)[], bench: string[]): string[] {
  const used = new Set<string | null>(lineup);
  bench = bench.filter((id) => !used.has(id) && club.squad.includes(id) && available(w.players[id]));
  bench.forEach((id) => used.add(id));
  const pool = club.squad.map((id) => w.players[id]).filter((p) => available(p) && !used.has(p.id));
  pool.sort((a, b) => b.ovr - a.ovr);
  if (!bench.some((id) => w.players[id].pos === 'GOL')) {
    const gk = pool.find((p) => p.pos === 'GOL');
    if (gk && bench.length < BENCH_SIZE) { bench.push(gk.id); used.add(gk.id); }
  }
  for (const p of pool) {
    if (bench.length >= BENCH_SIZE) break;
    if (!used.has(p.id)) { bench.push(p.id); used.add(p.id); }
  }
  return bench.slice(0, BENCH_SIZE);
}

// Elenco curto demais: sobe garotos da base ou contrata amadores para completar 11.
function emergencyFill(w: World, club: Club): void {
  let avail = club.squad.filter((id) => available(w.players[id])).length;
  while (avail < 11) {
    const y = club.youth.map((id) => w.players[id]).filter((p) => !p.inj && !p.susp).sort((a, b) => b.ovr - a.ovr)[0];
    if (y) promoteYouth(w, y.id, true);
    else {
      const pos = neededPos(w, club);
      const p = newPlayer(w, { pos, age: randi(20, 30), ovr: rand(42, 50), pot: 52, clubId: club.id, contract: 1 });
      club.squad.push(p.id);
      assignNumbers(w, club);
      if (club.id === w.userClub) pushMessage(w, { kind: 'info', title: 'Reforço emergencial', body: `Sem jogadores suficientes, o clube contratou ${p.name} (${p.pos}) às pressas.` });
    }
    avail++;
  }
}

export function autoLineup(w: World, club: Club): void {
  emergencyFill(w, club);
  club.lineup = fillSlots(w, club, new Array<string | null>(11).fill(null));
  club.bench = fillBench(w, club, club.lineup, []);
  pickCaptain(w, club);
  pickPenTaker(w, club);
  pickFkTaker(w, club);
  // A CPU ajusta as instruções ao perfil do time escalado; as do usuário são dele.
  if (club.id !== w.userClub) club.instr = aiInstructions(w, club);
}

// ---------- Capitão e batedor ----------
/** Candidatos: disponíveis do elenco, titulares primeiro. */
function leaderPool(w: World, club: Club): { p: Player; starter: boolean }[] {
  const starters = new Set(club.lineup);
  return club.squad.map((id) => w.players[id]).filter((p) => available(p)).map((p) => ({ p, starter: starters.has(p.id) }));
}

/** Escolhe e grava o capitão do clube (experiência, overall e liderança; titulares primeiro). */
export function pickCaptain(w: World, club: Club): string | null {
  let best: Player | null = null, bs = -Infinity;
  for (const { p, starter } of leaderPool(w, club)) {
    const sc = (starter ? 100 : 0) + p.ovr * 0.5 + Math.min(p.age, 33) + (hasTrait(p, 'lideranca') ? 15 : 0);
    if (sc > bs) { bs = sc; best = p; }
  }
  club.captain = best ? best.id : null;
  return club.captain;
}

/** Nota de cobrança de pênalti: bola parada e finalização, com bônus para o Cobrador de pênalti. */
export const penScore = (p: Player): number => attr(p, 'bp') * 0.6 + attr(p, 'fin') * 0.4 + (hasTrait(p, 'penalti') ? 12 : 0) + PEN_W[p.pos];
/** Nota de cobrança de falta: bola parada, com bônus para o Batedor de falta. */
export const fkScore = (p: Player): number => attr(p, 'bp') + (hasTrait(p, 'faltas') ? 15 : 0);

function pickBest(w: World, club: Club, score: (p: Player) => number): string | null {
  let best: Player | null = null, bs = -Infinity;
  for (const { p, starter } of leaderPool(w, club)) {
    if (p.pos === 'GOL') continue;
    const sc = (starter ? 1000 : 0) + score(p);
    if (sc > bs) { bs = sc; best = p; }
  }
  return best ? best.id : null;
}

/** Escolhe e grava o batedor de pênaltis (bola parada e finalização; titulares primeiro). */
export function pickPenTaker(w: World, club: Club): string | null {
  club.penTaker = pickBest(w, club, penScore);
  return club.penTaker;
}

/** Escolhe e grava o batedor de faltas (bola parada; titulares primeiro). */
export function pickFkTaker(w: World, club: Club): string | null {
  club.fkTaker = pickBest(w, club, fkScore);
  return club.fkTaker;
}

/** Define o capitão do clube do usuário. Falso se o jogador não é do elenco profissional. */
export function setCaptain(w: World, pid: string): boolean {
  const u = user(w);
  if (!u.squad.includes(pid)) return false;
  u.captain = pid;
  return true;
}

/** Define o batedor de faltas do clube do usuário. Falso se o jogador não é do elenco profissional. */
export function setFkTaker(w: World, pid: string): boolean {
  const u = user(w);
  if (!u.squad.includes(pid)) return false;
  u.fkTaker = pid;
  return true;
}

/** Define o batedor de pênaltis do clube do usuário. Falso se o jogador não é do elenco profissional. */
export function setPenTaker(w: World, pid: string): boolean {
  const u = user(w);
  if (!u.squad.includes(pid)) return false;
  u.penTaker = pid;
  return true;
}

function leaderOk(w: World, club: Club, pid: string | null): boolean {
  return !!pid && club.squad.includes(pid) && available(w.players[pid]);
}

/** Troca jogadores indisponíveis. Retorna os nomes substituídos. */
export function ensureLineup(w: World, club: Club): string[] {
  const changes: string[] = [];
  emergencyFill(w, club);
  let lineup = (club.lineup || []).slice(0, 11);
  while (lineup.length < 11) lineup.push(null);
  const seen = new Set<string>();
  lineup = lineup.map((id) => {
    const p = id ? w.players[id] : undefined;
    if (!id || seen.has(id) || !club.squad.includes(id) || !available(p)) {
      if (p && id && club.squad.includes(id)) changes.push(p.name);
      return null;
    }
    seen.add(id);
    return id;
  });
  club.lineup = fillSlots(w, club, lineup);
  club.bench = fillBench(w, club, club.lineup, club.bench || []);
  // Capitão/batedor escolhidos pelo usuário: trocados só se estiverem indisponíveis.
  if (!leaderOk(w, club, club.captain)) pickCaptain(w, club);
  if (!leaderOk(w, club, club.penTaker)) pickPenTaker(w, club);
  if (!leaderOk(w, club, club.fkTaker)) pickFkTaker(w, club);
  return changes;
}

/** Força média aproximada do time titular (para exibição e expectativas). */
export function teamRating(w: World, club: Club): number {
  const slots = FORMATIONS[club.formation];
  const ids = club.lineup && club.lineup.length === 11 ? club.lineup : null;
  if (!ids) {
    const top = club.squad.map((id) => w.players[id]).sort((a, b) => b.ovr - a.ovr).slice(0, 11);
    return avg(top, (p) => p.ovr);
  }
  return avg(ids.map((id, i) => ({ p: id ? w.players[id] : undefined, s: slots[i] })), (x) => (x.p ? x.p.ovr * playerFit(x.p, x.s.pos) : 40));
}

/** Força por setor do time titular (tela de tática: "força por setor"). */
export function sectors(w: World, club: Club): SectorStrength {
  const slots = FORMATIONS[club.formation];
  const acc = { d: [0, 0], m: [0, 0], a: [0, 0] };
  club.lineup.forEach((id, i) => {
    const p = id ? w.players[id] : undefined;
    if (!p) return;
    const sp = slots[i].pos;
    const eff = p.ovr * playerFit(p, sp) * (0.7 + 0.3 * p.fitness / 100);
    const wt = SECTOR[sp];
    for (const k of ['d', 'm', 'a'] as const) {
      const wk = wt[k];
      if (wk) { acc[k][0] += eff * wk; acc[k][1] += wk; }
    }
  });
  const gk = club.lineup.map((id, i) => ({ p: id ? w.players[id] : undefined, s: slots[i] })).find((x) => x.s.pos === 'GOL');
  return { G: gk && gk.p ? gk.p.ovr : 0, D: acc.d[1] ? acc.d[0] / acc.d[1] : 0, M: acc.m[1] ? acc.m[0] / acc.m[1] : 0, A: acc.a[1] ? acc.a[0] / acc.a[1] : 0 };
}

// Olheiros contratados pelo usuário: cada um tem nível (1-5), país de especialidade e salário.
// Substituem o antigo "departamento de olheiros" por níveis: mais olheiros = mais relatórios ao mesmo
// tempo; o melhor olheiro define a faixa de potencial da base e o bônus da peneira; o especialista de
// um país faz relatórios mais rápidos de jogadores de lá e barateia a peneira naquele país.
import { makeName } from './gen';
import { LEAGUE_IDS, LEAGUES } from './leagues';
import type { Club, LeagueId, Player, Scout, World } from './types';
import { clamp, randi, weighted } from './util';
import { addMoney, user } from './world';

/** Máximo de olheiros contratados ao mesmo tempo. */
export const SCOUT_MAX = 6;
/** Candidatos no mercado de olheiros (renovado a cada temporada). */
export const SCOUT_MARKET_SIZE = 6;
/** Luvas para contratar: semanas de salário. */
export const SCOUT_HIRE_WEEKS = 6;
/** Multa para dispensar: semanas de salário. */
export const SCOUT_FIRE_WEEKS = 4;

/** Salário semanal de um olheiro: cresce rápido com o nível e acompanha os salários da liga do clube. */
export function scoutWage(skill: number, league: LeagueId): number {
  return Math.round((5000 * Math.pow(skill, 1.7) * LEAGUES[league].wages) / 500) * 500;
}

export const scoutHireFee = (s: Pick<Scout, 'wage'>): number => s.wage * SCOUT_HIRE_WEEKS;
export const scoutFireFee = (s: Pick<Scout, 'wage'>): number => s.wage * SCOUT_FIRE_WEEKS;

/** Olheiros contratados pelo usuário. */
export const scoutStaff = (w: World): Scout[] => w.scoutStaff ?? [];

/** Folha semanal dos olheiros. */
export const scoutPayroll = (w: World): number => scoutStaff(w).reduce((s, x) => s + x.wage, 0);

/** Nível do olheiro-chefe (o melhor contratado); 0 sem olheiros. */
export const bestScoutSkill = (w: World): number => scoutStaff(w).reduce((m, s) => Math.max(m, s.skill), 0);

/** Olheiro especialista num país, se houver (o de maior nível). */
export const specialistFor = (w: World, nat: LeagueId): Scout | null =>
  scoutStaff(w).filter((s) => s.nat === nat).sort((a, b) => b.skill - a.skill)[0] ?? null;

function makeScout(w: World, club: Club, skill?: number, nat?: LeagueId): Scout {
  const home = club.league;
  const country = nat ?? (Math.random() < 0.45 ? home : (weighted(LEAGUE_IDS.filter((l) => l !== home), (l) => LEAGUES[l].talent ** 3) ?? home));
  const lvl = skill ?? (weighted([1, 2, 3, 4, 5], (k) => [22, 30, 26, 15, 7][k - 1]) ?? 2);
  return {
    id: 'sc' + w.nextId++,
    name: makeName(country),
    nat: country,
    skill: lvl,
    age: randi(32, 64),
    wage: scoutWage(lvl, home),
  };
}

/** Renova os candidatos do mercado de olheiros (início de temporada e carreira nova). */
export function refreshScoutMarket(w: World): void {
  const u = user(w);
  const list: Scout[] = [];
  // Sempre há pelo menos um bom nome e um especialista de fora.
  list.push(makeScout(w, u, randi(3, 5)));
  list.push(makeScout(w, u, undefined, weighted(LEAGUE_IDS.filter((l) => l !== u.league), (l) => LEAGUES[l].talent ** 3) ?? u.league));
  while (list.length < SCOUT_MARKET_SIZE) list.push(makeScout(w, u));
  w.scoutMarket = list.sort((a, b) => b.skill - a.skill);
}

/** Equipe inicial: um olheiro do país do clube e, em clubes grandes, um segundo de outro país. */
export function seedScoutStaff(w: World, level: number): void {
  const u = user(w);
  const lvl = clamp(Math.round(level), 1, 5);
  const staff = [makeScout(w, u, lvl, u.league)];
  if (lvl >= 3) staff.push(makeScout(w, u, Math.max(1, lvl - 1)));
  w.scoutStaff = staff;
  if (!w.scoutMarket?.length) refreshScoutMarket(w);
}

export interface ScoutActionResult {
  ok: boolean;
  reason?: string;
}

export function hireScout(w: World, id: string): ScoutActionResult {
  const u = user(w);
  const s = (w.scoutMarket ?? []).find((x) => x.id === id);
  if (!s) return { ok: false, reason: 'Olheiro não está mais disponível.' };
  if (scoutStaff(w).length >= SCOUT_MAX) return { ok: false, reason: `Limite de ${SCOUT_MAX} olheiros.` };
  const fee = scoutHireFee(s);
  if (u.money < fee) return { ok: false, reason: 'Caixa insuficiente para as luvas.' };
  addMoney(w, u.id, -fee, 'other');
  w.scoutMarket = (w.scoutMarket ?? []).filter((x) => x.id !== id);
  w.scoutStaff = [...scoutStaff(w), { ...s, since: { season: w.season, week: w.week } }];
  return { ok: true };
}

/** Dispensa um olheiro (paga a multa). Um relatório em andamento com ele passa para outro ou é cancelado. */
export function fireScout(w: World, id: string): ScoutActionResult {
  const u = user(w);
  const s = scoutStaff(w).find((x) => x.id === id);
  if (!s) return { ok: false, reason: 'Olheiro não encontrado.' };
  const fee = scoutFireFee(s);
  if (u.money < fee) return { ok: false, reason: 'Caixa insuficiente para a multa.' };
  addMoney(w, u.id, -fee, 'other');
  w.scoutStaff = scoutStaff(w).filter((x) => x.id !== id);
  const busy = new Set(w.scoutQueue.map((j) => j.scoutId));
  for (const job of w.scoutQueue) {
    if (job.scoutId !== id) continue;
    const other = scoutStaff(w).find((x) => !busy.has(x.id));
    if (other) { job.scoutId = other.id; busy.add(other.id); } else job.scoutId = undefined;
  }
  w.scoutQueue = w.scoutQueue.filter((j) => j.scoutId);
  return { ok: true };
}

/** Olheiro livre mais indicado para um jogador: especialista no país dele, depois o de maior nível. */
export function scoutForPlayer(w: World, p: Pick<Player, 'nat' | 'clubId'>): Scout | null {
  const busy = new Set(w.scoutQueue.map((j) => j.scoutId));
  const free = scoutStaff(w).filter((s) => !busy.has(s.id));
  const league = p.clubId ? w.clubs[p.clubId]?.league : undefined;
  const score = (s: Scout) => s.skill + (s.nat === p.nat || s.nat === league ? 10 : 0);
  return free.sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Semanas até o relatório: 1 com especialista ou olheiro nível 3+; 2 nos demais. */
export function reportWeeks(s: Scout, p: Pick<Player, 'nat' | 'clubId'>, w: World): number {
  const league = p.clubId ? w.clubs[p.clubId]?.league : undefined;
  return s.skill >= 3 || s.nat === p.nat || s.nat === league ? 1 : 2;
}

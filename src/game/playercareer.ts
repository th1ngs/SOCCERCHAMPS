// Carreira de jogador: o usuário é um jogador que começa aos 17 anos num clube pequeno.
// O clube dele é dirigido pela CPU (managesClub = false); o usuário escolhe o treino da semana,
// conquista (ou perde) a confiança do técnico, recebe propostas, renova contrato e decide quando parar.
import { ATTR_INDEX, ATTR_PROFILE, ATTRS_FOR, CLUBS, FORMATIONS } from './data';
import { clubWage, newPlayer, newWorld, releaseClauseFor, valueOf } from './gen';
import { LEAGUES, clubBaseOvr, competitionName, divisionFullName, prestigeOf } from './leagues';
import { formatMoney } from './util';
import { transfer } from './market';
import { ROLE_NAME, renewedContract } from './transfers';
import { seasonTitles } from './career';
import { autoLineup } from './squad';
import type {
  CareerEvent, CareerFocus, CareerIntensity, CareerMatchReport, CareerOffer, Club, LeagueId, Match, Player, PlayerCareer, Position, Role, World,
} from './types';
import { chance, clamp, pick, rand, randi, shuffle } from './util';
import {
  clubPlayers, currentWeek, endWeek, newSeason, simMatch, simulateWeek, startSeason, table, userMatch, windowOpen,
} from './world';

export const CAREER_START_AGE = 17;
export const CAREER_RETIRE_MIN = 33;
export const CAREER_RETIRE_MAX = 40;
const MAX_OFFERS = 3;
const LOG_MAX = 200;

export const INTENSITY: Record<CareerIntensity, { name: string; desc: string; grow: number; fitness: number; trust: number; injury: number }> = {
  leve: { name: 'Leve', desc: 'Recupera o físico, mas evolui pouco e o técnico nota.', grow: 0.2, fitness: 10, trust: -0.4, injury: 0 },
  normal: { name: 'Normal', desc: 'Evolução e condição física equilibradas.', grow: 1, fitness: 0, trust: 0.3, injury: 0.004 },
  forte: { name: 'Forte', desc: 'Evolui mais e impressiona o técnico, mas cansa e pode lesionar.', grow: 1.6, fitness: -7, trust: 0.9, injury: 0.025 },
};

/** Opções de foco do treino para a posição: os 4 atributos mais importantes e o treino geral. */
export const careerFocusOptions = (pos: Position): CareerFocus[] => [...ATTRS_FOR[pos].slice(0, 4), 'geral'];

const absWeek = (w: World): number => w.season * 100 + w.week;

/** Garante os campos da carreira em saves (tolerante a campos novos). */
export function career(w: World): PlayerCareer | null {
  return w.playerCareer ?? null;
}

export function careerPlayer(w: World): Player | null {
  const c = career(w);
  return c ? w.players[c.pid] ?? null : null;
}

export function logCareer(w: World, text: string, tone: CareerEvent['tone'] = 'info'): void {
  const c = career(w);
  if (!c) return;
  c.log.unshift({ season: w.season, week: w.week, text, tone });
  if (c.log.length > LOG_MAX) c.log.length = LOG_MAX;
}

// ---------- Início ----------
/**
 * Três clubes para começar: dois da divisão mais baixa do país e um da divisão acima
 * (entre os de menor reputação). Usa o cadastro estático: não precisa de World.
 */
export function startingClubs(league: LeagueId): string[] {
  const divs = LEAGUES[league].divisions;
  const low = CLUBS.filter((c) => c.div === divs[divs.length - 1]);
  const above = divs.length > 1 ? CLUBS.filter((c) => c.div === divs[divs.length - 2]).sort((a, b) => a.rep - b.rep) : [];
  const picks = shuffle(low.slice()).slice(0, 2).map((c) => c.id);
  const up = above.slice(0, Math.max(3, Math.ceil(above.length / 3)));
  if (up.length) picks.push(pick(up).id);
  else picks.push(...shuffle(low.filter((c) => !picks.includes(c.id))).slice(0, 1).map((c) => c.id));
  return picks;
}

export interface NewCareerOptions {
  name: string;
  pos: Position;
  nat: LeagueId;
  clubId: string;
}

/** Cria o mundo da carreira de jogador: o protagonista de 17 anos entra no elenco do clube escolhido. */
export function newPlayerCareer(o: NewCareerOptions): World {
  const w = newWorld(o.name, o.clubId);
  startSeason(w);
  const club = w.clubs[o.clubId];
  const base = clubBaseOvr(club);
  const p = newPlayer(w, {
    name: o.name.trim() || 'Craque',
    age: CAREER_START_AGE,
    pos: o.pos,
    nat: o.nat,
    ovr: clamp(base - 6 + rand(-2, 2), 46, 66),
    pot: rand(78, 90),
    clubId: club.id,
    contract: 2,
  });
  p.wage = Math.round((clubWage(w, club.id, p.ovr) * 0.6) / 100) * 100;
  p.releaseClause = releaseClauseFor(p);
  p.morale = 75;
  club.squad.push(p.id);
  w.playerCareer = {
    pid: p.id, trust: 50, money: 0, focus: 'geral', intensity: 'normal',
    offers: [], nextOffer: 1, log: [], last: null, seasons: [], milestones: [],
    wantsOut: false, retired: false, debut: w.season,
  };
  for (const c of Object.values(w.clubs)) autoLineup(w, c);
  logCareer(w, `${p.name} assinou o primeiro contrato profissional com o ${club.name} (${divisionFullName(club.div)}).`, 'gold');
  return w;
}

// ---------- Papel no elenco ----------
/** Papel provável num clube: titular, rotação ou reserva, comparando com quem joga na mesma posição. */
export function roleAt(w: World, p: Player, club: Club): Role {
  const slots = FORMATIONS[club.formation].filter((s) => s.pos === p.pos).length || 1;
  const rivals = clubPlayers(w, club).filter((x) => x.id !== p.id && x.pos === p.pos && !x.youth).map((x) => x.ovr).sort((a, b) => b - a);
  const bar = rivals[slots - 1] ?? 0;
  if (p.ovr >= bar) return 'titular';
  if (p.ovr >= bar - 3) return 'rotacao';
  return 'reserva';
}

const ROLE_TRUST: Record<Role, number> = { titular: 60, rotacao: 50, reserva: 42 };

// ---------- Propostas ----------
function makeOffer(w: World, p: Player, club: Club, kind: CareerOffer['kind']): CareerOffer {
  const c = career(w) as PlayerCareer;
  const role = roleAt(w, p, club);
  const market = clubWage(w, club.id, p.ovr);
  const wage = kind === 'renew'
    ? Math.round(Math.max(p.wage * rand(1.05, 1.25), market * rand(0.9, 1.1)) / 100) * 100
    : Math.round((market * rand(1, 1.3) * (role === 'titular' ? 1.1 : 1)) / 100) * 100;
  const fee = kind === 'transfer' ? Math.round((valueOf(p) * rand(0.95, 1.35)) / 10000) * 10000 : 0;
  return { id: c.nextOffer++, club: club.id, kind, fee, wage, years: kind === 'renew' ? randi(2, 3) : randi(2, 4), role, expires: absWeek(w) + (kind === 'free' ? 3 : 2) };
}

/** Clubes que se interessam: nível do elenco perto do overall do jogador e prestígio compatível. */
function interestedClubs(w: World, p: Player, kind: 'transfer' | 'free'): Club[] {
  const cur = p.clubId ? w.clubs[p.clubId] : null;
  const fee = kind === 'transfer' ? valueOf(p) : 0;
  const taken = new Set((career(w)?.offers ?? []).map((o) => o.club));
  return Object.values(w.clubs).filter((c) => {
    if (c.id === p.clubId || taken.has(c.id) || c.squad.length >= 30) return false;
    const base = clubBaseOvr(c);
    if (p.ovr < base - 7 || p.ovr > base + 9) return false;
    if (cur && prestigeOf(c) < prestigeOf(cur) - 6) return false;
    return c.money > fee * 1.2;
  });
}

function addOffers(w: World, p: Player, kind: 'transfer' | 'free', n: number): CareerOffer[] {
  const c = career(w) as PlayerCareer;
  const made: CareerOffer[] = [];
  // Clubes só chamam quem vai jogar (titular ou rotação); sem clube, vale até proposta para reserva.
  const all = interestedClubs(w, p, kind);
  const playing = all.filter((club) => roleAt(w, p, club) !== 'reserva');
  const pool = shuffle(kind === 'free' && playing.length < n ? all : playing);
  // Prefere os clubes mais prestigiados entre os interessados (até o limite de propostas abertas).
  pool.sort((a, b) => prestigeOf(b) - prestigeOf(a) + rand(-12, 12));
  for (const club of pool) {
    if (made.length >= n || c.offers.length >= MAX_OFFERS) break;
    const o = makeOffer(w, p, club, kind);
    c.offers.push(o);
    made.push(o);
  }
  for (const o of made) logCareer(w, `Proposta do ${w.clubs[o.club].name}: ${ROLE_NAME[o.role]}, ${o.years} anos.`, 'good');
  return made;
}

/** Média de notas na temporada (null sem jogos). */
export const seasonRating = (p: Player): number | null => (p.s.apps ? p.s.rsum / p.s.apps : null);

/** Propostas e renovação depois de cada semana. */
function weeklyOffers(w: World, p: Player): void {
  const c = career(w) as PlayerCareer;
  const now = absWeek(w);
  c.offers = c.offers.filter((o) => o.expires >= now && (o.kind !== 'transfer' || windowOpen(w)) && w.clubs[o.club]);
  if (!p.clubId) {
    if (c.offers.filter((o) => o.kind === 'free').length < 2) addOffers(w, p, 'free', 2);
    return;
  }
  const club = w.clubs[p.clubId];
  if (windowOpen(w)) {
    const r = seasonRating(p) ?? 6.5;
    const prob = 0.1 + (c.wantsOut ? 0.35 : 0) + (r >= 7.2 ? 0.2 : r >= 6.9 ? 0.08 : 0) + (p.ovr >= clubBaseOvr(club) + 4 ? 0.15 : 0);
    if (chance(prob)) addOffers(w, p, 'transfer', 1);
  }
  // Último ano de contrato: a partir da semana 18 o clube decide se renova.
  if (p.contract <= 1 && w.week >= 22 && c.renewSeason !== w.season) {
    c.renewSeason = w.season;
    if (c.trust >= 35 || p.ovr >= clubBaseOvr(club) - 3) {
      const o = makeOffer(w, p, club, 'renew');
      o.expires = w.season * 100 + 99;
      c.offers.push(o);
      logCareer(w, `O ${club.name} quer renovar o seu contrato.`, 'good');
    } else {
      logCareer(w, `O ${club.name} não vai renovar o seu contrato. Você fica livre no fim da temporada.`, 'bad');
    }
  }
}

export interface OfferResult {
  ok: boolean;
  reason?: string;
}

/** Aceita uma proposta: transferência, contrato como agente livre ou renovação. */
export function acceptCareerOffer(w: World, id: number): OfferResult {
  const c = career(w);
  const p = careerPlayer(w);
  if (!c || !p) return { ok: false, reason: 'Carreira não encontrada.' };
  const o = c.offers.find((x) => x.id === id);
  if (!o) return { ok: false, reason: 'Proposta expirada.' };
  const club = w.clubs[o.club];
  if (!club) return { ok: false, reason: 'Clube não encontrado.' };
  if (o.kind === 'transfer' && !windowOpen(w)) return { ok: false, reason: 'A janela de transferências está fechada.' };
  if (o.kind === 'renew') {
    p.contract = renewedContract(w, o.years);
    p.wage = o.wage;
    p.releaseClause = releaseClauseFor(p);
    c.trust = clamp(c.trust + 3, 0, 100);
    c.offers = c.offers.filter((x) => x.id !== id);
    logCareer(w, `Contrato renovado com o ${club.name} por ${o.years} anos.`, 'gold');
    return { ok: true };
  }
  const from = p.clubId ? w.clubs[p.clubId] : null;
  p.agreedWage = o.wage;
  transfer(w, p.id, club.id, o.fee, true, { kind: o.kind === 'free' ? 'free' : 'transfer' });
  p.contract = o.years;
  p.listed = false;
  p.releaseClause = releaseClauseFor(p);
  w.userClub = club.id;
  c.trust = ROLE_TRUST[o.role];
  c.wantsOut = false;
  c.renewSeason = undefined;
  c.money += o.wage * 4; // luvas
  c.offers = [];
  autoLineup(w, club);
  if (from) autoLineup(w, from);
  logCareer(w, `${o.kind === 'free' ? 'Assinou' : 'Transferido'} com o ${club.name} (${divisionFullName(club.div)})${o.fee ? ` por ${formatMoney(o.fee)}` : ''}.`, 'gold');
  return { ok: true };
}

export function declineCareerOffer(w: World, id: number): void {
  const c = career(w);
  if (!c) return;
  const o = c.offers.find((x) => x.id === id);
  c.offers = c.offers.filter((x) => x.id !== id);
  if (o?.kind === 'renew') logCareer(w, 'Você recusou a renovação: fica livre no fim da temporada.', 'bad');
}

/** Pede para ser negociado (ou retira o pedido). O técnico não gosta. */
export function toggleTransferRequest(w: World): boolean {
  const c = career(w);
  const p = careerPlayer(w);
  if (!c || !p || !p.clubId) return false;
  c.wantsOut = !c.wantsOut;
  p.listed = c.wantsOut;
  if (c.wantsOut) {
    c.trust = clamp(c.trust - 5, 0, 100);
    logCareer(w, 'Você pediu para ser negociado. Mais clubes vão aparecer na janela.', 'info');
  } else logCareer(w, 'Você retirou o pedido de transferência.', 'info');
  return c.wantsOut;
}

// ---------- Treino ----------
export function setCareerTraining(w: World, focus: CareerFocus, intensity: CareerIntensity): void {
  const c = career(w);
  if (!c) return;
  c.focus = focus;
  c.intensity = intensity;
}

/** Treino da semana: evolução extra, atributo em foco, condição física e lesão (treino forte). */
function train(w: World, p: Player): string | null {
  const c = career(w) as PlayerCareer;
  const it = INTENSITY[c.intensity];
  if (p.inj) return null;
  if (p.ovr < p.pot) {
    const gap = p.pot - p.ovr;
    const rate = p.age <= 21 ? 0.0012 : p.age <= 25 ? 0.0008 : p.age <= 29 ? 0.0003 : 0.0001;
    p.ovr = Math.round(Math.min(p.pot, p.ovr + gap * rate * it.grow * (c.focus === 'geral' ? 1.25 : 1)) * 1000) / 1000;
  }
  if (c.focus !== 'geral' && p.at && p.at.length) {
    const i = ATTR_INDEX[c.focus];
    p.at[i] = Math.min(ATTR_PROFILE[p.pos][i] + 14, Math.round((p.at[i] + 0.18 * (it.grow + 0.4)) * 100) / 100);
  }
  p.fitness = clamp(p.fitness + it.fitness, 30, 100);
  c.trust = clamp(c.trust + it.trust, 0, 100);
  if (chance(it.injury)) {
    p.inj = randi(1, 3);
    p.injType = 'Lesão muscular';
    p.injNew = true;
    return `Lesão no treino forte: ${p.inj} semana(s) fora.`;
  }
  return null;
}

// ---------- Semana ----------
function matchReport(w: World, p: Player, m: Match, before: Player['s'], pre: { inj: boolean; susp: boolean }, moments: string[]): CareerMatchReport {
  const c = career(w) as PlayerCareer;
  const home = m.h === p.clubId;
  const club = w.clubs[p.clubId as string];
  const apps = p.s.apps - before.apps;
  const status: CareerMatchReport['status'] = pre.inj ? 'lesionado' : pre.susp ? 'suspenso'
    : club.lineup.includes(p.id) ? 'titular' : apps ? 'reserva' : club.bench.includes(p.id) ? 'banco' : 'fora';
  return {
    season: w.season, week: w.week, comp: competitionName(m.comp), opp: home ? m.a : m.h, home,
    gf: (home ? m.hs : m.as) ?? 0, ga: (home ? m.as : m.hs) ?? 0, pens: m.pens ? (home ? [m.pens[0], m.pens[1]] : [m.pens[1], m.pens[0]]) : null,
    status, rating: apps ? Math.round((p.s.rsum - before.rsum) * 10) / 10 : null,
    goals: p.s.goals - before.goals, assists: p.s.assists - before.assists, moments, trust: c.trust,
  };
}

function updateTrust(c: PlayerCareer, r: CareerMatchReport): void {
  if (r.rating != null) c.trust += (r.rating - 6.6) * 5 + r.goals * 2 + r.assists * 1.2;
  else if (r.status === 'banco') c.trust += c.intensity === 'forte' ? 0.6 : 0.2;
  c.trust = clamp(Math.round(c.trust * 10) / 10, 0, 100);
  r.trust = c.trust;
}

const MILESTONES: { key: string; test: (p: Player, w: World) => boolean; text: (p: Player) => string }[] = [
  { key: 'debut', test: (p) => p.c.apps >= 1, text: () => 'Estreia como profissional!' },
  { key: 'goal1', test: (p) => p.c.goals >= 1, text: () => 'Primeiro gol como profissional!' },
  { key: 'apps50', test: (p) => p.c.apps >= 50, text: () => '50 jogos na carreira.' },
  { key: 'apps100', test: (p) => p.c.apps >= 100, text: () => '100 jogos na carreira.' },
  { key: 'apps250', test: (p) => p.c.apps >= 250, text: () => '250 jogos na carreira.' },
  { key: 'apps500', test: (p) => p.c.apps >= 500, text: () => '500 jogos: lenda viva.' },
  { key: 'goals50', test: (p) => p.c.goals >= 50, text: () => '50 gols na carreira.' },
  { key: 'goals100', test: (p) => p.c.goals >= 100, text: () => '100 gols na carreira!' },
  { key: 'goals200', test: (p) => p.c.goals >= 200, text: () => '200 gols na carreira!' },
  { key: 'ovr75', test: (p) => p.ovr >= 75, text: () => 'Overall 75: jogador de nível de Série A.' },
  { key: 'ovr80', test: (p) => p.ovr >= 80, text: () => 'Overall 80: um dos melhores da liga.' },
  { key: 'ovr85', test: (p) => p.ovr >= 85, text: () => 'Overall 85: craque internacional.' },
  { key: 'ovr90', test: (p) => p.ovr >= 90, text: () => 'Overall 90: entre os melhores do mundo.' },
  { key: 'intl', test: (p) => (p.intl?.[0] ?? 0) >= 1, text: () => 'Estreia pela seleção na Copa das Nações!' },
];

function checkMilestones(w: World, p: Player): void {
  const c = career(w) as PlayerCareer;
  for (const m of MILESTONES) {
    if (c.milestones.includes(m.key) || !m.test(p, w)) continue;
    c.milestones.push(m.key);
    logCareer(w, m.text(p), 'gold');
  }
}

export interface CareerWeekResult {
  report: CareerMatchReport | null;
  seasonEnd: boolean;
  injury: string | null;
}

/**
 * Joga a semana: treino, jogo do clube (com o relatório do protagonista), os demais jogos, fechamento da
 * semana (motor completo), salário, confiança, propostas e marcos.
 */
export function playCareerWeek(w: World): CareerWeekResult {
  const c = career(w);
  const p = careerPlayer(w);
  if (!c || !p || c.retired || w.pendingSeason) return { report: null, seasonEnd: false, injury: null };
  if (w.week === 0) {
    endWeek(w);
    logCareer(w, `Começa a temporada ${w.season}.`);
    weeklyOffers(w, p);
    return { report: null, seasonEnd: false, injury: null };
  }
  const injury = train(w, p);
  if (injury) logCareer(w, injury, 'bad');
  let report: CareerMatchReport | null = null;
  const m = p.clubId ? userMatch(w) : null;
  if (m && p.clubId === w.userClub) {
    const before = { ...p.s };
    const pre = { inj: p.inj > 0, susp: p.susp > 0 };
    const sim = simMatch(w, m);
    const moments = sim.events.filter((e) => e.text.includes(p.name)).map((e) => `${e.min}' ${e.text}`).slice(-6);
    report = matchReport(w, p, m, before, pre, moments);
    updateTrust(c, report);
    c.last = report;
  }
  simulateWeek(w);
  const rep = endWeek(w);
  if (p.clubId) c.money += p.wage;
  weeklyOffers(w, p);
  checkMilestones(w, p);
  if (rep.seasonEnd) careerSeasonEnd(w, p);
  return { report, seasonEnd: !!rep.seasonEnd, injury };
}

/** Fim de temporada: guarda a linha completa da temporada, títulos e prêmios do protagonista. */
function careerSeasonEnd(w: World, p: Player): void {
  const c = career(w) as PlayerCareer;
  const ps = w.pendingSeason;
  if (!ps) return;
  const club = p.clubId ? w.clubs[p.clubId] : null;
  const titles = club ? seasonTitles(ps)[club.id] ?? [] : [];
  const aw = ps.entry.awards;
  const awards: string[] = [];
  if (aw?.player?.id === p.id) awards.push('Bola de Ouro');
  if (aw?.young?.id === p.id) awards.push('Melhor jovem');
  if (aw?.goalkeeper?.id === p.id) awards.push('Goleiro do ano');
  if (aw?.goldenBoot?.id === p.id) awards.push('Chuteira de Ouro');
  if (aw?.team?.some((x) => x.id === p.id)) awards.push('Seleção do ano');
  const teamPos = club ? (ps.tables[club.div]?.findIndex((r) => r.id === club.id) ?? -1) + 1 || null : null;
  c.seasons.push({
    season: w.season, club: club?.id ?? null, league: club?.league ?? null, apps: p.s.apps, goals: p.s.goals, assists: p.s.assists,
    rating: seasonRating(p), ovr: Math.round(p.ovr), teamPos, titles, awards,
  });
  for (const t of titles) logCareer(w, `Campeão: ${t}!`, 'gold');
  for (const a of awards) logCareer(w, `Prêmio da temporada: ${a}!`, 'gold');
  if (titles.length && !c.milestones.includes('title1')) { c.milestones.push('title1'); }
  if (awards.includes('Bola de Ouro') && !c.milestones.includes('ballon')) c.milestones.push('ballon');
}

/** Vira a temporada (motor completo) e cuida do contrato vencido, da seleção e da aposentadoria forçada. */
export function careerNewSeason(w: World): void {
  const c = career(w);
  const p = careerPlayer(w);
  if (!c || !p || !w.pendingSeason) return;
  const intl = p.intl?.[0] ?? 0;
  const hadClub = p.clubId;
  newSeason(w);
  c.offers = c.offers.filter((o) => o.kind !== 'renew');
  if ((p.intl?.[0] ?? 0) > intl) logCareer(w, `Convocado para a Copa das Nações: ${(p.intl?.[0] ?? 0) - intl} jogo(s) pela seleção.`, 'gold');
  if (hadClub && !p.clubId) {
    logCareer(w, 'Seu contrato terminou. Você está sem clube: escolha uma das propostas.', 'bad');
    addOffers(w, p, 'free', 3);
  }
  checkMilestones(w, p);
  if (p.age >= CAREER_RETIRE_MAX) retireCareer(w);
}

export function canRetire(w: World): boolean {
  const p = careerPlayer(w);
  return !!p && p.age >= CAREER_RETIRE_MIN && !career(w)?.retired;
}

export function retireCareer(w: World): void {
  const c = career(w);
  const p = careerPlayer(w);
  if (!c || !p || c.retired) return;
  c.retired = true;
  c.offers = [];
  logCareer(w, `${p.name} pendurou as chuteiras aos ${p.age} anos: ${p.c.apps} jogos e ${p.c.goals} gols.`, 'gold');
}

/** Próximo jogo do clube do protagonista nesta semana (para a tela). */
export function careerNextMatch(w: World): Match | null {
  const p = careerPlayer(w);
  if (!p?.clubId || p.clubId !== w.userClub || w.week === 0) return null;
  return currentWeek(w)?.matches.find((m) => !m.played && (m.h === p.clubId || m.a === p.clubId)) ?? null;
}

/** Posição do clube do protagonista na divisão. */
export function careerTablePos(w: World): number | null {
  const p = careerPlayer(w);
  if (!p?.clubId) return null;
  const club = w.clubs[p.clubId];
  const i = table(w, club.div).findIndex((r) => r.id === club.id);
  return i >= 0 ? i + 1 : null;
}

/** Totais da carreira (temporadas fechadas + a atual). */
export function careerTotalsFor(w: World): { apps: number; goals: number; assists: number; titles: number; awards: number } {
  const c = career(w);
  const p = careerPlayer(w);
  const t = { apps: p?.c.apps ?? 0, goals: p?.c.goals ?? 0, assists: p?.c.assists ?? 0, titles: 0, awards: 0 };
  for (const s of c?.seasons ?? []) { t.titles += s.titles.length; t.awards += s.awards.length; }
  return t;
}

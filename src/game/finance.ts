// Realidade financeira por clube (v5): cada receita e despesa depende da liga, da divisão,
// da reputação, do estádio e da torcida. Valores semanais em R$.
import { LOAN_INTEREST, TICKET_PRICES } from './data';
import { DIVISIONS, DIVISION_SIZE, LEAGUES, LEAGUE_PRIZE_BASE, TOTAL_WEEKS, TV_BASE } from './leagues';
import type { Club, LeagueInfo, Loan, World } from './types';
import { clamp, formatMoney, rand, randi } from './util';

/** Peso de cada divisão nas receitas comerciais (1ª, 2ª, 3ª). */
const LEVEL_COMMERCIAL = [1, 0.7, 0.5, 0.38];
/** Escala geral das receitas (calibrada para a folha média ficar perto de 90% da receita livre). */
export const REVENUE_SCALE = 1.3;
/** Fração da receita livre (receita − manutenção − dívida) que a diretoria libera para salários. */
export const WAGE_RATIO = 0.95;
/** Semanas por temporada usadas nas médias. */
const SEASON_WEEKS = TOTAL_WEEKS;
/** Jogos em casa por temporada (os da liga + copas, em média). */
const HOME_GAMES = DIVISION_SIZE;

const lg = (c: Club): LeagueInfo => LEAGUES[c.league];
const levelOf = (c: Club): number => DIVISIONS[c.div].level;
const levelF = (c: Club): number => LEVEL_COMMERCIAL[levelOf(c) - 1] ?? LEVEL_COMMERCIAL[LEVEL_COMMERCIAL.length - 1];
const round1k = (v: number): number => Math.round(v / 1000) * 1000;

/** Reputação média da divisão do clube. */
function divisionRep(w: World, c: Club): number {
  let sum = 0, n = 0;
  for (const x of Object.values(w.clubs)) if (x.div === c.div) { sum += x.rep; n++; }
  return n ? sum / n : c.rep;
}

/** Cota de TV semanal: parte igual para todos e parte pelo peso do clube (conforme a liga). */
export function tvShare(w: World, c: Club, avgRep = divisionRep(w, c)): number {
  const L = lg(c);
  const base = (TV_BASE[levelOf(c) - 1] ?? TV_BASE[TV_BASE.length - 1]) * L.tv;
  const weight = clamp(c.rep / Math.max(1, avgRep), 0.55, 1.7);
  return round1k(base * REVENUE_SCALE * (1 - L.tvSplit + L.tvSplit * weight));
}

/** Valor semanal de mercado de um patrocínio master para o clube hoje. */
export function sponsorValue(c: Club): number {
  return round1k(c.rep * c.rep * 34 * REVENUE_SCALE * lg(c).commercial * levelF(c));
}

/** Sócios-torcedores e produtos licenciados: cresce com a reputação e com o humor da torcida. */
export function commercialWeekly(c: Club): number {
  const fans = typeof c.fans === 'number' ? c.fans : 60;
  return round1k(c.rep * c.rep * 22 * REVENUE_SCALE * lg(c).commercial * levelF(c) * (0.6 + fans / 150));
}

/** Preço médio do ingresso (antes da política de preços do clube). */
export const ticketBase = (c: Club): number => (8 + c.rep * 0.18) * REVENUE_SCALE * lg(c).ticket;

/** Manutenção semanal: estádio (por lugar) e estrutura (base, CT e olheiros; cresce com o nível). */
export function upkeepWeekly(c: Club): number {
  // Olheiros: departamento por nível na CPU; o usuário (scouting 0) paga o salário dos olheiros contratados.
  const levels = [c.academy, c.training, c.scouting ?? 1];
  const structure = levels.reduce((s, l, i) => s + (i === 2 && l === 0 ? 0 : Math.pow(Math.max(1, l), 1.5) * 5500), 0) * lg(c).wealth;
  return round1k(c.cap * 0.55 * lg(c).ticket + structure);
}

/** Renda média por semana dos jogos em casa (ocupação típica de 70%). */
export function gateWeeklyAvg(c: Club): number {
  const tp = TICKET_PRICES[c.ticketPrice] || TICKET_PRICES.normal;
  const occ = clamp(0.35 + c.rep / 200 + c.rep / 400 + tp.occ, 0.2, 1);
  return round1k((c.cap * occ * ticketBase(c) * tp.mult * HOME_GAMES) / SEASON_WEEKS);
}

/** Prêmio médio por semana (meio da tabela). */
export function prizeWeeklyAvg(c: Club): number {
  const base = LEAGUE_PRIZE_BASE[levelOf(c) - 1] ?? LEAGUE_PRIZE_BASE[LEAGUE_PRIZE_BASE.length - 1];
  return round1k((8 * base * lg(c).wealth) / SEASON_WEEKS);
}

export interface FinanceProfile {
  tv: number;
  sponsor: number;
  commercial: number;
  gate: number;
  prize: number;
  /** Receita semanal estimada (soma das anteriores). */
  revenue: number;
  upkeep: number;
  wages: number;
  /** Parcela semanal de empréstimo bancário (0 sem dívida). */
  debt: number;
  wageCap: number;
  /** Quanto ainda cabe na folha antes do teto. */
  room: number;
}

/** Folha salarial semanal do clube (inclui a parte que o dono paga de jogadores emprestados). */
export function clubWages(w: World, c: Club): number {
  let wages = 0;
  for (const id of c.squad) {
    const p = w.players[id];
    if (p) wages += p.loan ? p.wage * p.loan.wageShare : p.wage;
  }
  for (const id of c.youth) wages += w.players[id]?.wage ?? 0;
  if (c.id === w.userClub) {
    for (const p of Object.values(w.players)) if (p.loan && p.loan.from === c.id) wages += p.wage * (1 - p.loan.wageShare);
  }
  return Math.round(wages);
}

/** Receitas e despesas semanais estimadas do clube. */
export function financeProfile(w: World, c: Club): FinanceProfile {
  const tv = tvShare(w, c);
  const sponsor = c.sponsor || sponsorValue(c);
  const commercial = commercialWeekly(c);
  const gate = gateWeeklyAvg(c);
  const prize = prizeWeeklyAvg(c);
  const wages = clubWages(w, c);
  const wageCap = c.wageCap || wageCapFor(w, c);
  return {
    tv, sponsor, commercial, gate, prize,
    revenue: tv + sponsor + commercial + gate + prize,
    upkeep: upkeepWeekly(c),
    wages,
    debt: c.loan ? c.loan.weekly : 0,
    wageCap,
    room: wageCap - wages,
  };
}

/** Teto salarial que a diretoria aprova: WAGE_RATIO da receita livre (receita − manutenção − metade da dívida). */
export function wageCapFor(w: World, c: Club): number {
  const revenue = tvShare(w, c) + (c.sponsor || sponsorValue(c)) + commercialWeekly(c) + gateWeeklyAvg(c) + prizeWeeklyAvg(c);
  const free = revenue - upkeepWeekly(c) - (c.loan ? c.loan.weekly * 0.5 : 0);
  return Math.max(60000, Math.round((free * WAGE_RATIO) / 10000) * 10000);
}

/** Define patrocínio, dívida inicial, caixa e teto salarial de um clube recém-criado. */
export function initClubFinances(w: World, c: Club): void {
  c.sponsor = round1k(sponsorValue(c) * rand(0.9, 1.1));
  const L = lg(c);
  const revenue = tvShare(w, c) + c.sponsor + commercialWeekly(c) + gateWeeklyAvg(c) + prizeWeeklyAvg(c);
  // Clubes menores e ligas mais pobres começam endividados com mais frequência.
  const debtChance = clamp(L.debt * (c.rep < 60 ? 1.2 : c.rep > 85 ? 0.7 : 1), 0, 0.9);
  c.loan = null;
  if (Math.random() < debtChance) {
    const principal = Math.round((revenue * rand(6, 16)) / 100000) * 100000;
    c.loan = startingDebt(principal);
  }
  const cash = revenue * rand(7, 18) * (c.loan ? 0.6 : 1);
  c.money = Math.max(1e6, Math.round(cash / 100000) * 100000);
  c.wageCap = Math.max(wageCapFor(w, c), Math.round((clubWages(w, c) * 1.08) / 10000) * 10000);
}

/** Dívida bancária antiga: parcelas como as do empréstimo do jogo, já parcialmente paga. */
function startingDebt(principal: number): Loan {
  const weeksLeft = randi(12, 30);
  return { principal, weekly: Math.round((principal * (1 + LOAN_INTEREST)) / 30), weeksLeft };
}

export interface SponsorRenewal {
  before: number;
  after: number;
}

/**
 * Renova o patrocínio master no fim da temporada: acompanha a reputação e a divisão (acesso e queda),
 * com bônus para campeões. Recalcula também o teto salarial.
 */
export function renewClubFinances(w: World, c: Club, champion: boolean): SponsorRenewal {
  const before = c.sponsor || sponsorValue(c);
  const market = sponsorValue(c) * rand(0.95, 1.08) * (champion ? 1.12 : 1);
  // O contrato novo não despenca nem dispara de uma vez (negociação de uma temporada para a outra).
  const after = round1k(clamp(market, before * 0.7, before * 1.45));
  c.sponsor = after;
  c.wageCap = Math.max(wageCapFor(w, c), Math.round((Math.min(clubWages(w, c), wageCapFor(w, c) * 1.15) * 0.9) / 10000) * 10000);
  return { before, after };
}

/** Folha que ficaria acima do teto com um salário novo? Retorna o texto do veto ou null. */
export function wageVeto(w: World, c: Club, extraWage: number, tolerance = 1): string | null {
  const wages = clubWages(w, c);
  const cap = (c.wageCap || wageCapFor(w, c)) * tolerance;
  if (wages + extraWage <= cap) return null;
  return `A diretoria vetou: a folha iria a ${formatMoney(wages + extraWage)}/sem, acima do teto de ${formatMoney(cap)}/sem. Venda, empreste ou dispense alguém para abrir espaço.`;
}

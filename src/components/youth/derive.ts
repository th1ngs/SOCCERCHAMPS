// Derivações puras da tela "Categorias de base" (sem React, sem mutação do World).
// Regra de ouro: nunca expor `p.pot` na interface — só a faixa conhecida (potentialRange).
import {
  ACADEMY_FOCUS,
  LEAGUES,
  POS,
  SQUAD_MAX,
  TOTAL_WEEKS,
  UPGRADES,
  formatMoney,
  knownTraits,
  loanedOut,
  nextWindow,
  potentialRange,
  scoutCost,
  scoutSlots,
  user,
  windowOpen,
} from "@/game";
import type { Club, LeagueId, Message, Player, Position, TraitKey, World } from "@/game/types";

export type AcademyFocusKey = Club["academyFocus"];
export type PotRange = ReturnType<typeof potentialRange>;
export type YouthSort = "pot" | "age" | "pos" | "growth";
export type PosFilter = Position | "all";

/** Escala da barra de potencial. */
export const POT_SCALE_MIN = 40;
export const POT_SCALE_MAX = 99;
/** A interface só mostra "Joia" quando a faixa conhecida garante isso. */
export const GEM_MIN = 78;
/** Idade mínima para emprestar um garoto da base. */
export const LOAN_MIN_AGE = 17;

export const FOCUS_KEYS = Object.keys(ACADEMY_FOCUS) as AcademyFocusKey[];

/** Posições que o foco privilegia (evoluem 15% mais rápido). */
export const focusPos = (f: AcademyFocusKey): Position[] => ACADEMY_FOCUS[f]?.pos ?? [];

export const focusName = (f: AcademyFocusKey): string => ACADEMY_FOCUS[f]?.name ?? String(f);
export const focusDesc = (f: AcademyFocusKey): string => ACADEMY_FOCUS[f]?.desc ?? "";

/** Largura inicial da faixa de potencial de um garoto da base (contrato: 24 − 3·base − 2·olheiros, mín. 4). */
export const initialRangeWidth = (academy: number, scouting: number): number => Math.max(4, 24 - 3 * academy - 2 * scouting);

/** Posição percentual de um valor de potencial na barra (0–100). */
export const potPct = (v: number): number =>
  Math.max(0, Math.min(100, ((v - POT_SCALE_MIN) / (POT_SCALE_MAX - POT_SCALE_MIN)) * 100));

export const rangeLabel = (r: PotRange): string => (r.exact || r.min === r.max ? `${r.max}` : `${r.min}–${r.max}`);
export const rangeMid = (r: PotRange): number => (r.min + r.max) / 2;

export interface YouthOffer {
  msgId: number;
  club: string;
  fee: number;
}

export interface YouthView {
  p: Player;
  range: PotRange;
  traits: TraitKey[] | null;
  gem: boolean;
  /** Evolução desde a chegada (overall atual − overall na chegada). */
  growth: number;
  startOvr: number;
  startSeason: number;
  /** Faz 19 anos na virada da temporada: sobe ou sai. */
  decide: boolean;
  /** Relatório do olheiro em andamento: semana em que fica pronto. */
  scoutReady: number | null;
  /** Relatório completo já feito (faixa exata). */
  reportDone: boolean;
  /** Setor em foco na base (evolui 15% mais rápido). */
  inFocus: boolean;
  /** Proposta de clube da CPU ainda aberta na caixa de entrada. */
  offer: YouthOffer | null;
}

type YouthOfferMsg = Message & { offer: NonNullable<Message["offer"]> & { youth?: boolean } };

/** Propostas abertas por garotos da base (mensagens `offer` com `offer.youth`). */
export function openYouthOffers(w: World): Record<string, YouthOffer> {
  const out: Record<string, YouthOffer> = {};
  for (const m of w.inbox as YouthOfferMsg[]) {
    const o = m.offer;
    if (m.kind !== "offer" || !o || !o.youth || o.done || o.expired) continue;
    if (!out[o.pid] || out[o.pid].fee < o.fee) out[o.pid] = { msgId: m.id, club: o.club, fee: o.fee };
  }
  return out;
}

export function youthView(w: World, p: Player, focus: AcademyFocusKey, offers: Record<string, YouthOffer>): YouthView {
  const range = potentialRange(w, p);
  const start = p.start ?? { season: w.season, ovr: p.ovr };
  const queued = (w.scoutQueue ?? []).find((q) => q.pid === p.id);
  return {
    p,
    range,
    traits: knownTraits(w, p),
    gem: range.min >= GEM_MIN,
    growth: Math.round(p.ovr) - Math.round(start.ovr),
    startOvr: Math.round(start.ovr),
    startSeason: start.season,
    decide: p.age >= 18,
    scoutReady: queued ? queued.readyWeek : null,
    reportDone: range.exact || (w.scouting?.[p.id]?.level ?? 0) >= 2,
    inFocus: focusPos(focus).includes(p.pos),
    offer: offers[p.id] ?? null,
  };
}

const POS_ORDER: Record<Position, number> = { GOL: 0, ZAG: 1, LAT: 2, VOL: 3, MEI: 4, ATA: 5 };

export function sortYouth(list: YouthView[], key: YouthSort): YouthView[] {
  const byPot = (a: YouthView, b: YouthView) => rangeMid(b.range) - rangeMid(a.range) || b.p.ovr - a.p.ovr;
  const cmp: Record<YouthSort, (a: YouthView, b: YouthView) => number> = {
    pot: byPot,
    age: (a, b) => b.p.age - a.p.age || byPot(a, b),
    pos: (a, b) => POS_ORDER[a.p.pos] - POS_ORDER[b.p.pos] || byPot(a, b),
    growth: (a, b) => b.growth - a.growth || byPot(a, b),
  };
  return list.slice().sort(cmp[key]);
}

export const filterYouth = (list: YouthView[], pos: PosFilter): YouthView[] => (pos === "all" ? list : list.filter((v) => v.p.pos === pos));

export function posCounts(list: YouthView[]): Record<PosFilter, number> {
  const c = { all: list.length } as Record<PosFilter, number>;
  for (const p of POS) c[p] = 0;
  for (const v of list) c[v.p.pos]++;
  return c;
}

/* ---------- Motivos de bloqueio (botões desabilitados explicam o porquê) ---------- */

export function promoteBlock(club: Club): string | null {
  return club.squad.length >= SQUAD_MAX ? `Elenco cheio (${club.squad.length}/${SQUAD_MAX})` : null;
}

export function windowText(w: World): string {
  const nx = nextWindow(w);
  return nx === null ? "Janela fechada até a próxima temporada" : `Janela fechada (abre na semana ${nx})`;
}

export function loanBlock(w: World, p: Player): string | null {
  if (p.age < LOAN_MIN_AGE) return `Só a partir dos ${LOAN_MIN_AGE} anos`;
  if (!windowOpen(w)) return windowText(w);
  return null;
}

export interface ScoutState {
  level: number;
  max: number;
  slots: number;
  used: number;
  cost: number;
  upgradeCost: number;
  maxed: boolean;
  queue: { pid: string; name: string; pos: Position | null; club: string | null; readyWeek: number; youth: boolean }[];
}

export function scoutState(w: World): ScoutState {
  const u = user(w);
  const up = UPGRADES.scouting;
  const queue = (w.scoutQueue ?? [])
    .map((q) => {
      const p = w.players[q.pid];
      return {
        pid: q.pid,
        name: p?.name ?? "Jogador",
        pos: p?.pos ?? null,
        club: p?.clubId ? w.clubs[p.clubId]?.short ?? null : null,
        readyWeek: q.readyWeek,
        youth: !!p && u.youth.includes(p.id),
      };
    })
    .sort((a, b) => a.readyWeek - b.readyWeek);
  const level = up.level(u);
  return {
    level,
    max: up.max,
    slots: scoutSlots(w),
    used: queue.length,
    cost: scoutCost(w),
    upgradeCost: up.cost(u),
    maxed: level >= up.max,
    queue,
  };
}

export function scoutBlock(w: World, v: YouthView, s: ScoutState): string | null {
  if (v.reportDone) return "Relatório completo já feito";
  if (v.scoutReady !== null) return `Pronto na semana ${v.scoutReady}`;
  if (s.used >= s.slots) return `Olheiros ocupados (${s.used}/${s.slots})`;
  if (user(w).money < s.cost) return `Caixa insuficiente (${formatMoney(user(w).money)})`;
  return null;
}

/* ---------- Resumo do topo ---------- */

export interface AcademySummary {
  academy: number;
  academyMax: number;
  scouting: number;
  scoutingMax: number;
  focus: AcademyFocusKey;
  youthCount: number;
  gems: number;
  arrivedThisSeason: number;
  weeksToIntake: number;
  nextSeason: number;
  decideCount: number;
}

export function academySummary(w: World, views: YouthView[]): AcademySummary {
  const u = user(w);
  return {
    academy: UPGRADES.academy.level(u),
    academyMax: UPGRADES.academy.max,
    scouting: UPGRADES.scouting.level(u),
    scoutingMax: UPGRADES.scouting.max,
    focus: u.academyFocus,
    youthCount: views.length,
    gems: views.filter((v) => v.gem).length,
    arrivedThisSeason: views.filter((v) => v.startSeason === w.season).length,
    weeksToIntake: Math.max(1, TOTAL_WEEKS - w.week + 1),
    nextSeason: w.season + 1,
    decideCount: views.filter((v) => v.decide).length,
  };
}

/* ---------- Emprestados ---------- */

export interface LoanedView {
  p: Player;
  club: Club | null;
  league: LeagueId | null;
  role: "Titular" | "Rotação";
  apps: number;
  goals: number;
  until: number | null;
  wageShare: number;
}

export function loanedViews(w: World): LoanedView[] {
  return loanedOut(w)
    .map((p) => {
      const loan = p.loan;
      const to = loan?.to ?? p.clubId;
      const club = to ? w.clubs[to] ?? null : null;
      const role = loan?.role ? loan.role === "titular" : !!club && club.lineup.includes(p.id);
      return {
        p,
        club,
        league: club ? club.league : null,
        role: role ? ("Titular" as const) : ("Rotação" as const),
        apps: Math.max(0, (p.s?.apps ?? 0) - (loan?.apps0 ?? 0)),
        goals: Math.max(0, (p.s?.goals ?? 0) - (loan?.goals0 ?? 0)),
        until: loan?.until ?? null,
        wageShare: loan?.wageShare ?? 0,
      };
    })
    .sort((a, b) => a.p.age - b.p.age || b.apps - a.apps);
}

export const pct = (v: number): string => `${Math.round(v * 100)}%`;
export const countryName = (id: LeagueId): string => LEAGUES[id]?.country ?? id;

// Derivações puras da Central de transferências (sem React, sem mutar o mundo).
// Os tipos vêm das assinaturas do motor (docs/BASE_TRANSFERS.md), para que qualquer
// mudança no contrato apareça aqui, num lugar só.
import {
  INSTALLMENT_GAP,
  NEGOTIATION_COOLDOWN,
  NEGOTIATION_PATIENCE,
  SQUAD_MAX,
  WINDOWS,
  biggestDeals,
  clubPlayers,
  loanedIn,
  loanedOut,
  marketNews,
  netSpend,
  nextWindow,
  potentialRange,
  scoutCost,
  scoutSlots,
  sum,
  transferHistory,
  user,
} from "@/game";
import type { Club, ClubResponse, ContractResponse, Negotiation, Player, PotentialRange, Role, TransferKind, TransferRecord, World } from "@/game/types";

// ---------- Tipos do contrato ----------
export type { Role, Terms } from "@/game/types";
export type ClubReply = ClubResponse;
export type ContractReply = ContractResponse;
export type Installments = 1 | 2 | 3;
export type TransferRec = TransferRecord;
export type PotRange = PotentialRange;

/** Paciência inicial do clube vendedor e semanas sem negociar após o rompimento. */
export const PATIENCE_MAX = NEGOTIATION_PATIENCE;
export const WALKOUT_WEEKS = NEGOTIATION_COOLDOWN;
/** Semanas entre as parcelas de uma transferência. */
export const INSTALLMENT_WEEKS = INSTALLMENT_GAP;

export const ROLE_INFO: Record<Role, { label: string; desc: string }> = {
  titular: { label: "Titular", desc: "Promete vaga no time. É o pedido salarial base, mas ele cobra se jogar menos de 40% dos jogos até a semana 20." },
  rotacao: { label: "Rotação", desc: "Reveza com os titulares. Pede cerca de 10% a mais de salário." },
  reserva: { label: "Reserva", desc: "Entra pouco. Pede cerca de 25% a mais, e jogadores bons costumam recusar." },
};
export const ROLES: Role[] = ["titular", "rotacao", "reserva"];

export const KIND_LABEL: Record<TransferKind, string> = {
  transfer: "Transferência",
  loan: "Empréstimo",
  free: "Sem custo",
  release: "Rescisão",
  clause: "Multa rescisória",
};

// ---------- Janela ----------
export interface WindowInfo {
  open: boolean;
  /** Semana em que a janela atual fecha. */
  until: number | null;
  /** Semana em que a próxima janela abre (null = pré-temporada). */
  next: number | null;
  /** Última semana da janela: "Dia do fechamento". */
  deadline: boolean;
}

export function windowInfo(w: World): WindowInfo {
  const win = WINDOWS.find(([a, b]) => w.week >= a && w.week <= b);
  return { open: !!win, until: win ? win[1] : null, next: win ? null : nextWindow(w), deadline: !!win && w.week === win[1] };
}

// ---------- Folha e compromissos ----------
/** Parte do salário semanal paga pelo clube do usuário (considera empréstimos). */
export function userWage(w: World, p: Player): number {
  const l = p.loan;
  if (l && l.to === w.userClub) return p.wage * l.wageShare;
  if (l && l.from === w.userClub) return p.wage * (1 - l.wageShare);
  return p.wage;
}

export interface MarketHeader {
  cash: number;
  wageBill: number;
  squad: number;
  squadMax: number;
  payTotal: number;
  payCount: number;
  nextPay: World["payables"][number] | null;
}

export function marketHeader(w: World): MarketHeader {
  const u = user(w);
  const mine = clubPlayers(w, u);
  const out = loanedOut(w);
  const pays = w.payables.filter((d) => !d.club || d.club === w.userClub).sort((a, b) => a.season - b.season || a.week - b.week);
  return {
    cash: u.money,
    wageBill: sum(mine, (p) => userWage(w, p)) + sum(out, (p) => userWage(w, p)),
    squad: u.squad.length,
    squadMax: SQUAD_MAX,
    payTotal: sum(pays, (x) => x.amount),
    payCount: pays.length,
    nextPay: pays[0] ?? null,
  };
}

// ---------- Potencial e olheiros ----------
/** "68" (exato) ou "62–74" (faixa). */
export const rangeText = (r: PotRange): string => (r.exact || Math.round(r.min) === Math.round(r.max) ? `${Math.round(r.max)}` : `${Math.round(r.min)}–${Math.round(r.max)}`);

export interface ScoutStatus {
  /** 0 = básico, 1 = observado, 2 = relatório completo. */
  level: number;
  /** Semana em que o relatório pedido fica pronto. */
  readyWeek: number | null;
  cost: number;
  slots: number;
  busy: number;
  /** Motivo para não poder pedir agora (null = pode pedir). */
  reason: string | null;
}

export function scoutStatus(w: World, pid: string): ScoutStatus {
  const level = w.scouting[pid]?.level ?? 0;
  const q = w.scoutQueue.find((x) => x.pid === pid);
  const cost = scoutCost(w);
  const slots = scoutSlots(w);
  const busy = w.scoutQueue.length;
  const reason =
    level >= 2
      ? "Relatório completo já disponível"
      : q
        ? `Relatório a caminho: pronto na semana ${q.readyWeek}`
        : busy >= slots
          ? `Olheiros ocupados (${busy}/${slots} relatórios em andamento)`
          : user(w).money < cost
            ? "Caixa insuficiente para o relatório"
            : null;
  return { level, readyWeek: q?.readyWeek ?? null, cost, slots, busy, reason };
}

// ---------- Negociações ----------
export interface NegotiationInfo {
  patience: number;
  lastFee: number;
  week: number;
  season: number;
  /** Semana em que o clube volta a negociar (após rompimento), ou null. */
  cooldownUntil: number | null;
  /** Temporada da volta (se for depois da virada). */
  cooldownSeason: number | null;
  agreed: Negotiation["agreed"] | null;
  contract: Negotiation["contract"] | null;
}

/** Semana absoluta usada pelo motor: temporada × 100 + semana. */
export const absWeek = (season: number, week: number): number => season * 100 + week;

export function negotiationInfo(w: World, pid: string): NegotiationInfo | null {
  const n = w.negotiations[pid];
  if (!n) return null;
  const cd = n.cooldownUntil ?? (n.patience <= 0 ? absWeek(n.season, n.week + WALKOUT_WEEKS) : 0);
  const blocked = cd > absWeek(w.season, w.week);
  return {
    patience: n.patience,
    lastFee: n.lastFee,
    week: n.week,
    season: n.season,
    cooldownUntil: blocked ? cd % 100 : null,
    cooldownSeason: blocked ? Math.floor(cd / 100) : null,
    agreed: n.agreed ?? null,
    contract: n.contract ?? null,
  };
}

export interface NegotiationRow extends NegotiationInfo {
  p: Player;
  club: Club | null;
}

export function negotiationRows(w: World): NegotiationRow[] {
  const rows: NegotiationRow[] = [];
  for (const pid of Object.keys(w.negotiations)) {
    const p = w.players[pid];
    const n = negotiationInfo(w, pid);
    if (!p || !n || p.clubId === w.userClub) continue;
    rows.push({ ...n, p, club: p.clubId ? (w.clubs[p.clubId] ?? null) : null });
  }
  return rows.sort((a, b) => b.season - a.season || b.week - a.week);
}

// ---------- Lista de observação ----------
export interface WatchRow {
  p: Player;
  club: Club | null;
  clause: number;
  affordable: boolean;
  range: PotRange;
  scoutLevel: number;
  /** Última novidade (mensagem ou transferência envolvendo o jogador). */
  last: { text: string; season: number; week: number } | null;
}

function lastChange(w: World, p: Player): WatchRow["last"] {
  let best: WatchRow["last"] = null;
  const later = (s: number, wk: number) => !best || s > best.season || (s === best.season && wk > best.week);
  for (const r of transferHistory(w)) {
    if (r.pid !== p.id || !later(r.season, r.week)) continue;
    const to = r.to ? (w.clubs[r.to]?.name ?? r.to) : "mercado livre";
    best = { text: `${KIND_LABEL[r.kind]} para ${to}${r.fee ? ` (${fmtShort(r.fee)})` : ""}`, season: r.season, week: r.week };
  }
  // A caixa de entrada vem da mais nova para a mais antiga.
  const m = w.inbox.find((x) => x.pid === p.id || x.title.includes(p.name));
  if (m && later(m.season, m.week)) best = { text: m.title, season: m.season, week: m.week };
  return best;
}

const fmtShort = (v: number) => `R$ ${(v / 1e6).toFixed(1).replace(".", ",")} mi`;

export function watchRows(w: World): WatchRow[] {
  const cash = user(w).money;
  const rows: WatchRow[] = [];
  for (const pid of w.watchlist) {
    const p = w.players[pid];
    if (!p) continue;
    const clause = p.releaseClause ?? 0;
    rows.push({
      p,
      club: p.clubId ? (w.clubs[p.clubId] ?? null) : null,
      clause,
      affordable: clause > 0 && clause <= cash,
      range: potentialRange(w, p),
      scoutLevel: w.scouting[pid]?.level ?? 0,
      last: lastChange(w, p),
    });
  }
  return rows;
}

// ---------- Empréstimos ----------
export interface LoanRow {
  p: Player;
  /** Clube onde o jogador está agora. */
  club: Club | null;
  /** Clube dono do jogador. */
  owner: Club | null;
  until: number;
  wageShare: number;
  buyOption: number | null;
  /** Salário semanal pago pelo usuário. */
  userPays: number;
}

function loanRow(w: World, p: Player): LoanRow | null {
  const l = p.loan;
  if (!l) return null;
  return {
    p,
    club: w.clubs[l.to] ?? null,
    owner: w.clubs[l.from] ?? null,
    until: l.until,
    wageShare: l.wageShare,
    buyOption: l.buyOption,
    userPays: userWage(w, p),
  };
}

export function loanRows(w: World): { out: LoanRow[]; in: LoanRow[] } {
  const f = (list: Player[]) => list.map((p) => loanRow(w, p)).filter((r): r is LoanRow => !!r);
  return { out: f(loanedOut(w)), in: f(loanedIn(w)) };
}

// ---------- Histórico ----------
export interface HistoryData {
  seasons: number[];
  rows: (TransferRec & { dir: "in" | "out" })[];
  net: number;
  spent: number;
  received: number;
}

export function historyData(w: World, season: number): HistoryData {
  const all = transferHistory(w, { clubId: w.userClub });
  const seasons = Array.from(new Set([w.season, ...all.map((r) => r.season)])).sort((a, b) => b - a);
  const rows = all
    .filter((r) => r.season === season)
    .map((r) => ({ ...r, dir: (r.to === w.userClub ? "in" : "out") as "in" | "out" }))
    .sort((a, b) => b.week - a.week);
  const spent = sum(
    rows.filter((r) => r.dir === "in"),
    (r) => r.fee,
  );
  const received = sum(
    rows.filter((r) => r.dir === "out"),
    (r) => r.fee,
  );
  return { seasons, rows, net: netSpend(w, w.userClub, season), spent, received };
}

// ---------- Notícias ----------
export function newsData(w: World): { feed: TransferRec[]; top: TransferRec[] } {
  return { feed: marketNews(w, 30), top: biggestDeals(w, w.season, 5) };
}

/** Nome do clube de um registro (null = mercado livre). */
export const clubName = (w: World, id: string | null): string => (id ? (w.clubs[id]?.name ?? id) : "Mercado livre");

/** Parcelas de uma transferência (como no motor): a 1ª é paga agora, as demais a cada INSTALLMENT_GAP semanas. */
export function installmentPlan(fee: number, n: Installments): { now: number; each: number; rest: number } {
  const now = Math.round(fee / n);
  return { now, each: n > 1 ? Math.round((fee - now) / (n - 1)) : 0, rest: n - 1 };
}

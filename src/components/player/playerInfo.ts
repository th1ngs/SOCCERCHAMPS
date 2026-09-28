// Helpers puros de exibição de jogadores (sem React, sem mutar o mundo).
import { WINDOWS, clamp, nextWindow } from "@/game";
import type { Player, World } from "@/game/types";

/** Potencial em estrelas (0,5–5). Exato para jogadores do clube; arredondado a meia estrela para os outros. */
export function potentialStars(p: Pick<Player, "pot">, exact: boolean): number {
  const v = clamp((p.pot - 45) / 10, 0.5, 5);
  return exact ? v : Math.round(v * 2) / 2;
}

export const yearsText = (n: number): string => `${n} ${n === 1 ? "ano" : "anos"}`;

export const contractText = (n: number): string => (n > 0 ? yearsText(n) : "—");

export const gamesText = (n: number): string => `${n} ${n === 1 ? "jogo" : "jogos"}`;

/** Nota média na temporada ("6,85") ou "—". */
export const avgRating = (p: Pick<Player, "s">): string => (p.s.apps ? (p.s.rsum / p.s.apps).toFixed(2).replace(".", ",") : "—");

/** Último nome, para camisas e listas compactas. */
export const surname = (name: string): string => name.split(" ").slice(-1)[0];

/** Semana em que a janela atual fecha, ou null se está fechada. */
export function windowEnd(w: World): number | null {
  const win = WINDOWS.find(([a, b]) => w.week >= a && w.week <= b);
  return win ? win[1] : null;
}

/** Motivo curto para ações de mercado indisponíveis com a janela fechada. */
export function windowClosedReason(w: World): string {
  const n = nextWindow(w);
  return n !== null ? `Janela fechada — abre na semana ${n}` : "Janela fechada — reabre na pré-temporada";
}

/** Converte o valor digitado em R$ milhões para reais, em passos de R$ 10 mil. */
export function feeFromMillions(input: string): number {
  const n = Number(input.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round((n * 1e6) / 10000) * 10000);
}

export const toMillions = (v: number): string => (v / 1e6).toFixed(2);

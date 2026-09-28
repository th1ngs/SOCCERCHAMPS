// Funções puras compartilhadas pelas telas de partida (pré-jogo, ao vivo, botão e resumo).
import { CUP_ROUNDS, applyResult, currentWeek, simulateWeek } from "@/game";
import type { Club, Match, MatchResult, MatchStats, World } from "@/game/types";

/** O que fica em `scratch[resultKey(id)]` até o resumo ser fechado. */
export interface StoredResult {
  result: MatchResult;
  stats: MatchStats | null;
}

export const resultKey = (matchId: string): string => `result:${matchId}`;

/** Jogo da semana atual pelo id (fallback: procura em todas as semanas). */
export function findMatch(w: World, id: string): Match | null {
  const wk = currentWeek(w);
  const m = wk?.matches.find((x) => x.id === id);
  if (m) return m;
  for (const week of w.weeks) {
    const found = week?.matches.find((x) => x.id === id);
    if (found) return found;
  }
  return null;
}

/** "Série A • Rodada 12" ou "Copa • Quartas de final". */
export function compName(w: World, m: Match): string {
  const wk = w.weeks.find((x) => x?.matches.some((y) => y.id === m.id)) ?? currentWeek(w);
  const round = wk?.round ?? 0;
  return m.comp === "CUP" ? `Copa • ${CUP_ROUNDS[round] ?? ""}` : `Série ${m.comp} • Rodada ${round}`;
}

export function venueName(w: World, m: Match): string {
  if (m.neutral) return "Campo neutro";
  const h = w.clubs[m.h];
  return h.stadium || `Estádio do ${h.name}`;
}

/** Aplica o resultado, simula o resto da rodada e guarda o resultado para o resumo. */
export function settleMatch(w: World, m: Match, res: MatchResult, scratch: Record<string, unknown>): void {
  if (!m.played) applyResult(w, m, res);
  simulateWeek(w);
  const stored: StoredResult = { result: res, stats: res.stats };
  scratch[resultKey(m.id)] = stored;
}

// ---------- Uniformes ----------
export interface Kit {
  fill: string;
  line: string;
}

const hex = (c: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
const dist = (x: string, y: string): number => {
  const p = hex(x), q = hex(y);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

/** Cores de uniforme distintas para os dois times (o visitante troca se parecer demais). */
export function kits(h: Pick<Club, "colors">, a: Pick<Club, "colors">): [Kit, Kit] {
  const hk = { fill: h.colors[0], line: h.colors[1] };
  let ak = { fill: a.colors[0], line: a.colors[1] };
  if (dist(hk.fill, ak.fill) < 120) ak = { fill: a.colors[1], line: a.colors[0] };
  if (dist(hk.fill, ak.fill) < 120) ak = { fill: "#f5f5f5", line: "#222222" };
  return [hk, ak];
}

/** Cor de texto legível sobre `bg`. */
export function contrast(bg: string): string {
  const n = parseInt(bg.slice(1), 16);
  const l = ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114;
  return l > 150 ? "#111" : "#fff";
}

export const pct = (a: number, b: number): [number, number] => {
  const tot = a + b || 1;
  const p = Math.round((a / tot) * 100);
  return [p, 100 - p];
};

/** Linhas de estatística (rótulo, mandante, visitante). */
export function statRows(s: MatchStats, full = true): [string, string, string][] {
  const [p0, p1] = pct(s.poss[0], s.poss[1]);
  const rows: [string, string, string][] = [
    ["Posse de bola", `${p0}%`, `${p1}%`],
    ["Finalizações", String(s.shots[0]), String(s.shots[1])],
    ["No alvo", String(s.onT[0]), String(s.onT[1])],
    ["Gols esperados (xG)", s.xg[0].toFixed(2), s.xg[1].toFixed(2)],
    ["Escanteios", String(s.corners[0]), String(s.corners[1])],
    ["Faltas", String(s.fouls[0]), String(s.fouls[1])],
    ["Amarelos", String(s.yellow[0]), String(s.yellow[1])],
    ["Vermelhos", String(s.red[0]), String(s.red[1])],
  ];
  return full ? rows : rows.slice(0, 4);
}

export function clearStored(scratch: Record<string, unknown>, matchId: string): void {
  delete scratch[resultKey(matchId)];
}

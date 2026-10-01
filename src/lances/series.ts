// Partida em lances: os ataques do usuário são jogados em 3D; os gols do adversário vêm da simulação
// (Manager) ou de chances sorteadas pela força dos times (arcade). Empate em mata-mata vai para o
// "lance decisivo": um ataque de cada lado até alguém fazer e o outro não.
import type { BotParams, Difficulty } from "./difficulty";
import type { ChanceSetup, LanceResult, ScenarioKind } from "./engine";
import { randomKind } from "./scenario";

export interface SeriesTeam {
  name: string;
  short: string;
  colors: [string, string];
  pattern: string;
}

export interface SeriesPlan {
  /** Competição e fase (rótulo do placar). */
  label: string;
  home: SeriesTeam;
  away: SeriesTeam;
  /** Lado do usuário (0 = mandante). */
  userSide: 0 | 1;
  chances: { min: number; kind: ScenarioKind }[];
  /** Gols do adversário (minuto e autor). */
  oppGoals: { min: number; who: string }[];
  difficulty: Difficulty;
  setup: (kind: ScenarioKind, params: BotParams, index: number) => ChanceSetup;
  /** Mata-mata: chance de gol do adversário em cada lance decisivo; null = empate vale. */
  tiebreak: { oppProb: number } | null;
}

export interface SeriesOutcome {
  /** Resultado de cada lance jogado (ou simulado, se o usuário pulou). */
  results: { min: number; result: LanceResult; simulated: boolean }[];
  userGoals: number;
  oppGoals: number;
  /** Lances decisivos: [usuário, adversário]. */
  tiebreak: [number, number] | null;
}

/** Minutos distintos e ordenados para n lances: um em cada trecho do jogo (3' a 88'). */
export function chanceMinutes(n: number, rng: () => number = Math.random): number[] {
  const out: number[] = [];
  const span = 86 / Math.max(1, n);
  for (let i = 0; i < n; i++) {
    const m = 3 + Math.floor(i * span + rng() * span);
    out.push(i && m <= out[i - 1] ? out[i - 1] + 1 : m);
  }
  return out;
}

export const planChances = (n: number, rng: () => number = Math.random) => chanceMinutes(n, rng).map((min) => ({ min, kind: randomKind(rng) }));

/** Probabilidade de gol num lance pulado (simulado) para o nível do bot. */
export const userGoalProb = (level: number): number => [0.62, 0.46, 0.33, 0.22][Math.max(0, Math.min(3, Math.round(level)))];

/** Chance de gol do adversário por lance no arcade: sobe com a dificuldade e com a força relativa dele. */
export function oppGoalProb(level: number, ratingDiff: number): number {
  return Math.max(0.08, Math.min(0.6, 0.18 + level * 0.06 + ratingDiff * 0.012));
}


// Classificação dos clubes na escolha de carreira (por divisão, pela reputação).
import { DIVISIONS, LEAGUES } from "@/game";
import type { ClubStatic, DivisionId, LeagueId } from "@/game/types";
import type { BadgeTone } from "@/components/ui/primitives";

export interface Tier {
  label: string;
  tone: BadgeTone;
}

/** Rótulo pela posição do clube no ranking de reputação da sua divisão (0 = mais forte). */
export function tierOf(div: DivisionId, rank: number, size: number): Tier {
  const info = DIVISIONS[div];
  if (!info.up) {
    if (rank < 3) return { label: "Favorito ao título", tone: "gold" };
    if (rank < 7) return { label: "Vaga continental", tone: "blue" };
    if (rank < size - 4) return { label: "Meio de tabela", tone: "neutral" };
    return { label: "Luta contra a queda", tone: "red" };
  }
  if (rank < 5) return { label: "Briga pelo acesso", tone: "green" };
  if (rank < size - 5) return { label: "Meio de tabela", tone: "neutral" };
  return info.down ? { label: "Luta contra a queda", tone: "red" } : { label: "Desafio difícil", tone: "orange" };
}

/** Dica de cada divisão para quem vai escolher o clube. */
export function divisionHint(div: DivisionId): string {
  const info = DIVISIONS[div];
  if (!info.up) return "Grandes cobram títulos: os 3 primeiros vão à Copa dos Campeões e os 3 últimos caem.";
  if (info.down) return "Briga pelo acesso: os 3 primeiros sobem e os 3 últimos caem.";
  return "Pouco dinheiro, metas modestas e o sonho do acesso: 3 sobem e ninguém cai.";
}

/** Prestígio absoluto em estrelas (1 a 5, meia estrela) a partir da reputação 0-100. */
export function prestigeStars(rep: number): number {
  const v = (rep - 40) / 10;
  return Math.max(1, Math.min(5, Math.round(v * 2) / 2));
}

/** Prestígio relativo à divisão: o mais forte tem 5 estrelas, o mais fraco 1. */
export function relativeStars(rep: number, min: number, max: number): number {
  if (max <= min) return 3;
  const v = 1 + (4 * (rep - min)) / (max - min);
  return Math.max(1, Math.min(5, Math.round(v * 2) / 2));
}

/** Poder financeiro da liga em 1-5 barras e um rótulo. */
export function wealthLevel(league: LeagueId): { bars: number; label: string } {
  const wealth = LEAGUES[league].wealth;
  const bars = Math.max(1, Math.min(5, Math.round((wealth - 0.6) / 0.2)));
  const label = bars >= 5 ? "Muito rica" : bars >= 3 ? "Rica" : bars >= 2 ? "Média" : "Modesta";
  return { bars, label };
}

export interface RankedClub {
  club: ClubStatic;
  rank: number;
  stars: number;
  tier: Tier;
}

/** Clubes de uma divisão, do mais forte ao mais fraco, com estrelas relativas e rótulo. */
export function rankDivision(clubs: ClubStatic[], div: DivisionId): RankedClub[] {
  const list = clubs.filter((c) => c.div === div).sort((a, b) => b.rep - a.rep);
  const reps = list.map((c) => c.rep);
  const min = Math.min(...reps), max = Math.max(...reps);
  return list.map((club, rank) => ({ club, rank, stars: relativeStars(club.rep, min, max), tier: tierOf(div, rank, list.length) }));
}

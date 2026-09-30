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

/** Escala global: reputação 30 ≈ 0,5 estrela; 95 = 5 estrelas. */
export function prestigeStars(rep: number): number {
  const v = 0.5 + ((rep - 30) * 4.5) / 65;
  return Math.max(0.5, Math.min(5, Math.round(v * 2) / 2));
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

/** Clubes de uma divisão, do mais forte ao mais fraco, com prestígio global e rótulo local. */
export function rankDivision(clubs: ClubStatic[], div: DivisionId): RankedClub[] {
  const list = clubs.filter((c) => c.div === div).sort((a, b) => b.rep - a.rep);
  return list.map((club, rank) => ({ club, rank, stars: prestigeStars(club.rep), tier: tierOf(div, rank, list.length) }));
}

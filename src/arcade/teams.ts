// Times do modo arcade: os clubes do Manager, com bandeiras dos discos geradas pelo padrão da camisa.
import { CLUBS } from "@/game/clubs";
import type { ClubStatic, KitPattern } from "@/game/types";
import type { Flag, Team } from "./game";

/** Bandeira do disco a partir das cores e do padrão do uniforme (legado: bridge.js flagOf). */
export function flagOf(c: { colors: readonly string[]; pattern: KitPattern | string }): Flag {
  const [p, s] = c.colors;
  if (c.pattern === "v") return { type: "v", colors: [p, s, p, s, p] };
  if (c.pattern === "h") return { type: "h", colors: [p, s, p, s, p] };
  if (c.pattern === "half") return { type: "v", colors: [p, s] };
  if (c.pattern === "sash") return { type: "cross", bg: p, fg: s };
  return { type: "circle", bg: p, fg: s };
}

export interface ArcadeTeam extends Team {
  club: ClubStatic;
  /** Força para os resultados simulados da Copa (escala 70-92 do legado). */
  rating: number;
}

const REP_MIN = Math.min(...CLUBS.map((c) => c.rep));
const REP_MAX = Math.max(...CLUBS.map((c) => c.rep));

export const ARCADE_TEAMS: ArcadeTeam[] = CLUBS.map((club) => ({
  id: club.id,
  name: club.name,
  flag: flagOf(club),
  club,
  rating: Math.round(70 + ((club.rep - REP_MIN) / Math.max(1, REP_MAX - REP_MIN)) * 22),
}));

export const teamById = (id: string | null | undefined): ArcadeTeam | undefined => (id ? ARCADE_TEAMS.find((t) => t.id === id) : undefined);

/** Estrelas de 1 a 4 (legado: round((rating - 70) / 5)). */
export const teamStars = (t: ArcadeTeam): number => Math.max(1, Math.round((t.rating - 70) / 5));

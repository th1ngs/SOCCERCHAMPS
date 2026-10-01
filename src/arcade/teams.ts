// Times do modo arcade e do online: os clubes do Manager, com a força para resultados simulados.
import { CLUBS } from "@/game/clubs";
import { LEAGUE_IDS, divisionLevel } from "@/game/leagues";
import type { ClubStatic, LeagueId } from "@/game/types";

export interface ArcadeTeam {
  id: string;
  name: string;
  club: ClubStatic;
  /** Força para os resultados simulados da Copa (escala 70-92 do legado). */
  rating: number;
}

const REP_MIN = Math.min(...CLUBS.map((c) => c.rep));
const REP_MAX = Math.max(...CLUBS.map((c) => c.rep));

export const ARCADE_TEAMS: ArcadeTeam[] = CLUBS.map((club) => ({
  id: club.id,
  name: club.name,
  club,
  rating: Math.round(70 + ((club.rep - REP_MIN) / Math.max(1, REP_MAX - REP_MIN)) * 22),
}));

/** Times de uma liga, da primeira divisão para baixo e por prestígio (ordem de CLUBS). */
export const teamsOfLeague = (league: LeagueId): ArcadeTeam[] => ARCADE_TEAMS.filter((t) => t.club.league === league);

/** Times das primeiras divisões de todas as ligas. */
export const firstDivisionTeams = (): ArcadeTeam[] => ARCADE_TEAMS.filter((t) => divisionLevel(t.club.div) === 1);

/** Ligas na ordem de exibição. */
export const ARCADE_LEAGUES: LeagueId[] = LEAGUE_IDS;

/** Sigla curta do país (rótulos compactos no celular). */
export const LEAGUE_CODE: Record<LeagueId, string> = { bra: "BRA", arg: "ARG", por: "POR", esp: "ESP", eng: "ING", ita: "ITA", ger: "ALE", fra: "FRA", ned: "HOL", bel: "BEL", tur: "TUR", sco: "ESC", gre: "GRE" };

export const teamById = (id: string | null | undefined): ArcadeTeam | undefined => (id ? ARCADE_TEAMS.find((t) => t.id === id) : undefined);

/** Estrelas de 1 a 4 (legado: round((rating - 70) / 5)). */
export const teamStars = (t: ArcadeTeam): number => Math.max(1, Math.round((t.rating - 70) / 5));

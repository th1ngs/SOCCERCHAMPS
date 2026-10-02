// Times do modo arcade e do online: os clubes do Manager, com a força para resultados simulados.
import { CLUBS } from "@/game/clubs";
import { LEAGUE_IDS, divisionLevel } from "@/game/leagues";
import { expectedXi, strengthStars } from "@/game/squad";
import type { ClubStatic, LeagueId } from "@/game/types";

export interface ArcadeTeam {
  id: string;
  name: string;
  club: ClubStatic;
  /** Força esperada do time titular (reputação + qualidade da liga/divisão): ~58 a ~86. */
  rating: number;
}

export const ARCADE_TEAMS: ArcadeTeam[] = CLUBS.map((club) => ({
  id: club.id,
  name: club.name,
  club,
  rating: Math.round(expectedXi(club)),
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

/** Estrelas de 0,5 a 5 (mesma escala global do Manager: força do time titular). */
export const teamStars = (t: ArcadeTeam): number => strengthStars(t.rating);

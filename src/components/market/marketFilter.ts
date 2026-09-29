// Filtros do mercado de transferências (puros).
import { marketPlayers, valueOf } from "@/game";
import type { Club, LeagueId, Player, Position, World } from "@/game/types";

/** Liga do clube do jogador: "" = todas, "free" = só agentes livres. */
export type LeagueFilter = "" | LeagueId | "free";

export interface MarketFilter {
  pos: "" | Position;
  /** Idade máxima (40 = qualquer). */
  age: number;
  /** Overall mínimo (0 = qualquer). */
  ovr: number;
  /** Valor máximo em R$ milhões (0 = qualquer). */
  max: number;
  league: LeagueFilter;
  /** Nacionalidade ("" = qualquer). */
  nat: "" | LeagueId;
  q: string;
}

export const DEFAULT_FILTER: MarketFilter = { pos: "", age: 40, ovr: 0, max: 0, league: "", nat: "", q: "" };
export const AGE_OPTIONS = [40, 21, 23, 25, 28, 31];
export const OVR_OPTIONS = [0, 60, 65, 70, 75, 80];
export const MAX_OPTIONS = [0, 1, 3, 5, 10, 20];
export const MARKET_LIMIT = 60;

export interface MarketRow {
  p: Player;
  club: Club | null;
  value: number;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Jogadores de outros clubes (todas as ligas) e livres, sem base, filtrados e ordenados por overall; devolve os 60 melhores. */
export function searchMarket(w: World, f: MarketFilter): { total: number; rows: MarketRow[] } {
  const q = norm(f.q.trim());
  const maxValue = f.max * 1e6;
  const base = marketPlayers(w, {
    league: f.league || undefined,
    nat: f.nat || undefined,
    pos: f.pos || undefined,
    minOvr: f.ovr || undefined,
    maxAge: f.age < 40 ? f.age : undefined,
    limit: Infinity,
  });
  const rows: MarketRow[] = [];
  for (const p of base) {
    const value = valueOf(p);
    if (f.max && value > maxValue) continue;
    const club = p.clubId ? w.clubs[p.clubId] ?? null : null;
    if (q && !norm(p.name).includes(q) && !(club && norm(club.name).includes(q))) continue;
    rows.push({ p, club, value });
  }
  // marketPlayers já devolve por overall (desc).
  return { total: rows.length, rows: rows.slice(0, MARKET_LIMIT) };
}

export const isDefaultFilter = (f: MarketFilter): boolean =>
  f.pos === DEFAULT_FILTER.pos &&
  f.age === DEFAULT_FILTER.age &&
  f.ovr === DEFAULT_FILTER.ovr &&
  f.max === DEFAULT_FILTER.max &&
  f.league === DEFAULT_FILTER.league &&
  f.nat === DEFAULT_FILTER.nat &&
  !f.q.trim();

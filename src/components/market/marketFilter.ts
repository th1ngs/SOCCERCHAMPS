// Filtros do mercado de transferências (puros).
import { valueOf } from "@/game";
import type { Club, Player, Position, World } from "@/game/types";

export interface MarketFilter {
  pos: "" | Position;
  /** Idade máxima (40 = qualquer). */
  age: number;
  /** Overall mínimo (0 = qualquer). */
  ovr: number;
  /** Valor máximo em R$ milhões (0 = qualquer). */
  max: number;
  free: boolean;
  q: string;
}

export const DEFAULT_FILTER: MarketFilter = { pos: "", age: 40, ovr: 0, max: 0, free: false, q: "" };
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

/** Jogadores de outros clubes e livres (sem base), filtrados e ordenados por overall; devolve os 60 melhores. */
export function searchMarket(w: World, userClub: string, f: MarketFilter): { total: number; rows: MarketRow[] } {
  const q = norm(f.q.trim());
  const maxValue = f.max * 1e6;
  const rows: MarketRow[] = [];
  for (const p of Object.values(w.players)) {
    if (p.clubId === userClub || p.youth) continue;
    if (f.pos && p.pos !== f.pos) continue;
    if (f.free && p.clubId) continue;
    if (f.age < 40 && p.age > f.age) continue;
    if (f.ovr && p.ovr < f.ovr) continue;
    const value = valueOf(p);
    if (f.max && value > maxValue) continue;
    const club = p.clubId ? w.clubs[p.clubId] ?? null : null;
    if (q && !norm(p.name).includes(q) && !(club && norm(club.name).includes(q))) continue;
    rows.push({ p, club, value });
  }
  rows.sort((a, b) => b.p.ovr - a.p.ovr);
  return { total: rows.length, rows: rows.slice(0, MARKET_LIMIT) };
}

export const isDefaultFilter = (f: MarketFilter): boolean =>
  f.pos === DEFAULT_FILTER.pos && f.age === DEFAULT_FILTER.age && f.ovr === DEFAULT_FILTER.ovr && f.max === DEFAULT_FILTER.max && f.free === DEFAULT_FILTER.free && !f.q.trim();

// Nível das ligas: estrelas e rótulos (estáticos, pela qualidade) e o ranking vivo (pelos elencos atuais).
import { LEAGUES, LEAGUE_IDS } from './leagues';
import { teamRating } from './squad';
import type { Club, LeagueId, World } from './types';

const QUALITIES = LEAGUE_IDS.map((l) => LEAGUES[l].quality);
const Q_MIN = Math.min(...QUALITIES);
const Q_MAX = Math.max(...QUALITIES);

/** Nível da liga em estrelas (1–5, de meia em meia), pela qualidade do futebol. */
export function leagueStars(league: LeagueId): number {
  const v = 1 + (4 * (LEAGUES[league].quality - Q_MIN)) / (Q_MAX - Q_MIN || 1);
  return Math.round(v * 2) / 2;
}

/** Rótulo do nível da liga. */
export function leagueTier(league: LeagueId): string {
  const s = leagueStars(league);
  if (s >= 4.5) return 'Elite mundial';
  if (s >= 3.5) return 'Muito forte';
  if (s >= 2.5) return 'Forte';
  if (s >= 1.5) return 'Intermediária';
  return 'Emergente';
}

export interface LeagueRankRow {
  id: LeagueId;
  rank: number;
  /** Força média dos times titulares (escalação) dos clubes da primeira divisão. */
  strength: number;
  stars: number;
  tier: string;
  /** Melhor clube da primeira divisão (pelo time titular). */
  top: Club | null;
  /** Fração de estrangeiros nos elencos da primeira divisão. */
  foreign: number;
  /** Vagas na Copa dos Campeões desta temporada. */
  contClubs: number;
  /** Copas dos Campeões ganhas por clubes da liga. */
  contTitles: number;
}

const avg = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/** Ranking das ligas pela força atual dos elencos das primeiras divisões (muda com as transferências). */
export function leagueRanking(w: World): LeagueRankRow[] {
  const cont = new Set(w.cups.cont?.entrants ?? []);
  const titles: Partial<Record<LeagueId, number>> = {};
  for (const h of w.history) {
    const champ = h.cups.cont ? w.clubs[h.cups.cont] : null;
    if (champ) titles[champ.league] = (titles[champ.league] ?? 0) + 1;
  }
  const rows = LEAGUE_IDS.filter((id) => Object.values(w.clubs).some((c) => c.league === id)).map((id) => {
    const div = LEAGUES[id].divisions[0];
    const clubs = Object.values(w.clubs).filter((c) => c.div === div);
    const rated = clubs.map((c) => ({ c, ovr: teamRating(w, c) }));
    rated.sort((a, b) => b.ovr - a.ovr);
    let players = 0, abroad = 0;
    for (const c of clubs) for (const pid of c.squad) { const p = w.players[pid]; if (p) { players++; if (p.nat !== id) abroad++; } }
    return {
      id,
      rank: 0,
      strength: avg(rated.map((r) => r.ovr)),
      stars: leagueStars(id),
      tier: leagueTier(id),
      top: rated[0]?.c ?? null,
      foreign: players ? abroad / players : 0,
      contClubs: clubs.filter((c) => cont.has(c.id)).length,
      contTitles: titles[id] ?? 0,
    } satisfies LeagueRankRow;
  });
  rows.sort((a, b) => b.strength - a.strength);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

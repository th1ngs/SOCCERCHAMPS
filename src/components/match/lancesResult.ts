// Partida do Manager decidida nos lances: os gols do adversário vêm da simulação da partida; os do
// usuário, dos lances jogados em 3D. Empate em mata-mata vai para os lances decisivos (viram os pênaltis da súmula).
import { FORMATIONS, Sim, autoLineup, clamp, ensureLineup, isKnockout, teamRating, weighted } from "@/game";
import type { Club, Match, MatchResult, Position, SimGoal, World } from "@/game/types";
import { Difficulty, loadBotSetting } from "@/lances/difficulty";
import { clubChance, kitOf } from "@/lances/scenario";
import { planChances, type SeriesOutcome, type SeriesPlan } from "@/lances/series";
import { compName, simOptions } from "./matchUtils";

const SCORER_W: Partial<Record<Position, number>> = { ATA: 5, MEI: 3, VOL: 1.2, LAT: 1, ZAG: 0.7 };

export interface LancesPrep {
  plan: SeriesPlan;
  base: MatchResult;
  userSide: 0 | 1;
}

const teamOf = (c: Club) => ({ ...kitOf(c), colors: [c.colors[0], c.colors[1]] as [string, string] });

/** Simula a partida (para os gols do adversário, cartões e notas) e monta os lances do usuário. */
export function prepareLances(w: World, m: Match): LancesPrep {
  const u = w.clubs[w.userClub];
  const userSide: 0 | 1 = m.h === u.id ? 0 : 1;
  const opp = w.clubs[userSide === 0 ? m.a : m.h];
  ensureLineup(w, u);
  autoLineup(w, opp);
  const base = new Sim(w, m.h, m.a, simOptions(m)).runToEnd().result();
  const oppGoals = base.goals.filter((g) => g.side !== userSide).map((g) => ({ min: g.min, who: w.players[g.pid]?.name ?? "?" }));
  const xg = base.stats?.xg?.[userSide] ?? 1.2;
  const n = clamp(Math.round(xg * 2 + 2), 3, 7);
  const ratingDiff = teamRating(w, opp) - teamRating(w, u);
  const difficulty = new Difficulty(loadBotSetting(), 1 + clamp(ratingDiff / 6, -1, 1.5));
  const plan: SeriesPlan = {
    label: compName(w, m),
    home: teamOf(w.clubs[m.h]),
    away: teamOf(w.clubs[m.a]),
    userSide,
    chances: planChances(n),
    oppGoals,
    difficulty,
    setup: (kind, params) => clubChance(w, u, opp, params, Math.random, kind),
    tiebreak: isKnockout(m.comp) ? { oppProb: clamp(0.38 + ratingDiff * 0.015, 0.2, 0.6) } : null,
  };
  return { plan, base, userSide };
}

/** Autor sorteado (lances simulados) entre os titulares de linha, com peso por posição. */
function fallbackScorer(w: World, club: Club): string {
  const slots = FORMATIONS[club.formation];
  const pool = club.lineup.map((id, i) => ({ id, pos: slots[i].pos })).filter((x): x is { id: string; pos: Position } => !!x.id && x.pos !== "GOL");
  return weighted(pool, (x) => SCORER_W[x.pos] ?? 1)?.id ?? club.squad[0];
}

/** Súmula final: gols do adversário da simulação + gols dos lances do usuário. */
export function lancesMatchResult(w: World, m: Match, prep: LancesPrep, o: SeriesOutcome): MatchResult {
  const { base, userSide } = prep;
  const u = w.clubs[w.userClub];
  const ratings = { ...base.ratings };
  // Tira o crédito dos gols do usuário que a simulação tinha marcado.
  for (const g of base.goals) {
    if (g.side !== userSide) continue;
    if (g.pid in ratings) ratings[g.pid] = clamp(ratings[g.pid] - 1.1, 3, 10);
    if (g.assist && g.assist in ratings) ratings[g.assist] = clamp(ratings[g.assist] - 0.6, 3, 10);
  }
  const mine: SimGoal[] = o.results.filter((r) => r.result.goal).map((r) => ({
    side: userSide, pid: r.result.scorer ?? fallbackScorer(w, u), min: r.min, assist: r.result.assist, pen: false,
  }));
  for (const g of mine) {
    ratings[g.pid] = clamp((ratings[g.pid] ?? 6.4) + 1.1, 3, 10);
    if (g.assist) ratings[g.assist] = clamp((ratings[g.assist] ?? 6.4) + 0.6, 3, 10);
  }
  // Quem marcou no lance precisa constar como em campo.
  const played: [string[], string[]] = [base.played[0].slice(), base.played[1].slice()];
  for (const g of mine) {
    if (!played[userSide].includes(g.pid)) played[userSide].push(g.pid);
    if (g.assist && !played[userSide].includes(g.assist)) played[userSide].push(g.assist);
  }
  const goals = [...base.goals.filter((g) => g.side !== userSide), ...mine].sort((a, b) => a.min - b.min);
  const hs = goals.filter((g) => g.side === 0).length, as = goals.length - hs;
  const pens: [number, number] | null = o.tiebreak && hs === as ? (userSide === 0 ? [o.tiebreak[0], o.tiebreak[1]] : [o.tiebreak[1], o.tiebreak[0]]) : null;
  const winner = hs > as ? 0 : hs < as ? 1 : pens ? (pens[0] > pens[1] ? 0 : 1) : -1;
  const stats = base.stats ? { ...base.stats, shots: [...base.stats.shots] as [number, number], onT: [...base.stats.onT] as [number, number] } : null;
  if (stats) {
    stats.shots[userSide] = Math.max(stats.shots[userSide], o.results.length);
    stats.onT[userSide] = o.results.filter((r) => ["goal", "save", "post"].includes(r.result.outcome)).length;
  }
  return { ...base, goals, hs, as, pens, winner, ratings, played, stats };
}

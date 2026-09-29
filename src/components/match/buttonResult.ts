// Partida do Manager decidida no futebol de botão (porta do antigo js/manager/bridge.js).
import { FORMATIONS, autoLineup, clamp, ensureLineup, gauss, isKnockout, randi, shuffle, teamRating, weighted } from "@/game";
import type { Club, Match as MgrMatch, MatchResult, Position, SimGoal, World } from "@/game/types";
import { Audio } from "@/arcade/audio";
import { Match, type MatchEnd } from "@/arcade/game";
import type { Level } from "@/arcade/ai";
import { ArcadeRunner } from "@/arcade/runner";
import { flagOf } from "@/arcade/teams";

const SCORER_W: Partial<Record<Position, number>> = { ATA: 5, MEI: 3, VOL: 1.2, LAT: 1, ZAG: 0.7 };

/** Autor do gol sorteado entre os titulares de linha, com peso por posição. */
function scorerFor(w: World, club: Club): string {
  const slots = FORMATIONS[club.formation];
  const pool = club.lineup
    .map((id, i) => ({ id, pos: slots[i].pos }))
    .filter((x): x is { id: string; pos: Position } => !!x.id && x.pos !== "GOL");
  const pick = weighted(pool, (x) => SCORER_W[x.pos] ?? 1);
  return pick ? pick.id : (club.lineup.find((x): x is string => !!x) ?? club.squad[0]);
}

/** Monta o MatchResult a partir do placar do botão (score = [usuário, adversário]). */
export function buttonMatchResult(w: World, m: MgrMatch, score: [number, number]): MatchResult {
  const userHome = m.h === w.userClub;
  const [su, so] = score;
  const hs = userHome ? su : so, as = userHome ? so : su;
  const home = w.clubs[m.h], away = w.clubs[m.a];
  const mins: number[] = [];
  for (let i = 0; i < hs + as; i++) mins.push(randi(2, 90));
  mins.sort((a, b) => a - b);
  const order = shuffle([...Array<number>(hs).fill(0), ...Array<number>(as).fill(1)]);
  const goals: SimGoal[] = order.map((side, i) => ({ side, pid: scorerFor(w, side === 0 ? home : away), min: mins[i], assist: null, pen: false }));
  const winner = hs > as ? 0 : hs < as ? 1 : -1;
  const played: [string[], string[]] = [
    home.lineup.filter((x): x is string => !!x),
    away.lineup.filter((x): x is string => !!x),
  ];
  const ratings: Record<string, number> = {}, fat: Record<string, number> = {};
  played.forEach((list, s) =>
    list.forEach((pid) => {
      ratings[pid] = clamp(6.3 + gauss() * 0.4 + (winner === s ? 0.4 : winner === 1 - s ? -0.3 : 0), 3, 10);
      fat[pid] = Math.max(20, w.players[pid].fitness - 22);
    }),
  );
  for (const g of goals) ratings[g.pid] = clamp(ratings[g.pid] + 1, 3, 10);
  return { hs, as, pens: null, goals, cards: [], injuries: [], played, ratings, fat, stats: null, winner };
}

export const LEVEL_LABEL: Record<Level, string> = { easy: "fácil", medium: "médio", hard: "difícil" };

/** Sessão de botão: prepara escalações, cria a partida arcade e avisa quando termina. */
export class ButtonSession {
  readonly runner: ArcadeRunner;
  readonly match: Match;
  readonly user: Club;
  readonly opp: Club;
  readonly level: Level;
  private ended: MatchEnd | null = null;
  private endFn: ((r: MatchEnd) => void) | null = null;

  constructor(w: World, m: MgrMatch) {
    const u = w.clubs[w.userClub];
    const opp = w.clubs[m.h === u.id ? m.a : m.h];
    ensureLineup(w, u);
    autoLineup(w, opp);
    const diffR = teamRating(w, opp) - teamRating(w, u);
    this.level = diffR > 3 ? "hard" : diffR < -3 ? "easy" : "medium";
    this.user = u;
    this.opp = opp;
    Audio.init();
    this.match = new Match({
      teams: [
        { id: "mgr_" + u.id, name: u.name, flag: flagOf(u) },
        { id: "mgr_" + opp.id, name: opp.name, flag: flagOf(opp) },
      ],
      controllers: ["human", "cpu"],
      difficulty: [this.level, this.level],
      duration: 180,
      goldenGoal: isKnockout(m.comp),
      onEnd: (r) => {
        this.ended = r;
        this.endFn?.(r);
      },
    });
    this.runner = new ArcadeRunner({ pauseOnHide: true });
    this.runner.setMatch(this.match, true);
  }

  /** Registra o callback de fim de jogo (chamado já se a partida terminou). */
  onEnd(fn: (r: MatchEnd) => void): () => void {
    this.endFn = fn;
    if (this.ended) fn(this.ended);
    return () => {
      if (this.endFn === fn) this.endFn = null;
    };
  }
}

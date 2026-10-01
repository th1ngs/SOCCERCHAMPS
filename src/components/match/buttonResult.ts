// Partida do Manager decidida no futebol de botão (porta do antigo js/manager/bridge.js).
import { FORMATIONS, autoLineup, clamp, ensureLineup, gauss, isKnockout, randi, shuffle, teamRating, weighted } from "@/game";
import type { Club, Match as MgrMatch, MatchResult, Position, SimGoal, World } from "@/game/types";
import { Audio } from "@/arcade/audio";
import { Match, type DiscPlayer, type GoalLog, type MatchEnd } from "@/arcade/game";
import { formationLayout } from "@/arcade/physics";
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

/**
 * Monta o MatchResult a partir do placar do botão (score = [usuário, adversário]).
 * Com o registro dos gols, autor, garçom e minuto saem do próprio jogo; sem ele, são sorteados.
 */
export function buttonMatchResult(w: World, m: MgrMatch, score: [number, number], log: GoalLog[] = []): MatchResult {
  const userHome = m.h === w.userClub;
  const [su, so] = score;
  const hs = userHome ? su : so, as = userHome ? so : su;
  const home = w.clubs[m.h], away = w.clubs[m.a];
  // Time 0 do botão é sempre o usuário.
  const sideOf = (team: number) => (team === 0) === userHome ? 0 : 1;
  const clubOf = (side: number) => (side === 0 ? home : away);
  let goals: SimGoal[];
  if (log.length === hs + as) {
    goals = log.map((g) => {
      const side = sideOf(g.team), club = clubOf(side);
      const pid = (g.slot !== null && club.lineup[g.slot]) || scorerFor(w, club);
      const assist = g.assist !== null ? club.lineup[g.assist] ?? null : null;
      return { side, pid, min: clamp(Math.round(g.at * 90), 1, 90), assist: assist && assist !== pid ? assist : null, pen: false };
    });
  } else {
    const mins: number[] = [];
    for (let i = 0; i < hs + as; i++) mins.push(randi(2, 90));
    mins.sort((a, b) => a - b);
    const order = shuffle([...Array<number>(hs).fill(0), ...Array<number>(as).fill(1)]);
    goals = order.map((side, i) => ({ side, pid: scorerFor(w, clubOf(side)), min: mins[i], assist: null, pen: false }));
  }
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
  for (const g of goals) {
    if (g.pid in ratings) ratings[g.pid] = clamp(ratings[g.pid] + 1, 3, 10);
    if (g.assist && g.assist in ratings) ratings[g.assist] = clamp(ratings[g.assist] + 0.5, 3, 10);
  }
  return { hs, as, pens: null, goals, cards: [], injuries: [], played, ratings, fat, stats: null, winner };
}

/** Os 11 discos de um clube: posições da formação, nomes e números dos titulares. */
export function clubDiscs(w: World, club: Club): { layout: ReturnType<typeof formationLayout>; players: DiscPlayer[] } {
  const slots = FORMATIONS[club.formation];
  return {
    layout: formationLayout(slots),
    players: slots.map((_, i) => {
      const p = club.lineup[i] ? w.players[club.lineup[i] as string] : undefined;
      return { name: p?.name ?? "—", num: p?.num ?? i + 1 };
    }),
  };
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
    const du = clubDiscs(w, u), dopp = clubDiscs(w, opp);
    this.match = new Match({
      teams: [
        { id: "mgr_" + u.id, name: u.name, flag: flagOf(u), players: du.players },
        { id: "mgr_" + opp.id, name: opp.name, flag: flagOf(opp), players: dopp.players },
      ],
      layouts: [du.layout, dopp.layout],
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

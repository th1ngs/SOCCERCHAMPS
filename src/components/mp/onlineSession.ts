// Partida online 1x1: o mesmo Match do botão nos dois aparelhos, com as jogadas trocadas pelo servidor.
// A física é determinística (só +, −, ×, ÷ e sqrt), então cada aparelho reproduz o chute do outro;
// cada jogada leva as posições de antes (snapshot) e o placar, para corrigir qualquer diferença.
import { Audio } from "@/arcade/audio";
import { Match, type ShotInput } from "@/arcade/game";
import { ArcadeRunner } from "@/arcade/runner";
import { flagOf, layoutsFor, teamById } from "@/arcade/teams";
import { MpHttpError, mpApi, type MpMove, type MpResult, type MpRoom } from "@/lib/mp";

/** Tempo da vez no online (segundos). */
export const ONLINE_TURN_S = 25;
const POLL_MS = 900;

export interface OnlineState {
  phase: "playing" | "over";
  myTurn: boolean;
  /** Segundos restantes da minha vez. */
  turnLeft: number;
  played: number;
  turns: number;
  score: [number, number];
  /** Segundos sem atividade do adversário (na vez dele). */
  opponentIdle: number;
  result: MpResult | null;
  error: string | null;
}

export class OnlineSession {
  readonly runner: ArcadeRunner;
  readonly match: Match;
  readonly side: 0 | 1;
  readonly code: string;
  readonly turns: number;
  private known: MpMove[] = [];
  private applied = 0;
  private turnKey = "";
  private turnStart = 0;
  private finished = false;
  private poller: ReturnType<typeof setInterval> | null = null;
  private posting: Promise<void> = Promise.resolve();
  private idle = 0;
  private state: OnlineState;
  private listeners = new Set<() => void>();

  constructor(room: MpRoom) {
    if (room.side === null || !room.guest) throw new Error("Sala sem os dois jogadores.");
    this.side = room.side;
    this.code = room.code;
    this.turns = room.turns;
    const home = teamById(room.host.team), away = teamById(room.guest.team);
    if (!home || !away) throw new Error("Time inválido na sala.");
    Audio.init();
    this.match = new Match({
      teams: [
        { id: "mp0_" + home.id, name: home.name, flag: flagOf(home.club) },
        { id: "mp1_" + away.id, name: away.name, flag: flagOf(away.club) },
      ],
      controllers: this.side === 0 ? ["human", "remote"] : ["remote", "human"],
      difficulty: ["medium", "medium"],
      duration: 1e9,
      goldenGoal: false,
      layouts: layoutsFor(11),
      noClock: true,
      noTurnTimer: true,
      onShot: (turn, shot) => this.onShot(turn, shot),
    });
    this.runner = new ArcadeRunner({ onTick: () => this.tick() });
    this.runner.setMatch(this.match, true);
    this.state = { phase: "playing", myTurn: false, turnLeft: ONLINE_TURN_S, played: 0, turns: this.turns, score: [0, 0], opponentIdle: 0, result: room.result, error: null };
    this.ingest(room);
  }

  // ---------- Store ----------
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };
  getSnapshot = (): OnlineState => this.state;
  private set(patch: Partial<OnlineState>): void {
    const next = { ...this.state, ...patch };
    if (JSON.stringify(next) === JSON.stringify(this.state)) return;
    this.state = next;
    for (const fn of this.listeners) fn();
  }

  start(): void {
    if (this.poller) return;
    this.poller = setInterval(() => void this.poll(), POLL_MS);
  }

  dispose(): void {
    if (this.poller) clearInterval(this.poller);
    this.poller = null;
  }

  // ---------- Rede ----------
  private ingest(room: MpRoom): void {
    // `moves` vem a partir de `since` = known.length.
    const from = room.total - room.moves.length;
    room.moves.forEach((m, k) => { if (!this.known[from + k]) this.known[from + k] = m; });
    this.idle = room.idle;
    if ((room.status === "done" || room.status === "abandoned") && room.result && room.result.reason !== "fim") this.end(room.result);
    else if (room.status === "done" && room.result) this.set({ result: room.result });
  }

  private async poll(): Promise<void> {
    try {
      const { room } = await mpApi.room(this.code, this.known.length);
      this.ingest(room);
      this.set({ error: null });
    } catch (e) {
      this.set({ error: (e as Error).message });
    }
  }

  private send(seq: number, move: MpMove): void {
    this.posting = this.posting.then(async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await mpApi.move(this.code, seq, move);
          return;
        } catch (e) {
          if (e instanceof MpHttpError && e.status === 409) {
            this.set({ error: "Partida dessincronizada: recarregue a página." });
            return;
          }
          await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
        }
      }
      this.set({ error: "Sem conexão com o servidor." });
    });
  }

  // ---------- Jogadas ----------
  private onShot(turn: number, shot: ShotInput): void {
    if (turn !== this.side || this.finished) return;
    const move: MpMove = { by: this.side, kind: "shot", ...shot, before: this.match.snapshot(), score: [this.match.score[0], this.match.score[1]] };
    const seq = this.applied;
    this.known[seq] = move;
    this.applied++;
    this.send(seq, move);
  }

  private skip(): void {
    const move: MpMove = { by: this.side, kind: "skip", before: this.match.snapshot(), score: [this.match.score[0], this.match.score[1]] };
    const seq = this.applied;
    this.known[seq] = move;
    this.applied++;
    this.match.passTurn();
    this.send(seq, move);
  }

  /** A cada quadro: aplica jogadas do adversário, controla o tempo da vez e o fim da partida. */
  private tick(): void {
    const m = this.match;
    if (this.finished) return;
    if (m.state === "aim" && this.applied >= this.turns) {
      this.end(null);
      return;
    }
    // Jogada do adversário pendente: aplica com tudo parado (mesmo que a vez local divirja, a do servidor vale).
    const next = this.known[this.applied];
    if (m.state === "aim" && !m.drag) {
      if (next && next.by !== this.side) {
        if (next.by !== m.turn) m.startTurn(next.by);
        m.restore(next.before);
        m.score = [next.score[0], next.score[1]];
        if (next.kind === "shot" && next.i != null) m.remoteShot({ i: next.i, dx: next.dx ?? 0, dy: next.dy ?? 0, p: next.p ?? 0 });
        else m.passTurn();
        this.applied++;
      }
    }
    const myTurn = m.state === "aim" && m.turn === this.side;
    const key = `${this.applied}:${m.turn}:${m.state}`;
    if (key !== this.turnKey) { this.turnKey = key; this.turnStart = performance.now(); }
    let left = ONLINE_TURN_S;
    if (myTurn) {
      left = Math.max(0, ONLINE_TURN_S - (performance.now() - this.turnStart) / 1000);
      if (left <= 0 && !m.drag) { this.skip(); left = ONLINE_TURN_S; }
    }
    this.set({
      myTurn, turnLeft: Math.ceil(left), played: Math.min(this.applied, this.turns), score: [m.score[0], m.score[1]],
      opponentIdle: !myTurn && m.state === "aim" ? Math.round(this.idle) : 0,
    });
  }

  private end(result: MpResult | null): void {
    if (this.finished) return;
    this.finished = true;
    const score: [number, number] = result ? result.score : [this.match.score[0], this.match.score[1]];
    if (!result) {
      this.match.endMatch();
      if (this.side === 0) void mpApi.finish(this.code, score).catch(() => {});
    } else this.match.state = "over";
    const winner = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
    this.set({ phase: "over", result: result ?? { score, winner, reason: "fim" }, score });
    // O placar final ainda é conferido no servidor (o primeiro registro vale).
    setTimeout(() => this.dispose(), 4000);
  }

  async leave(): Promise<void> {
    this.dispose();
    await mpApi.leave(this.code).catch(() => {});
  }

  async claim(): Promise<string | null> {
    try {
      const { room } = await mpApi.claim(this.code);
      if (room.result) this.end(room.result);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }
}

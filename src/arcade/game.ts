// Partida de botão: turnos, relógio, gols, entrada do jogador humano e controle da CPU.
// Porta fiel de legacy/js/game.js (mesma máquina de estados e mesmas opções).
import { createPlanner, type Level, type Planner, type Shot } from "./ai";
import { Audio } from "./audio";
import { F, P, STEP, allStopped, kickoffBodies, stepWorld, type Body, type PhysEvent } from "./physics";

export const TURN_TIME = 12;
const MAX_DRAG = 170;
const nowS = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;

/** Bandeira desenhada nos discos (padrões do legado + tipos das seleções). */
export type Flag =
  | { type: "h" | "v"; colors: string[] }
  | { type: "cross" | "nordic" | "swiss" | "circle" | "star"; bg: string; fg: string }
  | { type: "brazil" | "usa" };

export interface Team {
  id: string;
  name: string;
  flag: Flag;
}

export type Controller = "human" | "cpu";

export interface MatchEnd {
  score: [number, number];
  winner: number;
  overtime: boolean;
}

export interface MatchOptions {
  teams: [Team, Team];
  controllers: [Controller, Controller];
  difficulty: [Level, Level];
  /** Duração em segundos. */
  duration: number;
  goldenGoal: boolean;
  silent?: boolean;
  onEnd?: (r: MatchEnd) => void;
}

export type MatchState = "intro" | "aim" | "moving" | "goal" | "fulltime" | "over";

export interface Banner {
  text: string;
  t0: number;
  dur: number;
  sub?: string;
  big?: boolean;
  color?: string;
}

export interface Drag {
  disc: Body;
  /** Posição do ponteiro (null = mira da CPU). */
  px: number | null;
  py?: number;
  dx: number;
  dy: number;
  power: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  c: string;
  life: number;
}

type SfxName = "whistle" | "tick" | "goal" | "hit" | "kick";

export class Match {
  opts: MatchOptions;
  teams: [Team, Team];
  ctrl: [Controller, Controller];
  clock: number;
  score: [number, number] = [0, 0];
  overtime = false;
  timeUp = false;
  paused = false;
  particles: Particle[] = [];
  trail: { x: number; y: number }[] = [];
  banner: Banner | null = null;
  drag: Drag | null = null;
  accum = 0;
  events: PhysEvent[] = [];
  lastTick = 0;
  bodies: Body[] = [];
  turn = 0;
  turnTimer = TURN_TIME;
  state: MatchState = "intro";
  stateT = 0;
  lastScorer = 0;
  planner: Planner | null = null;
  cpuPhase: "think" | "aim" = "think";
  cpuShot: Shot | null = null;
  cpuT = 0;

  constructor(opts: MatchOptions) {
    this.opts = opts;
    this.teams = opts.teams;
    this.ctrl = opts.controllers;
    this.clock = opts.duration;
    this.kickoff(0);
    this.sfx("whistle", false);
  }

  sfx(name: SfxName, arg?: unknown): void {
    if (this.opts.silent) return;
    switch (name) {
      case "whistle": Audio.whistle(arg as boolean); break;
      case "tick": Audio.tick(); break;
      case "goal": Audio.goal(); break;
      case "hit": Audio.hit(arg as PhysEvent); break;
      case "kick": Audio.kick(arg as number); break;
    }
  }

  showBanner(text: string, opts: Partial<Omit<Banner, "text">> = {}): void {
    this.banner = { text, t0: nowS(), dur: 1.4, ...opts };
  }

  isHumanTurn(): boolean {
    return this.ctrl[this.turn] === "human";
  }

  kickoff(team: number): void {
    this.bodies = kickoffBodies();
    this.trail = [];
    this.turn = team;
    this.setState("intro");
    this.showBanner(this.teams[team].name, { sub: "Saída de bola", dur: 1.3 });
  }

  setState(s: MatchState): void {
    this.state = s;
    this.stateT = 0;
  }

  startTurn(team: number): void {
    this.turn = team;
    this.turnTimer = TURN_TIME;
    this.drag = null;
    this.setState("aim");
    if (this.ctrl[team] === "cpu") {
      this.planner = createPlanner(this.bodies, team, this.opts.difficulty[team]);
      this.cpuPhase = "think";
    }
  }

  tickClock(dt: number): void {
    if (this.overtime || this.timeUp) return;
    this.clock = Math.max(0, this.clock - dt);
    if (this.clock === 0) this.timeUp = true;
  }

  update(dt: number): void {
    if (this.paused || this.state === "over") return;
    this.stateT += dt;
    this.updateParticles(dt);

    switch (this.state) {
      case "intro":
        if (this.stateT > 1.3) this.startTurn(this.turn);
        break;
      case "aim":
        this.tickClock(dt);
        if (this.timeUp && !this.overtime) { this.finishOrOvertime(); break; }
        if (this.ctrl[this.turn] === "cpu") this.updateCpu(dt);
        else {
          const before = Math.ceil(this.turnTimer);
          this.turnTimer -= dt;
          if (this.turnTimer <= 3 && Math.ceil(this.turnTimer) !== before && this.turnTimer > 0) this.sfx("tick");
          if (this.turnTimer <= 0) {
            this.drag = null;
            this.showBanner("Tempo esgotado!", { dur: 1.1, color: "#ffd23f" });
            this.startTurn(1 - this.turn);
          }
        }
        break;
      case "moving":
        this.tickClock(dt);
        this.physics(dt, true);
        // `state` pode ter mudado para 'goal' dentro de physics().
        if ((this.state as MatchState) === "moving" && (allStopped(this.bodies) || this.stateT > 15)) this.afterMove();
        break;
      case "goal":
        this.physics(dt, false);
        if (this.stateT > 2.8) {
          if (this.overtime || this.timeUp) this.endMatch();
          else this.kickoff(1 - this.lastScorer);
        }
        break;
      case "fulltime":
        this.physics(dt, false);
        if (this.stateT > 2.2) {
          this.state = "over";
          const s = this.score;
          this.opts.onEnd?.({ score: [s[0], s[1]], winner: s[0] > s[1] ? 0 : s[1] > s[0] ? 1 : -1, overtime: this.overtime });
        }
        break;
    }
  }

  physics(dt: number, detect: boolean): void {
    this.accum += Math.min(dt, 0.05);
    const ball = this.bodies[0];
    while (this.accum >= STEP) {
      this.accum -= STEP;
      this.events.length = 0;
      const g = stepWorld(this.bodies, STEP, this.events, detect && this.state === "moving");
      for (const ev of this.events) this.sfx("hit", ev);
      if (g >= 0 && this.state === "moving") this.onGoal(g);
    }
    const sp = Math.hypot(ball.vx, ball.vy);
    ball.rot += ((sp * dt) / ball.r) * (ball.vx >= 0 ? 1 : -1);
    if (sp > 250) this.trail.push({ x: ball.x, y: ball.y });
    if (this.trail.length > 14 || (sp <= 250 && this.trail.length)) this.trail.shift();
  }

  afterMove(): void {
    if (this.timeUp && !this.overtime) this.finishOrOvertime();
    else this.startTurn(1 - this.turn);
  }

  finishOrOvertime(): void {
    if (this.score[0] === this.score[1] && this.opts.goldenGoal && !this.overtime) {
      this.overtime = true;
      this.sfx("whistle", false);
      this.showBanner("MORTE SÚBITA", { sub: "Quem marcar primeiro vence!", dur: 2, color: "#ffd23f" });
      this.startTurn(1 - this.turn);
    } else {
      this.endMatch();
    }
  }

  endMatch(): void {
    this.drag = null;
    this.setState("fulltime");
    this.sfx("whistle", true);
    this.showBanner("FIM DE JOGO", { sub: `${this.teams[0].name} ${this.score[0]} x ${this.score[1]} ${this.teams[1].name}`, dur: 2.2 });
  }

  onGoal(team: number): void {
    this.score[team]++;
    this.lastScorer = team;
    this.drag = null;
    this.setState("goal");
    this.sfx("goal");
    this.showBanner("GOOOL!", { sub: this.teams[team].name, dur: 2.6, big: true, color: "#ffd23f" });
    this.confetti(team);
  }

  confetti(team: number): void {
    const f = this.teams[team].flag;
    const cols: string[] = "colors" in f ? f.colors.slice() : "bg" in f ? [f.bg, f.fg, "#ffffff"] : ["#ffdf00", "#009c3b", "#ffffff"];
    if (f.type === "brazil") cols.push("#ffdf00", "#009c3b", "#002776");
    const gx = team === 0 ? F.right : F.left;
    for (let i = 0; i < 140; i++) {
      const a = (team === 0 ? Math.PI : 0) + (Math.random() - 0.5) * 2.2;
      const sp = 200 + Math.random() * 600;
      this.particles.push({
        x: gx, y: F.cy + (Math.random() - 0.5) * 120,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
        c: cols[(Math.random() * cols.length) | 0], life: 2 + Math.random() * 1.2,
      });
    }
  }

  updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - 1.8 * dt; p.vy *= 1 - 1.8 * dt;
      p.rot += p.vr * dt; p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  updateCpu(dt: number): void {
    if (this.cpuPhase === "think") {
      const planner = this.planner;
      if (!planner) return;
      planner.step(28);
      if (planner.done && this.stateT > 0.7) {
        this.cpuShot = planner.choose();
        this.cpuPhase = "aim";
        this.cpuT = 0;
      }
    } else if (this.cpuPhase === "aim" && this.cpuShot) {
      this.cpuT += dt;
      const s = this.cpuShot;
      const k = Math.min(1, this.cpuT / 0.45);
      this.drag = { disc: this.bodies[s.i], dx: s.dx, dy: s.dy, power: s.p * k, px: null };
      if (this.cpuT > 0.7) this.shoot(this.bodies[s.i], s.dx, s.dy, s.p);
    }
  }

  shoot(disc: Body, dx: number, dy: number, power: number): void {
    const sp = power * P.maxShot;
    disc.vx = dx * sp;
    disc.vy = dy * sp;
    this.drag = null;
    this.accum = 0;
    this.setState("moving");
    this.sfx("kick", power);
  }

  // ---------- Entrada (coordenadas lógicas) ----------
  pointerDown(x: number, y: number): void {
    if (this.paused || this.state !== "aim" || !this.isHumanTurn()) return;
    let best: Body | null = null, bd = Infinity;
    for (let i = 1; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (b.team !== this.turn) continue;
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < b.r + 24 && d < bd) { bd = d; best = b; }
    }
    if (best) {
      this.drag = { disc: best, px: x, py: y, dx: 0, dy: 0, power: 0 };
      this.pointerMove(x, y);
    }
  }

  pointerMove(x: number, y: number): void {
    const d = this.drag;
    if (!d || d.px === null) return;
    d.px = x;
    d.py = y;
    const vx = d.disc.x - x, vy = d.disc.y - y;
    const len = Math.hypot(vx, vy);
    const dead = d.disc.r * 0.6;
    d.power = Math.max(0, Math.min(1, (len - dead) / MAX_DRAG));
    if (len > 0) { d.dx = vx / len; d.dy = vy / len; }
  }

  pointerUp(): void {
    const d = this.drag;
    if (!d || d.px === null) return;
    this.drag = null;
    if (this.state === "aim" && d.power > 0.04) this.shoot(d.disc, d.dx, d.dy, d.power);
  }

  cancelDrag(): void {
    if (this.drag && this.drag.px !== null) this.drag = null;
  }
}

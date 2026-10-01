// Motor de um lance de ataque (estilo Soccer Champs): o usuário conduz, toca para um companheiro ou chuta;
// a defesa e o goleiro são do bot, com força ajustada pela dificuldade e pelos atributos dos jogadores.
// Lógica pura (sem DOM nem three.js): o render 3D e os testes leem o estado.
// Coordenadas em metros: x lateral (−34 a 34), z rumo ao gol adversário (linha do gol em z = 52,5), y para cima.
import type { BotParams } from "./difficulty";

export const GOAL_Z = 52.5;
export const GOAL_HALF = 3.66;
export const BAR = 2.44;
export const BALL_R = 0.11;
export const FIELD_HALF_W = 34;
const G = 9.81;

export interface LanceAttrs {
  fin: number;
  pas: number;
  dri: number;
  vel: number;
  mar: number;
  ref: number;
  col: number;
}

export interface LancePlayer {
  id: string;
  name: string;
  num: number;
  attrs: LanceAttrs;
}

export interface LanceKit {
  name: string;
  short: string;
  colors: [string, string];
  pattern: string;
}

export type ScenarioKind = "centro" | "ponta" | "contra" | "entrada";
export const SCENARIO_NAME: Record<ScenarioKind, string> = {
  centro: "Jogada pelo meio",
  ponta: "Ataque pela ponta",
  contra: "Contra-ataque",
  entrada: "Na entrada da área",
};

export interface ChanceSetup {
  attack: { kit: LanceKit; players: LancePlayer[] };
  defense: { kit: LanceKit; players: LancePlayer[]; gk: LancePlayer };
  bot: BotParams;
  kind: ScenarioKind;
  /** Espelha o cenário (ataque pela esquerda ou pela direita). */
  mirror?: boolean;
  /** Segundos para finalizar. */
  timeLimit?: number;
}

export type Role = "att" | "def" | "gk";
export type ActorState = "run" | "idle" | "dive" | "tackle" | "down" | "celebrate" | "sad";

export interface Actor {
  i: number;
  role: Role;
  p: LancePlayer;
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Alvo atual de corrida. */
  tx: number;
  tz: number;
  /** Fator de velocidade do alvo atual (0-1). */
  pace: number;
  maxSpeed: number;
  heading: number;
  /** Fase da animação de corrida (radianos). */
  stride: number;
  state: ActorState;
  /** Mergulho do goleiro: destino e progresso. */
  dive: { x0: number; x: number; y: number; t: number; dur: number; side: number } | null;
  /** Altura do corpo (pulo do goleiro, comemoração). */
  y: number;
}

export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Aceleração lateral da curva (m/s²) e por quanto tempo ela vale. */
  ax: number;
  az: number;
  curveT: number;
  owner: number | null;
  /** Rotação acumulada (para o render). */
  spin: number;
}

export type Outcome = "goal" | "save" | "miss" | "post" | "block" | "tackle" | "intercept" | "time";

export interface LanceResult {
  outcome: Outcome;
  goal: boolean;
  scorer: string | null;
  assist: string | null;
  text: string;
}

export interface LanceEvent {
  type: "whistle" | "pass" | "receive" | "kick" | "save" | "goal" | "post" | "tackle" | "block" | "intercept";
  t: number;
}

export interface ShotCommand {
  /** Alvo no plano do gol: x (lateral) e y (altura), em metros. */
  tx: number;
  ty: number;
  /** Força de 0 a 1. */
  power: number;
  /** Curva de −1 a 1 (efeito para a esquerda/direita). */
  curve: number;
}

export type Phase = "intro" | "play" | "pass" | "shot" | "done";

type Rng = () => number;
const gauss = (r: Rng) => (r() + r() + r() - 1.5) / 0.75;
const dist = (ax: number, az: number, bx: number, bz: number) => Math.sqrt((ax - bx) ** 2 + (az - bz) ** 2);

interface Spot { x: number; z: number; run?: [number, number] }
interface Layout { carrier: Spot; mates: Spot[]; defs: Spot[] }

/** Posições de partida de cada cenário (ataque para +z). */
const LAYOUTS: Record<ScenarioKind, Layout> = {
  centro: {
    carrier: { x: 0, z: 29 },
    mates: [{ x: -15, z: 33, run: [-8, 44] }, { x: 14, z: 35, run: [7, 45] }, { x: 3, z: 38, run: [1, 46] }],
    defs: [{ x: -4, z: 38 }, { x: 5, z: 39 }, { x: 0, z: 44 }, { x: -11, z: 42 }],
  },
  ponta: {
    carrier: { x: 21, z: 35 },
    mates: [{ x: 3, z: 40, run: [-1, 46] }, { x: 9, z: 31, run: [11, 40] }, { x: -10, z: 37, run: [-5, 45] }],
    defs: [{ x: 17, z: 40 }, { x: 4, z: 45 }, { x: -3, z: 44 }, { x: 11, z: 44 }],
  },
  contra: {
    carrier: { x: -2, z: 19 },
    mates: [{ x: -18, z: 23, run: [-9, 42] }, { x: 16, z: 21, run: [8, 43] }],
    defs: [{ x: -5, z: 34 }, { x: 7, z: 38 }, { x: 0, z: 42 }],
  },
  entrada: {
    carrier: { x: 6, z: 33 },
    mates: [{ x: -8, z: 37, run: [-4, 45] }, { x: 15, z: 40, run: [9, 46] }, { x: 0, z: 44, run: [-1, 47] }],
    defs: [{ x: 3, z: 38 }, { x: 9, z: 40 }, { x: -4, z: 41 }, { x: 3, z: 45 }],
  },
};

const attackSpeed = (p: LancePlayer) => 5.6 + (p.attrs.vel / 99) * 2.4;

export class Chance {
  readonly setup: ChanceSetup;
  readonly bot: BotParams;
  readonly actors: Actor[] = [];
  readonly ball: Ball;
  phase: Phase = "intro";
  /** Tempo total desde o início (s). */
  time = 0;
  /** Tempo de jogo (descontada a apresentação). */
  clock = 0;
  readonly timeLimit: number;
  carrier: number;
  lastPasser: number | null = null;
  result: LanceResult | null = null;
  /** Tempo desde o resultado (para o render segurar a câmera). */
  doneT = 0;
  events: LanceEvent[] = [];
  moveTarget: { x: number; z: number } | null = null;
  passTo: number | null = null;
  /** Indicador visual do alvo do chute (x, y no plano do gol). */
  shotAim: { x: number; y: number } | null = null;
  private rng: Rng;
  private thinkT = 0;
  private grace = 0;
  private shotPlan: { save: boolean; blockAt: number | null; blocker: number | null; arrive: number; t: number; shooter: number } | null = null;
  private readonly mx: number;

  constructor(setup: ChanceSetup, rng: Rng = Math.random) {
    this.setup = setup;
    this.bot = setup.bot;
    this.rng = rng;
    this.mx = setup.mirror ? -1 : 1;
    this.timeLimit = setup.timeLimit ?? (setup.kind === "contra" ? 11 : 9.5);
    const L = LAYOUTS[setup.kind];
    const mk = (role: Role, p: LancePlayer, s: Spot, maxSpeed: number): Actor => {
      const x = s.x * this.mx, z = s.z;
      const a: Actor = { i: this.actors.length, role, p, x, z, vx: 0, vz: 0, tx: x, tz: z, pace: 0, maxSpeed, heading: role === "att" ? 0 : Math.PI, stride: rng() * 6, state: "idle", dive: null, y: 0 };
      this.actors.push(a);
      return a;
    };
    const atk = setup.attack.players;
    mk("att", atk[0], L.carrier, attackSpeed(atk[0]));
    L.mates.slice(0, Math.max(0, atk.length - 1)).forEach((s, k) => {
      const a = mk("att", atk[k + 1], s, attackSpeed(atk[k + 1]));
      if (s.run) { a.tx = s.run[0] * this.mx; a.tz = s.run[1]; a.pace = 0.75; }
    });
    const nDef = Math.max(1, Math.min(L.defs.length, this.bot.defenders - (setup.kind === "contra" ? 1 : 0)));
    setup.defense.players.slice(0, nDef).forEach((p, k) => mk("def", p, L.defs[k], this.bot.defSpeed * (0.88 + (p.attrs.vel / 99) * 0.2)));
    mk("gk", setup.defense.gk, { x: 0, z: GOAL_Z - 1.2 }, 5);
    this.carrier = 0;
    const c = this.actors[0];
    this.ball = { x: c.x, y: BALL_R, z: c.z + 0.6, vx: 0, vy: 0, vz: 0, ax: 0, az: 0, curveT: 0, owner: 0, spin: 0 };
  }

  get attackers(): Actor[] { return this.actors.filter((a) => a.role === "att"); }
  get defenders(): Actor[] { return this.actors.filter((a) => a.role === "def"); }
  get keeper(): Actor { return this.actors[this.actors.length - 1]; }
  /** Segundos restantes para finalizar. */
  get timeLeft(): number { return Math.max(0, this.timeLimit - this.clock); }

  private emit(type: LanceEvent["type"]): void { this.events.push({ type, t: this.time }); }

  // ---------- Comandos ----------
  /** Conduz a bola até um ponto do gramado. */
  commandMove(x: number, z: number): boolean {
    if (this.phase !== "play") return false;
    this.moveTarget = { x: Math.max(-32, Math.min(32, x)), z: Math.max(5, Math.min(GOAL_Z - 1.5, z)) };
    return true;
  }

  /** Toca a bola para um companheiro (índice do ator). */
  commandPass(to: number): boolean {
    const r = this.actors[to];
    if (this.phase !== "play" || !r || r.role !== "att" || to === this.carrier) return false;
    const c = this.actors[this.carrier];
    const pas = c.p.attrs.pas;
    const speed = 14 + (pas / 99) * 8;
    // Passe na frente do companheiro (onde ele vai estar quando a bola chegar).
    const d0 = dist(this.ball.x, this.ball.z, r.x, r.z);
    const lead = d0 / speed;
    let tx = r.x + r.vx * lead, tz = r.z + r.vz * lead;
    const ang = Math.atan2(tx - this.ball.x, tz - this.ball.z) + gauss(this.rng) * (1.15 - pas / 100) * 0.07;
    const d = dist(this.ball.x, this.ball.z, tx, tz);
    tx = this.ball.x + Math.sin(ang) * d;
    tz = this.ball.z + Math.cos(ang) * d;
    this.ball.owner = null;
    this.ball.vx = Math.sin(ang) * speed;
    this.ball.vz = Math.cos(ang) * speed;
    this.ball.vy = 0;
    this.passTo = to;
    this.lastPasser = this.carrier;
    this.moveTarget = null;
    c.state = "idle";
    // O companheiro vai ao encontro da bola.
    r.tx = tx; r.tz = tz; r.pace = 1;
    this.phase = "pass";
    this.emit("pass");
    return true;
  }

  /** Chuta a gol. */
  commandShot(cmd: ShotCommand): boolean {
    if (this.phase !== "play") return false;
    const c = this.actors[this.carrier];
    const k = this.keeper;
    const fin = c.p.attrs.fin;
    const b = this.ball;
    // Pressão: marcador perto atrapalha a finalização.
    const near = Math.min(...this.defenders.map((d) => dist(d.x, d.z, c.x, c.z)), 9);
    const pressure = Math.max(0, (2.4 - near) / 2.4);
    const dGoal = dist(b.x, b.z, cmd.tx, GOAL_Z);
    const sigma = (0.22 + dGoal * 0.017) * (1.45 - fin / 100) * (1 + pressure * 0.9);
    const tx = cmd.tx + gauss(this.rng) * sigma;
    const ty = Math.max(0.12, cmd.ty + gauss(this.rng) * sigma * 0.6);
    const power = Math.max(0, Math.min(1, cmd.power));
    const curve = Math.max(-1, Math.min(1, cmd.curve));
    const speed = 16 + power * 15 + (fin / 99) * 3;
    const dz = GOAL_Z - b.z, dx = tx - b.x;
    const dh = Math.sqrt(dx * dx + dz * dz);
    const T = Math.max(0.25, dh / speed);
    // Curva: aceleração lateral perpendicular; a direção inicial compensa para terminar no alvo.
    const nx = dz / dh, nz = -dx / dh; // perpendicular (à direita de quem chuta)
    const ac = curve * 7;
    const lat = 0.5 * ac * T * T;
    const ax0 = tx - nx * lat, az0 = GOAL_Z - nz * lat;
    const hx = ax0 - b.x, hz = az0 - b.z;
    const hl = Math.sqrt(hx * hx + hz * hz);
    b.owner = null;
    b.vx = (hx / hl) * (dh / T);
    b.vz = (hz / hl) * (dh / T);
    b.vy = (ty - b.y + 0.5 * G * T * T) / T;
    b.ax = nx * ac; b.az = nz * ac; b.curveT = T;
    this.shotAim = { x: tx, y: ty };
    this.moveTarget = null;
    c.state = "idle";

    // Bloqueio: um defensor no caminho da bola, com a bola baixa.
    let blockAt: number | null = null, blocker: number | null = null;
    for (const d of this.defenders) {
      const rx = d.x - b.x, rz = d.z - b.z;
      const along = (rx * dx + rz * dz) / dh;
      if (along < 1 || along > dh * 0.75) continue;
      const off = Math.abs(rx * (dz / dh) - rz * (dx / dh));
      const t = along / (dh / T);
      const yAt = b.y + b.vy * t - 0.5 * G * t * t;
      // Nem todo chute na direção do defensor é bloqueado: depende do tempo de reação dele (e da bola baixa).
      if (off < this.bot.blockR && yAt < 1.6 && this.rng() < 0.6 && (blockAt === null || t < blockAt)) { blockAt = t; blocker = d.i; }
    }
    // Goleiro: alcança o ponto de chegada se der tempo de reagir e mergulhar.
    const inFrame = Math.abs(tx) < GOAL_HALF + 0.35 && ty < BAR + 0.35;
    const ref = k.p.attrs.ref, col = k.p.attrs.col;
    const react = this.bot.gkReact * (1.25 - ref / 100 * 0.45) * (1 + Math.abs(curve) * 0.35);
    const reach = this.bot.gkReach * (0.85 + (col / 100) * 0.3) * (1 - power * 0.12) + Math.max(0, T - react) * this.bot.gkDive;
    const dxk = Math.abs(tx - k.x), dyk = Math.max(0, ty - 1.85) * 1.3 + Math.max(0, 0.35 - ty) * 0.6;
    const need = Math.sqrt(dxk * dxk + dyk * dyk);
    const save = inFrame && reach * (0.88 + this.rng() * 0.2) >= need;
    this.shotPlan = { save, blockAt, blocker, arrive: T, t: 0, shooter: this.carrier };
    // Mergulho do goleiro (animação), depois do tempo de reação.
    const side = tx >= k.x ? 1 : -1;
    k.dive = { x0: k.x, x: Math.max(-GOAL_HALF - 0.6, Math.min(GOAL_HALF + 0.6, save ? tx : k.x + side * Math.min(need, reach))), y: Math.min(2.4, ty), t: -react, dur: Math.max(0.2, T - react), side };
    this.phase = "shot";
    this.emit("kick");
    return true;
  }

  // ---------- Atualização ----------
  update(dt: number): void {
    const step = 1 / 120;
    let left = Math.min(dt, 0.1);
    while (left > 1e-6) {
      const h = Math.min(step, left);
      this.tick(h);
      left -= h;
    }
  }

  private finish(outcome: Outcome, text: string, scorer: string | null = null): void {
    if (this.result) return;
    const assist = outcome === "goal" && this.lastPasser !== null && this.lastPasser !== this.shotPlan?.shooter ? this.actors[this.lastPasser].p.id : null;
    this.result = { outcome, goal: outcome === "goal", scorer, assist, text };
    this.phase = "done";
    this.doneT = 0;
    const goal = outcome === "goal";
    for (const a of this.actors) {
      if (a.role === "att") a.state = goal ? "celebrate" : "sad";
      else if (a.state !== "dive") a.state = goal ? "sad" : "celebrate";
      a.pace = 0;
    }
  }

  private tick(h: number): void {
    this.time += h;
    if (this.phase === "intro") {
      if (this.time >= 0.9) { this.phase = "play"; this.emit("whistle"); }
      this.moveActors(h, false);
      return;
    }
    if (this.phase === "done") {
      this.doneT += h;
      this.moveBall(h);
      this.moveActors(h, false);
      return;
    }
    this.clock += h;
    this.grace = Math.max(0, this.grace - h);
    if ((this.phase === "play" || this.phase === "pass") && this.clock >= this.timeLimit) {
      this.finish("time", "O tempo acabou: a defesa fechou os espaços.");
      return;
    }
    this.thinkT -= h;
    if (this.thinkT <= 0) { this.think(); this.thinkT = this.bot.think; }
    this.steerAttackers();
    this.moveActors(h, true);
    this.moveBall(h);
    if (this.phase === "play") this.checkTackle(h);
    else if (this.phase === "pass") this.checkPass();
    else if (this.phase === "shot") this.checkShot(h);
  }

  /** Leitura da defesa (de tempos em tempos, conforme a dificuldade). */
  private think(): void {
    const defs = this.defenders;
    const b = this.ball;
    const bx = this.phase === "pass" ? b.x + b.vx * 0.35 : b.x, bz = this.phase === "pass" ? b.z + b.vz * 0.35 : b.z;
    if (this.phase === "shot") { for (const d of defs) d.pace = 0.2; return; }
    const order = defs.slice().sort((a, c) => dist(a.x, a.z, bx, bz) - dist(c.x, c.z, bx, bz));
    const presser = order[0];
    if (presser) {
      // Fecha entre a bola e o gol, colando no jogador.
      const gx = 0 - bx, gz = GOAL_Z - bz, gl = Math.sqrt(gx * gx + gz * gz) || 1;
      presser.tx = bx + (gx / gl) * 0.7; presser.tz = bz + (gz / gl) * 0.7;
      presser.pace = Math.min(1, this.bot.press);
    }
    const mates = this.attackers.filter((a) => a.i !== this.carrier);
    const free = order.slice(1);
    for (const m of mates) {
      if (!free.length) break;
      free.sort((a, c) => dist(a.x, a.z, m.x, m.z) - dist(c.x, c.z, m.x, m.z));
      const d = free.shift() as Actor;
      // Marca a linha de passe: entre o companheiro e a bola, um pouco à frente do gol.
      d.tx = m.x + (bx - m.x) * 0.28; d.tz = Math.min(GOAL_Z - 2, m.z + (bz - m.z) * 0.28 + 0.8);
      d.pace = 0.9;
    }
    for (const d of free) {
      // Sobra: cobre a frente da área.
      d.tx = bx * 0.4; d.tz = Math.min(GOAL_Z - 5, bz + (GOAL_Z - bz) * 0.55); d.pace = 0.8;
    }
  }

  private steerAttackers(): void {
    if (this.phase !== "play" && this.phase !== "pass") return;
    const c = this.actors[this.carrier];
    if (this.phase === "play") {
      if (this.moveTarget) {
        c.tx = this.moveTarget.x; c.tz = this.moveTarget.z; c.pace = 0.95;
        if (dist(c.x, c.z, c.tx, c.tz) < 0.6) this.moveTarget = null;
      } else {
        // Sem comando: avança devagar rumo ao gol, segurando na entrada da área.
        c.tx = c.x * 0.97; c.tz = Math.min(GOAL_Z - 11, c.z + 4); c.pace = c.z < GOAL_Z - 12 ? 0.48 : 0.15;
      }
    }
  }

  private moveActors(h: number, live: boolean): void {
    for (const a of this.actors) {
      if (a.role === "gk") { this.moveKeeper(a, h); continue; }
      if (a.state === "celebrate") { a.y = Math.abs(Math.sin(this.doneT * 7)) * 0.35; a.vx *= 0.9; a.vz *= 0.9; continue; }
      if (!live || a.state === "down" || a.state === "tackle") { a.vx *= Math.max(0, 1 - 6 * h); a.vz *= Math.max(0, 1 - 6 * h); a.x += a.vx * h; a.z += a.vz * h; this.animate(a, h); continue; }
      const dx = a.tx - a.x, dz = a.tz - a.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const withBall = this.ball.owner === a.i;
      const max = a.maxSpeed * a.pace * (withBall ? 0.92 : 1);
      const want = d < 0.3 ? 0 : Math.min(max, d * 2.2);
      const wx = d > 1e-6 ? (dx / d) * want : 0, wz = d > 1e-6 ? (dz / d) * want : 0;
      const acc = 11 * h;
      const ex = wx - a.vx, ez = wz - a.vz, el = Math.sqrt(ex * ex + ez * ez);
      if (el > acc) { a.vx += (ex / el) * acc; a.vz += (ez / el) * acc; } else { a.vx = wx; a.vz = wz; }
      a.x = Math.max(-FIELD_HALF_W, Math.min(FIELD_HALF_W, a.x + a.vx * h));
      a.z = Math.min(GOAL_Z - 0.6, a.z + a.vz * h);
      this.animate(a, h);
    }
  }

  private animate(a: Actor, h: number): void {
    const sp = Math.sqrt(a.vx * a.vx + a.vz * a.vz);
    a.stride += sp * h * 2.1;
    if (sp > 0.4) {
      const target = Math.atan2(a.vx, a.vz);
      let dh = target - a.heading;
      while (dh > Math.PI) dh -= 2 * Math.PI;
      while (dh < -Math.PI) dh += 2 * Math.PI;
      a.heading += dh * Math.min(1, h * 10);
      if (a.state === "idle") a.state = "run";
    } else if (a.state === "run") a.state = "idle";
  }

  private moveKeeper(k: Actor, h: number): void {
    const b = this.ball;
    if (k.dive) {
      k.dive.t += h;
      if (k.dive.t > 0) {
        k.state = "dive";
        const f = Math.min(1, k.dive.t / k.dive.dur);
        const e = 1 - (1 - f) * (1 - f);
        k.x = k.dive.x0 + (k.dive.x - k.dive.x0) * e;
        k.y = Math.max(0, Math.sin(f * Math.PI) * Math.min(0.9, k.dive.y * 0.45));
      }
      return;
    }
    if (this.phase === "done") return;
    // Posição: na linha entre a bola e o centro do gol, saindo mais quando a bola está perto.
    const dz = GOAL_Z - b.z;
    const out = Math.max(0.6, Math.min(3.2, 4.2 - dz * 0.09));
    const gx = (b.x / Math.max(4, dz)) * out;
    k.tx = Math.max(-GOAL_HALF + 0.4, Math.min(GOAL_HALF - 0.4, gx * 1.6));
    k.tz = GOAL_Z - out;
    const dx = k.tx - k.x, dzz = k.tz - k.z;
    const d = Math.sqrt(dx * dx + dzz * dzz);
    const v = Math.min(4.5, d * 4);
    if (d > 1e-4) { k.x += (dx / d) * v * h; k.z += (dzz / d) * v * h; k.vx = (dx / d) * v; k.vz = (dzz / d) * v; }
    k.heading = Math.PI + Math.atan2(b.x - k.x, -(b.z - k.z)) * 0.3;
    k.stride += v * h * 2;
  }

  private moveBall(h: number): void {
    const b = this.ball;
    if (b.owner !== null) {
      const o = this.actors[b.owner];
      const fx = Math.sin(o.heading), fz = Math.cos(o.heading);
      const tx = o.x + fx * 0.55, tz = o.z + fz * 0.55;
      b.vx = (tx - b.x) / Math.max(h, 1e-3) * 0.5; b.vz = (tz - b.z) / Math.max(h, 1e-3) * 0.5;
      b.x += (tx - b.x) * Math.min(1, h * 14); b.z += (tz - b.z) * Math.min(1, h * 14); b.y = BALL_R;
      b.spin += Math.sqrt(o.vx * o.vx + o.vz * o.vz) * h / BALL_R;
      return;
    }
    if (b.curveT > 0) { b.vx += b.ax * h; b.vz += b.az * h; b.curveT -= h; }
    b.vy -= G * h;
    b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
    if (b.y < BALL_R) {
      b.y = BALL_R;
      if (b.vy < -1.2) { b.vy = -b.vy * 0.5; b.vx *= 0.82; b.vz *= 0.82; } else b.vy = 0;
    }
    if (b.y <= BALL_R + 1e-3) { const f = Math.max(0, 1 - 0.55 * h); b.vx *= f; b.vz *= f; }
    // Rede: a bola para dentro do gol.
    if (this.result?.goal && b.z > GOAL_Z + 1.4) { b.vz = -Math.abs(b.vz) * 0.1; b.vx *= 0.5; b.z = GOAL_Z + 1.4; }
    b.spin += Math.sqrt(b.vx * b.vx + b.vz * b.vz) * h / BALL_R;
  }

  private checkTackle(h: number): void {
    const c = this.actors[this.carrier];
    if (this.grace > 0) return;
    for (const d of this.defenders) {
      const dd = dist(d.x, d.z, c.x, c.z);
      if (dd > 1.15) continue;
      const p = this.bot.tackle * h * (1.3 - c.p.attrs.dri / 100) * (1.15 - dd / 1.15 * 0.5);
      if (this.rng() < p) {
        d.state = "tackle";
        c.state = "down";
        this.ball.owner = null;
        this.ball.vx = (d.x - c.x) * 2 + (this.rng() - 0.5) * 3; this.ball.vz = -3; this.ball.vy = 1.5;
        this.emit("tackle");
        this.finish("tackle", `${d.p.name} desarmou ${c.p.name}.`);
        return;
      }
    }
  }

  private checkPass(): void {
    const b = this.ball;
    const pas = this.lastPasser !== null ? this.actors[this.lastPasser].p.attrs.pas : 70;
    const radius = this.bot.interceptR * (1.12 - pas / 250);
    for (const d of this.defenders) {
      if (dist(d.x, d.z, b.x, b.z) < radius) {
        b.owner = d.i; d.state = "idle";
        this.emit("intercept");
        this.finish("intercept", `${d.p.name} cortou o passe.`);
        return;
      }
    }
    const r = this.passTo !== null ? this.actors[this.passTo] : null;
    if (r && dist(r.x, r.z, b.x, b.z) < 1.05) {
      this.carrier = r.i; b.owner = r.i; this.phase = "play"; this.passTo = null; this.grace = 0.55;
      this.emit("receive");
      return;
    }
    const sp = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (Math.abs(b.x) > FIELD_HALF_W || b.z > GOAL_Z || sp < 1.2) this.finish("intercept", "O passe não chegou ao companheiro.");
  }

  private checkShot(h: number): void {
    const plan = this.shotPlan;
    if (!plan) return;
    plan.t += h;
    const b = this.ball;
    const shooter = this.actors[plan.shooter].p;
    if (plan.blockAt !== null && plan.blocker !== null && plan.t >= plan.blockAt) {
      const d = this.actors[plan.blocker];
      b.vx = -b.vx * 0.25 + (this.rng() - 0.5) * 4; b.vz = -Math.abs(b.vz) * 0.3; b.vy = Math.abs(b.vy) * 0.4 + 1; b.curveT = 0;
      this.emit("block");
      this.finish("block", `${d.p.name} se jogou na frente e bloqueou o chute.`);
      return;
    }
    if (b.z >= GOAL_Z - BALL_R - 0.05) {
      const k = this.keeper;
      const inside = Math.abs(b.x) < GOAL_HALF - BALL_R && b.y < BAR - BALL_R;
      if (plan.save && Math.abs(b.x) < GOAL_HALF + 0.4 && b.y < BAR + 0.4) {
        b.vz = -Math.abs(b.vz) * 0.25; b.vx = (b.x >= k.x ? 1 : -1) * (2 + this.rng() * 3); b.vy = Math.abs(b.vy) * 0.3 + 1.2; b.curveT = 0;
        b.z = GOAL_Z - BALL_R - 0.06;
        this.emit("save");
        this.finish("save", `Defesaça de ${k.p.name}!`);
        return;
      }
      if (inside) {
        this.emit("goal");
        this.finish("goal", `GOL de ${shooter.name}!`, shooter.id);
        return;
      }
      const post = (Math.abs(Math.abs(b.x) - GOAL_HALF) < 0.18 && b.y < BAR + 0.1) || (Math.abs(b.y - BAR) < 0.18 && Math.abs(b.x) < GOAL_HALF + 0.1);
      if (post) {
        b.vz = -Math.abs(b.vz) * 0.4; b.vx += (b.x > 0 ? -1 : 1) * 2; b.curveT = 0;
        this.emit("post");
        this.finish("post", "Na trave!");
        return;
      }
      this.finish("miss", b.y >= BAR ? "Por cima do gol." : "Para fora, rente à trave.");
      return;
    }
    const sp = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (sp < 1 && plan.t > 0.5) this.finish("miss", "O chute saiu fraco e o goleiro ficou com a bola.");
  }

  /** Eventos novos desde a última leitura (para som e efeitos). */
  drainEvents(): LanceEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}

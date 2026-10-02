// Motor de um lance de ataque (estilo Soccer Champs): o usuário conduz (inclusive segurando e arrastando),
// toca rasteiro ou por cima, dribla, chuta (com efeito, cavadinha, de primeira ou de cabeça);
// a defesa e o goleiro são do bot, com força ajustada pela dificuldade e pelos atributos dos jogadores.
// Tem impedimento: a defesa segura uma linha (e no difícil sobe em bloco), e os companheiros do usuário
// correm sem passar dela até a bola sair.
// Lógica pura (sem DOM nem three.js): o render 3D e os testes leem o estado.
// Coordenadas em metros: x lateral (−34 a 34), z rumo ao gol adversário (linha do gol em z = 52,5), y para cima.
import type { BotParams } from "./difficulty";

export const GOAL_Z = 52.5;
export const GOAL_HALF = 3.66;
export const BAR = 2.44;
export const BALL_R = 0.11;
export const FIELD_HALF_W = 34;
const G = 9.81;
/** Bico da grande área (z). */
const BOX_Z = GOAL_Z - 16.5;
/** Tolerância da linha de impedimento (mesma linha = em condição). */
const OFFSIDE_TOL = 0.25;

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
  /** Mergulho do goleiro: destino e progresso (z: recua para a linha na cavadinha). */
  dive: { x0: number; x: number; z0: number; z: number; y: number; t: number; dur: number; side: number } | null;
  /** Altura do corpo (pulo do goleiro, comemoração). */
  y: number;
  /** Segundos desde o último chute/passe (animação da perna); negativo = nenhum. */
  kickT: number;
  /** Segundos desde o último drible (finta do corpo); negativo = nenhum. */
  feintT: number;
  /** Caído depois de um drible (s restantes). */
  stunT: number;
  /** Faixa de corrida sem a bola (atacantes): para onde ele tenta ir, respeitando o impedimento. */
  lane: { x: number; z: number } | null;
  /** Alvo desejado (a defesa decide de tempos em tempos; o alvo de corrida segue suave até ele). */
  wx: number;
  wz: number;
  /** Bote do marcador (animação, s desde o início; negativo = nenhum) e a recarga até o próximo. */
  lungeT: number;
  lungeCd: number;
  /** Lado (x do mundo, ±1) da finta de quem dribla e da queda de quem foi driblado. */
  feintSide: number;
  fallSide: number;
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

export type Outcome = "goal" | "save" | "miss" | "post" | "block" | "tackle" | "intercept" | "offside" | "time";

export interface LanceResult {
  outcome: Outcome;
  goal: boolean;
  scorer: string | null;
  assist: string | null;
  text: string;
}

export interface LanceEvent {
  type: "whistle" | "pass" | "lob" | "receive" | "kick" | "save" | "goal" | "post" | "tackle" | "block" | "intercept" | "dribble" | "offside";
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

/** Tipo do último chute (para o texto e o render). */
export type ShotKind = "normal" | "chip" | "volley" | "header";

export type Phase = "intro" | "play" | "pass" | "shot" | "done";

type Rng = () => number;
const gauss = (r: Rng) => (r() + r() + r() - 1.5) / 0.75;
const dist = (ax: number, az: number, bx: number, bz: number) => Math.sqrt((ax - bx) ** 2 + (az - bz) ** 2);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface Spot { x: number; z: number; run?: [number, number] }
interface Layout { carrier: Spot; mates: Spot[]; defs: Spot[] }

/** Posições de partida de cada cenário (ataque para +z). `run` é a faixa de corrida do companheiro. */
const LAYOUTS: Record<ScenarioKind, Layout> = {
  centro: {
    carrier: { x: 0, z: 29 },
    mates: [{ x: -15, z: 32, run: [-9, 44] }, { x: 14, z: 33, run: [8, 45] }, { x: 3, z: 34, run: [1, 46] }],
    defs: [{ x: -4, z: 37 }, { x: 5, z: 38 }, { x: 0, z: 41 }, { x: -11, z: 39 }],
  },
  ponta: {
    carrier: { x: 21, z: 35 },
    mates: [{ x: 3, z: 38, run: [-1, 46] }, { x: 9, z: 31, run: [11, 40] }, { x: -10, z: 37, run: [-5, 45] }],
    defs: [{ x: 17, z: 40 }, { x: 4, z: 42 }, { x: -3, z: 42 }, { x: 11, z: 41 }],
  },
  contra: {
    carrier: { x: -2, z: 19 },
    mates: [{ x: -18, z: 23, run: [-9, 42] }, { x: 16, z: 21, run: [8, 43] }],
    defs: [{ x: -5, z: 34 }, { x: 7, z: 37 }, { x: 0, z: 40 }],
  },
  entrada: {
    carrier: { x: 6, z: 33 },
    mates: [{ x: -8, z: 36, run: [-4, 45] }, { x: 15, z: 37, run: [9, 46] }, { x: 0, z: 38, run: [-1, 47] }],
    defs: [{ x: 3, z: 38 }, { x: 9, z: 40 }, { x: -4, z: 40 }, { x: 3, z: 43 }],
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
  /** Conduzindo em velocidade máxima (segurando e arrastando). */
  sprint = false;
  /** Ritmo da condução sem arrancada (o joystick pouco inclinado anda mais devagar). */
  private movePace = 0.9;
  passTo: number | null = null;
  /** Passe atual: por cima? para onde? o recebedor estava impedido no momento do passe? */
  passLofted = false;
  passTarget: { x: number; z: number } | null = null;
  private offsidePass = false;
  /** Defensores que já tentaram cortar o passe atual (cada um tem uma chance por passe). */
  private passTries = new Set<number>();
  private passFrom = { x: 0, z: 0 };
  /** Chute pedido durante o passe: sai de primeira quando a bola chegar. */
  queuedShot: ShotCommand | null = null;
  shotKind: ShotKind = "normal";
  /** Indicador visual do alvo do chute (x, y no plano do gol). */
  shotAim: { x: number; y: number } | null = null;
  /** Recarga do drible e arrancada depois dele. */
  dribbleCd = 0;
  private burstT = 0;
  private exposedT = 0;
  /** Linha da defesa subindo em bloco (s restantes). */
  trapT = 0;
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
    this.timeLimit = setup.timeLimit ?? (setup.kind === "contra" ? 12.5 : 11);
    const L = LAYOUTS[setup.kind];
    const mk = (role: Role, p: LancePlayer, s: Spot, maxSpeed: number): Actor => {
      const x = s.x * this.mx, z = s.z;
      const a: Actor = {
        i: this.actors.length, role, p, x, z, vx: 0, vz: 0, tx: x, tz: z, pace: 0, maxSpeed, heading: role === "att" ? 0 : Math.PI,
        stride: rng() * 6, state: "idle", dive: null, y: 0, kickT: -1, feintT: -1, stunT: 0, lane: null,
        wx: x, wz: z, lungeT: -1, lungeCd: rng(), feintSide: 1, fallSide: 1,
      };
      this.actors.push(a);
      return a;
    };
    const atk = setup.attack.players;
    mk("att", atk[0], L.carrier, attackSpeed(atk[0]));
    L.mates.slice(0, Math.max(0, atk.length - 1)).forEach((s, k) => {
      const a = mk("att", atk[k + 1], s, attackSpeed(atk[k + 1]));
      if (s.run) a.lane = { x: s.run[0] * this.mx, z: s.run[1] };
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

  /**
   * Linha de impedimento: o penúltimo adversário (normalmente o zagueiro mais recuado, já que o goleiro é o último)
   * ou a bola, o que estiver mais perto do gol.
   */
  offsideLine(): number {
    const zs = this.actors.filter((a) => a.role !== "att").map((a) => a.z).sort((a, b) => b - a);
    const second = zs.length > 1 ? zs[1] : zs[0] ?? GOAL_Z;
    return Math.max(second, this.ball.z);
  }

  /** Companheiro em posição de impedimento agora (se receber um passe, é impedimento). */
  isOffside(a: Actor): boolean {
    return a.role === "att" && a.i !== this.carrier && a.z > 0 && a.z > this.offsideLine() + OFFSIDE_TOL;
  }

  private emit(type: LanceEvent["type"]): void { this.events.push({ type, t: this.time }); }

  // ---------- Comandos ----------
  /** Conduz a bola até um ponto do gramado (`sprint`: em velocidade máxima, como ao segurar e arrastar). */
  commandMove(x: number, z: number, sprint = false, pace = 0.9): boolean {
    if (this.phase !== "play") return false;
    this.moveTarget = { x: clamp(x, -32, 32), z: clamp(z, 5, GOAL_Z - 1.5) };
    this.sprint = sprint;
    this.movePace = clamp(pace, 0.3, 1);
    return true;
  }

  /** Para de conduzir (fica com a bola parada, protegendo). */
  commandStop(): boolean {
    if (this.phase !== "play") return false;
    const c = this.actors[this.carrier];
    this.moveTarget = { x: c.x, z: c.z };
    this.sprint = false;
    return true;
  }

  /** Toca a bola para um companheiro (índice do ator): rasteiro ou por cima da marcação. */
  commandPass(to: number, lofted = false): boolean {
    const r = this.actors[to];
    if (this.phase !== "play" || !r || r.role !== "att" || to === this.carrier) return false;
    const c = this.actors[this.carrier];
    const b = this.ball;
    const pas = c.p.attrs.pas;
    // Impedimento é julgado no momento do passe.
    this.offsidePass = this.isOffside(r);
    // Rasteiro: rápido. Por cima: parábola alta (3 a 5 m) que passa sobre a marcação; o tempo de voo vem da altura.
    const d0 = dist(b.x, b.z, r.x, r.z);
    const apex = 2.8 + Math.min(2.2, d0 * 0.08);
    const flight = (2 * Math.sqrt(2 * G * apex)) / G;
    const speed = lofted ? Math.max(6, d0 / flight) : 14 + (pas / 99) * 8;
    // Passe na frente do companheiro (onde ele vai estar quando a bola chegar): o lançamento em profundidade.
    const lead = Math.min(d0 / speed, lofted ? 1.6 : 1.1);
    let tx = r.x + r.vx * lead, tz = r.z + r.vz * lead;
    const err = (1.15 - pas / 100) * (lofted ? 0.11 : 0.07);
    const ang = Math.atan2(tx - b.x, tz - b.z) + gauss(this.rng) * err;
    let d = dist(b.x, b.z, tx, tz);
    if (lofted) d *= 1 + gauss(this.rng) * err * 0.6;
    tx = b.x + Math.sin(ang) * d;
    tz = b.z + Math.cos(ang) * d;
    b.owner = null;
    b.vx = Math.sin(ang) * speed;
    b.vz = Math.cos(ang) * speed;
    // Por cima: a bola cai no alvo (parábola); rasteiro: no chão.
    b.vy = lofted ? 0.5 * G * (d / speed) : 0;
    b.ax = 0; b.az = 0; b.curveT = 0;
    this.passTo = to;
    this.passTries.clear();
    this.passFrom = { x: b.x, z: b.z };
    this.passLofted = lofted;
    this.passTarget = { x: tx, z: tz };
    this.lastPasser = this.carrier;
    this.moveTarget = null;
    this.sprint = false;
    c.state = "idle";
    c.kickT = 0;
    // Quem passou parte para a tabela: corre à frente pela faixa dele.
    c.lane = { x: clamp(c.x + (c.x > tx ? -3 : 3), -30, 30), z: Math.min(GOAL_Z - 7, c.z + 11) };
    // O companheiro vai ao encontro da bola.
    r.tx = tx; r.tz = tz; r.pace = 1;
    this.phase = "pass";
    this.emit(lofted ? "lob" : "pass");
    return true;
  }

  /**
   * Drible (finta e arrancada): pode deixar o marcador mais próximo no chão.
   * Dá certo conforme o drible de quem conduz contra o nível da defesa; se falhar, fica exposto ao desarme.
   */
  commandDribble(): boolean {
    if (this.phase !== "play" || this.dribbleCd > 0) return false;
    const c = this.actors[this.carrier];
    this.dribbleCd = 1.4;
    this.burstT = 0.6;
    c.feintT = 0;
    let near: Actor | null = null, nd = 2.8;
    for (const d of this.defenders) {
      if (d.stunT > 0) continue;
      const dd = dist(d.x, d.z, c.x, c.z);
      if (dd < nd) { nd = dd; near = d; }
    }
    // Arranca para longe do marcador e rumo ao gol.
    const away = near ? Math.sign(c.x - near.x) || 1 : (c.x > 0 ? -1 : 1);
    c.feintSide = away;
    this.moveTarget = { x: clamp(c.x + away * 2.6, -32, 32), z: clamp(c.z + 3.2, 5, GOAL_Z - 1.5) };
    this.sprint = true;
    this.emit("dribble");
    if (!near) return true;
    const p = clamp(0.32 + (c.p.attrs.dri - 55) / 90 - (this.bot.tackle - 0.55) * 0.17, 0.12, 0.88);
    if (this.rng() < p) {
      near.stunT = 0.9 + this.rng() * 0.5;
      near.state = "down";
      // Ele morde a finta: cai para o lado contrário de onde a bola foi.
      near.fallSide = -away;
      this.grace = 0.7;
    } else this.exposedT = 0.6;
    return true;
  }

  /** Chuta a gol. Durante um passe, o chute fica guardado e sai de primeira (ou de cabeça) quando a bola chegar. */
  commandShot(cmd: ShotCommand): boolean {
    if (this.phase === "pass" && this.passTo !== null) { this.queuedShot = cmd; return true; }
    if (this.phase !== "play") return false;
    this.shoot(cmd, "normal");
    return true;
  }

  private shoot(cmd: ShotCommand, kind: ShotKind): void {
    const c = this.actors[this.carrier];
    const k = this.keeper;
    const fin = c.p.attrs.fin;
    const b = this.ball;
    // Pressão: marcador perto atrapalha a finalização.
    const near = Math.min(...this.defenders.filter((d) => d.stunT <= 0).map((d) => dist(d.x, d.z, c.x, c.z)), 9);
    const pressure = Math.max(0, (2.4 - near) / 2.4);
    let power = clamp(cmd.power, 0, 1);
    const dGoal = dist(b.x, b.z, cmd.tx, GOAL_Z);
    // Cavadinha: gesto lento e comprido (pouca força, mira alta) de fora da pequena área.
    if (kind === "normal" && power < 0.5 && cmd.ty >= 1.6 && dGoal > 7) kind = "chip";
    if (kind === "header") power = Math.min(power, 0.55);
    const kindErr = kind === "header" ? 1.5 : kind === "volley" ? 1.25 : kind === "chip" ? 1.1 : 1;
    const sigma = (0.22 + dGoal * 0.017) * (1.45 - fin / 100) * (1 + pressure * 0.9) * kindErr;
    const tx = cmd.tx + gauss(this.rng) * sigma;
    const aimY = kind === "chip" ? Math.min(2.1, cmd.ty) : kind === "header" ? Math.min(cmd.ty, 1.6) : cmd.ty;
    const ty = Math.max(0.12, aimY + gauss(this.rng) * sigma * 0.6);
    const curve = kind === "header" ? 0 : clamp(cmd.curve, -1, 1);
    const speed = kind === "header" ? 11 + power * 8 : 16 + power * 15 + (fin / 99) * 3;
    const dz = GOAL_Z - b.z, dx = tx - b.x;
    const dh = Math.sqrt(dx * dx + dz * dz);
    let T = Math.max(0.25, dh / speed);
    if (kind === "chip") {
      // Cavadinha: arco alto (3 a 4,5 m) que cai no gol; o tempo de voo vem da altura.
      const H = clamp(3 + dh * 0.05 - power * 0.8, 2.8, 4.5);
      const vy0 = Math.sqrt(2 * G * (H - b.y));
      T = (vy0 + Math.sqrt(Math.max(0, vy0 * vy0 - 2 * G * (ty - b.y)))) / G;
    }
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
    this.shotKind = kind;
    this.moveTarget = null;
    this.sprint = false;
    c.state = "idle";
    c.kickT = 0;

    // Bloqueio: um defensor no caminho da bola, com a bola baixa.
    let blockAt: number | null = null, blocker: number | null = null;
    for (const d of this.defenders) {
      if (d.stunT > 0) continue;
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
    let save = inFrame && reach * (0.88 + this.rng() * 0.2) >= need;
    let backTo = k.z;
    // Bola por cima do goleiro (cavadinha): ele só salva se der tempo de voltar para a linha.
    const tK = clamp((k.z - b.z) / Math.max(1, dz / T), 0, T);
    const yAtK = b.y + b.vy * tK - 0.5 * G * tK * tK;
    if (yAtK > 2.55) {
      // Andando de costas ele é lento (~3,6 m/s) e ainda precisa saltar: longe do gol, a cavadinha é mortal.
      const back = Math.max(0, GOAL_Z - 0.6 - k.z);
      const margin = T - react - (back / 3.6 + 0.15);
      save = inFrame && this.rng() < clamp(0.15 + margin * 0.8, 0.06, 0.75);
      backTo = GOAL_Z - 0.6;
    }
    this.shotPlan = { save, blockAt, blocker, arrive: T, t: 0, shooter: this.carrier };
    // Mergulho do goleiro (animação), depois do tempo de reação.
    const side = tx >= k.x ? 1 : -1;
    k.dive = {
      x0: k.x, z0: k.z, z: backTo,
      x: clamp(save ? tx : k.x + side * Math.min(need, reach), -GOAL_HALF - 0.6, GOAL_HALF + 0.6),
      y: Math.min(2.4, ty), t: -react, dur: Math.max(0.2, T - react), side,
    };
    this.phase = "shot";
    this.emit("kick");
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
      a.stunT = 0;
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
    this.dribbleCd = Math.max(0, this.dribbleCd - h);
    this.burstT = Math.max(0, this.burstT - h);
    this.exposedT = Math.max(0, this.exposedT - h);
    this.trapT = Math.max(0, this.trapT - h);
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

  /** Leitura da defesa (de tempos em tempos, conforme a dificuldade): pressão, linha e marcação. */
  private think(): void {
    const defs = this.defenders.filter((d) => d.stunT <= 0);
    const b = this.ball;
    if (this.phase === "shot") { for (const d of defs) d.pace = 0.2; return; }
    const bx = this.phase === "pass" ? b.x + b.vx * 0.35 : b.x, bz = this.phase === "pass" ? b.z + b.vz * 0.35 : b.z;
    // Linha de impedimento em bloco (difícil e lendário): sobe de uma vez de vez em quando.
    if (this.phase === "play" && this.trapT <= 0 && this.bot.trap > 0 && this.rng() < this.bot.trap * this.bot.think) this.trapT = 1.1;
    // Profundidade da última linha: alguns metros à frente da bola (no contra-ataque, a defesa ainda está voltando).
    let lineZ = clamp(bz + this.bot.lineGap, bz + 3, GOAL_Z - 6);
    if (this.setup.kind === "contra") lineZ = Math.max(lineZ, Math.min(GOAL_Z - 10, 40 - this.clock * 1.2));
    if (this.trapT > 0) lineZ = Math.max(bz + 1.5, lineZ - 2.8);

    const order = defs.slice().sort((a, c) => dist(a.x, a.z, bx, bz) - dist(c.x, c.z, bx, bz));
    const presser = this.phase === "play" ? order[0] : undefined;
    if (presser) {
      // Fecha entre a bola e o gol, colando no jogador.
      const gx = 0 - bx, gz = GOAL_Z - bz, gl = Math.sqrt(gx * gx + gz * gz) || 1;
      presser.wx = bx + (gx / gl) * 0.7; presser.wz = bz + (gz / gl) * 0.7;
      presser.pace = Math.min(1, this.bot.press);
    }
    const free = order.filter((d) => d !== presser);
    // No passe: o defensor mais perto do destino corre para cortar (recuperação no lançamento).
    if (this.phase === "pass" && this.passTarget && free.length) {
      const pt = this.passTarget;
      free.sort((a, c) => dist(a.x, a.z, pt.x, pt.z) - dist(c.x, c.z, pt.x, pt.z));
      const chaser = free.shift() as Actor;
      chaser.wx = pt.x; chaser.wz = Math.min(GOAL_Z - 1, pt.z + 0.6); chaser.pace = 1;
    }
    // Marcação por zona na linha: cada um acompanha a faixa de um atacante, sem sair da linha
    // (quem passar dela fica impedido; só quando a bola sai é que eles correm atrás).
    const mates = this.attackers.filter((a) => a.i !== this.carrier).sort((a, c) => c.z - a.z);
    for (const m of mates) {
      if (!free.length) break;
      free.sort((a, c) => Math.abs(a.x - m.x) - Math.abs(c.x - m.x));
      const d = free.shift() as Actor;
      const chase = this.phase === "pass" && m.z > lineZ;
      d.wx = m.x + (bx - m.x) * 0.22;
      d.wz = chase ? Math.min(GOAL_Z - 1.5, m.z + 1.2) : lineZ;
      d.pace = chase ? 1 : 0.9;
    }
    for (const d of free) {
      // Sobra: cobre o meio, um pouco atrás da linha (no lendário, colado nela).
      d.wx = bx * 0.4; d.wz = Math.min(GOAL_Z - 4, lineZ + this.bot.cover); d.pace = 0.85;
    }
  }

  /** Movimentação de quem conduz e dos companheiros (que respeitam a linha de impedimento). */
  private steerAttackers(): void {
    if (this.phase !== "play" && this.phase !== "pass") return;
    const c = this.actors[this.carrier];
    if (this.phase === "play") {
      if (this.moveTarget) {
        c.tx = this.moveTarget.x; c.tz = this.moveTarget.z; c.pace = this.sprint ? 1 : this.movePace;
        if (dist(c.x, c.z, c.tx, c.tz) < 0.6) { this.moveTarget = null; this.sprint = false; }
      } else {
        // Sem comando: avança devagar rumo ao gol, segurando na entrada da área.
        c.tx = c.x * 0.97; c.tz = Math.min(GOAL_Z - 11, c.z + 4); c.pace = c.z < GOAL_Z - 12 ? 0.42 : 0.12;
      }
    }
    const line = this.offsideLine();
    for (const m of this.attackers) {
      if (m.i === this.carrier || (this.phase === "pass" && m.i === this.passTo)) continue;
      const lane = m.lane ?? { x: m.x, z: m.z };
      // Corridas que mudam de ritmo: diagonal para dentro e para fora, com uma volta curta para pedir a bola.
      const wob = Math.sin(this.clock * 0.85 + m.i * 1.9);
      let tx = lane.x + wob * 2.6;
      // Não pode passar da linha: corre colado nela (meio metro antes).
      let tz = Math.min(lane.z, line - 0.6) - (wob < -0.55 ? 1.6 : 0);
      let pace = 0.72;
      if (m.z > line + 0.05) { tz = line - 2; pace = 0.95; } // está impedido: volta para a linha
      // Não encosta em quem tem a bola.
      if (dist(tx, tz, c.x, c.z) < 5) tx += (tx >= c.x ? 1 : -1) * 3;
      m.tx = clamp(tx, -31, 31); m.tz = clamp(tz, 5, GOAL_Z - 3); m.pace = pace;
    }
  }

  private moveActors(h: number, live: boolean): void {
    for (const a of this.actors) {
      if (a.kickT >= 0) a.kickT = a.kickT > 2 ? -1 : a.kickT + h;
      if (a.feintT >= 0) a.feintT = a.feintT > 2 ? -1 : a.feintT + h;
      if (a.lungeT >= 0) a.lungeT = a.lungeT > 1 ? -1 : a.lungeT + h;
      a.lungeCd = Math.max(0, a.lungeCd - h);
      if (a.stunT > 0) { a.stunT = Math.max(0, a.stunT - h); if (a.stunT === 0 && a.state === "down" && !this.result) a.state = "idle"; }
      if (a.role === "gk") { this.moveKeeper(a, h); continue; }
      if (a.state === "celebrate") { a.y = Math.abs(Math.sin(this.doneT * 7)) * 0.35; a.vx *= 0.9; a.vz *= 0.9; this.animate(a, h); continue; }
      if (!live || a.state === "down" || a.state === "tackle" || a.stunT > 0) { a.vx *= Math.max(0, 1 - 6 * h); a.vz *= Math.max(0, 1 - 6 * h); a.x += a.vx * h; a.z += a.vz * h; this.animate(a, h); continue; }
      // Defesa: o alvo de corrida segue suave a decisão (sem trancos a cada leitura).
      if (a.role === "def") { const k = Math.min(1, h * 7); a.tx += (a.wx - a.tx) * k; a.tz += (a.wz - a.tz) * k; }
      const dx = a.tx - a.x, dz = a.tz - a.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const withBall = this.ball.owner === a.i;
      const burst = withBall && this.burstT > 0 ? 1.22 : 1;
      const max = a.maxSpeed * a.pace * (withBall ? 0.92 : 1) * burst;
      const want = d < 0.3 ? 0 : Math.min(max, d * 2.2);
      let wx = d > 1e-6 ? (dx / d) * want : 0, wz = d > 1e-6 ? (dz / d) * want : 0;
      const acc = (withBall && this.burstT > 0 ? 18 : 11) * h;
      // Ninguém vira em cima da linha correndo: em velocidade, a direção gira aos poucos (e freia nas viradas bruscas).
      const cs = Math.sqrt(a.vx * a.vx + a.vz * a.vz);
      if (cs > 1.2 && want > 0.5) {
        const ca = Math.atan2(a.vx, a.vz);
        let da = Math.atan2(wx, wz) - ca;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        const maxTurn = (13 / (1 + cs * 0.3)) * h * (withBall && this.burstT > 0 ? 1.6 : 1);
        if (Math.abs(da) > maxTurn) {
          const na = ca + Math.sign(da) * maxTurn;
          const ns = Math.abs(da) > 1.7 ? Math.max(0, cs - 15 * h) : Math.min(want, cs + acc);
          wx = Math.sin(na) * ns; wz = Math.cos(na) * ns;
          a.vx = wx; a.vz = wz;
        }
      }
      const ex = wx - a.vx, ez = wz - a.vz, el = Math.sqrt(ex * ex + ez * ez);
      if (el > acc) { a.vx += (ex / el) * acc; a.vz += (ez / el) * acc; } else { a.vx = wx; a.vz = wz; }
      a.x = clamp(a.x + a.vx * h, -FIELD_HALF_W, FIELD_HALF_W);
      a.z = Math.min(GOAL_Z - 0.6, a.z + a.vz * h);
      this.animate(a, h);
    }
  }

  private animate(a: Actor, h: number): void {
    const sp = Math.sqrt(a.vx * a.vx + a.vz * a.vz);
    a.stride += sp * h * 2.1;
    const b = this.ball;
    // Marcador perto da bola não dá as costas: anda de lado e de costas, de frente para ela.
    const faceBall = a.role === "def" && this.phase === "play" && a.stunT <= 0 && a.state !== "tackle" && dist(a.x, a.z, b.x, b.z) < 7;
    if (faceBall) {
      let dh = Math.atan2(b.x - a.x, b.z - a.z) - a.heading;
      while (dh > Math.PI) dh -= 2 * Math.PI;
      while (dh < -Math.PI) dh += 2 * Math.PI;
      a.heading += dh * Math.min(1, h * 8);
      if (sp > 0.4 && a.state === "idle") a.state = "run";
      else if (sp <= 0.4 && a.state === "run") a.state = "idle";
      return;
    }
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
        k.z = k.dive.z0 + (k.dive.z - k.dive.z0) * Math.min(1, f * 1.4);
        k.y = Math.max(0, Math.sin(f * Math.PI) * Math.min(0.9, k.dive.y * 0.45));
      }
      return;
    }
    if (this.phase === "done") return;
    let tx: number, tz: number, vmax = 4.5;
    const pt = this.passTarget;
    if (this.phase === "pass" && pt && pt.z > GOAL_Z - 6.5 && Math.abs(pt.x) < 9.5) {
      // Bola lançada na pequena área: o goleiro sai para pegar.
      tx = pt.x; tz = Math.max(GOAL_Z - 6.5, pt.z); vmax = 5.6;
    } else {
      // Posição: na linha entre a bola e o centro do gol, saindo mais quando a bola está perto.
      const dz = GOAL_Z - b.z;
      const out = clamp(4.2 - dz * 0.09, 0.6, 3.2);
      const gx = (b.x / Math.max(4, dz)) * out;
      tx = clamp(gx * 1.6, -GOAL_HALF + 0.4, GOAL_HALF - 0.4);
      tz = GOAL_Z - out;
    }
    k.tx = tx; k.tz = tz;
    // Passadas curtas de lado, com aceleração (sem deslizar).
    const dx = k.tx - k.x, dzz = k.tz - k.z;
    const d = Math.sqrt(dx * dx + dzz * dzz);
    const v = Math.min(vmax, d * 3.5);
    const wx = d > 1e-4 ? (dx / d) * v : 0, wz = d > 1e-4 ? (dzz / d) * v : 0;
    const acc = 16 * h, ex = wx - k.vx, ez = wz - k.vz, el = Math.sqrt(ex * ex + ez * ez);
    if (el > acc) { k.vx += (ex / el) * acc; k.vz += (ez / el) * acc; } else { k.vx = wx; k.vz = wz; }
    k.x += k.vx * h; k.z += k.vz * h;
    let dh = Math.PI + Math.atan2(b.x - k.x, -(b.z - k.z)) * 0.6 - k.heading;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    k.heading += dh * Math.min(1, h * 8);
    k.stride += Math.sqrt(k.vx * k.vx + k.vz * k.vz) * h * 2.6;
  }

  private moveBall(h: number): void {
    const b = this.ball;
    if (b.owner !== null) {
      const o = this.actors[b.owner];
      const fx = Math.sin(o.heading), fz = Math.cos(o.heading);
      // Condução em toques: a bola vai um pouco à frente a cada duas passadas e o jogador a alcança.
      const osp = Math.min(1, Math.sqrt(o.vx * o.vx + o.vz * o.vz) / 7);
      const ahead = 0.5 + osp * (0.2 + 0.45 * Math.pow(0.5 + 0.5 * Math.sin(o.stride * 0.5), 3));
      // Finta do drible: a bola sai para o lado da arrancada.
      const side = o.feintT >= 0 && o.feintT < 0.7 ? o.feintSide * 0.55 * Math.sin(Math.min(1, o.feintT / 0.35) * Math.PI * 0.5) * (o.feintT > 0.45 ? Math.max(0, 1 - (o.feintT - 0.45) / 0.25) : 1) : 0;
      const tx = o.x + fx * ahead + side, tz = o.z + fz * ahead;
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
      // Quique: perde altura e um pouco de velocidade; quando não quica mais, rola.
      if (b.vy < -1.2) { b.vy = -b.vy * 0.5; b.vx *= 0.8; b.vz *= 0.8; } else b.vy = 0;
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
      if (d.stunT > 0) continue;
      const dd = dist(d.x, d.z, c.x, c.z);
      // Bote (animação): o marcador estica a perna de vez em quando ao chegar perto.
      if (dd < 1.6 && d.lungeCd <= 0) { d.lungeT = 0; d.lungeCd = 0.9 + this.rng() * 0.7; }
      if (dd > 1.15) continue;
      const p = this.bot.tackle * h * (1.3 - c.p.attrs.dri / 100) * (1.15 - dd / 1.15 * 0.5) * (this.exposedT > 0 ? 2.2 : 1);
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
    // Bola alta passa por cima dos defensores; baixa (ou caindo) pode ser cortada, de cabeça inclusive.
    // Logo na saída do pé (primeiros 2 m) ninguém corta: o passe já saiu.
    if (b.y < 2.0 && dist(b.x, b.z, this.passFrom.x, this.passFrom.z) > 2.2) {
      for (const d of this.defenders) {
        if (d.stunT > 0 || this.passTries.has(d.i)) continue;
        if (dist(d.x, d.z, b.x, b.z) < radius) {
          // Uma tentativa por defensor e por passe: reflexo e marcação dele contra o nível; de cabeça é mais difícil.
          this.passTries.add(d.i);
          const p = clamp(0.5 + (this.bot.interceptR - 0.6) * 0.5 + (d.p.attrs.mar - 60) / 300, 0.3, 0.92) * (b.y > 1.2 ? 0.6 : 1);
          if (this.rng() >= p) continue;
          b.owner = d.i; d.state = "idle";
          this.emit("intercept");
          this.finish("intercept", b.y > 1.2 ? `${d.p.name} subiu e cortou de cabeça.` : `${d.p.name} cortou o passe.`);
          return;
        }
      }
    }
    // Goleiro sai e fica com a bola na área (com as mãos).
    const k = this.keeper;
    if (b.z > BOX_Z && b.y < 2.6 && !this.passTries.has(k.i) && dist(k.x, k.z, b.x, b.z) < 1.3) {
      // Uma chance por passe (pode errar o tempo da saída).
      this.passTries.add(k.i);
      if (this.rng() >= 0.55 + this.bot.gkReach * 0.2) return;
      b.owner = k.i; b.vx = 0; b.vz = 0; b.vy = 0;
      this.emit("save");
      this.finish("intercept", `${k.p.name} saiu do gol e ficou com a bola.`);
      return;
    }
    const r = this.passTo !== null ? this.actors[this.passTo] : null;
    if (r && dist(r.x, r.z, b.x, b.z) < 1.1 && b.y < 2.1) {
      if (this.offsidePass) {
        this.emit("offside");
        this.finish("offside", `Impedimento de ${r.p.name}: ele estava à frente da linha da defesa no passe.`);
        return;
      }
      const height = b.y;
      this.carrier = r.i; b.owner = r.i; this.phase = "play"; this.passTo = null; this.passTarget = null; this.grace = 0.55;
      this.emit("receive");
      // Chute pedido durante o passe: sai de primeira (de cabeça se a bola chegou alta).
      const q = this.queuedShot;
      this.queuedShot = null;
      if (q) { b.y = Math.max(BALL_R, height); this.shoot(q, height > 1.05 ? "header" : "volley"); }
      return;
    }
    const sp = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (Math.abs(b.x) > FIELD_HALF_W || b.z > GOAL_Z || (sp < 1.2 && b.y <= BALL_R + 0.01)) this.finish("intercept", "O passe não chegou ao companheiro.");
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
        this.finish("save", this.shotKind === "chip" ? `${k.p.name} voltou a tempo e tirou a cavadinha!` : `Defesaça de ${k.p.name}!`);
        return;
      }
      if (inside) {
        this.emit("goal");
        const how = this.shotKind === "chip" ? " De cavadinha!" : this.shotKind === "header" ? " De cabeça!" : this.shotKind === "volley" ? " De primeira!" : "";
        this.finish("goal", `GOL de ${shooter.name}!${how}`, shooter.id);
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

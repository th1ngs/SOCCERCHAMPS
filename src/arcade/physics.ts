// Física do futebol de botão: discos (jogadores) e bola, colisões elásticas, paredes e gols.
// Porta fiel do antigo js/physics.js (mesmas constantes e mesma ordem de operações).

export interface Field {
  w: number;
  h: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  goalTop: number;
  goalBottom: number;
  goalDepth: number;
  cx: number;
  cy: number;
}

/** Coordenadas lógicas do campo (independentes da tela). */
export const F: Field = (() => {
  const f = { w: 1100, h: 620, left: 60, right: 1040, top: 40, bottom: 580, goalTop: 242, goalBottom: 378, goalDepth: 45 };
  return { ...f, cx: (f.left + f.right) / 2, cy: (f.top + f.bottom) / 2 };
})();

export const P = {
  playerR: 27,
  ballR: 14,
  playerM: 3,
  ballM: 1,
  /** Velocidade máxima de um chute (unidades/s). */
  maxShot: 1350,
  /** Restituição disco-disco. */
  eDisc: 0.86,
  eWallPlayer: 0.6,
  eWallBall: 0.75,
  /** Desaceleração constante. */
  fricA: { player: 260, ball: 190 },
  /** Desaceleração proporcional à velocidade. */
  fricK: { player: 1.15, ball: 0.95 },
  stopSpeed: 5,
} as const;

export const STEP = 1 / 120;

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  m: number;
  fa: number;
  fk: number;
  e: number;
  isBall: boolean;
  /** -1 = bola; 0 = time da esquerda; 1 = time da direita. */
  team: number;
  rot: number;
}

export interface PhysEvent {
  type: "ball" | "disc" | "wall";
  v: number;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dx: number;
  dy: number;
  len2: number;
}

/** Formação 1-2-2 do time da esquerda (o da direita é espelhado). */
const FORMATION: [number, number][] = [[105, 310], [255, 215], [255, 405], [405, 200], [405, 420]];

function buildWalls(): Wall[] {
  const s: Wall[] = [];
  const { left: L, right: R, top: T, bottom: B, goalTop: gt, goalBottom: gb, goalDepth: d } = F;
  const seg = (x1: number, y1: number, x2: number, y2: number) =>
    s.push({ x1, y1, x2, y2, dx: x2 - x1, dy: y2 - y1, len2: (x2 - x1) ** 2 + (y2 - y1) ** 2 });
  seg(L, T, R, T); seg(L, B, R, B);
  seg(L, T, L, gt); seg(L, gb, L, B);
  seg(R, T, R, gt); seg(R, gb, R, B);
  // Gol da esquerda
  seg(L - d, gt, L, gt); seg(L - d, gb, L, gb); seg(L - d, gt, L - d, gb);
  // Gol da direita
  seg(R, gt, R + d, gt); seg(R, gb, R + d, gb); seg(R + d, gt, R + d, gb);
  return s;
}
export const WALLS: readonly Wall[] = buildWalls();

function makeBody(x: number, y: number, isBall: boolean, team: number): Body {
  const kind = isBall ? "ball" : "player";
  return {
    x, y, vx: 0, vy: 0,
    r: isBall ? P.ballR : P.playerR,
    m: isBall ? P.ballM : P.playerM,
    fa: P.fricA[kind], fk: P.fricK[kind],
    e: isBall ? P.eWallBall : P.eWallPlayer,
    isBall, team: isBall ? -1 : team, rot: 0,
  };
}

/** Corpo 0 é sempre a bola; 1..5 time 0 (esquerda); 6..10 time 1 (direita). */
export function kickoffBodies(): Body[] {
  const bodies = [makeBody(F.cx, F.cy, true, -1)];
  for (let team = 0; team < 2; team++) {
    for (const [x, y] of FORMATION) bodies.push(makeBody(team === 0 ? x : F.w - x, y, false, team));
  }
  return bodies;
}

function integrate(bodies: Body[], h: number): void {
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.vx === 0 && b.vy === 0) continue;
    const sp = Math.hypot(b.vx, b.vy);
    const ns = sp - (b.fa + b.fk * sp) * h;
    if (ns <= P.stopSpeed) { b.vx = 0; b.vy = 0; continue; }
    const f = ns / sp;
    b.vx *= f; b.vy *= f;
    b.x += b.vx * h; b.y += b.vy * h;
  }
}

function collide(bodies: Body[], events: PhysEvent[] | null): void {
  const n = bodies.length;
  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      if (a.vx === 0 && a.vy === 0 && b.vx === 0 && b.vy === 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      let d = Math.sqrt(d2), nx: number, ny: number;
      if (d < 1e-6) { nx = 1; ny = 0; d = 0; } else { nx = dx / d; ny = dy / d; }
      const ia = 1 / a.m, ib = 1 / b.m, it = ia + ib;
      const ov = rr - d;
      a.x -= (nx * ov * ia) / it; a.y -= (ny * ov * ia) / it;
      b.x += (nx * ov * ib) / it; b.y += (ny * ov * ib) / it;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) {
        const jmp = (-(1 + P.eDisc) * vn) / it;
        a.vx -= jmp * nx * ia; a.vy -= jmp * ny * ia;
        b.vx += jmp * nx * ib; b.vy += jmp * ny * ib;
        if (events) events.push({ type: a.isBall || b.isBall ? "ball" : "disc", v: -vn });
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    for (let k = 0; k < WALLS.length; k++) {
      const w = WALLS[k];
      let t = ((b.x - w.x1) * w.dx + (b.y - w.y1) * w.dy) / w.len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = w.x1 + w.dx * t, py = w.y1 + w.dy * t;
      const dx = b.x - px, dy = b.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 >= b.r * b.r) continue;
      const d = Math.sqrt(d2) || 1e-6;
      const nx = dx / d, ny = dy / d;
      b.x = px + nx * b.r; b.y = py + ny * b.r;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + b.e) * vn * nx; b.vy -= (1 + b.e) * vn * ny;
        if (events) events.push({ type: "wall", v: -vn });
      }
    }
  }
}

/** Retorna o time que marcou (0 ou 1) ou -1. */
export function checkGoal(ball: Body): number {
  if (ball.y > F.goalTop && ball.y < F.goalBottom) {
    if (ball.x + ball.r < F.left) return 1;
    if (ball.x - ball.r > F.right) return 0;
  }
  return -1;
}

/** Avança `dt` segundos com sub-passos adaptativos para evitar atravessar paredes. */
export function stepWorld(bodies: Body[], dt: number, events: PhysEvent[] | null, detectGoal: boolean): number {
  let mv = 0;
  for (let i = 0; i < bodies.length; i++) {
    const s = Math.abs(bodies[i].vx) + Math.abs(bodies[i].vy);
    if (s > mv) mv = s;
  }
  const n = Math.min(16, Math.max(1, Math.ceil((mv * dt) / 6)));
  const h = dt / n;
  let goal = -1;
  for (let k = 0; k < n; k++) {
    integrate(bodies, h);
    collide(bodies, events);
    if (detectGoal && goal < 0) goal = checkGoal(bodies[0]);
  }
  return goal;
}

export function allStopped(bodies: readonly Body[]): boolean {
  for (let i = 0; i < bodies.length; i++) {
    if (bodies[i].vx !== 0 || bodies[i].vy !== 0) return false;
  }
  return true;
}

export function clone(bodies: readonly Body[]): Body[] {
  return bodies.map((b) => ({ ...b }));
}

export interface SimulateResult {
  goal: number;
  t: number;
  bodies: Body[];
}

/** Simula até tudo parar (ou gol / tempo máximo). Usado pela IA. */
export function simulate(bodies: Body[], maxT: number): SimulateResult {
  let t = 0;
  while (t < maxT) {
    const g = stepWorld(bodies, STEP, null, true);
    t += STEP;
    if (g >= 0) return { goal: g, t, bodies };
    if (allStopped(bodies)) break;
  }
  return { goal: -1, t, bodies };
}

export const Phys = { F, P, STEP, WALLS, kickoffBodies, stepWorld, allStopped, clone, simulate, checkGoal };

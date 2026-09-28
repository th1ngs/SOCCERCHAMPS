// IA: gera chutes candidatos, simula cada um com a física real e escolhe o melhor.
// Porta fiel de legacy/js/ai.js.
import { F, P, clone, simulate, type Body, type SimulateResult } from "./physics";

export type Level = "easy" | "medium" | "hard";

export interface LevelConfig {
  noiseAng: number;
  noisePow: number;
  sample: number;
  pickTop: number;
}

export const LEVELS: Record<Level, LevelConfig> = {
  easy: { noiseAng: 0.13, noisePow: 0.2, sample: 0.35, pickTop: 5 },
  medium: { noiseAng: 0.06, noisePow: 0.1, sample: 0.75, pickTop: 2 },
  hard: { noiseAng: 0.025, noisePow: 0.05, sample: 1, pickTop: 1 },
};

export const LEVEL_NAME: Record<Level, string> = { easy: "Fácil", medium: "Médio", hard: "Difícil" };

const POWERS = [0.45, 0.7, 1];

/** Chute escolhido: índice do disco, direção unitária e força (0-1). */
export interface Shot {
  i: number;
  dx: number;
  dy: number;
  p: number;
}

interface Candidate extends Shot {
  score?: number;
}

export interface Planner {
  done: boolean;
  step(n: number): void;
  choose(): Shot;
}

function gauss(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;
}

function genCandidates(bodies: Body[], team: number): Candidate[] {
  const ball = bodies[0];
  const attackRight = team === 0;
  const goalX = attackRight ? F.right + 12 : F.left - 12;
  const targets: [number, number][] = [];
  const refTop = F.top + ball.r, refBot = F.bottom - ball.r;
  for (const gy of [F.goalTop + 22, F.cy, F.goalBottom - 22]) {
    targets.push([goalX, gy]);
    targets.push([goalX, 2 * refTop - gy]); // tabela na lateral de cima
    targets.push([goalX, 2 * refBot - gy]); // tabela na lateral de baixo
  }
  const farX = attackRight ? F.right - 130 : F.left + 130;
  targets.push([farX, F.top + 60], [farX, F.bottom - 60], [F.cx + (attackRight ? 160 : -160), F.cy]);

  const cands: Candidate[] = [];
  for (let i = 1; i < bodies.length; i++) {
    const d = bodies[i];
    if (d.team !== team) continue;
    for (const [tx, ty] of targets) {
      let bx = tx - ball.x, by = ty - ball.y;
      const bl = Math.hypot(bx, by) || 1;
      bx /= bl; by /= bl;
      const gx = ball.x - bx * (ball.r + d.r), gy = ball.y - by * (ball.r + d.r);
      let sx = gx - d.x, sy = gy - d.y;
      const sl = Math.hypot(sx, sy);
      if (sl < 1) continue;
      sx /= sl; sy /= sl;
      if (sx * bx + sy * by < 0.3) continue; // corte muito fino, impossível
      for (const p of POWERS) cands.push({ i, dx: sx, dy: sy, p });
    }
    let cx = ball.x - d.x, cy = ball.y - d.y;
    const cl = Math.hypot(cx, cy) || 1;
    cx /= cl; cy /= cl;
    for (const p of POWERS) cands.push({ i, dx: cx, dy: cy, p });
  }
  const own: number[] = [];
  for (let i = 1; i < bodies.length; i++) if (bodies[i].team === team) own.push(i);
  for (let k = 0; k < 10; k++) {
    const a = Math.random() * Math.PI * 2;
    cands.push({ i: own[(Math.random() * own.length) | 0], dx: Math.cos(a), dy: Math.sin(a), p: 0.3 + Math.random() * 0.7 });
  }
  return cands;
}

/** Quão perigoso um disco está em relação à bola apontando para um gol. */
function shotChance(disc: Body, ball: Body, goalX: number): number {
  const dx = ball.x - disc.x, dy = ball.y - disc.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 420 || dist < 1) return 0;
  const gx = goalX - ball.x, gy = F.cy - ball.y;
  const gd = Math.hypot(gx, gy) || 1;
  const align = (dx * gx + dy * gy) / (dist * gd);
  if (align < 0.3) return 0;
  return align * (1 - dist / 420) * Math.max(0, 1 - gd / 700);
}

function scoreResult(res: SimulateResult, team: number, before: Body[]): number {
  if (res.goal === team) return 100000 - res.t * 100;
  if (res.goal === 1 - team) return -100000;
  const b = res.bodies, ball = b[0];
  const dir = team === 0 ? 1 : -1;
  const ownGX = team === 0 ? F.left : F.right;
  const oppGX = team === 0 ? F.right : F.left;
  let s = 0;
  s += (((ball.x - ownGX) * dir) / (F.right - F.left)) * 400;
  const dOwn = Math.hypot(ball.x - ownGX, ball.y - F.cy);
  if (dOwn < 350) s -= (350 - dOwn) * 1.5;

  let threat = 0, chance = 0, keeper = Infinity;
  for (let i = 1; i < b.length; i++) {
    const d = b[i];
    if (d.team === team) {
      chance = Math.max(chance, shotChance(d, ball, oppGX));
      keeper = Math.min(keeper, Math.hypot(d.x - ownGX, d.y - F.cy));
    } else {
      threat = Math.max(threat, shotChance(d, ball, ownGX));
    }
  }
  s -= threat * 900;
  s += chance * 350;
  if (keeper > 140) s -= (keeper - 140) * 0.8;
  const b0 = before[0];
  if (Math.hypot(ball.x - b0.x, ball.y - b0.y) < 5) s -= 120;
  return s;
}

export function createPlanner(bodies: readonly Body[], team: number, level: Level): Planner {
  const cfg = LEVELS[level] || LEVELS.medium;
  const snapshot = clone(bodies);
  let cands = genCandidates(snapshot, team);
  if (cfg.sample < 1) cands = cands.filter(() => Math.random() < cfg.sample);
  let idx = 0;

  return {
    done: cands.length === 0,
    step(n: number) {
      for (let k = 0; k < n && idx < cands.length; k++, idx++) {
        const c = cands[idx];
        const sim = clone(snapshot);
        const sp = c.p * P.maxShot;
        sim[c.i].vx = c.dx * sp; sim[c.i].vy = c.dy * sp;
        c.score = scoreResult(simulate(sim, 7), team, snapshot);
      }
      if (idx >= cands.length) this.done = true;
    },
    choose(): Shot {
      let pick: Shot;
      if (!cands.length) {
        // Plano B: disco mais próximo chuta direto na bola.
        let best = -1, bd = Infinity;
        for (let i = 1; i < snapshot.length; i++) {
          if (snapshot[i].team !== team) continue;
          const d = Math.hypot(snapshot[i].x - snapshot[0].x, snapshot[i].y - snapshot[0].y);
          if (d < bd) { bd = d; best = i; }
        }
        const s = snapshot[best];
        const l = bd || 1;
        pick = { i: best, dx: (snapshot[0].x - s.x) / l, dy: (snapshot[0].y - s.y) / l, p: 0.8 };
      } else {
        const sorted = cands.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        const pool = sorted.slice(0, cfg.pickTop);
        pick = pool[(Math.random() * pool.length) | 0];
      }
      const ang = Math.atan2(pick.dy, pick.dx) + gauss() * cfg.noiseAng;
      const p = Math.max(0.2, Math.min(1, pick.p * (1 + gauss() * cfg.noisePow)));
      return { i: pick.i, dx: Math.cos(ang), dy: Math.sin(ang), p };
    },
  };
}

export const AI = { createPlanner, LEVELS };

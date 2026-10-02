// Jogador-robô habilidoso para medir os lances (usado por scripts/lances-test.ts).
import { Chance, GOAL_Z, type LanceResult } from '../src/lances/engine';

const hyp = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

/** Distância de um ponto à reta do passe (só dentro do segmento). */
function laneDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return hyp(px, pz, ax + dx * t, az + dz * t);
}

/**
 * Robô quase perfeito: conduz desviando da marcação, dribla quando colado, lança quem está em condição
 * (por cima se a linha de passe estiver fechada), chuta no canto oposto ao goleiro e dá cavadinha se ele sair.
 */
export function playBot(c: Chance, rng: () => number): LanceResult {
  let passes = 0, shot = false, t = 0, nextSteer = 0;
  while (c.phase !== 'done' && t < 25) {
    c.update(1 / 60); t += 1 / 60;
    if (c.phase !== 'play') continue;
    const car = c.actors[c.carrier];
    const defs = c.defenders.filter((d) => d.stunT <= 0);
    const nearD = defs.slice().sort((a, b) => hyp(a.x, a.z, car.x, car.z) - hyp(b.x, b.z, car.x, car.z))[0];
    const near = nearD ? hyp(nearD.x, nearD.z, car.x, car.z) : 9;
    const k = c.keeper;
    const dGoal = hyp(car.x, car.z, 0, GOAL_Z);
    // Zagueiro na frente (entre a bola e o gol, a menos de 3,5 m)?
    const front = defs.some((d) => d.z > car.z && d.z - car.z < 3.5 && Math.abs(d.x - car.x) < 1.8);
    if (!shot && ((dGoal < 16 && (front || c.clock > 2.5)) || (dGoal < 22 && near < 1.3) || c.timeLeft < 1.2)) {
      if (k.z < GOAL_Z - 2.6 && dGoal < 13 && dGoal > 7) c.commandShot({ tx: k.x > 0 ? -1.5 : 1.5, ty: 1.9, power: 0.35, curve: 0 });
      else c.commandShot({ tx: k.x > 0 ? -2.9 : 2.9, ty: 0.4 + rng() * 1.6, power: 0.75, curve: 0 });
      shot = true;
      continue;
    }
    if (near < 1.7 && c.dribbleCd === 0 && rng() < 0.05) { c.commandDribble(); continue; }
    if (passes < 2 && c.clock > 1.2 && (near < 2.6 || front)) {
      const opts = c.attackers.filter((a) => a.i !== c.carrier && !c.isOffside(a) && a.z + a.vz * 0.8 < GOAL_Z - 7.5).map((a) => ({
        a, free: Math.min(9, ...defs.map((d) => hyp(d.x, d.z, a.x, a.z))),
        blocked: defs.some((d) => laneDist(d.x, d.z, car.x, car.z, a.x, a.z) < 1.6),
      }));
      opts.sort((x, y) => y.free + y.a.z * 0.15 - (x.free + x.a.z * 0.15));
      const o = opts[0];
      if (o && o.free > 2.5) { c.commandPass(o.a.i, o.blocked); passes++; continue; }
    }
    if (t >= nextSteer) {
      nextSteer = t + 0.25;
      const away = nearD && near < 5 ? Math.sign(car.x - nearD.x) || 1 : -Math.sign(car.x) * 0.5;
      c.commandMove(car.x + away * 2.5, car.z + 4, near < 4);
    }
  }
  if (!(c.phase === 'done' && c.result)) throw new Error('Falhou: o lance precisa terminar');
  return c.result!;
}

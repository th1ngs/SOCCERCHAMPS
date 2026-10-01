import assert from "node:assert/strict";
import { KICKOFF_MAX_POWER, Match, type Team } from "../src/arcade/game";
import { F, P, formationLayout, kickoffBodies, simulate, type Layout } from "../src/arcade/physics";
import { createPlanner } from "../src/arcade/ai";
import { FORMATIONS, FORMATION_KEYS } from "../src/game/data";

const teams: [Team, Team] = [
  { id: "home", name: "Casa", flag: { type: "h", colors: ["#fff", "#000"] } },
  { id: "away", name: "Fora", flag: { type: "h", colors: ["#000", "#fff"] } },
];
const match = new Match({ teams, controllers: ["human", "human"], difficulty: ["medium", "medium"], duration: 120, goldenGoal: false, silent: true });

// Estes dois chutes de força total faziam gol diretamente da saída.
for (const [discIndex, angle] of [[4, 45], [5, 315]]) {
  const bodies = kickoffBodies();
  bodies[discIndex].vx = Math.cos(angle * Math.PI / 180) * P.maxShot;
  bodies[discIndex].vy = Math.sin(angle * Math.PI / 180) * P.maxShot;
  assert.equal(simulate(bodies, 7).goal, 0);
}

// A força limitada da saída não deve produzir gol direto, de nenhum dos lados.
for (const team of [0, 1]) {
  for (let discIndex = 1 + team * 5; discIndex <= 5 + team * 5; discIndex++) {
    for (let angle = 0; angle < 360; angle += 3) {
      const bodies = kickoffBodies();
      bodies[discIndex].vx = Math.cos(angle * Math.PI / 180) * KICKOFF_MAX_POWER * P.maxShot;
      bodies[discIndex].vy = Math.sin(angle * Math.PI / 180) * KICKOFF_MAX_POWER * P.maxShot;
      assert.notEqual(simulate(bodies, 7).goal, team, `Gol direto na saída: time ${team}, disco ${discIndex}, ângulo ${angle}`);
    }
  }
}

match.startTurn(0);
match.shoot(match.bodies[4], Math.SQRT1_2, Math.SQRT1_2, 1);
assert.equal(match.bodies[4].vx, Math.SQRT1_2 * KICKOFF_MAX_POWER * P.maxShot);
assert.equal(match.kickoffTurn, false);
match.startTurn(1);
match.shoot(match.bodies[6], -1, 0, 1);
assert.equal(match.bodies[6].vx, -P.maxShot);
match.kickoff(1);
assert.equal(match.kickoffTurn, true);

console.log("Saída curta e força normal após a primeira jogada: OK");

// Formato de 11: todas as formações cabem no próprio campo, sem discos sobrepostos nem dentro do círculo central.
for (const key of FORMATION_KEYS) {
  const layout = formationLayout(FORMATIONS[key]);
  const bodies = kickoffBodies([layout, layout]);
  assert.equal(bodies.length, 23);
  for (let i = 1; i < bodies.length; i++) {
    const b = bodies[i];
    assert.ok(b.y - b.r >= F.top && b.y + b.r <= F.bottom, `${key}: disco fora do campo`);
    assert.ok(Math.hypot(b.x - F.cx, b.y - F.cy) > 85 + b.r, `${key}: disco no círculo central`);
    assert.ok(b.team === 0 ? b.x < F.cx : b.x > F.cx, `${key}: disco no campo adversário`);
    for (let j = i + 1; j < bodies.length; j++) {
      const o = bodies[j];
      assert.ok(Math.hypot(b.x - o.x, b.y - o.y) >= b.r + o.r + 8, `${key}: discos ${i} e ${j} colados`);
    }
  }
  // Nenhuma saída curta faz gol direto.
  for (const team of [0, 1]) {
    for (let k = 1 + team * 11; k <= 11 + team * 11; k++) {
      for (let angle = 0; angle < 360; angle += 6) {
        const bs = kickoffBodies([layout, layout]);
        bs[k].vx = Math.cos(angle * Math.PI / 180) * KICKOFF_MAX_POWER * P.maxShot;
        bs[k].vy = Math.sin(angle * Math.PI / 180) * KICKOFF_MAX_POWER * P.maxShot;
        assert.notEqual(simulate(bs, 7).goal, team, `${key}: gol direto na saída (time ${team}, disco ${k}, ${angle}°)`);
      }
    }
  }
}

// IA no formato de 11: cada quadro respeita o orçamento de tempo e a jogada fica pronta.
const eleven: [Layout, Layout] = [formationLayout(FORMATIONS["4-4-2"]), formationLayout(FORMATIONS["4-3-3"])];
const planner = createPlanner(kickoffBodies(eleven), 1, "hard");
let frames = 0, worst = 0;
while (!planner.done && frames < 500) {
  const t0 = performance.now();
  planner.step(28);
  worst = Math.max(worst, performance.now() - t0);
  frames++;
}
assert.ok(planner.done, "IA não terminou de planejar");
const shot = planner.choose();
assert.ok(shot.i >= 12 && shot.i <= 22, "IA escolheu disco do outro time");
console.log(`Formato de 11: formações OK; IA planejou em ${frames} quadros (pior ${worst.toFixed(1)} ms)`);

// Autor do gol: o último disco do time que marcou a tocar na bola.
const m11 = new Match({ teams, controllers: ["human", "human"], difficulty: ["medium", "medium"], duration: 120, goldenGoal: false, silent: true, layouts: eleven });
m11.touches = [14, 20];
assert.deepEqual([m11.creditGoal(0).slot, m11.creditGoal(0).assist], [null, null], "só o adversário tocou = gol contra");
m11.touches = [3, 9, 20];
assert.deepEqual([m11.creditGoal(0).slot, m11.creditGoal(0).assist], [m11.bodies[9].slot, m11.bodies[3].slot], "desvio do adversário mantém o autor");
m11.touches = [3, 20, 9];
assert.equal(m11.creditGoal(0).assist, null, "toque adversário no meio corta a assistência");
m11.touches = [20, 3, 9];
const g = m11.creditGoal(0);
assert.equal(g.slot, m11.bodies[9].slot);
assert.equal(g.assist, m11.bodies[3].slot);
console.log("Autor e garçom do gol: OK");

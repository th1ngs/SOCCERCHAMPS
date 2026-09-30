import assert from "node:assert/strict";
import { KICKOFF_MAX_POWER, Match, type Team } from "../src/arcade/game";
import { P, kickoffBodies, simulate } from "../src/arcade/physics";

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

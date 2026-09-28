// Teste de fumaça da API de carreiras. Uso: API=http://localhost:3000 npx tsx scripts/api-smoke.ts
import { autoLineup, CLUBS, endWeek, newWorld, simulateWeek, startSeason } from "../src/game";

const API = process.env.API ?? "http://localhost:3000";

async function req(path: string, init?: RequestInit) {
  const r = await fetch(API + path, { ...init, headers: { "Content-Type": "application/json" } });
  return { status: r.status, body: await r.json() };
}

async function main() {
  const w = newWorld("Tester", CLUBS[0].id);
  startSeason(w);
  for (const c of Object.values(w.clubs)) autoLineup(w, c);
  for (let i = 0; i < 3; i++) {
    simulateWeek(w);
    endWeek(w);
  }
  const created = await req("/api/careers", { method: "POST", body: JSON.stringify({ data: w }) });
  console.log("POST", created.status, created.body);
  const code = created.body.code as string;
  if (!code) process.exit(1);
  w.manager.name = "Tester 2";
  console.log("PUT", (await req(`/api/careers/${code}`, { method: "PUT", body: JSON.stringify({ data: w }) })).status);
  const got = await req(`/api/careers/${code.toLowerCase()}`);
  console.log("GET", got.status, got.body.data?.manager?.name, "semana", got.body.data?.week);
  console.log("GET formato inválido", (await req("/api/careers/XXXX")).status, "| inexistente", (await req("/api/careers/ABCDE-FGHJK")).status);
  console.log("POST save inválido", (await req("/api/careers", { method: "POST", body: JSON.stringify({ data: { a: 1 } }) })).status);
  console.log("HALL", (await req("/api/hall")).status);
}

main();

// Regras puras da tela de escalação (trocas, validação e candidatos).
import { available, clamp, playerFit } from "@/game";
import type { Club, Player, Position, TacticKey, World } from "@/game/types";

export const BENCH_SIZE = 7;

/** Explicação de cada estilo de jogo. */
export const TACTIC_HELP: Record<TacticKey, string> = {
  def: "Menos chances para o adversário, menos ataque.",
  bal: "Sem riscos extras.",
  att: "Mais ataque, defesa mais exposta.",
  press: "Rouba bola no meio e ataca mais, mas cansa bem mais.",
};

/** Coloca `pid` na posição `i` do campo; quem estava ali vai para o lugar de onde `pid` saiu (campo ou banco). */
export function assignSlot(c: Club, i: number, pid: string): void {
  const cur = c.lineup[i];
  const li = c.lineup.indexOf(pid);
  const bi = c.bench.indexOf(pid);
  if (li >= 0) c.lineup[li] = cur;
  else if (bi >= 0) {
    if (cur) c.bench[bi] = cur;
    else c.bench.splice(bi, 1);
  }
  c.lineup[i] = pid;
}

/** Coloca `pid` na vaga `i` do banco; quem estava ali vai para o lugar de onde `pid` saiu. */
export function assignBench(c: Club, i: number, pid: string): void {
  const cur = c.bench[i];
  const li = c.lineup.indexOf(pid);
  const bi = c.bench.indexOf(pid);
  if (li >= 0) c.lineup[li] = cur ?? null;
  else if (bi >= 0 && cur) c.bench[bi] = cur;
  c.bench[i] = pid;
}

const leaderOk = (w: World, c: Club, pid: string | null) => !!pid && c.squad.includes(pid) && available(w.players[pid]);

/** Verdadeiro se a escalação salva tem buracos, repetidos ou indisponíveis (aí chamamos ensureLineup). */
export function lineupNeedsFix(w: World, c: Club): boolean {
  if (!c.lineup || c.lineup.length !== 11 || !c.bench) return true;
  const seen = new Set<string>();
  for (const id of c.lineup) {
    if (!id || seen.has(id) || !c.squad.includes(id) || !available(w.players[id])) return true;
    seen.add(id);
  }
  for (const id of c.bench) {
    if (!id || seen.has(id) || !c.squad.includes(id) || !available(w.players[id])) return true;
    seen.add(id);
  }
  const free = c.squad.filter((id) => !seen.has(id) && available(w.players[id])).length;
  if (c.bench.length < BENCH_SIZE && free > 0) return true;
  return !leaderOk(w, c, c.captain) || !leaderOk(w, c, c.penTaker);
}

export type Role = "TIT" | "RES" | null;

export interface Candidate {
  p: Player;
  /** Overall efetivo na vaga (overall × encaixe na posição). */
  score: number;
  fit: number;
  role: Role;
}

/** Jogadores aptos, do mais indicado ao menos indicado para a vaga (`slotPos` null = banco). */
export function candidates(w: World, c: Club, slotPos: Position | null): Candidate[] {
  const starters = new Set(c.lineup);
  const bench = new Set(c.bench);
  return c.squad
    .map((id) => w.players[id])
    .filter((p) => available(p))
    .map((p) => {
      const f = slotPos ? playerFit(p, slotPos) : 1;
      return { p, fit: f, score: p.ovr * f, role: starters.has(p.id) ? "TIT" : bench.has(p.id) ? "RES" : null } as Candidate;
    })
    .sort((a, b) => b.score - a.score);
}

/** Largura da barra de força do setor (40 → 4%, 90 → 100%). */
export const sectorWidth = (v: number): number => clamp((v - 40) * 2, 4, 100);

/** Cor do aviso de fora de posição. */
export const fitTone = (f: number): "ok" | "warn" | "bad" => (f >= 1 ? "ok" : f < 0.8 ? "bad" : "warn");

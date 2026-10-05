// Save compacto (v12): os jogadores são gravados sem os campos que estão no valor padrão (null, false, 0,
// estatísticas zeradas), que eram ~30% do save. `unpackWorld` restaura tudo antes da migração.
import type { Player, World } from './types';

const ZERO_S = { apps: 0, goals: 0, assists: 0, rsum: 0 };
const ZERO_C = { apps: 0, goals: 0, assists: 0 };
/** Valores padrão dos campos que todo jogador tem. */
const DEFAULTS: Record<string, unknown> = {
  youth: false, inj: 0, susp: 0, yc: 0, listed: false, num: 0, played: false, injType: null, star: false,
  loan: null, releaseClause: 0, clubId: null, fitness: 100,
};
const isZero = (o: unknown, keys: string[]): boolean => !!o && typeof o === 'object' && keys.every((k) => (o as Record<string, unknown>)[k] === 0);

function packPlayer(p: Player): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (k in DEFAULTS && v === DEFAULTS[k]) continue;
    if (k === 'renewAsk' && v == null) continue; // ausente e null significam o mesmo
    if (k === 's' && isZero(v, ['apps', 'goals', 'assists', 'rsum'])) continue;
    if (k === 'c' && isZero(v, ['apps', 'goals', 'assists'])) continue;
    if (k === 'fitness' || k === 'morale') { out[k] = Math.round((v as number) * 10) / 10; continue; }
    out[k] = v;
  }
  return out;
}

/** Cópia rasa do mundo com os jogadores compactados (para gravar). */
export function packWorld(w: World): unknown {
  const players: Record<string, unknown> = {};
  for (const [id, p] of Object.entries(w.players)) players[id] = packPlayer(p);
  return { ...w, players, packed: 1 };
}

/** Restaura os campos omitidos por `packWorld` (chamado no início da migração). */
export function unpackWorld(w: World): void {
  const lw = w as World & { packed?: number };
  if (!lw.packed) return;
  for (const p of Object.values(w.players) as unknown as Record<string, unknown>[]) {
    for (const [k, v] of Object.entries(DEFAULTS)) if (!(k in p)) p[k] = v;
    if (!p.s) p.s = { ...ZERO_S };
    if (!p.c) p.c = { ...ZERO_C };
  }
  delete lw.packed;
}

// Monta os lances: jogadores reais do Manager (com atributos) ou elencos genéricos para o arcade e o online.
import { FORMATIONS, attr, makeName } from "@/game";
import type { Club, LeagueId, Player, Position, World } from "@/game/types";
import type { BotParams } from "./difficulty";
import type { ChanceSetup, LanceKit, LancePlayer, ScenarioKind } from "./engine";

const KINDS: ScenarioKind[] = ["centro", "ponta", "contra", "entrada"];
const CARRIER_W: Partial<Record<Position, number>> = { ATA: 5, MEI: 4, LAT: 1.2, VOL: 1 };
const MATE_W: Partial<Record<Position, number>> = { ATA: 5, MEI: 4, LAT: 2, VOL: 1.2 };
const DEF_W: Partial<Record<Position, number>> = { ZAG: 5, LAT: 3, VOL: 3, MEI: 0.6 };

export const kitOf = (c: { name: string; short: string; colors: readonly string[]; pattern: string }): LanceKit => ({
  name: c.name, short: c.short, colors: [c.colors[0], c.colors[1]], pattern: c.pattern,
});

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const near = (a: string, b: string): boolean => {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2) < 110;
};

/** Uniforme da defesa sem confundir com o do ataque (mesmo time ou cores parecidas): inverte ou usa um reserva. */
export function contrastKit(def: LanceKit, att: LanceKit): LanceKit {
  if (!near(def.colors[0], att.colors[0])) return def;
  const swapped: LanceKit = { ...def, colors: [def.colors[1], def.colors[0]], pattern: "solid" };
  if (!near(swapped.colors[0], att.colors[0]) && !near(swapped.colors[0], att.colors[1])) return swapped;
  const alt = near("#c81e3c", att.colors[0]) || near("#c81e3c", att.colors[1]) ? "#1d4ed8" : "#c81e3c";
  return { ...def, colors: [alt, "#ffffff"], pattern: "solid" };
}

const fromPlayer = (p: Player): LancePlayer => ({
  id: p.id, name: p.name.split(" ").slice(-1)[0], num: p.num || 0,
  attrs: { fin: attr(p, "fin"), pas: attr(p, "pas"), dri: attr(p, "dri"), vel: attr(p, "vel"), mar: attr(p, "mar"), ref: attr(p, "ref"), col: attr(p, "col"), fol: attr(p, "fol"), cab: attr(p, "cab"), bp: attr(p, "bp") },
});

function pickWeighted<T>(items: T[], w: (x: T) => number, rng: () => number): T | undefined {
  const total = items.reduce((s, x) => s + w(x), 0);
  if (total <= 0) return items[0];
  let r = rng() * total;
  for (const x of items) { r -= w(x); if (r <= 0) return x; }
  return items[items.length - 1];
}

/** Titulares com a posição da vaga (o lance usa a função em campo, não a de origem). */
function onField(w: World, club: Club): { p: Player; pos: Position }[] {
  const slots = FORMATIONS[club.formation];
  return club.lineup.map((id, i) => (id && w.players[id] ? { p: w.players[id], pos: slots[i].pos } : null)).filter((x): x is { p: Player; pos: Position } => !!x);
}

export const randomKind = (rng: () => number = Math.random): ScenarioKind => KINDS[Math.floor(rng() * KINDS.length)];

/** Lance do Manager: atacantes do clube do usuário contra a defesa e o goleiro do adversário. */
export function clubChance(w: World, att: Club, def: Club, bot: BotParams, rng: () => number = Math.random, kind: ScenarioKind = randomKind(rng)): ChanceSetup {
  const mine = onField(w, att), theirs = onField(w, def);
  const pool = mine.filter((x) => x.pos !== "GOL");
  const carrier = pickWeighted(pool, (x) => CARRIER_W[x.pos] ?? 0.5, rng) ?? pool[0];
  const mates: Player[] = [];
  const rest = pool.filter((x) => x !== carrier);
  while (mates.length < 3 && rest.length) {
    const m = pickWeighted(rest, (x) => MATE_W[x.pos] ?? 0.5, rng) as (typeof rest)[number];
    mates.push(m.p);
    rest.splice(rest.indexOf(m), 1);
  }
  const defPool = theirs.filter((x) => x.pos !== "GOL").sort((a, b) => (DEF_W[b.pos] ?? 0.3) - (DEF_W[a.pos] ?? 0.3) || b.p.ovr - a.p.ovr);
  const gk = theirs.find((x) => x.pos === "GOL")?.p ?? theirs[0].p;
  return {
    attack: { kit: kitOf(att), players: [carrier.p, ...mates].map(fromPlayer) },
    defense: { kit: contrastKit(kitOf(def), kitOf(att)), players: defPool.slice(0, 4).map((x) => fromPlayer(x.p)), gk: fromPlayer(gk) },
    bot, kind, mirror: rng() < 0.5,
  };
}

/** Elenco genérico de um time do arcade a partir da força (overall médio). */
export function genericSquad(id: string, league: LeagueId, rating: number): { att: LancePlayer[]; def: LancePlayer[]; gk: LancePlayer } {
  // Nomes estáveis por time (mesma semente a cada partida).
  let seed = [...id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const saved = Math.random;
  Math.random = rnd; // makeName usa Math.random: troca temporária para nomes determinísticos
  try {
    const mk = (num: number, off: Partial<Record<keyof LancePlayer["attrs"], number>>): LancePlayer => {
      const base = (k: keyof LancePlayer["attrs"]) => Math.round(Math.max(30, Math.min(97, rating + (off[k] ?? -12) + (rnd() - 0.5) * 8)));
      return { id: `${id}:${num}`, name: makeName(league).split(" ").slice(-1)[0], num, attrs: { fin: base("fin"), pas: base("pas"), dri: base("dri"), vel: base("vel"), mar: base("mar"), ref: base("ref"), col: base("col"), fol: base("fol"), cab: base("cab"), bp: base("bp") } };
    };
    return {
      att: [mk(9, { fin: 4, dri: 0, vel: 2, pas: -6, cab: 3, fol: -4, bp: -6 }), mk(10, { fin: -2, pas: 4, dri: 3, vel: -2, bp: 5, fol: -2, cab: -10 }), mk(11, { fin: -3, dri: 2, vel: 4, pas: -4, fol: 2, cab: -8, bp: -2 }), mk(7, { fin: -4, dri: 1, vel: 3, pas: -3, fol: 4, cab: -6, bp: 0 })],
      def: [mk(4, { mar: 4, vel: -4, cab: 4 }), mk(3, { mar: 3, vel: -3, cab: 3 }), mk(2, { mar: 0, vel: 2, fol: 2 }), mk(5, { mar: 2, vel: 0, fol: 0 })],
      gk: mk(1, { ref: 4, col: 2, vel: -20 }),
    };
  } finally {
    Math.random = saved;
  }
}

export interface GenericTeam {
  id: string;
  rating: number;
  club: { name: string; short: string; colors: readonly string[]; pattern: string; league: LeagueId };
}

/** Lance do arcade/online: elencos genéricos dos dois times. */
export function genericChance(att: GenericTeam, def: GenericTeam, bot: BotParams, rng: () => number = Math.random, kind: ScenarioKind = randomKind(rng)): ChanceSetup {
  const a = genericSquad(att.id, att.club.league, att.rating), d = genericSquad(def.id, def.club.league, def.rating);
  // Quem conduz varia a cada lance.
  const order = a.att.slice().sort(() => rng() - 0.5);
  return {
    attack: { kit: kitOf(att.club), players: order.slice(0, 4) },
    defense: { kit: contrastKit(kitOf(def.club), kitOf(att.club)), players: d.def, gk: d.gk },
    bot, kind, mirror: rng() < 0.5,
  };
}

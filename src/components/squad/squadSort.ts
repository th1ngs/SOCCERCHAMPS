// Ordenação da lista do elenco (pura).
import { LEAGUE_IDS, POS, valueOf } from "@/game";
import type { Player } from "@/game/types";

export type SortKey = "num" | "name" | "nat" | "pos" | "age" | "ovr" | "pot" | "fit" | "morale" | "goals" | "value" | "contract";
export type SortDir = "asc" | "desc";
export interface SortState {
  key: SortKey;
  dir: SortDir;
}

/** Comparadores em ordem crescente; `dir` inverte. */
const ASC: Record<SortKey, (a: Player, b: Player) => number> = {
  num: (a, b) => (a.num || 99) - (b.num || 99),
  name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
  nat: (a, b) => LEAGUE_IDS.indexOf(a.nat) - LEAGUE_IDS.indexOf(b.nat) || b.ovr - a.ovr,
  pos: (a, b) => POS.indexOf(a.pos) - POS.indexOf(b.pos) || b.ovr - a.ovr,
  age: (a, b) => a.age - b.age,
  ovr: (a, b) => a.ovr - b.ovr,
  pot: (a, b) => a.pot - b.pot,
  fit: (a, b) => a.fitness - b.fitness,
  morale: (a, b) => a.morale - b.morale,
  goals: (a, b) => a.s.goals - b.s.goals || a.s.apps - b.s.apps,
  value: (a, b) => valueOf(a) - valueOf(b),
  contract: (a, b) => a.contract - b.contract,
};

/** Direção inicial ao clicar numa coluna (números "melhores" primeiro). */
export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  num: "asc",
  name: "asc",
  nat: "asc",
  pos: "asc",
  age: "asc",
  ovr: "desc",
  pot: "desc",
  fit: "desc",
  morale: "desc",
  goals: "desc",
  value: "desc",
  contract: "asc",
};

export const SORT_LABEL: Record<SortKey, string> = {
  num: "Número",
  name: "Nome",
  nat: "Nacionalidade",
  pos: "Posição",
  age: "Idade",
  ovr: "Overall",
  pot: "Potencial",
  fit: "Condição",
  morale: "Moral",
  goals: "Gols",
  value: "Valor",
  contract: "Contrato",
};

/** `potOf` devolve o potencial conhecido (meio da faixa) para não revelar o valor real. */
export function sortPlayers(list: Player[], s: SortState, potOf?: (p: Player) => number): Player[] {
  const cmp = s.key === "pot" && potOf ? (a: Player, b: Player) => potOf(a) - potOf(b) : ASC[s.key];
  const k = s.dir === "asc" ? 1 : -1;
  return list.slice().sort((a, b) => k * cmp(a, b));
}

/** Clique no cabeçalho: mesma coluna inverte; outra coluna usa a direção padrão. */
export const nextSort = (cur: SortState, key: SortKey): SortState =>
  cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: DEFAULT_DIR[key] };

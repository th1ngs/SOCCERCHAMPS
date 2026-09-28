// Utilitários gerais do modo Manager.

export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
export const randi = (a: number, b: number): number => Math.floor(rand(a, b + 1));
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p: number): boolean => Math.random() < p;
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

export function sum(arr: readonly number[]): number;
export function sum<T>(arr: readonly T[], f: (x: T) => number): number;
export function sum<T>(arr: readonly T[], f: (x: T) => number = (x) => x as unknown as number): number {
  return arr.reduce((s, x) => s + f(x), 0);
}

export function avg(arr: readonly number[]): number;
export function avg<T>(arr: readonly T[], f: (x: T) => number): number;
export function avg<T>(arr: readonly T[], f?: (x: T) => number): number {
  return arr.length ? (f ? sum(arr, f) : sum(arr as unknown as number[])) / arr.length : 0;
}

export const gauss = (): number => {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Embaralha no lugar e devolve o próprio array. */
export const shuffle = <T>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Escolha ponderada: wfn(item) >= 0. Retorna null só se a lista estiver vazia. */
export function weighted<T>(items: readonly T[], wfn: (item: T) => number): T | null {
  let total = 0;
  const ws = items.map((it) => { const w = Math.max(0, wfn(it)); total += w; return w; });
  if (total <= 0) return items.length ? pick(items) : null;
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

/** Valores em reais. Ex.: 1.5e6 -> "R$ 1,5 mi" (era U.money). */
export const formatMoney = (v: number): string => {
  const neg = v < 0 ? '-' : '';
  const a = Math.abs(v);
  let s: string;
  if (a >= 1e9) s = (a / 1e9).toFixed(1) + ' bi';
  else if (a >= 1e6) s = (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + ' mi';
  else if (a >= 1e3) s = Math.round(a / 1e3) + ' mil';
  else s = Math.round(a).toString();
  return neg + 'R$ ' + s.replace('.', ',');
};

export const stars = (v: number, max = 5): string => {
  const full = Math.floor(v), half = v - full >= 0.5;
  return '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(Math.max(0, max - full - (half ? 1 : 0)));
};

export const ordinal = (n: number): string => n + 'º';

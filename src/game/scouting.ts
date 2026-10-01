// Olheiros e potencial escondido: faixas de potencial, características conhecidas, relatórios e foco da base.
import { ATTRS, ATTRS_FOR, TRAITS } from './data';
import { attr, valueOf } from './gen';
import { LEAGUES, TOTAL_WEEKS } from './leagues';
import { askingPrice } from './market';
import type { AcademyFocus, AttrKey, Player, PotentialRange, ScoutLevel, ScoutRequestResult, TraitKey, World } from './types';
import { clamp } from './util';
import { addMoney, clubPlayers, pushMessage, user } from './world';
import { bestScoutSkill, reportWeeks, scoutForPlayer, scoutStaff } from './scouts';

/** Largura da faixa de potencial para jogadores de outros clubes, por nível de conhecimento. */
export const SCOUT_WIDTH: Record<ScoutLevel, number> = { 0: 22, 1: 12, 2: 0 };
/** Semanas no clube para o potencial de um jogador do elenco ficar exato. */
export const KNOW_WEEKS = 10;
/** Estreitamento da faixa dos garotos da base por temporada. */
const YOUTH_NARROW = 0.6;

/** Hash estável (FNV-1a) → [0, 1). Usado para posicionar a faixa sem Math.random na leitura. */
export function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296;
}

/** Semanas desde uma data (temporada, semana). */
export const weeksSince = (w: World, d: { season: number; week: number }): number => (w.season - d.season) * TOTAL_WEEKS + (w.week - d.week);

/** Nível de conhecimento do usuário sobre um jogador de fora. */
export const scoutLevel = (w: World, pid: string): ScoutLevel => w.scouting[pid]?.level ?? 0;

/** O jogador pertence ao usuário (elenco, base ou emprestado a outro clube)? */
export function isOwnPlayer(w: World, p: Player): boolean {
  return p.loan ? p.loan.from === w.userClub : p.clubId === w.userClub;
}

function place(p: Player, width: number): PotentialRange {
  const pot = Math.round(p.pot);
  const wd = Math.round(width);
  if (wd <= 0) return { min: pot, max: pot, exact: true };
  let min = pot - Math.round(hash01(p.id) * wd);
  let max = min + wd;
  if (max > 99) { min -= max - 99; max = 99; }
  if (min < 1) { max += 1 - min; min = 1; }
  return { min, max, exact: false };
}

/** Largura inicial da faixa de potencial na base: 24 − 3·base − 2·nível do olheiro-chefe (mín. 4). */
export const youthRangeWidth = (academy: number, scoutSkill: number): number => Math.max(4, 24 - 3 * academy - 2 * scoutSkill);

/** Largura da faixa de um garoto da base do usuário. */
function youthWidth(w: World, p: Player): number {
  const u = user(w);
  const base = youthRangeWidth(u.academy, Math.max(1, bestScoutSkill(w)));
  const seasons = Math.max(0, w.season - (p.start?.season ?? w.season));
  return base * Math.pow(YOUTH_NARROW, seasons);
}

/**
 * Faixa de potencial que o usuário enxerga. Sempre contém o potencial real (posição estável por hash do id).
 * - Elenco do usuário: exato após 10 semanas no clube.
 * - Base do usuário: largura 24 − 3·academy − 2·olheiro-chefe (mín. 4), −40% por temporada; exato com relatório.
 * - Outros: 22 (básico), 12 (observado), exato (relatório).
 */
export function potentialRange(w: World, p: Player): PotentialRange {
  const level = scoutLevel(w, p.id);
  if (level === 2) return place(p, 0);
  if (isOwnPlayer(w, p)) {
    const youth = p.youth || !!(p.loan && p.loan.youth);
    if (youth) return place(p, youthWidth(w, p));
    if (p.loan) return place(p, 0); // emprestado pelo usuário: o clube conhece
  }
  if (p.clubId === w.userClub && !p.youth) {
    if (!p.joined || weeksSince(w, p.joined) >= KNOW_WEEKS) return place(p, 0);
  }
  return place(p, SCOUT_WIDTH[level]);
}

/**
 * Habilidades conhecidas. Desde a v5 elas são públicas (fama do jogador: todo mundo sabe quem bate falta
 * ou é velocista); o que os olheiros revelam são o potencial e os atributos exatos. Mantém `| null` por compatibilidade.
 */
export function knownTraits(_w: World, p: Player): TraitKey[] | null {
  return p.traits.slice();
}

/** Atributo como o usuário o conhece: exato, aproximado (±, observado) ou desconhecido. */
export interface KnownAttr {
  key: AttrKey;
  value: number;
  /** Faixa conhecida (min = max quando exato). */
  min: number;
  max: number;
  exact: boolean;
}

/**
 * Atributos conhecidos na ordem da posição (ATTRS_FOR). Jogadores do usuário e com relatório: exatos;
 * observados: faixa de ±4 (estável por jogador); sem observação: null.
 */
export function knownAttrs(w: World, p: Player): KnownAttr[] | null {
  const level = scoutLevel(w, p.id);
  const own = isOwnPlayer(w, p) || p.clubId === w.userClub || level === 2;
  if (!own && level < 1) return null;
  return ATTRS_FOR[p.pos].map((key) => {
    const value = attr(p, key);
    if (own) return { key, value, min: value, max: value, exact: true };
    const shift = Math.round(hash01(`${p.id}:${key}`) * 8) - 4;
    const min = clamp(value - 4 + shift, 1, 99), max = clamp(value + 4 + shift, 1, 99);
    return { key, value, min: Math.min(min, value), max: Math.max(max, value), exact: false };
  });
}

/** Joia: potencial real ≥ 80 e até 17 anos (a UI só mostra o selo quando a faixa conhecida tem min ≥ 78). */
export const isGem = (p: Player): boolean => p.pot >= 80 && p.age <= 17;

/** Custo de um relatório de olheiro. */
export const scoutCost = (w: World): number => Math.round((60000 * LEAGUES[user(w).league].wealth) / 1000) * 1000;
/** Relatórios simultâneos: um por olheiro contratado. */
export const scoutSlots = (w: World): number => scoutStaff(w).length;

/** Marca o jogador como observado (nível 1) de graça; chame ao abrir a ficha de um jogador de outro clube. */
export function observe(w: World, pid: string): void {
  const p = w.players[pid];
  if (!p || isOwnPlayer(w, p) || p.clubId === w.userClub) return;
  if (scoutLevel(w, pid) < 1) w.scouting[pid] = { level: 1, season: w.season };
}

/** Encomenda um relatório completo a um olheiro livre (1 semana com especialista ou nível 3+; senão 2). */
export function requestScoutReport(w: World, pid: string): ScoutRequestResult {
  const p = w.players[pid];
  const u = user(w);
  if (!p) return { ok: false, reason: 'Jogador não encontrado.' };
  const ownYouth = isOwnPlayer(w, p) && (p.youth || !!(p.loan && p.loan.youth));
  if (!ownYouth && (isOwnPlayer(w, p) || p.clubId === u.id)) return { ok: false, reason: 'O jogador já é do seu elenco.' };
  if (scoutLevel(w, pid) === 2) return { ok: false, reason: 'Você já tem o relatório completo deste jogador.' };
  const queued = w.scoutQueue.find((j) => j.pid === pid);
  if (queued) return { ok: false, reason: 'Relatório já encomendado.', readyWeek: queued.readyWeek };
  if (!scoutSlots(w)) return { ok: false, reason: 'Contrate um olheiro na Base para pedir relatórios.' };
  const scout = scoutForPlayer(w, p);
  if (!scout) return { ok: false, reason: `Todos os ${scoutSlots(w)} olheiros estão ocupados.` };
  const cost = scoutCost(w);
  if (u.money < cost) return { ok: false, reason: 'Dinheiro insuficiente para enviar o olheiro.' };
  addMoney(w, u.id, -cost, 'other');
  const readyWeek = w.week + reportWeeks(scout, p, w);
  w.scoutQueue.push({ pid, readyWeek, season: w.season, scoutId: scout.id });
  observe(w, pid);
  return { ok: true, readyWeek };
}

/** Veredito do olheiro em relação ao elenco do usuário. */
export function scoutVerdict(w: World, p: Player): string {
  const squad = clubPlayers(w, user(w)).sort((a, b) => b.ovr - a.ovr);
  const eleventh = squad[10]?.ovr ?? 0;
  const top11 = squad.slice(0, 11);
  const avg11 = top11.length ? top11.reduce((s, x) => s + x.ovr, 0) / top11.length : 0;
  if (p.ovr >= eleventh) return 'Pode ser titular';
  if (p.age <= 21 && p.pot >= avg11) return 'Promessa';
  if ((p.clubId && askingPrice(w, p) > valueOf(p) * 1.5) || p.ovr < eleventh - 8) return 'Não vale o preço';
  return 'Opção para o elenco';
}

/** Entrega os relatórios prontos (chamado no endWeek/newSeason). */
export function processScoutQueue(w: World): void {
  if (!w.scoutQueue.length) return;
  const keep = [];
  for (const job of w.scoutQueue) {
    if (job.season === w.season && job.readyWeek > w.week) { keep.push(job); continue; }
    const p = w.players[job.pid];
    if (!p) continue;
    w.scouting[p.id] = { level: 2, season: w.season };
    const traits = p.traits.map((t) => TRAITS[t].name).join(', ') || 'nenhuma';
    const top = ATTRS_FOR[p.pos].map((k) => ({ k, v: attr(p, k) })).sort((a, b) => b.v - a.v).slice(0, 3)
      .map(({ k, v }) => `${ATTRS[k].name} ${v}`).join(', ');
    const club = p.clubId ? w.clubs[p.clubId].name : 'sem clube';
    const by = scoutStaff(w).find((s) => s.id === job.scoutId);
    pushMessage(w, {
      kind: 'info',
      pid: p.id,
      title: `Relatório ${by ? `de ${by.name}` : 'do olheiro'}: ${p.name}`,
      body: `${p.name} (${p.pos}, ${p.age} anos, ${club}): overall ${Math.round(p.ovr)}, potencial ${Math.round(p.pot)}. Pontos fortes: ${top}. Habilidades: ${traits}${p.star ? ' • Craque' : ''}. Veredito: ${scoutVerdict(w, p)}.`,
    });
  }
  w.scoutQueue = keep;
}

/** Define o foco das categorias de base do usuário. */
export function setAcademyFocus(w: World, focus: AcademyFocus): void {
  user(w).academyFocus = focus;
}

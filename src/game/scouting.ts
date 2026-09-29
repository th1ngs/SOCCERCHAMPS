// Olheiros e potencial escondido: faixas de potencial, características conhecidas, relatórios e foco da base.
import { TRAITS } from './data';
import { valueOf } from './gen';
import { LEAGUES, TOTAL_WEEKS } from './leagues';
import { askingPrice } from './market';
import type { AcademyFocus, Player, PotentialRange, ScoutLevel, ScoutRequestResult, TraitKey, World } from './types';
import { addMoney, clubPlayers, pushMessage, user } from './world';

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

/** Largura da faixa de um garoto da base do usuário. */
function youthWidth(w: World, p: Player): number {
  const u = user(w);
  const base = Math.max(4, 24 - 3 * u.academy - 2 * (u.scouting || 1));
  const seasons = Math.max(0, w.season - (p.start?.season ?? w.season));
  return base * Math.pow(YOUTH_NARROW, seasons);
}

/**
 * Faixa de potencial que o usuário enxerga. Sempre contém o potencial real (posição estável por hash do id).
 * - Elenco do usuário: exato após 10 semanas no clube.
 * - Base do usuário: largura 24 − 3·academy − 2·scouting (mín. 4), −40% por temporada; exato com relatório.
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

/** Características conhecidas (null se o jogador é de fora e não há relatório). O selo de craque é sempre visível. */
export function knownTraits(w: World, p: Player): TraitKey[] | null {
  if (isOwnPlayer(w, p) || p.clubId === w.userClub || scoutLevel(w, p.id) === 2) return p.traits.slice();
  return null;
}

/** Joia: potencial real ≥ 80 e até 17 anos (a UI só mostra o selo quando a faixa conhecida tem min ≥ 78). */
export const isGem = (p: Player): boolean => p.pot >= 80 && p.age <= 17;

/** Custo de um relatório de olheiro. */
export const scoutCost = (w: World): number => Math.round((60000 * LEAGUES[user(w).league].wealth) / 1000) * 1000;
/** Relatórios simultâneos (= nível do departamento). */
export const scoutSlots = (w: World): number => Math.max(1, user(w).scouting || 1);

/** Marca o jogador como observado (nível 1) de graça; chame ao abrir a ficha de um jogador de outro clube. */
export function observe(w: World, pid: string): void {
  const p = w.players[pid];
  if (!p || isOwnPlayer(w, p) || p.clubId === w.userClub) return;
  if (scoutLevel(w, pid) < 1) w.scouting[pid] = { level: 1, season: w.season };
}

/** Encomenda um relatório completo (pronto em 1-2 semanas; 1 semana com departamento nível 3+). */
export function requestScoutReport(w: World, pid: string): ScoutRequestResult {
  const p = w.players[pid];
  const u = user(w);
  if (!p) return { ok: false, reason: 'Jogador não encontrado.' };
  const ownYouth = isOwnPlayer(w, p) && (p.youth || !!(p.loan && p.loan.youth));
  if (!ownYouth && (isOwnPlayer(w, p) || p.clubId === u.id)) return { ok: false, reason: 'O jogador já é do seu elenco.' };
  if (scoutLevel(w, pid) === 2) return { ok: false, reason: 'Você já tem o relatório completo deste jogador.' };
  const queued = w.scoutQueue.find((j) => j.pid === pid);
  if (queued) return { ok: false, reason: 'Relatório já encomendado.', readyWeek: queued.readyWeek };
  if (w.scoutQueue.length >= scoutSlots(w)) return { ok: false, reason: `Todos os ${scoutSlots(w)} olheiros estão ocupados.` };
  const cost = scoutCost(w);
  if (u.money < cost) return { ok: false, reason: 'Dinheiro insuficiente para enviar o olheiro.' };
  addMoney(w, u.id, -cost, 'other');
  const readyWeek = w.week + (u.scouting >= 3 ? 1 : 2);
  w.scoutQueue.push({ pid, readyWeek, season: w.season });
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
    const club = p.clubId ? w.clubs[p.clubId].name : 'sem clube';
    pushMessage(w, {
      kind: 'info',
      pid: p.id,
      title: `Relatório do olheiro: ${p.name}`,
      body: `${p.name} (${p.pos}, ${p.age} anos, ${club}): overall ${Math.round(p.ovr)}, potencial ${Math.round(p.pot)}. Características: ${traits}${p.star ? ' • Craque' : ''}. Veredito: ${scoutVerdict(w, p)}.`,
    });
  }
  w.scoutQueue = keep;
}

/** Define o foco das categorias de base do usuário. */
export function setAcademyFocus(w: World, focus: AcademyFocus): void {
  user(w).academyFocus = focus;
}

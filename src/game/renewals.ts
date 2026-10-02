// Renovações em lote: contratos no último ano, recomendação por jogador, renovação em massa,
// avisos ao longo da temporada e a renovação automática (opcional) perto do fim.
import { valueOf } from './gen';
import { contractChance, negotiateRenewal, renewAsk } from './transfers';
import type { Player, Terms, World } from './types';
import { clamp, formatMoney } from './util';
import { clubPlayers, pushMessage, seasonWeeks, user } from './world';

/** Renovação automática: desligada, só os recomendados ou todos os que vencem (menos os indicados para sair). */
export type AutoRenew = 'off' | 'key' | 'all';
export type RenewAdvice = 'renovar' | 'avaliar' | 'liberar';

/** Generosidade da proposta em lote: fator sobre o salário pedido. */
export const RENEW_OFFERS = [
  { value: 1, label: 'O pedido' },
  { value: 1.05, label: 'Pedido +5%' },
  { value: 1.12, label: 'Pedido +12%' },
] as const;

export interface RenewalRow {
  pid: string;
  advice: RenewAdvice;
  reason: string;
  /** Termos que a renovação em lote vai propor. */
  terms: Terms;
  chance: number;
  /** Diferença na folha semanal se renovar. */
  delta: number;
}

/** Jogadores do usuário com contrato no último ano (sem os emprestados ao clube). */
export function expiringPlayers(w: World): Player[] {
  if (w.playerCareer) return [];
  return clubPlayers(w, user(w)).filter((p) => p.contract <= 1 && !p.loan);
}

/** Por que vale (ou não) renovar: titular, promessa, rotação, reserva ou veterano em queda. */
export function renewalAdvice(w: World, p: Player): { advice: RenewAdvice; reason: string } {
  const u = user(w);
  const squad = clubPlayers(w, u).filter((x) => !x.loan).sort((a, b) => b.ovr - a.ovr);
  const ref = squad[Math.min(squad.length - 1, 15)]?.ovr ?? p.ovr;
  const starter = u.lineup.includes(p.id);
  if (p.age >= 33 && !starter) return { advice: 'liberar', reason: 'Veterano fora do time titular' };
  if (starter) return p.age >= 34 ? { advice: 'avaliar', reason: 'Titular, mas já com 34+ anos' } : { advice: 'renovar', reason: 'Titular' };
  if (p.age <= 23 && p.pot >= p.ovr + 5) return { advice: 'renovar', reason: 'Promessa' };
  if (p.ovr >= ref) return { advice: 'renovar', reason: 'Peça da rotação' };
  if (p.ovr >= ref - 4) return { advice: 'avaliar', reason: 'Reserva' };
  return { advice: 'liberar', reason: 'Abaixo do nível do elenco' };
}

/** Termos da proposta em lote: o pedido do jogador com o salário (e as luvas) multiplicados pela generosidade. */
export function bulkTerms(w: World, pid: string, generosity = 1.05): Terms {
  const ask = renewAsk(w, pid);
  const k = clamp(generosity, 0.8, 1.5);
  return { ...ask, wage: Math.round((ask.wage * k) / 100) * 100, bonus: Math.round((ask.bonus * k) / 1000) * 1000 };
}

/** Linhas do painel de renovações, dos recomendados aos indicados para sair. */
export function renewalPlan(w: World, generosity = 1.05): RenewalRow[] {
  const order: Record<RenewAdvice, number> = { renovar: 0, avaliar: 1, liberar: 2 };
  return expiringPlayers(w)
    .map((p) => {
      const terms = bulkTerms(w, p.id, generosity);
      return { pid: p.id, ...renewalAdvice(w, p), terms, chance: contractChance(w, p.id, terms), delta: terms.wage - p.wage };
    })
    .sort((a, b) => order[a.advice] - order[b.advice] || w.players[b.pid].ovr - w.players[a.pid].ovr);
}

export interface BulkRenewResult {
  renewed: { pid: string; wage: number; years: number }[];
  failed: { pid: string; text: string }[];
  bonus: number;
}

/**
 * Renova vários contratos de uma vez com os termos de `bulkTerms`. Se o jogador fizer uma contraproposta
 * até 10% acima do oferecido, ela é aceita automaticamente. O teto salarial e o caixa para as luvas valem
 * a cada assinatura, então a ordem dos `pids` é a prioridade.
 */
export function bulkRenew(w: World, pids: string[], generosity = 1.05): BulkRenewResult {
  const res: BulkRenewResult = { renewed: [], failed: [], bonus: 0 };
  const u = user(w);
  for (const pid of pids) {
    const p = w.players[pid];
    if (!p || p.clubId !== u.id || p.loan) continue;
    const terms = bulkTerms(w, pid, generosity);
    if (u.money < terms.bonus) { res.failed.push({ pid, text: 'Sem caixa para as luvas.' }); continue; }
    let r = negotiateRenewal(w, pid, terms);
    if (r.status !== 'accepted' && r.counter && r.counter.wage <= terms.wage * 1.1 && u.money >= r.counter.bonus) {
      const counter = r.counter;
      r = negotiateRenewal(w, pid, counter);
      if (r.status === 'accepted') { res.renewed.push({ pid, wage: counter.wage, years: counter.years }); res.bonus += counter.bonus; continue; }
    }
    if (r.status === 'accepted') { res.renewed.push({ pid, wage: terms.wage, years: terms.years }); res.bonus += terms.bonus; }
    else res.failed.push({ pid, text: r.text });
  }
  return res;
}

/** Semanas dos avisos: início da temporada, reta final e última chamada (quando roda a renovação automática). */
export function renewalWeeks(w: World): { first: number; mid: number; last: number } {
  const n = seasonWeeks(w);
  return { first: 2, mid: Math.max(3, n - 12), last: Math.max(4, n - 3) };
}

const list = (w: World, pids: string[], max = 6): string => {
  const names = pids.slice(0, max).map((id) => w.players[id]?.name).filter(Boolean);
  return names.join(', ') + (pids.length > max ? ` e mais ${pids.length - max}` : '');
};

/** Chamado a cada semana (endWeek, já com a semana nova): avisos de contratos e a renovação automática. */
export function renewalReminders(w: World): void {
  if (w.playerCareer) return;
  const { first, mid, last } = renewalWeeks(w);
  if (w.week !== first && w.week !== mid && w.week !== last) return;
  const plan = renewalPlan(w);
  if (!plan.length) return;
  const mode = w.autoRenew ?? 'off';
  if (w.week === last && mode !== 'off') {
    const pick = plan.filter((r) => (mode === 'all' ? r.advice !== 'liberar' : r.advice === 'renovar')).map((r) => r.pid);
    if (pick.length) {
      const r = bulkRenew(w, pick, 1.05);
      const lines = [
        r.renewed.length ? `Renovados (${r.renewed.length}): ${r.renewed.map((x) => `${w.players[x.pid].name} (${formatMoney(x.wage)}/sem, ${x.years} ano${x.years > 1 ? 's' : ''})`).join('; ')}.` : 'Nenhum jogador aceitou os termos automáticos.',
        r.bonus ? `Luvas pagas: ${formatMoney(r.bonus)}.` : '',
        r.failed.length ? `Sem acordo: ${r.failed.map((x) => `${w.players[x.pid]?.name ?? '?'} (${x.text.replace(/\.$/, '')})`).join('; ')}.` : '',
      ];
      const left = renewalPlan(w).map((x) => x.pid);
      if (left.length) lines.push(`Ainda vencem no fim da temporada: ${list(w, left)}.`);
      pushMessage(w, { kind: 'info', title: `Renovação automática: ${r.renewed.length} de ${pick.length}`, body: lines.filter(Boolean).join('\n'), link: { href: '/jogo/elenco#renovacoes', label: 'Ver renovações' } });
      return;
    }
  }
  const key = plan.filter((r) => r.advice === 'renovar').map((r) => r.pid);
  const left = seasonWeeks(w) - w.week + 1;
  const title = w.week === first ? `${plan.length} contrato${plan.length > 1 ? 's' : ''} no último ano` : `Faltam ${left} semanas: ${plan.length} contrato${plan.length > 1 ? 's' : ''} vencendo`;
  const body = [
    `Terminam no fim desta temporada: ${list(w, plan.map((r) => r.pid), 8)}.`,
    key.length ? `Recomendados para renovar: ${list(w, key)}.` : '',
    'Sem renovação, eles saem de graça. No Elenco você renova vários de uma vez, ou liga a renovação automática.',
  ];
  pushMessage(w, { kind: 'info', title, body: body.filter(Boolean).join('\n'), link: { href: '/jogo/elenco#renovacoes', label: 'Renovar contratos' } });
}

/** Valor total (mercado) dos jogadores que saem de graça se nada for feito. */
export const expiringValue = (w: World): number => expiringPlayers(w).reduce((s, p) => s + valueOf(p), 0);

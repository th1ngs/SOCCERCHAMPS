// Negociações (clube e jogador), multa rescisória, parcelas, empréstimos de jogadores,
// contrapropostas às ofertas da CPU, lista de observação, histórico de transferências e dia do fechamento.
import { TOTAL_WEEKS, divisionLevel } from './leagues';
import { assignNumbers, releaseClauseFor, valueOf } from './gen';
import { wageVeto } from './finance';
import { SQUAD_MAX, acceptOffer, askingPrice, offerCeiling, renewDemand, transfer, wageDemand } from './market';
import { hash01, isOwnPlayer, weeksSince } from './scouting';
import type {
  ClubResponse, ContractResponse, CounterOfferResult, Deal, LoanInTerms, LoanOutOffer, Negotiation, Player, Role,
  Terms, TransferRecord, World,
} from './types';
import { clamp, formatMoney } from './util';
import { WINDOWS, addMoney, clubPlayers, detach, pushMessage, user, windowOpen } from './world';

/** Paciência inicial do clube vendedor. */
export const NEGOTIATION_PATIENCE = 3;
/** Semanas sem negociar depois de um "walkout". */
export const NEGOTIATION_COOLDOWN = 4;
/** Parcelar exige 5% a mais. */
export const INSTALLMENT_PREMIUM = 1.05;
/** Semanas entre parcelas. */
export const INSTALLMENT_GAP = 8;
/** Salário pedido por papel prometido (titular = exigência base). */
export const ROLE_WAGE: Record<Role, number> = { titular: 1, rotacao: 1.1, reserva: 1.25 };
export const ROLE_NAME: Record<Role, string> = { titular: 'titular', rotacao: 'rotação', reserva: 'reserva' };
/** Registros da CPU guardados no histórico. */
export const CPU_HISTORY_MAX = 400;

const absWeek = (w: World): number => w.season * 100 + w.week;
const round10k = (v: number): number => Math.round(v / 10000) * 10000;
const round100 = (v: number): number => Math.round(v / 100) * 100;

// ---------- Histórico ----------
export function recordTransfer(w: World, r: Omit<TransferRecord, 'season' | 'week' | 'user'>): void {
  if (!w.transfers) w.transfers = [];
  const mine = r.from === w.userClub || r.to === w.userClub;
  w.transfers.push({ season: w.season, week: w.week, ...r, ...(mine ? { user: true } : {}) });
  if (w.transfers.length > CPU_HISTORY_MAX + 200) trimTransfers(w);
}

/** Mantém todos os registros do usuário e os últimos CPU_HISTORY_MAX da CPU. */
export function trimTransfers(w: World): void {
  let cpu = w.transfers.filter((t) => !t.user).length;
  if (cpu <= CPU_HISTORY_MAX) return;
  w.transfers = w.transfers.filter((t) => t.user || cpu-- <= CPU_HISTORY_MAX);
}

/** Histórico, do mais recente para o mais antigo. */
export function transferHistory(w: World, filter: { season?: number; clubId?: string } = {}): TransferRecord[] {
  return (w.transfers || [])
    .filter((t) => (filter.season == null || t.season === filter.season) && (!filter.clubId || t.from === filter.clubId || t.to === filter.clubId))
    .reverse();
}

/** Gasto líquido do clube na temporada (compras − vendas). */
export function netSpend(w: World, clubId: string, season: number): number {
  let n = 0;
  for (const t of w.transfers || []) {
    if (t.season !== season || !t.fee) continue;
    if (t.to === clubId) n += t.fee;
    if (t.from === clubId) n -= t.fee;
  }
  return n;
}

/** Maiores transferências da temporada. */
export function biggestDeals(w: World, season: number, n = 10): TransferRecord[] {
  return (w.transfers || []).filter((t) => t.season === season && t.fee > 0).sort((a, b) => b.fee - a.fee).slice(0, n);
}

/** Transferências mais caras recentes (últimas 8 semanas), para o feed de notícias. */
export function marketNews(w: World, n = 5): TransferRecord[] {
  const idx = (season: number, week: number): number => season * (TOTAL_WEEKS + 1) + week;
  const now = idx(w.season, w.week);
  return (w.transfers || [])
    .filter((t) => t.fee > 0 && now - idx(t.season, t.week) <= 8)
    .sort((a, b) => b.fee - a.fee)
    .slice(0, n);
}

/** Última semana de uma janela (atividade dobrada da CPU). */
export const isDeadlineDay = (w: World): boolean => WINDOWS.some(([, b]) => w.week === b);

// ---------- Negociação com o clube ----------
function negotiation(w: World, pid: string): Negotiation {
  if (!w.negotiations) w.negotiations = {};
  let n = w.negotiations[pid];
  const cooling = n && n.cooldownUntil != null && n.cooldownUntil > absWeek(w);
  if (!n || (n.season !== w.season && !cooling)) {
    n = { patience: NEGOTIATION_PATIENCE, lastFee: 0, week: w.week, season: w.season };
    w.negotiations[pid] = n;
  } else if (!cooling && n.patience <= 0) {
    n.patience = NEGOTIATION_PATIENCE;
    delete n.cooldownUntil;
  }
  return n;
}

/** Motivo para não negociar (ou null). */
function blockReason(w: World, p: Player | undefined): ClubResponse | null {
  const u = user(w);
  const pat = (): number => (p ? w.negotiations?.[p.id]?.patience ?? NEGOTIATION_PATIENCE : 0);
  if (!p) return { status: 'refused', patience: 0, text: 'Jogador não encontrado.' };
  if (!windowOpen(w)) return { status: 'closed', patience: pat(), text: 'A janela de transferências está fechada.' };
  if (isOwnPlayer(w, p) || p.clubId === u.id) return { status: 'refused', patience: pat(), text: `${p.name} já está no seu clube.` };
  if (p.loan) return { status: 'refused', patience: pat(), text: `${p.name} está emprestado e não pode ser negociado agora.` };
  if (p.youth) return { status: 'refused', patience: pat(), text: 'O clube não negocia garotos da base.' };
  if (u.squad.length >= SQUAD_MAX) return { status: 'full', patience: pat(), text: `Seu elenco já tem ${SQUAD_MAX} jogadores. Venda, empreste ou dispense alguém antes.` };
  if (p.clubId && w.clubs[p.clubId].rep - u.rep > 18) {
    return { status: 'refused', patience: pat(), text: `${p.name} não quer trocar o ${w.clubs[p.clubId].name} por um clube de menor expressão.` };
  }
  return null;
}

/**
 * Proposta ao clube dono do jogador. Propostas baixas consomem paciência (3); com 0 o clube abandona a
 * negociação (walkout) e não negocia por 4 semanas. Parcelar (2-3×) exige 5% a mais. Agentes livres: aceito.
 */
export function negotiateTransfer(w: World, pid: string, bid: { fee: number; installments: 1 | 2 | 3 }): ClubResponse {
  const p = w.players[pid];
  const blocked = blockReason(w, p);
  if (blocked) return blocked;
  const u = user(w);
  const n = negotiation(w, pid);
  if (n.cooldownUntil != null && n.cooldownUntil > absWeek(w)) {
    const until = n.cooldownUntil % 100;
    return { status: 'walkout', patience: 0, text: `O ${w.clubs[p.clubId as string].name} não quer mais conversar sobre ${p.name} até a semana ${until}.` };
  }
  const inst = bid.installments || 1;
  if (!p.clubId) {
    n.agreed = { fee: 0, installments: 1 };
    return { status: 'accepted', patience: n.patience, text: `${p.name} está sem clube: negocie direto o contrato.` };
  }
  const seller = w.clubs[p.clubId];
  if (Math.round(bid.fee / inst) > u.money) return { status: 'money', patience: n.patience, text: 'Você não tem dinheiro suficiente em caixa.' };
  const ask = round10k(askingPrice(w, p) * (inst > 1 ? INSTALLMENT_PREMIUM : 1));
  const improved = bid.fee > n.lastFee;
  n.lastFee = Math.max(n.lastFee, bid.fee);
  n.week = w.week;
  if (bid.fee >= ask) {
    n.agreed = { fee: bid.fee, installments: inst };
    return { status: 'accepted', patience: n.patience, text: `O ${seller.name} aceitou ${formatMoney(bid.fee)}${inst > 1 ? ` em ${inst} parcelas` : ''}. Agora acerte o contrato com ${p.name}.` };
  }
  const counter = bid.fee >= ask * 0.8;
  if (!counter || !improved) n.patience--;
  if (n.patience <= 0) {
    n.patience = 0;
    n.cooldownUntil = absWeek(w) + NEGOTIATION_COOLDOWN;
    delete n.agreed;
    return { status: 'walkout', patience: 0, text: `O ${seller.name} se cansou das propostas e encerrou a negociação por ${p.name}. Tente de novo em ${NEGOTIATION_COOLDOWN} semanas.` };
  }
  if (counter) return { status: 'counter', counterFee: ask, patience: n.patience, text: `O ${seller.name} pede ${formatMoney(ask)}${inst > 1 ? ' parcelado' : ''}.` };
  return { status: 'rejected', patience: n.patience, text: `O ${seller.name} recusou: a proposta está muito abaixo do que eles querem.` };
}

/** Paga a multa rescisória: pula o clube e vai direto aos termos pessoais (a multa é paga no completeTransfer). */
export function payReleaseClause(w: World, pid: string): ClubResponse {
  const p = w.players[pid];
  const blocked = blockReason(w, p);
  if (blocked) return blocked;
  const u = user(w);
  const n = negotiation(w, pid);
  if (!p.clubId || !p.releaseClause) return { status: 'refused', patience: n.patience, text: `${p.name} não tem multa rescisória.` };
  if (p.releaseClause > u.money) return { status: 'money', patience: n.patience, text: `A multa de ${formatMoney(p.releaseClause)} é maior que o seu caixa.` };
  n.agreed = { fee: p.releaseClause, installments: 1, clause: true };
  return { status: 'accepted', patience: n.patience, text: `Multa de ${formatMoney(p.releaseClause)} depositada em garantia. Agora acerte o contrato com ${p.name}.` };
}

// ---------- Termos pessoais ----------
/** Papel natural do jogador no elenco do usuário (pelos overalls). */
export function naturalRole(w: World, p: Player): Role {
  const better = clubPlayers(w, user(w)).filter((x) => x.id !== p.id && x.ovr > p.ovr).length;
  return better < 11 ? 'titular' : better < 16 ? 'rotacao' : 'reserva';
}

const yearsFor = (age: number): number => (age < 24 ? 4 : age < 29 ? 3 : age < 32 ? 2 : 1);

/** O que o jogador pede para assinar com o usuário. */
export function contractAsk(w: World, pid: string): Terms {
  const p = w.players[pid];
  const role = naturalRole(w, p);
  const wage = round100(wageDemand(w, p, user(w)) * ROLE_WAGE[role]);
  return { wage, years: yearsFor(p.age), bonus: Math.round((wage * (p.clubId ? 4 : 10)) / 1000) * 1000, role };
}

/** O que um jogador do usuário pede para renovar. */
export function renewAsk(w: World, pid: string): Terms {
  const p = w.players[pid];
  const role = naturalRole(w, p);
  const wage = round100(renewDemand(w, p) * ROLE_WAGE[role]);
  return { wage, years: yearsFor(p.age), bonus: Math.round((wage * 3) / 1000) * 1000, role, releaseClause: round10k(valueOf(p) * 2.5) };
}

const isRenewal = (w: World, p: Player): boolean => p.clubId === w.userClub && !p.loan;

/** Chance (0-1) de o jogador aceitar os termos. Cresce com o salário; bons jogadores recusam ser reserva. */
export function contractChance(w: World, pid: string, terms: Terms): number {
  const p = w.players[pid];
  if (!p) return 0;
  const renewal = isRenewal(w, p);
  const ask = renewal ? renewAsk(w, pid) : contractAsk(w, pid);
  if (terms.role === 'reserva' && ask.role === 'titular') return 0;
  const req = (ask.wage / ROLE_WAGE[ask.role]) * ROLE_WAGE[terms.role];
  let v = terms.wage / req;
  v += clamp((0.1 * (terms.bonus - ask.bonus)) / Math.max(ask.bonus, 1000), -0.1, 0.1);
  v -= 0.04 * Math.abs(terms.years - ask.years);
  if (renewal) {
    v += (p.morale - 65) / 400;
    if (terms.releaseClause != null && ask.releaseClause) v -= clamp((terms.releaseClause / ask.releaseClause - 1) * 0.1, -0.05, 0.1);
  }
  return clamp((v - 0.82) / 0.2, 0, 1);
}

function counterTerms(w: World, pid: string, terms: Terms): Terms {
  const p = w.players[pid];
  const ask = isRenewal(w, p) ? renewAsk(w, pid) : contractAsk(w, pid);
  const role = terms.role === 'reserva' && ask.role === 'titular' ? 'titular' : terms.role;
  return { ...ask, wage: round100(((ask.wage / ROLE_WAGE[ask.role]) * ROLE_WAGE[role]) * 1.02), role };
}

function decide(w: World, pid: string, terms: Terms, name: string): ContractResponse {
  const chance = contractChance(w, pid, terms);
  if (chance > 0 && Math.random() < chance) return { status: 'accepted', text: `${name} aceitou os termos!` };
  const counter = counterTerms(w, pid, terms);
  if (chance === 0 && terms.role === 'reserva') return { status: 'rejected', counter, text: `${name} não aceita ser reserva.` };
  if (chance >= 0.15) return { status: 'counter', counter, text: `${name} pede ${formatMoney(counter.wage)}/sem como ${ROLE_NAME[counter.role]}, por ${counter.years} ano(s).` };
  return { status: 'rejected', counter, text: `${name} recusou: os termos estão longe do que ele espera.` };
}

/** Negocia o contrato de um jogador que o usuário quer contratar (exige acordo com o clube, salvo agentes livres). */
export function negotiateContract(w: World, pid: string, terms: Terms): ContractResponse {
  const p = w.players[pid];
  if (!p) return { status: 'rejected', text: 'Jogador não encontrado.' };
  if (isRenewal(w, p)) return negotiateRenewal(w, pid, terms);
  if (!windowOpen(w)) return { status: 'rejected', text: 'A janela de transferências está fechada.' };
  const n = negotiation(w, pid);
  if (p.clubId && !n.agreed) return { status: 'rejected', text: `Acerte primeiro o valor com o ${w.clubs[p.clubId].name}.` };
  const veto = wageVeto(w, user(w), terms.wage);
  if (veto) return { status: 'rejected', text: veto };
  const r = decide(w, pid, terms, p.name);
  if (r.status === 'accepted') n.contract = { ...terms };
  return r;
}

/** Renovação com o mesmo motor de negociação. */
export function negotiateRenewal(w: World, pid: string, terms: Terms): ContractResponse {
  const p = w.players[pid];
  if (!p || !isRenewal(w, p)) return { status: 'rejected', text: 'Só é possível renovar com jogadores do seu elenco.' };
  // Renovações têm 10% de tolerância sobre o teto (manter o elenco é prioridade da diretoria).
  const veto = terms.wage > p.wage ? wageVeto(w, user(w), terms.wage - p.wage, 1.1) : null;
  if (veto) return { status: 'rejected', text: veto };
  const r = decide(w, pid, terms, p.name);
  if (r.status !== 'accepted') return r;
  const u = user(w);
  if (terms.bonus > 0) addMoney(w, u.id, -terms.bonus, 'other');
  p.wage = terms.wage;
  p.contract = terms.years;
  p.promise = terms.role;
  delete p.promiseChecked;
  p.releaseClause = terms.releaseClause ?? round10k(valueOf(p) * 2.5);
  p.renewAsk = null;
  p.morale = clamp(p.morale + 10, 10, 100);
  return { status: 'accepted', text: `${p.name} renovou por ${terms.years} ano(s), ${formatMoney(terms.wage)}/sem.` };
}

/**
 * Fecha a contratação: paga a 1ª parcela e as luvas; as demais parcelas vão para `w.payables`.
 * Exige acordo com o clube (ou multa paga) e termos aceitos pelo jogador. Grava `player.promise`.
 */
export function completeTransfer(w: World, pid: string, deal: Deal): boolean {
  const p = w.players[pid];
  const u = user(w);
  if (!p || blockReason(w, p)) return false;
  const n = w.negotiations?.[pid];
  if (p.clubId && (!n?.agreed || deal.fee < n.agreed.fee)) return false;
  if (!n?.contract || deal.wage < n.contract.wage || deal.role !== n.contract.role) return false;
  const inst = (p.clubId ? n.agreed?.installments ?? deal.installments : 1) || 1;
  const fee = p.clubId ? deal.fee : 0;
  const first = Math.round(fee / inst);
  if (u.money < first + deal.bonus) return false;
  if (wageVeto(w, u, deal.wage)) return false;
  const fromName = p.clubId ? w.clubs[p.clubId].name : 'mercado livre';
  const kind = !p.clubId ? 'free' : n.agreed?.clause ? 'clause' : 'transfer';
  transfer(w, pid, u.id, fee, true, { kind, pay: first });
  for (let k = 1; k < inst; k++) {
    let week = w.week + INSTALLMENT_GAP * k, season = w.season;
    while (week > TOTAL_WEEKS) { week -= TOTAL_WEEKS; season++; }
    const amount = k === inst - 1 ? fee - first * (inst - 1) : first;
    w.payables.push({ season, week, amount, desc: `Parcela ${k + 1}/${inst}: ${p.name}`, club: u.id });
  }
  if (deal.bonus > 0) addMoney(w, u.id, -deal.bonus, 'transfers');
  p.wage = deal.wage;
  p.contract = deal.years;
  p.promise = deal.role;
  p.releaseClause = releaseClauseFor(p);
  delete w.negotiations[pid];
  pushMessage(w, {
    kind: 'transfer', pid,
    title: `Contratado: ${p.name}`,
    body: `${p.name} (${p.pos}, ${p.age} anos, ${Math.round(p.ovr)}) chega do ${fromName} por ${fee ? formatMoney(fee) : 'custo zero'}${inst > 1 ? ` em ${inst} parcelas` : ''}, como ${ROLE_NAME[deal.role]}.`,
  });
  return true;
}

/** Paga as parcelas vencidas (endWeek). */
export function payDue(w: World): void {
  if (!w.payables?.length) return;
  const rest = [];
  for (const d of w.payables) {
    const due = d.season < w.season || (d.season === w.season && d.week <= w.week);
    if (!due) { rest.push(d); continue; }
    const club = d.club && w.clubs[d.club] ? d.club : w.userClub;
    addMoney(w, club, -d.amount, 'transfers');
    if (club === w.userClub) pushMessage(w, { kind: 'info', title: 'Parcela paga', body: `${d.desc}: ${formatMoney(d.amount)}.` });
  }
  w.payables = rest;
}

/** Promessa de titular não cumprida (menos de 40% dos jogos até a semana 20). */
export function checkPromises(w: World): void {
  const u = user(w);
  for (const p of clubPlayers(w, u)) {
    if (p.promise !== 'titular' || p.promiseChecked === w.season || !p.joined || weeksSince(w, p.joined) < 10) continue;
    const sinceWeek = p.joined.season === w.season ? p.joined.week : 0;
    let games = 0;
    for (let i = sinceWeek + 1; i <= w.week; i++) {
      const wk = w.weeks[i];
      if (wk && wk.matches.some((m) => m.played && (m.h === u.id || m.a === u.id))) games++;
    }
    if (!games) continue;
    const apps = p.s.apps - (p.joined.season === w.season ? p.joined.apps ?? 0 : 0);
    p.promiseChecked = w.season;
    if (apps / games < 0.4) {
      p.morale = clamp(p.morale - 15, 10, 100);
      pushMessage(w, { kind: 'board', pid: p.id, title: `${p.name} cobra a promessa`, body: `${p.name} foi contratado como titular, mas jogou só ${apps} de ${games} partidas. O jogador está insatisfeito (moral −15).` });
    }
  }
}

// ---------- Contraproposta às ofertas da CPU ----------
/**
 * Contraproposta a uma oferta da CPU. Até o teto escondido: aceita e a venda é concluída ('accepted').
 * Um pouco acima: a CPU melhora a oferta até 2 vezes ('improved', oferta atualizada na mensagem). Muito acima: 'walkout'.
 */
export function counterOffer(w: World, msgId: number, fee: number): CounterOfferResult {
  const msg = w.inbox.find((m) => m.id === msgId);
  const o = msg?.offer;
  if (!msg || !o || o.done) return { status: 'walkout', text: 'Esta proposta não está mais disponível.' };
  const p = w.players[o.pid];
  const buyer = w.clubs[o.club];
  if (!p || !buyer || !windowOpen(w)) return { status: 'walkout', text: 'A janela está fechada ou o negócio não é mais possível.' };
  if (o.ceiling == null) o.ceiling = offerCeiling(p, o.club, o.fee);
  if (fee <= o.fee || fee <= o.ceiling) {
    o.fee = Math.max(o.fee, round10k(fee));
    if (!acceptOffer(w, msg)) return { status: 'walkout', text: 'O negócio não pôde ser concluído.' };
    return { status: 'accepted', fee: o.fee, text: `O ${buyer.name} aceitou pagar ${formatMoney(o.fee)} por ${p.name}.` };
  }
  const rounds = o.rounds ?? 0;
  if (fee <= o.ceiling * 1.2 && rounds < 2) {
    o.rounds = rounds + 1;
    o.fee = Math.min(o.ceiling, round10k((o.fee + o.ceiling) / 2 + (o.ceiling - o.fee) * 0.25));
    return { status: 'improved', fee: o.fee, text: `O ${buyer.name} melhorou a proposta para ${formatMoney(o.fee)}.` };
  }
  o.done = true; o.walkout = true;
  return { status: 'walkout', text: `O ${buyer.name} achou o pedido alto demais e desistiu de ${p.name}.` };
}

// ---------- Empréstimos ----------
/** Clubes da CPU (reputação menor) interessados em receber o jogador emprestado (até 3, estável na temporada). */
export function loanOutOffers(w: World, pid: string): LoanOutOffer[] {
  const p = w.players[pid];
  const u = user(w);
  if (!p || p.loan || p.clubId !== u.id || (p.youth && p.age < 17)) return [];
  const out: (LoanOutOffer & { k: number })[] = [];
  for (const c of Object.values(w.clubs)) {
    // Clubes menores, de nível parecido ou de divisão abaixo aceitam o empréstimo.
    const lowerDiv = c.league === u.league && divisionLevel(c.div) > divisionLevel(u.div);
    if (c.id === u.id || (c.rep >= u.rep + 3 && !lowerDiv) || c.squad.length >= 30) continue;
    const ovrs = c.squad.map((id) => w.players[id].ovr).sort((a, b) => b - a);
    const better = ovrs.filter((o) => o > p.ovr).length;
    if (better >= 16) continue;
    const role = better < 11 ? 'titular' : 'rotacao';
    const avg11 = ovrs.slice(0, 11).reduce((s, x) => s + x, 0) / Math.max(1, Math.min(11, ovrs.length));
    const share = role === 'titular' ? clamp(0.6 + (p.ovr - avg11) / 25, 0.5, 1) : 0.5;
    out.push({ club: c.id, role, wageShare: Math.round(share * 20) / 20, k: hash01(`${pid}:${c.id}:${w.season}`) + (role === 'titular' ? 0 : 1) });
  }
  return out.sort((a, b) => a.k - b.k).slice(0, 3).map(({ club, role, wageShare }) => ({ club, role, wageShare }));
}

/** Empresta um jogador do usuário (ou garoto da base com 17+) até o fim da temporada. */
export function loanOut(w: World, pid: string, clubId: string): boolean {
  if (!windowOpen(w)) return false;
  const offer = loanOutOffers(w, pid).find((o) => o.club === clubId);
  if (!offer) return false;
  const p = w.players[pid];
  const u = user(w), to = w.clubs[clubId];
  const wasYouth = p.youth;
  detach(w, p);
  p.clubId = to.id;
  p.youth = false;
  p.num = 0;
  p.listed = false;
  to.squad.push(p.id);
  assignNumbers(w, to);
  p.loan = { from: u.id, to: to.id, until: w.season + 1, wageShare: offer.wageShare, buyOption: null, role: offer.role, youth: wasYouth, apps0: p.s.apps, goals0: p.s.goals };
  recordTransfer(w, { pid, name: p.name, from: u.id, to: to.id, fee: 0, kind: 'loan' });
  pushMessage(w, { kind: 'transfer', pid, title: `Emprestado: ${p.name}`, body: `${p.name} vai jogar no ${to.name} até o fim da temporada (${ROLE_NAME[offer.role]}; o ${to.name} paga ${Math.round(offer.wageShare * 100)}% do salário).` });
  return true;
}

/** Termos para pedir um jogador da CPU emprestado (aceito se não estiver entre os 13 melhores do clube). */
export function loanInTerms(w: World, pid: string): LoanInTerms {
  const p = w.players[pid];
  const u = user(w);
  const buyOption = p ? round10k(valueOf(p) * 1.15) : 0;
  const base = { wageShare: 0.5, buyOption };
  if (!p || !p.clubId || p.clubId === u.id || isOwnPlayer(w, p)) return { ok: false, reason: 'Jogador indisponível para empréstimo.', ...base };
  if (p.loan) return { ok: false, reason: `${p.name} já está emprestado.`, ...base };
  if (p.youth) return { ok: false, reason: 'O clube não empresta garotos da base.', ...base };
  if (!windowOpen(w)) return { ok: false, reason: 'A janela de transferências está fechada.', ...base };
  if (u.squad.length >= SQUAD_MAX) return { ok: false, reason: `Seu elenco já tem ${SQUAD_MAX} jogadores.`, ...base };
  const club = w.clubs[p.clubId];
  const better = club.squad.filter((id) => w.players[id].ovr > p.ovr).length;
  if (better < 13) return { ok: false, reason: `O ${club.name} não empresta jogadores que estão entre os 13 melhores do elenco.`, ...base };
  const veto = wageVeto(w, u, p.wage * base.wageShare);
  if (veto) return { ok: false, reason: veto, ...base };
  return { ok: true, ...base };
}

/** Pede o jogador emprestado. Com opção de compra, o usuário paga 25 pontos percentuais a mais do salário. */
export function loanIn(w: World, pid: string, withOption: boolean): boolean {
  const t = loanInTerms(w, pid);
  if (!t.ok) return false;
  const p = w.players[pid];
  const u = user(w), owner = w.clubs[p.clubId as string];
  detach(w, p);
  p.clubId = u.id;
  p.num = 0;
  p.listed = false;
  u.squad.push(p.id);
  assignNumbers(w, u);
  p.joined = { season: w.season, week: w.week, apps: p.s.apps };
  p.loan = { from: owner.id, to: u.id, until: w.season + 1, wageShare: withOption ? Math.min(1, t.wageShare + 0.25) : t.wageShare, buyOption: withOption ? t.buyOption : null, apps0: p.s.apps, goals0: p.s.goals };
  recordTransfer(w, { pid, name: p.name, from: owner.id, to: u.id, fee: 0, kind: 'loan' });
  pushMessage(w, { kind: 'transfer', pid, title: `Chegou emprestado: ${p.name}`, body: `${p.name} vem do ${owner.name} até o fim da temporada${withOption ? `, com opção de compra de ${formatMoney(t.buyOption)}` : ''}.` });
  return true;
}

/** Exerce a opção de compra de um jogador emprestado ao usuário. */
export function exerciseBuyOption(w: World, pid: string): boolean {
  const p = w.players[pid];
  const u = user(w);
  if (!p || !p.loan || p.loan.to !== u.id || p.loan.buyOption == null) return false;
  const fee = p.loan.buyOption;
  if (u.money < fee) return false;
  const owner = w.clubs[p.loan.from];
  addMoney(w, u.id, -fee, 'transfers');
  if (owner) addMoney(w, owner.id, fee, 'transfers');
  p.loan = null;
  p.contract = Math.max(p.contract, 3);
  p.start = { season: w.season, ovr: Math.round(p.ovr * 10) / 10 };
  p.releaseClause = releaseClauseFor(p);
  recordTransfer(w, { pid, name: p.name, from: owner ? owner.id : null, to: u.id, fee, kind: 'transfer' });
  pushMessage(w, { kind: 'transfer', pid, title: `Opção de compra: ${p.name}`, body: `${p.name} agora é do ${u.name} em definitivo, por ${formatMoney(fee)}.` });
  return true;
}

/** Encerra um empréstimo e devolve o jogador ao dono (com resumo de jogos e gols quando envolve o usuário). */
export function endLoan(w: World, p: Player, notify = true): void {
  const L = p.loan;
  if (!L) return;
  const owner = w.clubs[L.from], borrower = w.clubs[L.to];
  const apps = p.s.apps - (L.apps0 ?? 0), goals = p.s.goals - (L.goals0 ?? 0);
  detach(w, p);
  p.loan = null;
  p.num = 0;
  p.listed = false;
  if (!owner) { p.clubId = null; w.free.push(p.id); return; }
  p.clubId = owner.id;
  if (L.youth && p.age < 19) { p.youth = true; owner.youth.push(p.id); }
  else { p.youth = false; owner.squad.push(p.id); assignNumbers(w, owner); }
  recordTransfer(w, { pid: p.id, name: p.name, from: borrower ? borrower.id : null, to: owner.id, fee: 0, kind: 'loan' });
  if (notify && (owner.id === w.userClub || L.to === w.userClub)) {
    const back = owner.id === w.userClub;
    pushMessage(w, {
      kind: 'transfer', pid: p.id,
      title: back ? `${p.name} volta de empréstimo` : `Fim do empréstimo: ${p.name}`,
      body: `${p.name} ${back ? `volta do ${borrower ? borrower.name : 'empréstimo'}` : `volta ao ${owner.name}`}: ${apps} jogo(s) e ${goals} gol(s) no empréstimo.`,
    });
  }
}

/** Encerra um empréstimo antes do prazo (só com a janela aberta). */
export function recallLoan(w: World, pid: string): boolean {
  const p = w.players[pid];
  if (!p || !p.loan || !windowOpen(w)) return false;
  if (p.loan.from !== w.userClub && p.loan.to !== w.userClub) return false;
  endLoan(w, p, true);
  return true;
}

/** Fim de temporada: todos os empréstimos vencidos voltam (chamado no newSeason). */
export function returnLoans(w: World): void {
  for (const p of Object.values(w.players)) if (p.loan && p.loan.until <= w.season + 1) endLoan(w, p, true);
}

/** Jogadores do usuário emprestados a outros clubes. */
export const loanedOut = (w: World): Player[] => Object.values(w.players).filter((p) => p.loan && p.loan.from === w.userClub);
/** Jogadores de outros clubes emprestados ao usuário. */
export const loanedIn = (w: World): Player[] => Object.values(w.players).filter((p) => p.loan && p.loan.to === w.userClub);

// ---------- Lista de observação ----------
/** Liga/desliga a observação de um jogador. Retorna true se passou a ser observado. */
export function toggleWatch(w: World, pid: string): boolean {
  if (!w.watchlist) w.watchlist = [];
  if (!w.watchState) w.watchState = {};
  const i = w.watchlist.indexOf(pid);
  if (i >= 0) {
    w.watchlist.splice(i, 1);
    delete w.watchState[pid];
    return false;
  }
  const p = w.players[pid];
  if (!p) return false;
  w.watchlist.push(pid);
  w.watchState[pid] = watchSnapshot(w, p);
  return true;
}

function watchSnapshot(w: World, p: Player): { listed: boolean; contract: number; clubId: string | null; clauseOk: boolean } {
  return { listed: !!p.listed, contract: p.contract, clubId: p.clubId, clauseOk: !!p.clubId && p.releaseClause > 0 && p.releaseClause <= user(w).money };
}

/** Avisos da lista de observação (endWeek): lista de venda, último ano de contrato, troca de clube, multa ao alcance. */
export function checkWatchlist(w: World): void {
  if (!w.watchlist?.length) return;
  const keep: string[] = [];
  for (const pid of w.watchlist) {
    const p = w.players[pid];
    if (!p) { delete w.watchState[pid]; continue; }
    keep.push(pid);
    const prev = w.watchState[pid] ?? watchSnapshot(w, p);
    const cur = watchSnapshot(w, p);
    const alerts: string[] = [];
    if (cur.clubId !== prev.clubId) alerts.push(cur.clubId ? `trocou de clube: agora joga no ${w.clubs[cur.clubId].name}` : 'está sem clube');
    else {
      if (cur.listed && !prev.listed) alerts.push('entrou na lista de venda do clube');
      if (cur.clubId && cur.contract <= 1 && prev.contract > 1) alerts.push('entrou no último ano de contrato');
      if (cur.clauseOk && !prev.clauseOk) alerts.push(`tem multa rescisória (${formatMoney(p.releaseClause)}) ao alcance do seu caixa`);
    }
    if (alerts.length && !isOwnPlayer(w, p)) {
      pushMessage(w, { kind: 'news', pid, title: `Observado: ${p.name}`, body: `${p.name} ${alerts.join('; ')}.` });
    }
    w.watchState[pid] = cur;
  }
  w.watchlist = keep;
}

// Mercado: transferências, propostas, renovações, base e estrutura do clube.
import { LOAN_INTEREST, LOAN_OPTIONS, LOAN_WEEKS, POS } from './data';
import { assignNumbers, makeYouth, releaseClauseFor, valueOf, wageFor } from './gen';
import { hash01 } from './scouting';
import { endLoan, recordTransfer } from './transfers';
import type {
  BidResult, Club, LeagueId, Message, Player, Position, TransferKind, TrialOptions, UpgradeKey, Upgrade, World,
} from './types';
import { avg, chance, clamp, formatMoney, pick, rand, randi, shuffle } from './util';
import { addMoney, clubPlayers, detach, neededPos, pushMessage, removePlayer, toFree, user, windowOpen } from './world';

export const SQUAD_MAX = 32;
/** Fração das buscas da CPU feitas fora da própria liga. */
const INTL_SHARE = 0.3;

export interface TransferOptions {
  /** Tipo para o histórico (padrão: 'transfer', ou 'free' sem clube de origem). */
  kind?: TransferKind;
  /** Quanto o comprador paga agora (padrão: fee; o resto vira parcelas). */
  pay?: number;
}

/** Move o jogador para `toId` pagando `fee` ao clube de origem (se houver) e registra no histórico. */
export function transfer(w: World, pid: string, toId: string, fee: number, silent?: boolean, opts: TransferOptions = {}): Player {
  const p = w.players[pid];
  const from = p.clubId ? w.clubs[p.clubId] : null;
  const to = w.clubs[toId];
  detach(w, p);
  if (from) addMoney(w, from.id, fee, 'transfers');
  addMoney(w, toId, -(opts.pay ?? fee), 'transfers');
  p.clubId = toId;
  p.youth = false;
  p.listed = false;
  p.num = 0;
  p.contract = randi(2, 4);
  p.morale = 75;
  if (!p.agreedWage) p.wage = Math.round(wageFor(p.ovr) * rand(0.95, 1.15) / 100) * 100;
  else { p.wage = p.agreedWage; p.agreedWage = null; }
  p.loan = null;
  p.promise = null;
  delete p.promiseChecked;
  p.start = { season: w.season, ovr: Math.round(p.ovr * 10) / 10 };
  p.joined = { season: w.season, week: w.week, apps: p.s.apps };
  p.releaseClause = releaseClauseFor(p);
  to.squad.push(pid);
  assignNumbers(w, to);
  recordTransfer(w, { pid, name: p.name, from: from ? from.id : null, to: toId, fee, kind: opts.kind ?? (from ? 'transfer' : 'free') });
  // `silent`: mensagens de transferência são tratadas pela UI (mantido por compatibilidade).
  void silent;
  return p;
}

/** Filtros do mercado (todas as ligas). `league: 'free'` = só agentes livres. */
export interface MarketFilter {
  league?: LeagueId | 'free';
  nat?: LeagueId;
  pos?: Position;
  minOvr?: number;
  maxAge?: number;
  /** Máximo de resultados (padrão 200), ordenados por overall. */
  limit?: number;
}

/** Jogadores negociáveis (fora do clube do usuário, sem garotos da base), filtrados e ordenados por overall. */
export function marketPlayers(w: World, f: MarketFilter = {}): Player[] {
  const out: Player[] = [];
  for (const p of Object.values(w.players)) {
    if (p.youth || p.loan || p.clubId === w.userClub) continue;
    const club = p.clubId ? w.clubs[p.clubId] : null;
    if (f.league === 'free' ? !!club : f.league && (!club || club.league !== f.league)) continue;
    if (f.nat && p.nat !== f.nat) continue;
    if (f.pos && p.pos !== f.pos) continue;
    if (f.minOvr != null && p.ovr < f.minOvr) continue;
    if (f.maxAge != null && p.age > f.maxAge) continue;
    out.push(p);
  }
  return out.sort((a, b) => b.ovr - a.ovr).slice(0, f.limit ?? 200);
}

/** Peso do jogador no elenco: 1 titular, 0.5 rotação, 0.1 reserva. */
export function importance(w: World, p: Player): number {
  if (!p.clubId) return 0;
  const club = w.clubs[p.clubId];
  const rank = clubPlayers(w, club).sort((a, b) => b.ovr - a.ovr).findIndex((x) => x.id === p.id);
  return rank < 11 ? 1 : rank < 16 ? 0.5 : 0.1;
}

export function askingPrice(w: World, p: Player): number {
  if (!p.clubId) return 0;
  // Jogador na lista de venda de um clube da CPU sai 15% mais barato.
  const v = valueOf(p) * (1.1 + importance(w, p) * 0.55) * (p.listed && p.clubId !== w.userClub ? 0.85 : 1);
  return Math.round(v / 10000) * 10000;
}

export function wageDemand(w: World, p: Player, club: Club): number {
  const fromRep = p.clubId ? w.clubs[p.clubId].rep : club.rep;
  const f = 1.1 + Math.max(0, fromRep - club.rep) / 60;
  return Math.round((wageFor(p.ovr) * f) / 100) * 100;
}

/** Resposta a uma proposta do usuário por um jogador. */
export function evaluateBid(w: World, pid: string, fee: number): BidResult {
  const p = w.players[pid];
  const u = user(w);
  if (!windowOpen(w)) return { status: 'closed', text: 'A janela de transferências está fechada.' };
  if (u.squad.length >= SQUAD_MAX) return { status: 'full', text: `Seu elenco já tem ${SQUAD_MAX} jogadores. Venda ou dispense alguém antes.` };
  if (fee > u.money) return { status: 'money', text: 'Você não tem dinheiro suficiente em caixa.' };
  const fromRep = p.clubId ? w.clubs[p.clubId].rep : 0;
  if (p.clubId && fromRep - u.rep > 18) return { status: 'refused', text: `${p.name} não quer trocar o ${w.clubs[p.clubId].name} por um clube de menor expressão.` };
  const wage = wageDemand(w, p, u);
  if (!p.clubId) return { status: 'accepted', wage, text: `${p.name} aceita assinar sem custo de transferência. Salário pedido: ${formatMoney(wage)}/sem.` };
  const seller = w.clubs[p.clubId];
  const ask = askingPrice(w, p);
  if (fee >= ask) return { status: 'accepted', wage, text: `O ${seller.name} aceitou a proposta! Salário pedido por ${p.name}: ${formatMoney(wage)}/sem.` };
  if (fee >= ask * 0.8) return { status: 'counter', ask, wage, text: `O ${seller.name} fez uma contraproposta: ${formatMoney(ask)}.` };
  return { status: 'rejected', text: `O ${seller.name} recusou. A proposta está muito abaixo do que eles querem.` };
}

export function completeBuy(w: World, pid: string, fee: number, wage: number): void {
  const p = w.players[pid];
  const from = p.clubId ? w.clubs[p.clubId].name : 'mercado livre';
  p.agreedWage = wage;
  transfer(w, pid, w.userClub, fee);
  pushMessage(w, { kind: 'transfer', title: `Contratado: ${p.name}`, body: `${p.name} (${p.pos}, ${p.age} anos, ${Math.round(p.ovr)}) chega do ${from} por ${fee ? formatMoney(fee) : 'custo zero'}.` });
}

/** Aceita uma proposta recebida (mensagem com `offer`). */
export function acceptOffer(w: World, msg: Message): boolean {
  const o = msg.offer;
  if (!o) return false;
  const p = w.players[o.pid];
  if (!p || p.clubId !== w.userClub || p.loan || o.done) return false;
  if (!windowOpen(w)) return false;
  const buyer = w.clubs[o.club];
  const wasYouth = p.youth;
  transfer(w, p.id, buyer.id, o.fee);
  if (wasYouth && p.age < 19) {
    // Garoto vendido continua na base do comprador.
    buyer.squad = buyer.squad.filter((id) => id !== p.id);
    buyer.youth.push(p.id);
    p.youth = true;
    p.num = 0;
    p.contract = 3;
  }
  o.done = true; o.accepted = true;
  pushMessage(w, { kind: 'transfer', title: `Vendido: ${p.name}`, body: `${p.name} foi vendido ao ${buyer.name} por ${formatMoney(o.fee)}.` });
  return true;
}

export function renewDemand(w: World, p: Player): number {
  if (!p.renewAsk) p.renewAsk = Math.round((wageFor(p.ovr) * rand(1.05, 1.3)) / 100) * 100;
  return p.renewAsk;
}

export function renew(w: World, pid: string, years: number): void {
  const p = w.players[pid];
  p.wage = renewDemand(w, p);
  p.contract = years;
  p.renewAsk = null;
  p.morale = clamp(p.morale + 10, 10, 100);
}

export const releaseCost = (p: Player): number => Math.round(p.wage * Math.max(1, p.contract) * 35 * 0.5);

export function release(w: World, pid: string): void {
  const p = w.players[pid];
  // Emprestado ao usuário: dispensar = devolver ao dono.
  if (p.loan) { if (p.loan.to === w.userClub) endLoan(w, p, true); return; }
  recordTransfer(w, { pid, name: p.name, from: w.userClub, to: null, fee: 0, kind: 'release' });
  addMoney(w, w.userClub, -releaseCost(p), 'other');
  toFree(w, p);
}

// ---------- Base ----------
export function promoteYouth(w: World, pid: string, silent?: boolean): void {
  const p = w.players[pid];
  const c = w.clubs[p.clubId as string];
  c.youth = c.youth.filter((id) => id !== pid);
  c.squad.push(pid);
  p.youth = false;
  p.contract = 3;
  p.wage = Math.round((wageFor(p.ovr) * 0.6) / 100) * 100;
  assignNumbers(w, c);
  void silent;
}

export function dismissYouth(w: World, pid: string): void {
  removePlayer(w, w.players[pid]);
}

/** Peneira em região estrangeira custa ×1,8. */
export const TRIAL_FOREIGN_MULT = 1.8;

/**
 * Custo da peneira. Aceita o World (clube do usuário) ou, por compatibilidade, o próprio clube.
 * Região estrangeira: ×1,8.
 */
export function trialCost(wOrClub: World | Club, opts: TrialOptions = {}): number {
  const club = 'clubs' in wOrClub ? user(wOrClub) : wOrClub;
  const base = 300000 + club.academy * 150000;
  return Math.round(base * (opts.region && opts.region !== club.league ? TRIAL_FOREIGN_MULT : 1));
}

/**
 * Peneira: uma vez por temporada, revela 1-3 garotos (+1 com olheiros nível 4+).
 * `region`: nacionalidade dos garotos; `pos`: todos dessa posição.
 */
export function runTrial(w: World, opts: TrialOptions = {}): Player[] | null {
  const u = user(w);
  const cost = trialCost(w, opts);
  if (w.trialUsed || u.money < cost) return null;
  addMoney(w, u.id, -cost, 'other');
  w.trialUsed = true;
  const found: Player[] = [];
  const n = randi(1, 3) + ((u.scouting || 1) >= 4 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const y = makeYouth(w, u, randi(15, 17), { pos: opts.pos, nat: opts.region });
    if (chance(0.25)) { y.pot = clamp(y.pot + rand(4, 10), 45, 96); }
    found.push(y);
  }
  return found;
}

// ---------- Estrutura ----------
export const UPGRADES: Record<UpgradeKey, Upgrade> = {
  academy: { name: 'Categoria de base', desc: 'Garotos com mais potencial em cada safra.', max: 5, cost: (c) => 3e6 * c.academy, level: (c) => c.academy },
  training: { name: 'Centro de treinamento', desc: 'Jogadores evoluem mais rápido.', max: 5, cost: (c) => 4e6 * c.training, level: (c) => c.training },
  stadium: { name: 'Estádio (+5.000 lugares)', desc: 'Mais público e mais bilheteria.', max: 90000, cost: (c) => 10e6 + c.cap * 100, level: (c) => c.cap },
  scouting: { name: 'Departamento de olheiros', desc: 'Mais olheiros ao mesmo tempo, relatórios mais rápidos e faixas de potencial mais estreitas na base.', max: 5, cost: (c) => 3e6 * (c.scouting || 1), level: (c) => c.scouting || 1 },
};

export function upgrade(w: World, kind: UpgradeKey): boolean {
  const u = user(w);
  const up = UPGRADES[kind];
  const cost = up.cost(u);
  if (u.money < cost) return false;
  if (kind === 'stadium') { if (u.cap >= up.max) return false; u.cap += 5000; }
  else { if (u[kind] >= up.max) return false; u[kind]++; }
  addMoney(w, u.id, -cost, 'other');
  return true;
}

// ---------- Empréstimo bancário ----------
/** Saldo devedor restante (parcelas que faltam). */
export const loanBalance = (club: Club): number => (club.loan ? club.loan.weekly * club.loan.weeksLeft : 0);

/** Contrata um empréstimo de LOAN_OPTIONS (12% de juros totais, 30 parcelas). Falha se já houver um ativo. */
export function takeLoan(w: World, amount: number): boolean {
  const u = user(w);
  if (u.loan || !LOAN_OPTIONS.includes(amount)) return false;
  u.loan = { principal: amount, weekly: Math.round((amount * (1 + LOAN_INTEREST)) / LOAN_WEEKS), weeksLeft: LOAN_WEEKS };
  addMoney(w, u.id, amount, 'loan');
  pushMessage(w, { kind: 'board', title: 'Empréstimo contratado', body: `O banco liberou ${formatMoney(amount)}. Serão ${LOAN_WEEKS} parcelas semanais de ${formatMoney(u.loan.weekly)}.` });
  return true;
}

/** Quita o saldo restante do empréstimo. Falha sem empréstimo ativo ou sem caixa suficiente. */
export function repayLoan(w: World): boolean {
  const u = user(w);
  if (!u.loan) return false;
  const due = loanBalance(u);
  if (u.money < due) return false;
  addMoney(w, u.id, -due, 'loan');
  u.loan = null;
  return true;
}

// ---------- CPU ----------
export function aiTransfers(w: World): void {
  const clubs = Object.values(w.clubs).filter((c) => c.id !== w.userClub);
  const all = Object.values(w.players).filter((p) => p.clubId && p.clubId !== w.userClub && !p.youth && !p.loan);
  const userDiv = user(w).div;
  // Escala com o número de clubes (legado: 2-5 tentativas para 32 clubes).
  const n = Math.round((randi(2, 5) * clubs.length) / 32);
  for (let k = 0; k < n; k++) {
    const buyer = pick(clubs);
    if (buyer.money < 3e6 || buyer.squad.length >= 30) continue;
    const pos = chance(0.5) ? neededPos(w, buyer) : pick(POS);
    const mine = clubPlayers(w, buyer).filter((p) => p.pos === pos).sort((a, b) => b.ovr - a.ovr);
    const bar = mine.length ? mine[Math.min(1, mine.length - 1)].ovr + 1 : 50;
    // 70% das buscas no mercado doméstico, 30% em qualquer liga.
    const intl = chance(INTL_SHARE);
    const cands = all.filter((p) => {
      const from = w.clubs[p.clubId as string];
      return p.pos === pos && from.id !== buyer.id && p.ovr > bar && (intl || from.league === buyer.league) &&
        from.rep <= buyer.rep + 8 && from.squad.length > 20 &&
        // No mercado internacional o olheiro já descarta quem o clube não pode pagar.
        (!intl || valueOf(p) <= buyer.money * 0.6);
    });
    if (!cands.length) continue;
    const t = pick(cands.sort((a, b) => b.ovr - a.ovr).slice(0, 5));
    const fee = Math.round((valueOf(t) * rand(1, 1.35)) / 10000) * 10000;
    if (fee > buyer.money * 0.6) continue;
    const from = w.clubs[t.clubId as string];
    transfer(w, t.id, buyer.id, fee, true);
    if (t.ovr >= 70 && (from.div === userDiv || buyer.div === userDiv)) {
      pushMessage(w, { kind: 'news', title: `Mercado: ${t.name} no ${buyer.name}`, body: `${t.name} (${t.pos}, ${Math.round(t.ovr)}) deixa o ${from.name} e acerta com o ${buyer.name} por ${formatMoney(fee)}.` });
    }
  }
  // Reposição com agentes livres
  for (const c of clubs) {
    if (c.squad.length >= 22 || !chance(0.4)) continue;
    const pos = neededPos(w, c);
    const fa = w.free.map((id) => w.players[id]).filter((p) => p && p.pos === pos).sort((a, b) => b.ovr - a.ovr)[0];
    if (fa) transfer(w, fa.id, c.id, 0, true);
  }
}

/** Clubes da CPU põem na lista de venda até 2 excedentes (fora dos 22 melhores ou veteranos). Semana 0 e 15. */
export function aiListPlayers(w: World): void {
  for (const c of Object.values(w.clubs)) {
    if (c.id === w.userClub) continue;
    const ps = clubPlayers(w, c).filter((p) => !p.loan).sort((a, b) => b.ovr - a.ovr);
    let listed = 0;
    ps.forEach((p, i) => {
      p.listed = false;
      if (listed < 2 && (i >= 22 || (p.age >= 33 && i >= 11)) && chance(0.5)) { p.listed = true; listed++; }
    });
  }
}

/** Teto escondido da CPU numa oferta (1,2-1,5× o valor; ao menos 10% acima da oferta). */
export function offerCeiling(p: Player, club: string, fee: number): number {
  const f = hash01(p.id + ':' + club);
  return Math.round(Math.max(valueOf(p) * (1.2 + 0.3 * f), fee * (1.1 + 0.2 * f)) / 10000) * 10000;
}

export function aiOffersToUser(w: World): void {
  const u = user(w);
  const players = clubPlayers(w, u).filter((p) => !p.loan);
  const average = avg(players, (p) => p.ovr);
  let made = 0;
  // Cobiça por garotos da base de alto potencial.
  for (const p of u.youth.map((id) => w.players[id])) {
    if (made >= 1 || p.pot < 74 || w.inbox.some((m) => m.offer && !m.offer.done && m.offer.pid === p.id)) continue;
    if (!chance(p.pot >= 80 ? 0.06 : 0.03)) continue;
    const fee = Math.round((valueOf(p) * rand(1.2, 1.8)) / 10000) * 10000;
    const buyers = Object.values(w.clubs).filter((c) => c.id !== u.id && c.rep >= u.rep - 10 && c.money > fee * 1.2);
    if (!buyers.length) continue;
    const b = pick(buyers);
    pushMessage(w, {
      kind: 'offer', pid: p.id,
      title: `Proposta pelo garoto ${p.name}`,
      body: `O ${b.name} oferece ${formatMoney(fee)} por ${p.name} (${p.pos}, ${p.age} anos), da sua base. Aceitar faz o garoto sair.`,
      offer: { pid: p.id, club: b.id, fee, expires: w.week + 2, youth: true, ceiling: offerCeiling(p, b.id, fee) },
    });
    made++;
  }
  for (const p of shuffle(players.slice())) {
    if (made >= 2) break;
    if (w.inbox.some((m) => m.offer && !m.offer.done && m.offer.pid === p.id)) continue;
    const prob = p.listed ? 0.35 : p.ovr >= average + 5 ? 0.04 : 0.01;
    if (!chance(prob)) continue;
    const fee = Math.round((valueOf(p) * (p.listed ? rand(0.75, 1.05) : rand(0.95, 1.45))) / 10000) * 10000;
    const buyers = Object.values(w.clubs).filter((c) => c.id !== u.id && c.rep >= u.rep - 20 && c.money > fee * 1.2 && c.squad.length < 30);
    if (!buyers.length) continue;
    const b = pick(buyers);
    pushMessage(w, {
      kind: 'offer',
      title: `Proposta por ${p.name}`,
      body: `O ${b.name} oferece ${formatMoney(fee)} por ${p.name} (${p.pos}, ${Math.round(p.ovr)}). Valor de mercado: ${formatMoney(valueOf(p))}.`,
      pid: p.id,
      offer: { pid: p.id, club: b.id, fee, expires: w.week + 2, ceiling: offerCeiling(p, b.id, fee) },
    });
    made++;
  }
}

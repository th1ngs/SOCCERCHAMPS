// Mercado: transferências, propostas, renovações, base e estrutura do clube.
(function (M) {
  const U = M.U;
  M.SQUAD_MAX = 32;

  M.transfer = function (w, pid, toId, fee, silent) {
    const p = w.players[pid];
    const from = p.clubId ? w.clubs[p.clubId] : null;
    const to = w.clubs[toId];
    M.detach(w, p);
    if (from) M.money(w, from.id, fee, 'transfers');
    M.money(w, toId, -fee, 'transfers');
    p.clubId = toId;
    p.youth = false;
    p.listed = false;
    p.num = 0;
    p.contract = U.randi(2, 4);
    p.morale = 75;
    if (!p.agreedWage) p.wage = Math.round(M.wageFor(p.ovr) * U.rand(0.95, 1.15) / 100) * 100;
    else { p.wage = p.agreedWage; p.agreedWage = null; }
    to.squad.push(pid);
    M.assignNumbers(w, to);
    if (!silent && (toId === w.userClub || (from && from.id === w.userClub))) {
      // mensagens tratadas pela UI
    }
    return p;
  };

  M.importance = function (w, p) {
    if (!p.clubId) return 0;
    const club = w.clubs[p.clubId];
    const rank = M.clubPlayers(w, club).sort((a, b) => b.ovr - a.ovr).findIndex((x) => x.id === p.id);
    return rank < 11 ? 1 : rank < 16 ? 0.5 : 0.1;
  };

  M.askingPrice = function (w, p) {
    if (!p.clubId) return 0;
    const v = M.valueOf(p) * (1.1 + M.importance(w, p) * 0.55);
    return Math.round(v / 10000) * 10000;
  };

  M.wageDemand = function (w, p, club) {
    const fromRep = p.clubId ? w.clubs[p.clubId].rep : club.rep;
    const f = 1.1 + Math.max(0, fromRep - club.rep) / 60;
    return Math.round((M.wageFor(p.ovr) * f) / 100) * 100;
  };

  // Resposta a uma proposta do usuário por um jogador.
  M.evaluateBid = function (w, pid, fee) {
    const p = w.players[pid];
    const u = M.user(w);
    if (!M.windowOpen(w)) return { status: 'closed', text: 'A janela de transferências está fechada.' };
    if (u.squad.length >= M.SQUAD_MAX) return { status: 'full', text: `Seu elenco já tem ${M.SQUAD_MAX} jogadores. Venda ou dispense alguém antes.` };
    if (fee > u.money) return { status: 'money', text: 'Você não tem dinheiro suficiente em caixa.' };
    const fromRep = p.clubId ? w.clubs[p.clubId].rep : 0;
    if (fromRep - u.rep > 18) return { status: 'refused', text: `${p.name} não quer trocar o ${w.clubs[p.clubId].name} por um clube de menor expressão.` };
    const wage = M.wageDemand(w, p, u);
    if (!p.clubId) return { status: 'accepted', wage, text: `${p.name} aceita assinar sem custo de transferência. Salário pedido: ${U.money(wage)}/sem.` };
    const ask = M.askingPrice(w, p);
    if (fee >= ask) return { status: 'accepted', wage, text: `O ${w.clubs[p.clubId].name} aceitou a proposta! Salário pedido por ${p.name}: ${U.money(wage)}/sem.` };
    if (fee >= ask * 0.8) return { status: 'counter', ask, wage, text: `O ${w.clubs[p.clubId].name} fez uma contraproposta: ${U.money(ask)}.` };
    return { status: 'rejected', text: `O ${w.clubs[p.clubId].name} recusou. A proposta está muito abaixo do que eles querem.` };
  };

  M.completeBuy = function (w, pid, fee, wage) {
    const p = w.players[pid];
    const from = p.clubId ? w.clubs[p.clubId].name : 'mercado livre';
    p.agreedWage = wage;
    M.transfer(w, pid, w.userClub, fee);
    M.msg(w, { kind: 'transfer', title: `Contratado: ${p.name}`, body: `${p.name} (${p.pos}, ${p.age} anos, ${Math.round(p.ovr)}) chega do ${from} por ${fee ? U.money(fee) : 'custo zero'}.` });
  };

  M.acceptOffer = function (w, msg) {
    const o = msg.offer;
    const p = w.players[o.pid];
    if (!p || p.clubId !== w.userClub || o.done) return false;
    if (!M.windowOpen(w)) return false;
    const buyer = w.clubs[o.club];
    M.transfer(w, p.id, buyer.id, o.fee);
    o.done = true; o.accepted = true;
    M.msg(w, { kind: 'transfer', title: `Vendido: ${p.name}`, body: `${p.name} foi vendido ao ${buyer.name} por ${U.money(o.fee)}.` });
    return true;
  };

  M.renewDemand = function (w, p) {
    if (!p.renewAsk) p.renewAsk = Math.round((M.wageFor(p.ovr) * U.rand(1.05, 1.3)) / 100) * 100;
    return p.renewAsk;
  };

  M.renew = function (w, pid, years) {
    const p = w.players[pid];
    p.wage = M.renewDemand(w, p);
    p.contract = years;
    p.renewAsk = null;
    p.morale = U.clamp(p.morale + 10, 10, 100);
  };

  M.releaseCost = (p) => Math.round(p.wage * Math.max(1, p.contract) * 35 * 0.5);

  M.release = function (w, pid) {
    const p = w.players[pid];
    M.money(w, w.userClub, -M.releaseCost(p), 'other');
    M.toFree(w, p);
  };

  // ---------- Base ----------
  M.promoteYouth = function (w, pid, silent) {
    const p = w.players[pid];
    const c = w.clubs[p.clubId];
    c.youth = c.youth.filter((id) => id !== pid);
    c.squad.push(pid);
    p.youth = false;
    p.contract = 3;
    p.wage = Math.round((M.wageFor(p.ovr) * 0.6) / 100) * 100;
    M.assignNumbers(w, c);
  };

  M.dismissYouth = function (w, pid) {
    M.removePlayer(w, w.players[pid]);
  };

  M.trialCost = (club) => 300000 + club.academy * 150000;
  M.runTrial = function (w) {
    const u = M.user(w);
    const cost = M.trialCost(u);
    if (w.trialUsed || u.money < cost) return null;
    M.money(w, u.id, -cost, 'other');
    w.trialUsed = true;
    const found = [];
    const n = U.randi(1, 3);
    for (let k = 0; k < n; k++) {
      const y = M.makeYouth(w, u, U.randi(15, 17));
      if (U.chance(0.25)) { y.pot = U.clamp(y.pot + U.rand(4, 10), 45, 96); }
      found.push(y);
    }
    return found;
  };

  // ---------- Estrutura ----------
  M.UPGRADES = {
    academy: { name: 'Categoria de base', desc: 'Garotos com mais potencial em cada safra.', max: 5, cost: (c) => 3e6 * c.academy, level: (c) => c.academy },
    training: { name: 'Centro de treinamento', desc: 'Jogadores evoluem mais rápido.', max: 5, cost: (c) => 4e6 * c.training, level: (c) => c.training },
    stadium: { name: 'Estádio (+5.000 lugares)', desc: 'Mais público e mais bilheteria.', max: 90000, cost: (c) => 10e6 + c.cap * 100, level: (c) => c.cap },
  };

  M.upgrade = function (w, kind) {
    const u = M.user(w);
    const up = M.UPGRADES[kind];
    const cost = up.cost(u);
    if (u.money < cost) return false;
    if (kind === 'stadium') { if (u.cap >= up.max) return false; u.cap += 5000; }
    else { if (u[kind] >= up.max) return false; u[kind]++; }
    M.money(w, u.id, -cost, 'other');
    return true;
  };

  // ---------- CPU ----------
  M.aiTransfers = function (w) {
    const clubs = Object.values(w.clubs).filter((c) => c.id !== w.userClub);
    const all = Object.values(w.players).filter((p) => p.clubId && p.clubId !== w.userClub && !p.youth);
    const userDiv = M.user(w).div;
    const n = U.randi(2, 5);
    for (let k = 0; k < n; k++) {
      const buyer = U.pick(clubs);
      if (buyer.money < 3e6 || buyer.squad.length >= 30) continue;
      const pos = U.chance(0.5) ? M.neededPos(w, buyer) : U.pick(M.POS);
      const mine = M.clubPlayers(w, buyer).filter((p) => p.pos === pos).sort((a, b) => b.ovr - a.ovr);
      const bar = mine.length ? mine[Math.min(1, mine.length - 1)].ovr + 1 : 50;
      const cands = all.filter((p) => p.pos === pos && p.clubId !== buyer.id && p.ovr > bar &&
        w.clubs[p.clubId].rep <= buyer.rep + 8 && w.clubs[p.clubId].squad.length > 20);
      if (!cands.length) continue;
      const t = U.pick(cands.sort((a, b) => b.ovr - a.ovr).slice(0, 5));
      const fee = Math.round((M.valueOf(t) * U.rand(1, 1.35)) / 10000) * 10000;
      if (fee > buyer.money * 0.6) continue;
      const from = w.clubs[t.clubId];
      M.transfer(w, t.id, buyer.id, fee, true);
      if (t.ovr >= 70 && (from.div === userDiv || buyer.div === userDiv)) {
        M.msg(w, { kind: 'news', title: `Mercado: ${t.name} no ${buyer.name}`, body: `${t.name} (${t.pos}, ${Math.round(t.ovr)}) deixa o ${from.name} e acerta com o ${buyer.name} por ${U.money(fee)}.` });
      }
    }
    // Reposição com agentes livres
    for (const c of clubs) {
      if (c.squad.length >= 22 || !U.chance(0.4)) continue;
      const pos = M.neededPos(w, c);
      const fa = w.free.map((id) => w.players[id]).filter((p) => p && p.pos === pos).sort((a, b) => b.ovr - a.ovr)[0];
      if (fa) M.transfer(w, fa.id, c.id, 0, true);
    }
  };

  M.aiOffersToUser = function (w) {
    const u = M.user(w);
    const players = M.clubPlayers(w, u);
    const avg = U.avg(players, (p) => p.ovr);
    let made = 0;
    for (const p of U.shuffle(players.slice())) {
      if (made >= 2) break;
      if (w.inbox.some((m) => m.offer && !m.offer.done && m.offer.pid === p.id)) continue;
      const prob = p.listed ? 0.35 : p.ovr >= avg + 5 ? 0.04 : 0.01;
      if (!U.chance(prob)) continue;
      const fee = Math.round((M.valueOf(p) * (p.listed ? U.rand(0.75, 1.05) : U.rand(0.95, 1.45))) / 10000) * 10000;
      const buyers = Object.values(w.clubs).filter((c) => c.id !== u.id && c.rep >= u.rep - 20 && c.money > fee * 1.2 && c.squad.length < 30);
      if (!buyers.length) continue;
      const b = U.pick(buyers);
      M.msg(w, {
        kind: 'offer',
        title: `Proposta por ${p.name}`,
        body: `O ${b.name} oferece ${U.money(fee)} por ${p.name} (${p.pos}, ${Math.round(p.ovr)}). Valor de mercado: ${U.money(M.valueOf(p))}.`,
        offer: { pid: p.id, club: b.id, fee, expires: w.week + 2 },
      });
      made++;
    }
  };
})(window.SCM);

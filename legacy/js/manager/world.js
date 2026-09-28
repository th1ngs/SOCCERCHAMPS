// Temporada: calendário, resultados, tabela, Copa, semana a semana e virada de ano.
(function (M) {
  const U = M.U;
  const CUP_WEEKS = [4, 10, 16, 22, 28];
  M.TOTAL_WEEKS = 35;
  M.CUP_ROUNDS = ['1ª fase', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
  M.CUP_PRIZE = [1e6, 2e6, 3.5e6, 6e6, 12e6];
  M.WINDOWS = [[0, 4], [15, 19]];
  M.windowOpen = (w) => M.WINDOWS.some(([a, b]) => w.week >= a && w.week <= b);
  M.nextWindow = (w) => {
    const nx = M.WINDOWS.find(([a]) => a > w.week);
    return nx ? nx[0] : null;
  };

  const TV = { A: 380000, B: 120000 };

  // ---------- Mensagens ----------
  M.msg = function (w, m) {
    w.inbox.unshift(Object.assign({ id: w.nextMsg++, season: w.season, week: w.week, read: false, kind: 'info' }, m));
    if (w.inbox.length > 80) w.inbox.length = 80;
  };

  M.user = (w) => w.clubs[w.userClub];
  M.clubPlayers = (w, club) => club.squad.map((id) => w.players[id]);

  M.money = function (w, clubId, amount, cat) {
    w.clubs[clubId].money += amount;
    if (clubId === w.userClub) {
      w.finWeek[cat] = (w.finWeek[cat] || 0) + amount;
      w.finSeason[cat] = (w.finSeason[cat] || 0) + amount;
    }
  };

  // ---------- Calendário ----------
  function roundRobin(ids) {
    const n = ids.length, arr = ids.slice(), rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i], b = arr[n - 1 - i];
        pairs.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
      }
      rounds.push(pairs);
      arr.splice(1, 0, arr.pop());
    }
    return rounds.concat(rounds.map((r) => r.map(([a, b]) => [b, a])));
  }

  let mid = 1;
  const mkMatch = (h, a, comp) => ({ id: 'm' + Date.now().toString(36) + mid++, h, a, comp, hs: null, as: null, pens: null, played: false, goals: [] });

  M.divClubs = (w, div) => Object.values(w.clubs).filter((c) => c.div === div).map((c) => c.id);

  M.startSeason = function (w) {
    const rA = roundRobin(U.shuffle(M.divClubs(w, 'A')));
    const rB = roundRobin(U.shuffle(M.divClubs(w, 'B')));
    w.weeks = [null];
    let li = 0;
    for (let wk = 1; wk <= M.TOTAL_WEEKS; wk++) {
      if (CUP_WEEKS.includes(wk)) {
        w.weeks.push({ type: 'cup', round: CUP_WEEKS.indexOf(wk), matches: [] });
      } else {
        const ms = rA[li].map(([h, a]) => mkMatch(h, a, 'A')).concat(rB[li].map(([h, a]) => mkMatch(h, a, 'B')));
        w.weeks.push({ type: 'league', round: li + 1, matches: ms });
        li++;
      }
    }
    w.cup = { alive: U.shuffle(Object.keys(w.clubs)), champion: null };
    for (const p of Object.values(w.players)) p.s = { apps: 0, goals: 0, assists: 0, rsum: 0 };
    w.finSeason = {};
    w.finWeek = {};
    w.trialUsed = false;
    setObjective(w);
    const u = M.user(w);
    M.msg(w, {
      kind: 'board',
      title: `Temporada ${w.season}: objetivo da diretoria`,
      body: `A diretoria do ${u.name} espera: ${w.board.label} na Série ${u.div}. A janela de transferências está aberta até a semana ${M.WINDOWS[0][1]}.`,
    });
  };

  function drawCup(w, week) {
    const alive = U.shuffle(w.cup.alive.slice());
    for (let i = 0; i + 1 < alive.length; i += 2) week.matches.push(mkMatch(alive[i], alive[i + 1], 'CUP'));
    if (week.round === 4) week.matches.forEach((m) => (m.neutral = true));
  }

  M.currentWeek = (w) => w.weeks[w.week] || null;

  M.userMatch = function (w) {
    const wk = M.currentWeek(w);
    if (!wk) return null;
    return wk.matches.find((m) => (m.h === w.userClub || m.a === w.userClub) && !m.played) || null;
  };

  M.weekLabel = function (w) {
    if (w.week === 0) return 'Pré-temporada';
    const wk = M.currentWeek(w);
    if (!wk) return 'Fim de temporada';
    return wk.type === 'cup' ? `Copa • ${M.CUP_ROUNDS[wk.round]}` : `Rodada ${wk.round} de 30`;
  };

  // ---------- Tabela ----------
  M.table = function (w, div) {
    const rows = {};
    for (const id of M.divClubs(w, div)) rows[id] = { id, p: 0, j: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, form: [] };
    for (const wk of w.weeks) {
      if (!wk || wk.type !== 'league') continue;
      for (const m of wk.matches) {
        if (m.comp !== div || !m.played || !rows[m.h] || !rows[m.a]) continue;
        const h = rows[m.h], a = rows[m.a];
        h.j++; a.j++; h.gf += m.hs; h.ga += m.as; a.gf += m.as; a.ga += m.hs;
        if (m.hs > m.as) { h.v++; h.p += 3; a.d++; h.form.push('V'); a.form.push('D'); }
        else if (m.hs < m.as) { a.v++; a.p += 3; h.d++; h.form.push('D'); a.form.push('V'); }
        else { h.e++; a.e++; h.p++; a.p++; h.form.push('E'); a.form.push('E'); }
      }
    }
    return Object.values(rows).sort((x, y) => y.p - x.p || y.v - x.v || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || w.clubs[x.id].name.localeCompare(w.clubs[y.id].name));
  };

  M.position = (w, clubId) => M.table(w, w.clubs[clubId].div).findIndex((r) => r.id === clubId) + 1;

  M.topScorers = function (w, div, n = 10) {
    return Object.values(w.players)
      .filter((p) => p.clubId && w.clubs[p.clubId].div === div && p.s.goals > 0)
      .sort((a, b) => b.s.goals - a.s.goals || b.s.assists - a.s.assists)
      .slice(0, n);
  };

  M.userForm = function (w, n = 5) {
    const res = [];
    for (let i = w.week; i >= 1 && res.length < n; i--) {
      const wk = w.weeks[i];
      if (!wk) continue;
      const m = wk.matches.find((x) => x.played && (x.h === w.userClub || x.a === w.userClub));
      if (!m) continue;
      const home = m.h === w.userClub;
      const gf = home ? m.hs : m.as, ga = home ? m.as : m.hs;
      let r = gf > ga ? 'V' : gf < ga ? 'D' : 'E';
      if (m.pens) r = (home ? m.pens[0] > m.pens[1] : m.pens[1] > m.pens[0]) ? 'V' : 'D';
      res.push(r);
    }
    return res.reverse();
  };

  // ---------- Diretoria ----------
  function setObjective(w) {
    const u = M.user(w);
    const rank = Object.values(w.clubs).filter((c) => c.div === u.div).sort((a, b) => b.rep - a.rep).findIndex((c) => c.id === u.id) + 1;
    let target, label;
    if (u.div === 'A') {
      if (rank <= 3) { target = 3; label = 'brigar pelo título (top 3)'; }
      else if (rank <= 8) { target = 8; label = 'terminar entre os 8 primeiros'; }
      else if (rank <= 12) { target = 12; label = 'fazer uma campanha tranquila (top 12)'; }
      else { target = 13; label = 'evitar o rebaixamento'; }
    } else {
      if (rank <= 5) { target = 3; label = 'conquistar o acesso (top 3)'; }
      else if (rank <= 10) { target = 9; label = 'terminar entre os 9 primeiros'; }
      else { target = 14; label = 'fazer uma campanha digna (top 14)'; }
    }
    w.board.target = target;
    w.board.label = label;
  }

  function expectedPoints(w, m) {
    const home = m.h === w.userClub;
    const me = w.clubs[w.userClub], op = w.clubs[home ? m.a : m.h];
    const d = M.teamRating(w, me) - M.teamRating(w, op) + (m.neutral ? 0 : home ? 2 : -2);
    return U.clamp(1.35 + d * 0.09, 0.65, 2.4);
  }

  // ---------- Resultados ----------
  M.applyResult = function (w, m, res) {
    m.hs = res.hs; m.as = res.as; m.pens = res.pens; m.played = true;
    m.goals = res.goals.map((g) => [g.pid, g.side, g.min, g.assist || 0, g.pen ? 1 : 0]);
    const clubsIds = [m.h, m.a];
    const winner = res.winner;
    const playedSet = new Set(res.played[0].concat(res.played[1]));

    // Suspensões cumpridas
    for (const cid of clubsIds) {
      for (const pid of w.clubs[cid].squad) {
        const p = w.players[pid];
        if (p.susp > 0 && !playedSet.has(pid)) p.susp--;
      }
    }
    res.played.forEach((list, s) => {
      for (const pid of list) {
        const p = w.players[pid];
        if (!p) continue;
        p.s.apps++; p.c.apps++;
        p.s.rsum += res.ratings[pid] || 6;
        p.played = true;
        if (res.fat[pid] != null) p.fitness = Math.round(res.fat[pid]);
        const mor = winner === s ? 5 : winner === 1 - s ? -5 : 0;
        p.morale = U.clamp(p.morale + mor, 10, 100);
      }
    });
    for (const g of res.goals) {
      const p = w.players[g.pid];
      if (p) { p.s.goals++; p.c.goals++; }
      const a = g.assist && w.players[g.assist];
      if (a) { a.s.assists++; a.c.assists++; }
    }
    for (const c of res.cards) {
      const p = w.players[c.pid];
      if (!p) continue;
      if (c.type === 'yellow') { p.yc++; if (p.yc >= 3) { p.susp = 1; p.yc = 0; } }
      else if (c.type === 'red') p.susp = 2;
      else p.susp = 1;
    }
    for (const inj of res.injuries) {
      const p = w.players[inj.pid];
      if (p) { p.inj = Math.max(p.inj, inj.weeks); p.injNew = true; }
    }

    // Bilheteria para o mandante
    if (!m.neutral) {
      const hc = w.clubs[m.h], ac = w.clubs[m.a];
      const occ = U.clamp(0.35 + hc.rep / 200 + ac.rep / 400 + (m.comp === 'CUP' ? 0.1 : 0), 0.2, 1);
      const income = Math.round(hc.cap * occ * (15 + hc.rep * 0.3));
      m.attendance = Math.round(hc.cap * occ);
      M.money(w, m.h, income, 'tickets');
    }
    if (m.comp === 'CUP') {
      const wk = M.currentWeek(w);
      const winId = winner === 0 ? m.h : m.a;
      M.money(w, winId, M.CUP_PRIZE[wk.round], 'prize');
    }

    // Confiança da diretoria
    if (clubsIds.includes(w.userClub) && m.comp !== 'CUP') {
      const s = m.h === w.userClub ? 0 : 1;
      const pts = winner === s ? 3 : winner === -1 ? 1 : 0;
      w.board.conf = U.clamp(w.board.conf + (pts - expectedPoints(w, m)) * 2.4, 0, 100);
    } else if (clubsIds.includes(w.userClub)) {
      const s = m.h === w.userClub ? 0 : 1;
      w.board.conf = U.clamp(w.board.conf + (winner === s ? 2.5 : -2.5), 0, 100);
    }
  };

  M.simMatch = function (w, m, opts = {}) {
    const sim = new M.Sim(w, m.h, m.a, Object.assign({ knockout: m.comp === 'CUP', neutral: !!m.neutral }, opts));
    sim.runToEnd();
    M.applyResult(w, m, sim.result());
    return sim;
  };

  // Simula todos os jogos pendentes da semana (inclusive o do usuário, se houver).
  M.simulateWeek = function (w) {
    const wk = M.currentWeek(w);
    if (!wk) return;
    for (const m of wk.matches) if (!m.played) M.simMatch(w, m);
  };

  // ---------- Evolução ----------
  function develop(p, club) {
    const trainLvl = club ? club.training : 2;
    const intensity = club ? M.TRAINING[club.trainingInt].dev : 1;
    let g = 0;
    if (p.ovr < p.pot) {
      const gap = p.pot - p.ovr;
      const rate = p.age <= 18 ? 0.0085 : p.age <= 21 ? 0.007 : p.age <= 24 ? 0.0048 : p.age <= 27 ? 0.002 : 0.0005;
      g = gap * rate * (0.75 + 0.1 * trainLvl) * intensity * (p.played ? 1.3 : p.youth ? 1.1 : 0.85) * U.rand(0.5, 1.5);
    }
    if (p.age >= 31) g -= (p.age - 30) * 0.03 * U.rand(0.5, 1.5);
    p.ovr = U.clamp(p.ovr + g, 25, 99);
  }

  M.endWeek = function (w) {
    const wk = M.currentWeek(w);
    const u = M.user(w);
    const report = { news: [] };

    if (wk && wk.type === 'cup') {
      const winners = wk.matches.map((m) => {
        const win = m.hs > m.as ? 0 : m.hs < m.as ? 1 : m.pens[0] > m.pens[1] ? 0 : 1;
        return win === 0 ? m.h : m.a;
      });
      const userOut = w.cup.alive.includes(w.userClub) && !winners.includes(w.userClub);
      w.cup.alive = winners;
      if (userOut) M.msg(w, { kind: 'info', title: 'Eliminados da Copa', body: `O ${u.name} caiu na ${M.CUP_ROUNDS[wk.round].toLowerCase()} da Copa.` });
      if (wk.round === 4) {
        w.cup.champion = winners[0];
        const champ = w.clubs[winners[0]];
        champ.trophies.push({ season: w.season, comp: 'Copa' });
        M.msg(w, { kind: champ.id === u.id ? 'trophy' : 'info', title: `${champ.name} é campeão da Copa!`, body: champ.id === u.id ? 'Título! A torcida está em festa e a diretoria, radiante.' : `O ${champ.name} levantou a taça da Copa.` });
        if (champ.id === u.id) w.board.conf = U.clamp(w.board.conf + 15, 0, 100);
      }
    }

    // Jogadores
    const ownerOf = {};
    for (const c of Object.values(w.clubs)) for (const id of c.squad.concat(c.youth)) ownerOf[id] = c;
    for (const p of Object.values(w.players)) {
      const club = ownerOf[p.id];
      if (p.inj > 0) {
        if (p.injNew) p.injNew = false;
        else {
          p.inj--;
          if (p.inj === 0 && club === u) M.msg(w, { kind: 'medical', title: `${p.name} recuperado`, body: `${p.name} está liberado pelo departamento médico.` });
        }
      }
      const tr = club ? M.TRAINING[club.trainingInt] : M.TRAINING.mid;
      p.fitness = U.clamp(p.fitness + tr.recover, 0, 100);
      develop(p, club);
      if (club && !p.youth) {
        if (!p.played && !p.inj) p.morale = U.clamp(p.morale - 1.2, 10, 100);
        p.morale += (65 - p.morale) * 0.04;
        if (!p.inj && U.chance(0.0035 * tr.injury)) {
          p.inj = U.randi(1, 3);
          if (club === u) M.msg(w, { kind: 'medical', title: `${p.name} machucado no treino`, body: `${p.name} sofreu uma lesão no treino e fica fora por ${p.inj} semana(s).` });
        }
      }
      p.played = false;
    }

    // Finanças semanais
    for (const c of Object.values(w.clubs)) {
      const wages = U.sum(c.squad.concat(c.youth), (id) => w.players[id].wage);
      M.money(w, c.id, -wages, 'wages');
      M.money(w, c.id, Math.round(c.rep * 3000), 'sponsor');
      M.money(w, c.id, TV[c.div], 'tv');
    }
    w.finance.push(Object.assign({ season: w.season, week: w.week, balance: u.money }, w.finWeek));
    if (w.finance.length > 60) w.finance.shift();
    w.finWeek = {};

    if (M.windowOpen(w)) {
      M.aiTransfers(w);
      M.aiOffersToUser(w);
    }
    // Propostas expiradas
    for (const m of w.inbox) {
      if (m.offer && !m.offer.done && (m.offer.expires < w.week || m.season !== w.season)) {
        m.offer.done = true; m.offer.expired = true;
      }
    }
    if (u.money < 0) {
      w.board.conf = U.clamp(w.board.conf - 2, 0, 100);
      if (w.week % 4 === 0) M.msg(w, { kind: 'board', title: 'Caixa no vermelho', body: 'A diretoria está preocupada com as finanças negativas. Venda jogadores ou reduza a folha salarial.' });
    }
    if (w.week === M.WINDOWS[1][0] - 1) M.msg(w, { kind: 'info', title: 'Janela do meio do ano', body: `A janela de transferências abre na próxima semana e vai até a semana ${M.WINDOWS[1][1]}.` });

    if (w.week >= 8 && w.board.conf <= 4) {
      w.fired = { reason: 'A sequência de maus resultados custou o seu emprego.' };
    }

    w.week++;
    if (w.week > M.TOTAL_WEEKS) {
      report.seasonEnd = M.seasonEnd(w);
    } else {
      const next = M.currentWeek(w);
      if (next.type === 'cup' && !next.matches.length) drawCup(w, next);
      for (const c of Object.values(w.clubs)) if (c.id !== w.userClub) M.autoLineup(w, c);
    }
    return report;
  };

  // ---------- Fim de temporada ----------
  M.seasonEnd = function (w) {
    const u = M.user(w);
    const tA = M.table(w, 'A'), tB = M.table(w, 'B');
    const userDiv = u.div;
    const userPos = (userDiv === 'A' ? tA : tB).findIndex((r) => r.id === u.id) + 1;
    tA.forEach((r, i) => M.money(w, r.id, (17 - (i + 1)) * 0.8e6, 'prize'));
    tB.forEach((r, i) => M.money(w, r.id, (17 - (i + 1)) * 0.25e6, 'prize'));
    const champA = w.clubs[tA[0].id], champB = w.clubs[tB[0].id];
    champA.trophies.push({ season: w.season, comp: 'Série A' });
    champB.trophies.push({ season: w.season, comp: 'Série B' });
    const relegated = tA.slice(-3).map((r) => r.id);
    const promoted = tB.slice(0, 3).map((r) => r.id);
    relegated.forEach((id) => { w.clubs[id].rep = U.clamp(w.clubs[id].rep - 4, 30, 95); });
    promoted.forEach((id) => { w.clubs[id].rep = U.clamp(w.clubs[id].rep + 3, 30, 95); });
    tA.forEach((r, i) => { const c = w.clubs[r.id]; c.rep = U.clamp(c.rep + (8.5 - (i + 1)) * 0.35, 30, 95); });
    tB.forEach((r, i) => { const c = w.clubs[r.id]; c.rep = U.clamp(c.rep + (8.5 - (i + 1)) * 0.25, 30, 95); });

    const scA = M.topScorers(w, 'A', 1)[0], scB = M.topScorers(w, 'B', 1)[0];
    const best = Object.values(w.players)
      .filter((p) => p.clubId && p.s.apps >= 15)
      .sort((a, b) => b.s.rsum / b.s.apps - a.s.rsum / a.s.apps)[0];

    const success = userPos <= w.board.target;
    const delta = success ? 20 + (w.board.target - userPos) * 2 : -(userPos - w.board.target) * 7;
    w.board.conf = U.clamp(w.board.conf + delta, 0, 100);
    const fired = w.board.conf < 20;

    const entry = {
      season: w.season,
      champA: champA.id, champB: champB.id, cup: w.cup.champion,
      user: { club: u.id, div: userDiv, pos: userPos, objective: w.board.label, success },
      scorerA: scA ? { name: scA.name, club: scA.clubId, goals: scA.s.goals } : null,
      best: best ? { name: best.name, club: best.clubId, avg: best.s.rsum / best.s.apps } : null,
    };
    w.history.push(entry);

    const summary = { entry, tA, tB, relegated, promoted, userPos, success, fired, scA, scB, best };
    if (fired) w.fired = { reason: `Objetivo não cumprido: a meta era ${w.board.label}, e o time terminou em ${userPos}º.` };
    else if (userPos <= Math.max(1, w.board.target - 3) || (userDiv === 'B' && userPos <= 3)) {
      const bigger = Object.values(w.clubs).filter((c) => c.rep > u.rep + 4 && c.id !== u.id);
      if (bigger.length && U.chance(0.6)) summary.offer = U.pick(bigger).id;
    }
    w.pendingSeason = summary;
    return summary;
  };

  M.newSeason = function (w) {
    const u = M.user(w);
    const news = [];
    const ps = w.pendingSeason;
    if (ps) {
      ps.relegated.forEach((id) => (w.clubs[id].div = 'B'));
      ps.promoted.forEach((id) => (w.clubs[id].div = 'A'));
    }
    w.pendingSeason = null;
    // Envelhecimento e aposentadoria
    for (const p of Object.values(w.players)) {
      p.age++;
      if (p.age >= 25) p.pot = Math.max(Math.round(p.ovr), Math.min(p.pot, Math.round(p.ovr) + 2));
      const retireP = p.age >= 38 ? 1 : p.age >= 34 ? (p.age - 33) * 0.22 : 0;
      if (!p.youth && U.chance(retireP)) {
        if (p.clubId === u.id) news.push(`${p.name} (${p.age} anos) se aposentou.`);
        removePlayer(w, p);
      }
    }
    // Contratos
    for (const c of Object.values(w.clubs)) {
      for (const id of c.squad.slice()) {
        const p = w.players[id];
        p.contract--;
        p.renewAsk = null;
        if (p.contract > 0) continue;
        if (c.id === u.id) {
          news.push(`${p.name} encerrou o contrato e deixou o clube.`);
          toFree(w, p);
        } else if (U.chance(0.75)) {
          p.contract = U.randi(1, 3);
          p.wage = M.wageFor(p.ovr);
        } else toFree(w, p);
      }
    }
    // Base: 19+ anos sobe ou sai
    for (const c of Object.values(w.clubs)) {
      for (const id of c.youth.slice()) {
        const p = w.players[id];
        if (p.age < 19) continue;
        const keep = c.id === u.id ? c.squad.length < 32 : p.pot >= 50 + c.rep * 0.3 && c.squad.length < 30;
        if (keep) {
          M.promoteYouth(w, id, true);
          if (c.id === u.id) news.push(`${p.name} completou 19 anos e subiu para o profissional.`);
        } else {
          if (c.id === u.id) news.push(`${p.name} completou 19 anos e foi dispensado da base.`);
          removePlayer(w, p);
        }
      }
    }
    // Clubes da CPU completam o elenco
    for (const c of Object.values(w.clubs)) if (c.id !== u.id) aiMaintain(w, c);
    // Nova safra da base
    const intake = [];
    for (const c of Object.values(w.clubs)) {
      const n = U.randi(2, 2 + c.academy);
      for (let k = 0; k < n; k++) {
        const y = M.makeYouth(w, c, U.randi(15, 16));
        if (c.id === u.id) intake.push(y);
      }
    }
    // Agentes livres
    w.free = w.free.filter((id) => w.players[id]);
    while (w.free.length > 70) {
      const worst = w.free.map((id) => w.players[id]).sort((a, b) => a.ovr - b.ovr)[0];
      removePlayer(w, worst);
    }
    while (w.free.length < 40) M.makeFreeAgent(w);

    w.season++;
    w.week = 0;
    w.board.conf = 50 + (w.board.conf - 50) * 0.5;
    M.startSeason(w);
    for (const c of Object.values(w.clubs)) M.ensureLineup(w, c);
    if (news.length) M.msg(w, { kind: 'info', title: 'Movimentações de fim de temporada', body: news.join('\n') });
    if (intake.length) {
      const best = intake.slice().sort((a, b) => b.pot - a.pot)[0];
      M.msg(w, { kind: 'youth', title: `Nova safra da base: ${intake.length} garotos`, body: `Chegaram à base: ${intake.map((p) => `${p.name} (${p.pos}, ${p.age})`).join(', ')}. Destaque para ${best.name}, que os olheiros acham promissor.` });
    }
  };

  // Mantém o elenco de um clube da CPU entre 23 e 30 jogadores.
  function aiMaintain(w, c) {
    while (c.squad.length > 30) {
      const worst = M.clubPlayers(w, c).sort((a, b) => a.ovr - b.ovr)[0];
      toFree(w, worst);
    }
    while (c.squad.length < 23) {
      const need = neededPos(w, c);
      const fa = w.free.map((id) => w.players[id]).filter((p) => p.pos === need).sort((a, b) => b.ovr - a.ovr)[0];
      if (fa && fa.ovr > 45 + c.rep * 0.25) M.transfer(w, fa.id, c.id, 0, true);
      else {
        const base = 48 + c.rep * 0.32;
        const age = U.randi(19, 30);
        const p = M.newPlayer(w, { pos: need, age, ovr: U.clamp(base - 3 + U.gauss() * 4, 40, 90), pot: base + U.rand(0, 8), clubId: c.id, contract: U.randi(1, 4) });
        c.squad.push(p.id);
      }
    }
    M.assignNumbers(w, c);
  }
  M.aiMaintain = aiMaintain;

  function neededPos(w, c) {
    const tpl = { GOL: 3, ZAG: 4, LAT: 4, VOL: 3, MEI: 4, ATA: 4 };
    const count = {};
    for (const p of M.clubPlayers(w, c)) count[p.pos] = (count[p.pos] || 0) + 1;
    let best = 'MEI', gap = -99;
    for (const pos in tpl) { const g = tpl[pos] - (count[pos] || 0); if (g > gap) { gap = g; best = pos; } }
    return best;
  }
  M.neededPos = neededPos;

  function detach(w, p) {
    if (p.clubId && w.clubs[p.clubId]) {
      const c = w.clubs[p.clubId];
      c.squad = c.squad.filter((id) => id !== p.id);
      c.youth = c.youth.filter((id) => id !== p.id);
      c.lineup = c.lineup.map((id) => (id === p.id ? null : id));
      c.bench = c.bench.filter((id) => id !== p.id);
    }
    w.free = w.free.filter((id) => id !== p.id);
  }
  M.detach = detach;

  function toFree(w, p) {
    detach(w, p);
    p.clubId = null;
    p.contract = 0;
    p.listed = false;
    p.num = 0;
    p.youth = false;
    w.free.push(p.id);
  }
  M.toFree = toFree;

  function removePlayer(w, p) {
    detach(w, p);
    delete w.players[p.id];
  }
  M.removePlayer = removePlayer;

  // Demissão: propostas de clubes menores
  M.jobOffers = function (w) {
    const u = M.user(w);
    const pool = Object.values(w.clubs).filter((c) => c.id !== u.id && c.rep < u.rep - 3);
    return U.shuffle(pool.length >= 3 ? pool : Object.values(w.clubs).filter((c) => c.id !== u.id)).slice(0, 3).map((c) => c.id);
  };

  M.switchClub = function (w, clubId) {
    const old = w.clubs[w.userClub];
    w.userClub = clubId;
    aiMaintain(w, old);
    M.autoLineup(w, old);
    w.fired = null;
    w.board.conf = 55;
    setObjective(w);
    M.ensureLineup(w, w.clubs[clubId]);
    const c = w.clubs[clubId];
    M.msg(w, { kind: 'board', title: `Bem-vindo ao ${c.name}!`, body: `A diretoria do ${c.name} confia no seu trabalho. Objetivo: ${w.board.label}.` });
  };
})(window.SCM);

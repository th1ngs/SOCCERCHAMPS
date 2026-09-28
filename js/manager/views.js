// Telas das abas: início, elenco, tática, base, mercado, competições, clube e mensagens.
(function (M) {
  const U = M.U, UI = M.UI;
  const V = (M.VIEWS = {});
  const esc = U.esc;

  function nextFixture(w) {
    for (let i = Math.max(1, w.week); i <= M.TOTAL_WEEKS; i++) {
      const wk = w.weeks[i];
      if (!wk) continue;
      const m = wk.matches.find((x) => !x.played && (x.h === w.userClub || x.a === w.userClub));
      if (m) return { m, week: i, wk };
    }
    return null;
  }
  M.nextFixture = nextFixture;

  const compLabel = (w, m, wk) => (m.comp === 'CUP' ? `Copa • ${M.CUP_ROUNDS[wk.round]}` : `Série ${m.comp} • Rodada ${wk.round}`);

  // ---------- Início ----------
  V.home = function (w) {
    const u = M.user(w);
    const nf = nextFixture(w);
    const table = M.table(w, u.div);
    const pos = table.findIndex((r) => r.id === u.id);
    const around = table.slice(Math.max(0, Math.min(pos - 2, table.length - 5)), Math.max(5, Math.min(pos + 3, table.length)));
    const players = M.clubPlayers(w, u);
    const injured = players.filter((p) => p.inj > 0);
    const susp = players.filter((p) => p.susp > 0);
    const tired = players.filter((p) => !p.inj && p.fitness < 70 && u.lineup.includes(p.id));
    const expiring = players.filter((p) => p.contract <= 1);
    const scorers = players.filter((p) => p.s.goals > 0).sort((a, b) => b.s.goals - a.s.goals).slice(0, 3);
    const wages = U.sum(u.squad.concat(u.youth), (id) => w.players[id].wage);
    const conf = Math.round(w.board.conf);

    let next = `<div class="card next"><h3 class="sec">Próximo jogo</h3><p class="muted">Sem jogos marcados. Os confrontos da Copa são sorteados a cada fase.</p></div>`;
    if (nf) {
      const home = nf.m.h === u.id;
      const opp = w.clubs[home ? nf.m.a : nf.m.h];
      const oppPos = opp.div === u.div && nf.m.comp !== 'CUP' && M.table(w, u.div).some((r) => r.j > 0) ? M.position(w, opp.id) : null;
      const oppForm = M.userForm({ ...w, userClub: opp.id }, 5);
      next = `<div class="card next">
        <h3 class="sec">Próximo jogo • ${compLabel(w, nf.m, nf.wk)}${nf.week !== w.week ? ` • semana ${nf.week}` : ''}</h3>
        <div class="vs-line">
          <div class="vs-team">${M.crest(home ? u : opp, 56)}<b>${esc(home ? u.name : opp.name)}</b></div>
          <div class="vs-mid"><span>${home ? 'EM CASA' : 'FORA'}</span><b>VS</b></div>
          <div class="vs-team">${M.crest(home ? opp : u, 56)}<b>${esc(home ? opp.name : u.name)}</b></div>
        </div>
        <div class="vs-meta">
          <span>Adversário: ${oppPos ? oppPos + 'º na tabela' : 'Série ' + opp.div} • força ${Math.round(M.teamRating(w, opp))}</span>
          <span>Forma: ${UI.formChips(oppForm) || '—'}</span>
        </div>
        ${nf.week === w.week ? `<button class="btn primary wide" data-act="advance">Ir para o jogo ▶</button>` : ''}
      </div>`;
    }

    return `<div class="dash">
      ${next}
      <div class="card">
        <h3 class="sec">Diretoria</h3>
        <div class="conf"><div class="conf-num ${conf < 30 ? 'bad' : conf < 55 ? 'warn' : 'good'}">${conf}%</div>
          <div><b>Confiança no treinador</b><small>Meta: ${esc(w.board.label)}</small></div></div>
        ${UI.bar(conf, 'wide')}
        <p class="muted small">${conf < 30 ? 'Você está na corda bamba. Precisa de resultados já.' : conf < 55 ? 'A diretoria está atenta ao desempenho.' : 'A diretoria apoia o seu trabalho.'}</p>
      </div>
      <div class="card">
        <h3 class="sec">Série ${u.div} <button class="link" data-act="goto" data-arg="comps" data-sub="${u.div}">ver tabela</button></h3>
        <table class="tbl compact"><tbody>${around.map((r) => {
          const i = table.indexOf(r);
          return `<tr class="${r.id === u.id ? 'me' : ''}"><td class="n">${i + 1}</td><td>${M.crest(w.clubs[r.id], 16)} ${esc(w.clubs[r.id].name)}</td><td class="n">${r.j}</td><td class="n b">${r.p}</td></tr>`;
        }).join('')}</tbody></table>
        <div class="form-line">Sua forma: ${UI.formChips(M.userForm(w)) || '<span class="muted">sem jogos ainda</span>'}</div>
      </div>
      <div class="card">
        <h3 class="sec">Elenco</h3>
        <ul class="alerts">
          ${players.length < 20 ? `<li>⚠️ Elenco curto: só <b>${players.length}</b> jogadores. Contrate no <button class="link" data-act="goto" data-arg="market">mercado</button> ou promova garotos da base.</li>` : ''}
          ${injured.length ? `<li>🩹 <b>${injured.length}</b> lesionado(s): ${injured.map((p) => esc(p.name) + ` (${p.inj} sem.)`).join(', ')}</li>` : ''}
          ${susp.length ? `<li>🟥 Suspenso(s): ${susp.map((p) => esc(p.name)).join(', ')}</li>` : ''}
          ${tired.length ? `<li>🥵 Titulares cansados: ${tired.map((p) => esc(p.name) + ` (${Math.round(p.fitness)}%)`).join(', ')}</li>` : ''}
          ${expiring.length ? `<li>📝 <b>${expiring.length}</b> contrato(s) terminam nesta temporada. <button class="link" data-act="goto" data-arg="squad">renovar</button></li>` : ''}
          ${players.length >= 20 && !injured.length && !susp.length && !tired.length && !expiring.length ? '<li>✅ Elenco sem problemas.</li>' : ''}
        </ul>
        <h3 class="sec">Artilheiros do time</h3>
        ${scorers.length ? scorers.map((p) => `<div class="li">⚽ ${esc(p.name)} <b>${p.s.goals}</b></div>`).join('') : '<p class="muted small">Ninguém marcou ainda.</p>'}
      </div>
      <div class="card">
        <h3 class="sec">Finanças</h3>
        <div class="kv"><span>Saldo</span><b class="${u.money < 0 ? 'neg' : ''}">${U.money(u.money)}</b></div>
        <div class="kv"><span>Folha salarial</span><b>${U.money(wages)}/sem</b></div>
        <div class="kv"><span>Estádio</span><b>${u.cap.toLocaleString('pt-BR')} lugares</b></div>
        <div class="kv"><span>Janela</span><b>${M.windowOpen(w) ? 'aberta' : M.nextWindow(w) ? 'abre na semana ' + M.nextWindow(w) : 'fechada até a próxima temporada'}</b></div>
      </div>
      <div class="card">
        <h3 class="sec">Mensagens <button class="link" data-act="goto" data-arg="inbox">ver todas</button></h3>
        ${w.inbox.slice(0, 4).map((m) => `<div class="msg-mini ${m.read ? '' : 'unread'}" data-act="openMsg" data-arg="${m.id}"><b>${esc(m.title)}</b><small>T${m.season} • sem. ${m.week}</small></div>`).join('') || '<p class="muted small">Nenhuma mensagem.</p>'}
      </div>
    </div>`;
  };

  // ---------- Elenco ----------
  const SORTS = {
    pos: (a, b) => M.POS.indexOf(a.pos) - M.POS.indexOf(b.pos) || b.ovr - a.ovr,
    ovr: (a, b) => b.ovr - a.ovr,
    age: (a, b) => a.age - b.age,
    pot: (a, b) => b.pot - a.pot,
    value: (a, b) => M.valueOf(b) - M.valueOf(a),
    goals: (a, b) => b.s.goals - a.s.goals,
    fit: (a, b) => a.fitness - b.fitness,
  };

  function statusIcons(w, p) {
    const u = M.user(w);
    let s = '';
    if (u.lineup.includes(p.id)) s += '<span class="tag start" title="Titular">TIT</span>';
    else if (u.bench.includes(p.id)) s += '<span class="tag bench" title="Reserva">RES</span>';
    if (p.inj) s += `<span class="tag inj" title="Lesionado">🩹${p.inj}</span>`;
    if (p.susp) s += '<span class="tag susp" title="Suspenso">🟥</span>';
    if (p.listed) s += '<span class="tag sale" title="À venda">💲</span>';
    if (p.contract <= 1) s += '<span class="tag ctr" title="Contrato acabando">📝</span>';
    return s;
  }

  V.squad = function (w) {
    const u = M.user(w);
    const sort = UI.sub.squadSort || 'pos';
    const players = M.clubPlayers(w, u).sort(SORTS[sort]);
    const th = (k, label) => `<th class="sortable ${sort === k ? 'on' : ''}" data-act="squadSort" data-arg="${k}">${label}</th>`;
    const wages = U.sum(players, (p) => p.wage);
    return `<div class="view-head"><h2>Elenco <small>${players.length}/${M.SQUAD_MAX} jogadores • folha ${U.money(wages)}/sem</small></h2>
      <p class="muted">Toque em um jogador para ver detalhes, renovar, vender ou dispensar.</p></div>
      <div class="tbl-wrap"><table class="tbl players">
        <thead><tr><th>#</th><th>Nome</th>${th('pos', 'Pos')}${th('age', 'Idade')}${th('ovr', 'OVR')}${th('pot', 'Pot.')}${th('fit', 'Cond.')}<th>Moral</th>${th('goals', 'J / G / A')}${th('value', 'Valor')}<th>Contr.</th><th></th></tr></thead>
        <tbody>${players.map((p) => `<tr data-act="player" data-arg="${p.id}">
          <td class="n muted">${p.num}</td><td class="nm">${esc(p.name)}</td><td>${UI.pos(p.pos)}</td><td class="n">${p.age}</td>
          <td>${UI.ovr(p.ovr)}</td><td>${UI.potStars(p, true)}</td><td>${UI.bar(p.fitness)}</td><td>${UI.bar(p.morale)}</td>
          <td class="n">${p.s.apps} / ${p.s.goals} / ${p.s.assists}</td><td class="n">${U.money(M.valueOf(p))}</td>
          <td class="n">${p.contract} ${p.contract === 1 ? 'ano' : 'anos'}</td><td class="icons">${statusIcons(w, p)}</td></tr>`).join('')}
        </tbody></table></div>`;
  };
  M.ACT.squadSort = (el) => { UI.sub.squadSort = el.dataset.arg; UI.render(); };

  // ---------- Modal de jogador ----------
  UI.playerModal = function (pid) {
    const w = UI.w, p = w.players[pid];
    if (!p) return;
    const u = M.user(w);
    const own = p.clubId === u.id;
    const club = p.clubId ? w.clubs[p.clubId] : null;
    const avg = p.s.apps ? (p.s.rsum / p.s.apps).toFixed(2) : '—';
    let actions = '';
    if (own && p.youth) {
      actions = `<button class="btn primary" data-act="promote" data-arg="${p.id}">Promover ao profissional</button>
        <button class="btn danger ghost" data-act="dismissYouth" data-arg="${p.id}">Dispensar da base</button>`;
    } else if (own) {
      actions = `${p.contract <= 2 ? `<button class="btn" data-act="renewModal" data-arg="${p.id}">Renovar contrato</button>` : ''}
        <button class="btn" data-act="toggleList" data-arg="${p.id}">${p.listed ? 'Tirar da lista de venda' : 'Colocar à venda'}</button>
        <button class="btn danger ghost" data-act="releaseP" data-arg="${p.id}">Rescindir contrato</button>`;
    } else {
      actions = M.windowOpen(w)
        ? `<button class="btn primary" data-act="bidModal" data-arg="${p.id}">${club ? 'Fazer proposta' : 'Contratar (sem custo)'}</button>`
        : `<p class="muted small">A janela de transferências está fechada${M.nextWindow(w) ? ` (abre na semana ${M.nextWindow(w)})` : ''}.</p>`;
    }
    UI.modal(`<div class="pl-head">
        <div class="pl-ovr">${UI.ovr(p.ovr)}<small>OVR</small></div>
        <div class="pl-id"><h2>${esc(p.name)}</h2>
          <div>${UI.pos(p.pos)} ${M.POS_NAME[p.pos]} • ${p.age} anos ${p.num ? '• camisa ' + p.num : ''}</div>
          <div class="muted">${club ? M.crest(club, 16) + ' ' + esc(club.name) + (p.youth ? ' (base)' : '') : 'Sem clube (agente livre)'}</div>
        </div>
        <div class="pl-pot"><small>Potencial</small>${UI.potStars(p, own)}</div>
      </div>
      <div class="grid2 pl-grid">
        <div>
          <div class="kv"><span>Condição física</span>${UI.bar(p.fitness)}</div>
          <div class="kv"><span>Moral</span>${UI.bar(p.morale)}</div>
          <div class="kv"><span>Valor de mercado</span><b>${U.money(M.valueOf(p))}</b></div>
          <div class="kv"><span>Salário</span><b>${U.money(p.wage)}/sem</b></div>
          <div class="kv"><span>Contrato</span><b>${p.contract > 0 ? p.contract + (p.contract === 1 ? ' ano' : ' anos') : '—'}</b></div>
          ${p.inj ? `<div class="kv"><span>Lesão</span><b class="neg">${p.inj} semana(s)</b></div>` : ''}
          ${p.susp ? `<div class="kv"><span>Suspensão</span><b class="neg">${p.susp} jogo(s)</b></div>` : ''}
        </div>
        <div>
          <div class="kv"><span>Jogos na temporada</span><b>${p.s.apps}</b></div>
          <div class="kv"><span>Gols / assistências</span><b>${p.s.goals} / ${p.s.assists}</b></div>
          <div class="kv"><span>Nota média</span><b>${avg}</b></div>
          <div class="kv"><span>Carreira</span><b>${p.c.apps} jogos, ${p.c.goals} gols</b></div>
          <div class="kv"><span>Cartões amarelos</span><b>${p.yc} (3 = suspensão)</b></div>
        </div>
      </div>
      <div class="row-btns">${actions}</div>`);
  };
  M.ACT.player = (el) => UI.playerModal(el.dataset.arg);

  M.ACT.toggleList = (el) => {
    const p = UI.w.players[el.dataset.arg];
    p.listed = !p.listed;
    UI.toast(p.listed ? `${p.name} está na lista de transferências. Aguarde propostas nas janelas.` : `${p.name} saiu da lista de transferências.`);
    UI.playerModal(p.id); UI.refresh();
  };

  M.ACT.releaseP = (el) => {
    const w = UI.w, p = w.players[el.dataset.arg];
    UI.confirm(`Rescindir com ${p.name}?`, `A multa rescisória é de ${U.money(M.releaseCost(p))}. O jogador vira agente livre.`, 'Rescindir', () => {
      M.release(w, p.id);
      M.ensureLineup(w, M.user(w));
      UI.toast(`${p.name} foi dispensado.`);
      UI.refresh();
    });
  };

  M.ACT.renewModal = (el) => {
    const w = UI.w, p = w.players[el.dataset.arg];
    const ask = M.renewDemand(w, p);
    UI.modal(`<h2>Renovar com ${esc(p.name)}</h2>
      <p class="muted">Salário atual ${U.money(p.wage)}/sem. O jogador pede <b>${U.money(ask)}/sem</b>.</p>
      <label class="field"><span>Duração do novo contrato</span>
        <select id="renYears">${[1, 2, 3, 4, 5].map((y) => `<option value="${y}" ${y === 3 ? 'selected' : ''}>${y} ano(s)</option>`).join('')}</select></label>
      <div class="row-btns"><button class="btn ghost" data-act="player" data-arg="${p.id}">Voltar</button>
        <button class="btn primary" data-act="renewDo" data-arg="${p.id}">Assinar renovação</button></div>`);
  };
  M.ACT.renewDo = (el) => {
    const w = UI.w, p = w.players[el.dataset.arg];
    const years = Number(document.getElementById('renYears').value);
    M.renew(w, p.id, years);
    UI.toast(`${p.name} renovou por ${years} ano(s).`);
    UI.playerModal(p.id); UI.refresh();
  };

  // ---------- Proposta ----------
  M.ACT.bidModal = (el) => {
    const w = UI.w, p = w.players[el.dataset.arg];
    const val = M.valueOf(p);
    const u = M.user(w);
    const club = p.clubId ? w.clubs[p.clubId] : null;
    const def = club ? val : 0;
    UI.modal(`<h2>${club ? 'Proposta por' : 'Contratar'} ${esc(p.name)}</h2>
      <p class="muted">${club ? `Clube: ${esc(club.name)}. Valor de mercado: <b>${U.money(val)}</b>.` : 'Agente livre: não há custo de transferência, só salário.'} Seu caixa: <b>${U.money(u.money)}</b>.</p>
      ${club ? `<label class="field"><span>Valor da proposta (R$ milhões)</span>
        <input id="bidAmt" type="number" min="0" step="0.05" value="${(def / 1e6).toFixed(2)}"></label>
        <div class="quick">${[0.9, 1, 1.15, 1.3, 1.5].map((f) => `<button class="chip-btn" data-act="bidQuick" data-arg="${((val * f) / 1e6).toFixed(2)}">${Math.round(f * 100)}%</button>`).join('')}</div>` : ''}
      <div id="bidOut"></div>
      <div class="row-btns"><button class="btn ghost" data-act="player" data-arg="${p.id}">Voltar</button>
        <button class="btn primary" data-act="bidSend" data-arg="${p.id}">${club ? 'Enviar proposta' : 'Negociar'}</button></div>`);
  };
  M.ACT.bidQuick = (el) => { document.getElementById('bidAmt').value = el.dataset.arg; };
  M.ACT.bidSend = (el) => {
    const w = UI.w, pid = el.dataset.arg, p = w.players[pid];
    const inp = document.getElementById('bidAmt');
    const fee = inp ? Math.max(0, Math.round(Number(inp.value) * 1e6 / 10000) * 10000) : 0;
    const r = M.evaluateBid(w, pid, fee);
    const out = document.getElementById('bidOut');
    let extra = '';
    if (r.status === 'accepted') extra = `<button class="btn primary" data-act="bidClose" data-arg="${pid}" data-fee="${fee}" data-wage="${r.wage}">Fechar contratação</button>`;
    if (r.status === 'counter') {
      const r2wage = M.wageDemand(w, p, M.user(w));
      extra = `<button class="btn" data-act="bidClose" data-arg="${pid}" data-fee="${r.ask}" data-wage="${r2wage}">Aceitar ${U.money(r.ask)}</button>`;
    }
    out.innerHTML = `<div class="alert ${r.status === 'accepted' ? 'good' : r.status === 'counter' ? 'info' : 'bad'}">${esc(r.text)} ${extra}</div>`;
  };
  M.ACT.bidClose = (el) => {
    const w = UI.w, pid = el.dataset.arg;
    const fee = Number(el.dataset.fee), wage = Number(el.dataset.wage);
    const u = M.user(w);
    if (fee > u.money) { UI.toast('Dinheiro insuficiente.'); return; }
    if (u.squad.length >= M.SQUAD_MAX) { UI.toast('Elenco cheio.'); return; }
    M.completeBuy(w, pid, fee, wage);
    UI.closeModal();
    UI.toast(`${w.players[pid].name} é o novo reforço do ${u.name}!`);
    UI.refresh();
  };

  // ---------- Tática ----------
  function sectors(w, club) {
    const slots = M.FORMATIONS[club.formation];
    const acc = { d: [0, 0], m: [0, 0], a: [0, 0] };
    club.lineup.forEach((id, i) => {
      const p = w.players[id];
      if (!p) return;
      const sp = slots[i].pos;
      const eff = p.ovr * M.fit(p.pos, sp) * (0.7 + 0.3 * p.fitness / 100);
      const wt = M.SECTOR[sp];
      for (const k of ['d', 'm', 'a']) if (wt[k]) { acc[k][0] += eff * wt[k]; acc[k][1] += wt[k]; }
    });
    const gk = club.lineup.map((id, i) => ({ p: w.players[id], s: slots[i] })).find((x) => x.s.pos === 'GOL');
    return { G: gk && gk.p ? gk.p.ovr : 0, D: acc.d[1] ? acc.d[0] / acc.d[1] : 0, M: acc.m[1] ? acc.m[0] / acc.m[1] : 0, A: acc.a[1] ? acc.a[0] / acc.a[1] : 0 };
  }
  M.sectors = sectors;

  V.tactics = function (w) {
    const u = M.user(w);
    M.ensureLineup(w, u);
    const slots = M.FORMATIONS[u.formation];
    const sec = sectors(w, u);
    const pitch = slots.map((s, i) => {
      const p = w.players[u.lineup[i]];
      if (!p) return '';
      const fit = M.fit(p.pos, s.pos);
      return `<button class="slot ${fit < 1 ? (fit < 0.8 ? 'bad' : 'meh') : ''}" style="left:${s.y}%;top:${100 - s.x - 2}%" data-act="slotPick" data-arg="${i}">
        <span class="shirt" style="--c1:${u.colors[0]};--c2:${u.colors[1]}">${p.num}</span>
        <span class="sname">${esc(p.name.split(' ').slice(-1)[0])}</span>
        <span class="smeta">${s.pos} • ${Math.round(p.ovr)}${fit < 1 ? ' ⚠' : ''}</span>
        <span class="sfit"><i style="width:${p.fitness}%"></i></span></button>`;
    }).join('');
    const bench = u.bench.map((id, i) => {
      const p = w.players[id];
      return `<button class="bench-p" data-act="benchPick" data-arg="${i}">${UI.pos(p.pos)} <span class="nm">${esc(p.name)}</span> ${UI.ovr(p.ovr)}</button>`;
    }).join('');
    return `<div class="view-head"><h2>Tática</h2><p class="muted">Toque em uma posição no campo para trocar o jogador. ⚠ indica jogador fora da posição de origem.</p></div>
      <div class="tactics">
        <div class="pitch-v">${pitch}</div>
        <div class="tac-side">
          <div class="card">
            <h3 class="sec">Formação</h3>
            <div class="chips">${Object.keys(M.FORMATIONS).map((f) => `<button class="chip-btn ${u.formation === f ? 'on' : ''}" data-act="setFormation" data-arg="${f}">${f}</button>`).join('')}</div>
            <h3 class="sec">Estilo de jogo</h3>
            <div class="chips">${Object.entries(M.TACTICS).map(([k, t]) => `<button class="chip-btn ${u.tactic === k ? 'on' : ''}" data-act="setTactic" data-arg="${k}">${t.name}</button>`).join('')}</div>
            <p class="muted small">${{ def: 'Menos chances para o adversário, menos ataque.', bal: 'Sem riscos extras.', att: 'Mais ataque, defesa mais exposta.', press: 'Rouba bola no meio e ataca mais, mas cansa bem mais.' }[u.tactic]}</p>
            <button class="btn wide" data-act="autoPick">Escalar o melhor time</button>
          </div>
          <div class="card">
            <h3 class="sec">Força por setor</h3>
            ${[['Goleiro', sec.G], ['Defesa', sec.D], ['Meio-campo', sec.M], ['Ataque', sec.A]].map(([n, v]) => `<div class="kv"><span>${n}</span><span class="secbar"><i style="width:${U.clamp((v - 40) * 2, 4, 100)}%"></i><b>${Math.round(v)}</b></span></div>`).join('')}
          </div>
          <div class="card"><h3 class="sec">Banco de reservas</h3><div class="bench">${bench}</div></div>
        </div>
      </div>`;
  };

  M.ACT.setFormation = (el) => {
    const w = UI.w, u = M.user(w);
    u.formation = el.dataset.arg;
    M.autoLineup(w, u);
    UI.refresh();
  };
  M.ACT.setTactic = (el) => { M.user(UI.w).tactic = el.dataset.arg; UI.refresh(); };
  M.ACT.autoPick = () => { M.autoLineup(UI.w, M.user(UI.w)); UI.toast('Melhor time escalado.'); UI.refresh(); };

  function choosePlayerModal(title, slotPos, onPick, excludeYouth = true) {
    const w = UI.w, u = M.user(w);
    const list = M.clubPlayers(w, u).filter((p) => M.available(p) || !excludeYouth)
      .map((p) => ({ p, sc: slotPos ? p.ovr * M.fit(p.pos, slotPos) : p.ovr }))
      .sort((a, b) => b.sc - a.sc);
    UI.modal(`<h2>${esc(title)}</h2><div class="pick-players">${list.map(({ p, sc }) => {
      const role = u.lineup.includes(p.id) ? '<span class="tag start">TIT</span>' : u.bench.includes(p.id) ? '<span class="tag bench">RES</span>' : '';
      return `<button class="pp" data-act="pickDo" data-arg="${p.id}">${UI.pos(p.pos)}<span class="nm">${esc(p.name)}</span>${role}
        <span class="muted small">cond. ${Math.round(p.fitness)}%</span>${UI.ovr(sc)}</button>`;
    }).join('')}</div>`, { wide: false });
    UI.pickCb = onPick;
  }
  M.ACT.pickDo = (el) => { const cb = UI.pickCb; UI.pickCb = null; UI.closeModal(); if (cb) cb(el.dataset.arg); };

  M.ACT.slotPick = (el) => {
    const w = UI.w, u = M.user(w);
    const i = Number(el.dataset.arg);
    const slot = M.FORMATIONS[u.formation][i];
    choosePlayerModal(`Escolher ${M.POS_NAME[slot.pos].toLowerCase()} (${slot.pos})`, slot.pos, (pid) => {
      const cur = u.lineup[i];
      const li = u.lineup.indexOf(pid), bi = u.bench.indexOf(pid);
      if (li >= 0) u.lineup[li] = cur;
      else if (bi >= 0) u.bench[bi] = cur;
      u.lineup[i] = pid;
      UI.refresh();
    });
  };
  M.ACT.benchPick = (el) => {
    const w = UI.w, u = M.user(w);
    const i = Number(el.dataset.arg);
    choosePlayerModal('Escolher reserva', null, (pid) => {
      const cur = u.bench[i];
      const li = u.lineup.indexOf(pid), bi = u.bench.indexOf(pid);
      if (li >= 0) u.lineup[li] = cur;
      else if (bi >= 0) u.bench[bi] = cur;
      u.bench[i] = pid;
      UI.refresh();
    });
  };

  // ---------- Base ----------
  V.youth = function (w) {
    const u = M.user(w);
    const ys = u.youth.map((id) => w.players[id]).sort((a, b) => b.pot - a.pot);
    const cost = M.trialCost(u);
    return `<div class="view-head"><h2>Categoria de base <small>nível ${u.academy}/5</small></h2>
      <p class="muted">Todo início de temporada chega uma nova safra. Quanto melhor a estrutura da base, maior o potencial dos garotos. Aos 19 anos eles sobem ao profissional ou são dispensados.</p></div>
      <div class="youth-top">
        <div class="card"><h3 class="sec">Peneira extra</h3>
          <p class="muted small">Olheiros rodam o país atrás de talentos: 1 a 3 garotos novos. Uma vez por temporada.</p>
          <button class="btn ${w.trialUsed ? '' : 'primary'}" data-act="trial" ${w.trialUsed || u.money < cost ? 'disabled' : ''}>${w.trialUsed ? 'Peneira já realizada' : `Fazer peneira (${U.money(cost)})`}</button></div>
        <div class="card"><h3 class="sec">Estrutura</h3><p class="muted small">Melhore a base na aba Clube para revelar mais joias.</p>
          <button class="btn" data-act="goto" data-arg="club">Ver estrutura</button></div>
      </div>
      ${ys.length ? `<div class="youth-grid">${ys.map((p) => `<div class="ycard">
          <div class="yh">${UI.pos(p.pos)}<b data-act="player" data-arg="${p.id}">${esc(p.name)}</b><span class="muted">${p.age} anos</span></div>
          <div class="yv"><div>${UI.ovr(p.ovr)}<small>atual</small></div><div>${UI.potStars(p, true)}<small>potencial</small></div></div>
          <div class="row-btns tight"><button class="btn small primary" data-act="promote" data-arg="${p.id}">Promover</button>
          <button class="btn small ghost" data-act="dismissYouth" data-arg="${p.id}">Dispensar</button></div></div>`).join('')}</div>`
        : '<div class="card"><p class="muted">Nenhum garoto na base agora. Faça uma peneira ou aguarde a próxima safra.</p></div>'}`;
  };

  M.ACT.promote = (el) => {
    const w = UI.w, u = M.user(w), p = w.players[el.dataset.arg];
    if (u.squad.length >= M.SQUAD_MAX) { UI.toast(`Elenco cheio (${M.SQUAD_MAX}). Libere uma vaga antes.`); return; }
    M.promoteYouth(w, p.id);
    UI.closeModal();
    UI.toast(`${p.name} subiu para o profissional!`);
    UI.refresh();
  };
  M.ACT.dismissYouth = (el) => {
    const w = UI.w, p = w.players[el.dataset.arg];
    UI.confirm(`Dispensar ${p.name}?`, 'O garoto deixa o clube e não pode voltar.', 'Dispensar', () => { M.dismissYouth(w, p.id); UI.refresh(); });
  };
  M.ACT.trial = () => {
    const found = M.runTrial(UI.w);
    if (!found) return;
    UI.refresh();
    UI.modal(`<h2>Resultado da peneira</h2><p class="muted">Os olheiros aprovaram ${found.length} garoto(s):</p>
      ${found.map((p) => `<div class="li">${UI.pos(p.pos)} <b>${esc(p.name)}</b> (${p.age} anos) ${UI.ovr(p.ovr)} ${UI.potStars(p, true)}</div>`).join('')}
      <div class="row-btns"><button class="btn primary" data-act="closeModal">Ótimo!</button></div>`);
  };

  // ---------- Mercado ----------
  V.market = function (w) {
    const f = (UI.sub.market = Object.assign({ pos: '', age: 40, ovr: 0, max: 0, free: false, q: '' }, UI.sub.market));
    const u = M.user(w);
    const open = M.windowOpen(w);
    let list = Object.values(w.players).filter((p) => p.clubId !== u.id && !p.youth);
    if (f.pos) list = list.filter((p) => p.pos === f.pos);
    if (f.free) list = list.filter((p) => !p.clubId);
    if (f.age < 40) list = list.filter((p) => p.age <= f.age);
    if (f.ovr) list = list.filter((p) => p.ovr >= f.ovr);
    if (f.max) list = list.filter((p) => M.valueOf(p) <= f.max * 1e6);
    if (f.q) { const q = f.q.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.clubId && w.clubs[p.clubId].name.toLowerCase().includes(q))); }
    list.sort((a, b) => b.ovr - a.ovr);
    const total = list.length;
    list = list.slice(0, 60);
    const mine = M.clubPlayers(w, u).filter((p) => p.listed);
    return `<div class="view-head"><h2>Mercado de transferências</h2>
      <div class="alert ${open ? 'good' : 'warn'}">${open ? `Janela <b>aberta</b> até a semana ${M.WINDOWS.find(([a, b]) => w.week >= a && w.week <= b)[1]}.` : `Janela <b>fechada</b>. ${M.nextWindow(w) ? 'Abre na semana ' + M.nextWindow(w) + '.' : 'Reabre na pré-temporada.'} Você pode pesquisar e planejar.`}
      Caixa: <b>${U.money(u.money)}</b></div></div>
      <div class="filters">
        <select data-change="mkt" data-k="pos"><option value="">Todas as posições</option>${M.POS.map((p) => `<option value="${p}" ${f.pos === p ? 'selected' : ''}>${M.POS_NAME[p]}</option>`).join('')}</select>
        <select data-change="mkt" data-k="age">${[40, 21, 23, 25, 28, 31].map((a) => `<option value="${a}" ${f.age === a ? 'selected' : ''}>${a === 40 ? 'Qualquer idade' : 'Até ' + a + ' anos'}</option>`).join('')}</select>
        <select data-change="mkt" data-k="ovr">${[0, 60, 65, 70, 75, 80].map((a) => `<option value="${a}" ${f.ovr === a ? 'selected' : ''}>${a ? 'OVR ' + a + '+' : 'Qualquer OVR'}</option>`).join('')}</select>
        <select data-change="mkt" data-k="max">${[0, 1, 3, 5, 10, 20].map((a) => `<option value="${a}" ${f.max === a ? 'selected' : ''}>${a ? 'Até R$ ' + a + ' mi' : 'Qualquer valor'}</option>`).join('')}</select>
        <label class="check"><input type="checkbox" data-change="mkt" data-k="free" ${f.free ? 'checked' : ''}> Só agentes livres</label>
        <input type="search" placeholder="Buscar nome ou clube" value="${esc(f.q)}" data-change="mkt" data-k="q">
      </div>
      <p class="muted small">${total} jogadores encontrados${total > 60 ? ' (mostrando os 60 melhores)' : ''}.</p>
      <div class="tbl-wrap"><table class="tbl players">
        <thead><tr><th>Nome</th><th>Clube</th><th>Pos</th><th>Idade</th><th>OVR</th><th>Pot.</th><th>Valor</th><th>Salário</th></tr></thead>
        <tbody>${list.map((p) => `<tr data-act="player" data-arg="${p.id}">
          <td class="nm">${esc(p.name)}</td><td>${p.clubId ? UI.clubTag(w, p.clubId, 16) : '<span class="tag free">LIVRE</span>'}</td>
          <td>${UI.pos(p.pos)}</td><td class="n">${p.age}</td><td>${UI.ovr(p.ovr)}</td><td>${UI.potStars(p, false)}</td>
          <td class="n">${U.money(M.valueOf(p))}</td><td class="n">${U.money(p.wage)}</td></tr>`).join('')}</tbody></table></div>
      <h3 class="sec">Seus jogadores à venda</h3>
      ${mine.length ? mine.map((p) => `<div class="li" data-act="player" data-arg="${p.id}">${UI.pos(p.pos)} ${esc(p.name)} ${UI.ovr(p.ovr)} <span class="muted">${U.money(M.valueOf(p))}</span></div>`).join('') : '<p class="muted small">Nenhum. Abra a ficha de um jogador do elenco e toque em “Colocar à venda” para receber propostas.</p>'}`;
  };
  M.ACT.mkt = (el) => {
    const k = el.dataset.k;
    const f = UI.sub.market;
    f[k] = k === 'free' ? el.checked : k === 'q' || k === 'pos' ? el.value : Number(el.value);
    UI.render();
  };

  // ---------- Competições ----------
  V.comps = function (w) {
    const u = M.user(w);
    const sub = UI.sub.comps || u.div;
    const tabs = [['A', 'Série A'], ['B', 'Série B'], ['cup', 'Copa'], ['scorers', 'Artilharia'], ['fixtures', 'Calendário'], ['history', 'Histórico']];
    let body = '';
    if (sub === 'A' || sub === 'B') body = tableHTML(w, sub);
    else if (sub === 'cup') body = cupHTML(w);
    else if (sub === 'scorers') body = scorersHTML(w);
    else if (sub === 'fixtures') body = fixturesHTML(w);
    else body = historyHTML(w);
    return `<div class="view-head"><h2>Competições</h2></div>
      <div class="subtabs">${tabs.map(([k, l]) => `<button class="${sub === k ? 'on' : ''}" data-act="compSub" data-arg="${k}">${l}</button>`).join('')}</div>${body}`;
  };
  M.ACT.compSub = (el) => { UI.sub.comps = el.dataset.arg; UI.render(); };

  function tableHTML(w, div) {
    const t = M.table(w, div);
    const zone = (i) => (div === 'A' ? (i === 0 ? 'z-champ' : i >= 13 ? 'z-down' : '') : i < 3 ? 'z-up' : '');
    const wk = M.currentWeek(w) || w.weeks[w.week - 1];
    let lastRound = null;
    for (let i = Math.min(w.week, M.TOTAL_WEEKS); i >= 1; i--) {
      const x = w.weeks[i];
      if (x && x.type === 'league' && x.matches.some((m) => m.played && m.comp === div)) { lastRound = x; break; }
    }
    return `<div class="tbl-wrap"><table class="tbl league">
      <thead><tr><th>#</th><th>Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Últimos</th></tr></thead>
      <tbody>${t.map((r, i) => `<tr class="${zone(i)} ${r.id === w.userClub ? 'me' : ''}">
        <td class="n">${i + 1}</td><td>${UI.clubTag(w, r.id, 18)}</td><td class="n b">${r.p}</td><td class="n">${r.j}</td><td class="n">${r.v}</td><td class="n">${r.e}</td><td class="n">${r.d}</td>
        <td class="n">${r.gf}</td><td class="n">${r.ga}</td><td class="n">${r.gf - r.ga}</td><td class="form">${UI.formChips(r.form.slice(-5))}</td></tr>`).join('')}</tbody></table></div>
      <p class="legend">${div === 'A' ? '<span class="lg z-champ"></span> Campeão <span class="lg z-down"></span> Rebaixamento' : '<span class="lg z-up"></span> Acesso à Série A'}</p>
      ${lastRound ? `<h3 class="sec">Última rodada (${lastRound.round})</h3><div class="results">${lastRound.matches.filter((m) => m.comp === div).map((m) => UI.resultRow(w, m)).join('')}</div>` : ''}`;
  }

  function cupHTML(w) {
    let html = '';
    for (let r = 0; r < 5; r++) {
      const wk = w.weeks.find((x) => x && x.type === 'cup' && x.round === r);
      if (!wk || !wk.matches.length) { html += `<h3 class="sec">${M.CUP_ROUNDS[r]}</h3><p class="muted small">Sorteio na semana ${[4, 10, 16, 22, 28][r]}.</p>`; continue; }
      html += `<h3 class="sec">${M.CUP_ROUNDS[r]}</h3><div class="results">${wk.matches.map((m) => UI.resultRow(w, m)).join('')}</div>`;
    }
    const alive = w.cup.alive.includes(w.userClub);
    return `<div class="alert ${w.cup.champion ? 'info' : alive ? 'good' : 'warn'}">${w.cup.champion ? `Campeão: <b>${esc(w.clubs[w.cup.champion].name)}</b>` : alive ? 'Seu time segue vivo na Copa. Jogo único; empate vai para os pênaltis.' : 'Seu time foi eliminado da Copa.'}</div>${html}`;
  }

  function scorersHTML(w) {
    const col = (div) => {
      const list = M.topScorers(w, div, 15);
      return `<div><h3 class="sec">Série ${div}</h3><table class="tbl compact"><tbody>${list.map((p, i) => `<tr class="${p.clubId === w.userClub ? 'me' : ''}" data-act="player" data-arg="${p.id}">
        <td class="n">${i + 1}</td><td>${esc(p.name)}</td><td>${M.crest(w.clubs[p.clubId], 16)}</td><td class="n b">${p.s.goals}</td></tr>`).join('') || '<tr><td class="muted">Sem gols ainda.</td></tr>'}</tbody></table></div>`;
    };
    return `<div class="grid2">${col('A')}${col('B')}</div>`;
  }

  function fixturesHTML(w) {
    const rows = [];
    for (let i = 1; i <= M.TOTAL_WEEKS; i++) {
      const wk = w.weeks[i];
      const m = wk && wk.matches.find((x) => x.h === w.userClub || x.a === w.userClub);
      const label = wk.type === 'cup' ? `Copa • ${M.CUP_ROUNDS[wk.round]}` : `Rodada ${wk.round}`;
      if (!m) {
        if (wk.type === 'cup') rows.push(`<div class="fx muted ${i === w.week ? 'cur' : ''}"><span>Sem. ${i}</span><span>${label}</span><span>${wk.matches.length ? 'sem jogo' : 'sorteio pendente'}</span></div>`);
        continue;
      }
      const home = m.h === w.userClub;
      const opp = w.clubs[home ? m.a : m.h];
      let res = '';
      if (m.played) {
        const gf = home ? m.hs : m.as, ga = home ? m.as : m.hs;
        const r = gf > ga || (m.pens && (home ? m.pens[0] > m.pens[1] : m.pens[1] > m.pens[0])) ? 'V' : gf < ga || m.pens ? 'D' : 'E';
        res = `<span class="fchip f${r}">${r}</span> <b>${gf} - ${ga}</b>${m.pens ? ` <small>(pên.)</small>` : ''}`;
      }
      rows.push(`<div class="fx ${i === w.week ? 'cur' : ''}"><span>Sem. ${i}</span><span>${label}</span><span>${home ? 'vs' : '@'} ${M.crest(opp, 16)} ${esc(opp.name)}</span><span>${res}</span></div>`);
    }
    return `<div class="fixtures">${rows.join('')}</div>`;
  }

  function historyHTML(w) {
    const u = M.user(w);
    const trophies = u.trophies.length ? u.trophies.map((t) => `<span class="trophy">🏆 ${t.comp} ${t.season}</span>`).join('') : '<span class="muted">Nenhum título ainda.</span>';
    return `<div class="card"><h3 class="sec">Sala de troféus do ${esc(u.name)}</h3><div class="trophies">${trophies}</div></div>
      ${w.history.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Temporada</th><th>Série A</th><th>Série B</th><th>Copa</th><th>Seu time</th><th>Artilheiro A</th></tr></thead><tbody>
      ${w.history.slice().reverse().map((h) => `<tr><td class="n">${h.season}</td><td>${UI.clubTag(w, h.champA, 16)}</td><td>${UI.clubTag(w, h.champB, 16)}</td><td>${h.cup ? UI.clubTag(w, h.cup, 16) : '—'}</td>
        <td>${esc(w.clubs[h.user.club].name)}: ${h.user.pos}º Série ${h.user.div} ${h.user.success ? '✅' : '❌'}</td><td>${h.scorerA ? esc(h.scorerA.name) + ' (' + h.scorerA.goals + ')' : '—'}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">O histórico aparece ao final da primeira temporada.</p>'}`;
  }

  // ---------- Clube ----------
  V.club = function (w) {
    const u = M.user(w);
    const fs = w.finSeason || {};
    const cats = [['tickets', 'Bilheteria'], ['tv', 'Direitos de TV'], ['sponsor', 'Patrocínio'], ['prize', 'Premiações'], ['transfers', 'Transferências'], ['wages', 'Salários'], ['other', 'Outros (estrutura, multas)']];
    const fin = w.finance.filter((f) => f.season === w.season);
    const spark = (() => {
      if (fin.length < 2) return '';
      const vals = fin.map((f) => f.balance);
      const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
      const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 300},${70 - ((v - mn) / rng) * 60}`).join(' ');
      return `<svg class="spark" viewBox="0 0 300 80" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>
        <div class="spark-lbl"><span>${U.money(mn)}</span><span>${U.money(mx)}</span></div>`;
    })();
    const up = (k) => {
      const d = M.UPGRADES[k];
      const lvl = d.level(u);
      const maxed = k === 'stadium' ? u.cap >= d.max : lvl >= d.max;
      const cost = d.cost(u);
      return `<div class="upg"><div><b>${d.name}</b><small>${d.desc}</small>
        <div class="lvl">${k === 'stadium' ? `${u.cap.toLocaleString('pt-BR')} lugares` : '●'.repeat(lvl) + '○'.repeat(5 - lvl)}</div></div>
        <button class="btn small" data-act="upgrade" data-arg="${k}" ${maxed || u.money < cost ? 'disabled' : ''}>${maxed ? 'Máximo' : 'Melhorar • ' + U.money(cost)}</button></div>`;
    };
    return `<div class="view-head"><h2>${M.crest(u, 30)} ${esc(u.name)} <small>${esc(u.city)}-${u.uf} • reputação ${Math.round(u.rep)}</small></h2></div>
      <div class="dash">
        <div class="card"><h3 class="sec">Finanças da temporada</h3>
          <div class="kv"><span>Saldo atual</span><b class="${u.money < 0 ? 'neg' : ''}">${U.money(u.money)}</b></div>
          ${cats.map(([k, l]) => `<div class="kv"><span>${l}</span><b class="${(fs[k] || 0) < 0 ? 'neg' : 'pos'}">${U.money(fs[k] || 0)}</b></div>`).join('')}
          ${spark ? `<h3 class="sec">Evolução do caixa</h3>${spark}` : ''}
        </div>
        <div class="card"><h3 class="sec">Estrutura</h3>${up('academy')}${up('training')}${up('stadium')}</div>
        <div class="card"><h3 class="sec">Treinamento</h3>
          <div class="chips">${Object.entries(M.TRAINING).map(([k, t]) => `<button class="chip-btn ${u.trainingInt === k ? 'on' : ''}" data-act="setTraining" data-arg="${k}">${t.name}</button>`).join('')}</div>
          <p class="muted small">${{ low: 'Recuperação rápida e menos lesões, mas evolução mais lenta.', mid: 'Equilíbrio entre evolução e desgaste.', high: 'Jogadores evoluem mais rápido, mas cansam e se machucam mais. Faça rodízio!' }[u.trainingInt]}</p>
          <h3 class="sec">Diretoria</h3>
          <div class="kv"><span>Meta da temporada</span><b>${esc(w.board.label)}</b></div>
          <div class="kv"><span>Confiança</span>${UI.bar(w.board.conf)}</div>
          <h3 class="sec">Carreira</h3>
          <div class="kv"><span>Treinador</span><b>${esc(w.manager.name)}</b></div>
          <div class="kv"><span>Títulos do clube</span><b>${u.trophies.length}</b></div>
          <button class="btn ghost wide" data-act="quitToStart">Salvar e voltar à tela inicial</button>
        </div>
      </div>`;
  };
  M.ACT.upgrade = (el) => {
    const k = el.dataset.arg;
    if (M.upgrade(UI.w, k)) { UI.toast(`${M.UPGRADES[k].name} melhorado!`); UI.refresh(); }
  };
  M.ACT.setTraining = (el) => { M.user(UI.w).trainingInt = el.dataset.arg; UI.refresh(); };

  // ---------- Mensagens ----------
  V.inbox = function (w) {
    const open = UI.sub.openMsg;
    return `<div class="view-head"><h2>Mensagens</h2>${w.inbox.some((m) => !m.read) ? '<button class="btn small ghost" data-act="readAll">Marcar todas como lidas</button>' : ''}</div>
      <div class="inbox">${w.inbox.map((m) => {
        const o = m.offer;
        let actions = '';
        if (o && !o.done && w.players[o.pid] && w.players[o.pid].clubId === w.userClub) {
          actions = M.windowOpen(w)
            ? `<div class="row-btns tight"><button class="btn small primary" data-act="offerYes" data-arg="${m.id}">Aceitar ${U.money(o.fee)}</button><button class="btn small ghost" data-act="offerNo" data-arg="${m.id}">Recusar</button></div>`
            : '<p class="muted small">A janela fechou antes da resposta.</p>';
        } else if (o) actions = `<p class="muted small">${o.accepted ? 'Proposta aceita.' : o.expired ? 'Proposta expirada.' : 'Proposta recusada.'}</p>`;
        const isOpen = open === m.id || (o && !o.done);
        return `<div class="msg ${m.read ? '' : 'unread'} k-${m.kind}">
          <div class="msg-h" data-act="openMsg" data-arg="${m.id}"><b>${esc(m.title)}</b><small>T${m.season} • sem. ${m.week}</small></div>
          ${isOpen ? `<div class="msg-b">${esc(m.body).replace(/\n/g, '<br>')}${actions}</div>` : ''}</div>`;
      }).join('') || '<p class="muted">Caixa vazia.</p>'}</div>`;
  };
  M.ACT.openMsg = (el) => {
    const w = UI.w, id = Number(el.dataset.arg);
    const m = w.inbox.find((x) => x.id === id);
    if (m) m.read = true;
    UI.sub.openMsg = UI.sub.openMsg === id ? null : id;
    UI.tab = 'inbox';
    UI.refresh();
  };
  M.ACT.readAll = () => { UI.w.inbox.forEach((m) => (m.read = true)); UI.refresh(); };
  M.ACT.offerYes = (el) => {
    const w = UI.w, m = w.inbox.find((x) => x.id === Number(el.dataset.arg));
    const p = w.players[m.offer.pid];
    UI.confirm(`Vender ${p.name}?`, `${w.clubs[m.offer.club].name} paga ${U.money(m.offer.fee)}.`, 'Vender', () => {
      if (M.acceptOffer(w, m)) { M.ensureLineup(w, M.user(w)); UI.toast(`${p.name} vendido por ${U.money(m.offer.fee)}.`); }
      UI.refresh();
    });
  };
  M.ACT.offerNo = (el) => {
    const w = UI.w, m = w.inbox.find((x) => x.id === Number(el.dataset.arg));
    m.offer.done = true;
    m.read = true;
    UI.refresh();
  };
})(window.SCM);

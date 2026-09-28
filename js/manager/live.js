// Dia de jogo: pré-jogo, partida ao vivo animada, substituições e resumo.
(function (M) {
  const U = M.U, UI = M.UI, esc = U.esc;
  const $ = (s) => document.querySelector(s);
  const SPEEDS = [0.9, 0.42, 0.14]; // segundos por minuto de jogo
  const snd = (name, arg) => { try { if (window.SC && SC.Audio && M.UI.sound !== false) SC.Audio[name](arg); } catch (e) { /* sem áudio */ } };

  const L = (M.Live = {});

  function compName(w, m) {
    const wk = M.currentWeek(w);
    return m.comp === 'CUP' ? `Copa • ${M.CUP_ROUNDS[wk.round]}` : `Série ${m.comp} • Rodada ${wk.round}`;
  }

  // Cores de uniforme distintas para os dois times.
  function kits(h, a) {
    const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const dist = (x, y) => { const p = hex(x), q = hex(y); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
    const hk = { fill: h.colors[0], line: h.colors[1] };
    let ak = { fill: a.colors[0], line: a.colors[1] };
    if (dist(hk.fill, ak.fill) < 120) ak = { fill: a.colors[1], line: a.colors[0] };
    if (dist(hk.fill, ak.fill) < 120) ak = { fill: '#f5f5f5', line: '#222222' };
    return [hk, ak];
  }

  // ---------- Pré-jogo ----------
  L.prematch = function (m) {
    const w = UI.w;
    const u = M.user(w);
    const changes = M.ensureLineup(w, u);
    const oppId = m.h === u.id ? m.a : m.h;
    const opp = w.clubs[oppId];
    M.autoLineup(w, opp);
    const su = M.sectors(w, u), so = M.sectors(w, opp);
    const home = m.h === u.id;
    const row = (label, a, b) => {
      const tot = a + b || 1;
      return `<div class="cmp"><b>${Math.round(a)}</b><span class="cmpbar"><i style="width:${(a / tot) * 100}%"></i></span><em>${label}</em><span class="cmpbar r"><i style="width:${(b / tot) * 100}%"></i></span><b>${Math.round(b)}</b></div>`;
    };
    const lineupList = (club) => club.lineup.map((id, i) => {
      const p = w.players[id];
      const s = M.FORMATIONS[club.formation][i];
      return `<div class="lu">${UI.pos(s.pos)} <span>${esc(p.name)}</span> ${UI.ovr(p.ovr)}</div>`;
    }).join('');
    UI.modal(`<div class="pre-head">
        <div>${M.crest(w.clubs[m.h], 52)}<b>${esc(w.clubs[m.h].name)}</b></div>
        <div class="pre-mid"><small>${compName(w, m)}</small><b>VS</b><small>${m.neutral ? 'Campo neutro' : 'Estádio do ' + esc(w.clubs[m.h].name)}</small></div>
        <div>${M.crest(w.clubs[m.a], 52)}<b>${esc(w.clubs[m.a].name)}</b></div>
      </div>
      ${changes.length ? `<div class="alert warn">Fora deste jogo (lesão/suspensão), substituídos automaticamente: ${changes.map(esc).join(', ')}.</div>` : ''}
      <div class="cmp-wrap">
        <div class="cmp-head"><span>${esc(u.name)}</span><span>${esc(opp.name)}</span></div>
        ${row('Goleiro', su.G, so.G)}${row('Defesa', su.D, so.D)}${row('Meio', su.M, so.M)}${row('Ataque', su.A, so.A)}
      </div>
      <div class="grid2 pre-lu">
        <div><h3 class="sec">Seu time • ${u.formation} • ${M.TACTICS[u.tactic].name}</h3>${lineupList(u)}</div>
        <div><h3 class="sec">${esc(opp.name)} • ${opp.formation}</h3>${lineupList(opp)}</div>
      </div>
      <div class="play-opts">
        <button class="btn primary" data-act="liveStart" data-arg="${m.id}">▶ Assistir ao vivo</button>
        <button class="btn" data-act="quickStart" data-arg="${m.id}">⚡ Resultado rápido</button>
        <button class="btn" data-act="buttonStart" data-arg="${m.id}">🎮 Jogar no botão</button>
        <button class="btn ghost" data-act="preTactics">Ajustar escalação</button>
      </div>
      <p class="muted small">No modo botão você decide a partida jogando o futebol de botão. O placar vale para a temporada.</p>`,
    { wide: true });
    L.m = m;
    L.home = home;
  };

  M.ACT.preTactics = () => { UI.closeModal(); UI.tab = 'tactics'; UI.render(); };

  const findMatch = (id) => M.currentWeek(UI.w).matches.find((x) => x.id === id);

  M.ACT.quickStart = (el) => {
    const w = UI.w, m = findMatch(el.dataset.arg);
    UI.closeModal();
    const sim = new M.Sim(w, m.h, m.a, { knockout: m.comp === 'CUP', neutral: !!m.neutral });
    sim.runToEnd();
    L.end(m, sim);
  };

  M.ACT.buttonStart = (el) => {
    const m = findMatch(el.dataset.arg);
    UI.closeModal();
    M.Bridge.play(m, (res) => {
      M.applyResult(UI.w, m, res);
      M.simulateWeek(UI.w);
      L.summary(m, null, res);
    });
  };

  // ---------- Ao vivo ----------
  M.ACT.liveStart = (el) => {
    const w = UI.w, m = findMatch(el.dataset.arg);
    UI.closeModal();
    if (window.SC && SC.Audio) SC.Audio.init();
    const sim = new M.Sim(w, m.h, m.a, { knockout: m.comp === 'CUP', neutral: !!m.neutral, interactive: true });
    L.sim = sim;
    L.m = m;
    L.speed = 1;
    L.paused = false;
    L.acc = 0;
    L.feedTab = 'feed';
    L.flash = null;
    L.dots = null;
    L.ballD = { x: 50, y: 50 };
    L.kits = kits(w.clubs[m.h], w.clubs[m.a]);
    L.over = false;
    const md = $('#matchday');
    md.hidden = false;
    md.innerHTML = `<div class="md">
      <header class="md-score">
        <div class="md-t">${M.crest(w.clubs[m.h], 38)}<b>${esc(w.clubs[m.h].name)}</b></div>
        <div class="md-c"><div class="md-sc"><span id="mdS0">0</span><i>-</i><span id="mdS1">0</span></div><div id="mdMin" class="md-min">0'</div><small>${compName(w, m)}</small></div>
        <div class="md-t r"><b>${esc(w.clubs[m.a].name)}</b>${M.crest(w.clubs[m.a], 38)}</div>
      </header>
      <div class="md-body">
        <div class="md-pitch"><canvas id="mdCv"></canvas><div id="mdFlash" class="md-flash" hidden></div><div id="mdPause" class="md-pause" hidden></div></div>
        <aside class="md-side">
          <div class="md-poss"><span id="mdP0">50%</span><div class="possbar"><i id="mdPb" style="width:50%;background:${L.kits[0].fill}"></i></div><span id="mdP1">50%</span></div>
          <div class="subtabs small"><button class="on" data-act="mdTab" data-arg="feed">Narração</button><button data-act="mdTab" data-arg="stats">Estatísticas</button></div>
          <div id="mdFeed" class="md-feed"></div>
          <div id="mdStats" class="md-stats" hidden></div>
        </aside>
      </div>
      <footer class="md-ctrl">
        <div class="speed">${['1x', '2x', '4x'].map((s, i) => `<button class="chip-btn ${i === 1 ? 'on' : ''}" data-act="mdSpeed" data-arg="${i}">${s}</button>`).join('')}</div>
        <button class="btn small" id="mdPlay" data-act="mdPlay">⏸ Pausar</button>
        <button class="btn small" data-act="mdSubs">🔁 Substituições e tática</button>
        <button class="btn small ghost" id="mdSkip" data-act="mdSkip">⏭ Até o fim</button>
      </footer></div>`;
    L.cv = $('#mdCv');
    L.ctx = L.cv.getContext('2d');
    L.resize();
    snd('whistle', false);
    L.last = performance.now();
    cancelAnimationFrame(L.raf);
    L.raf = requestAnimationFrame(L.frame);
  };

  L.resize = function () {
    if (!L.cv) return;
    const box = L.cv.parentElement.getBoundingClientRect();
    const ratio = 105 / 68;
    let wpx = box.width, hpx = box.width / ratio;
    if (hpx > box.height) { hpx = box.height; wpx = hpx * ratio; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    L.cv.style.width = wpx + 'px'; L.cv.style.height = hpx + 'px';
    L.cv.width = Math.round(wpx * dpr); L.cv.height = Math.round(hpx * dpr);
    L.scale = { w: wpx, h: hpx, dpr };
  };
  window.addEventListener('resize', () => L.resize());

  L.frame = function (now) {
    const dt = Math.min(0.1, (now - L.last) / 1000);
    L.last = now;
    const sim = L.sim;
    if (!sim) return;
    if (!L.paused && !sim.finished) {
      L.acc += dt;
      const dur = SPEEDS[L.speed];
      while (L.acc >= dur && !L.paused && !sim.finished) { L.acc -= dur; L.minute(); }
    }
    L.draw(dt);
    L.raf = requestAnimationFrame(L.frame);
  };

  const ICON = { goal: '⚽', yellow: '🟨', red: '🟥', sub: '🔁', injury: '🩹', save: '🧤', miss: '↗', build: '·', info: '📣', pens: '🎯' };

  L.minute = function () {
    const sim = L.sim;
    const evs = sim.step();
    for (const ev of evs) L.feed(ev);
    if (evs.some((e) => e.type === 'goal')) {
      const g = evs.filter((e) => e.type === 'goal').pop();
      const club = sim.sides[g.side].club;
      L.flash = { t: 0, side: g.side };
      const f = $('#mdFlash');
      f.innerHTML = `${M.crest(club, 60)}<b>GOOOL!</b><span>${esc(club.name)}</span>`;
      f.hidden = false;
      f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
      setTimeout(() => { f.hidden = true; }, 2200);
      snd('goal');
      if (L.speed === 2) { L.pauseFor(1.2); }
    }
    if (evs.some((e) => e.type === 'save' || e.type === 'miss')) snd('kick', 0.6);
    L.hud();
    if (sim.pendingInjury) {
      const pi = sim.pendingInjury;
      sim.pendingInjury = null;
      L.setPaused(true);
      L.subsModal(`${UI.w.players[pi.pid].name} se machucou. Faça uma substituição.`);
    }
    if (sim.phase === 'half') {
      L.setPaused(true);
      L.overlay(`<b>Intervalo</b><span>${sim.score[0]} x ${sim.score[1]}</span>
        <div class="row-btns"><button class="btn" data-act="mdSubs">🔁 Mexer no time</button><button class="btn primary" data-act="mdResume">▶ 2º tempo</button></div>`);
    }
    if (sim.finished) L.finish();
  };

  L.pauseFor = function (s) {
    L.acc = -s;
  };

  L.feed = function (ev) {
    if (ev.type === 'build' && L.speed === 2) return;
    const feed = $('#mdFeed');
    if (!feed) return;
    const side = ev.side == null ? '' : `s${ev.side}`;
    const div = document.createElement('div');
    div.className = `fe t-${ev.type} ${side}`;
    div.innerHTML = `<span class="fm">${ev.min ? ev.min + "'" : ''}</span><span class="fi">${ICON[ev.type] || '•'}</span><span>${esc(ev.text)}</span>`;
    feed.prepend(div);
    while (feed.children.length > 120) feed.lastChild.remove();
  };

  L.hud = function () {
    const sim = L.sim;
    $('#mdS0').textContent = sim.score[0];
    $('#mdS1').textContent = sim.score[1];
    const min = sim.minute > 90 ? `90+${sim.minute - 90}'` : sim.minute + "'";
    $('#mdMin').textContent = sim.finished ? 'Encerrado' : min;
    const tot = sim.stats.poss[0] + sim.stats.poss[1] || 1;
    const p0 = Math.round((sim.stats.poss[0] / tot) * 100);
    $('#mdP0').textContent = p0 + '%';
    $('#mdP1').textContent = 100 - p0 + '%';
    $('#mdPb').style.width = p0 + '%';
    if (L.feedTab === 'stats') L.stats();
  };

  L.stats = function () {
    const s = L.sim.stats;
    const tot = s.poss[0] + s.poss[1] || 1;
    const rows = [
      ['Posse de bola', Math.round((s.poss[0] / tot) * 100) + '%', Math.round((s.poss[1] / tot) * 100) + '%'],
      ['Finalizações', s.shots[0], s.shots[1]], ['No alvo', s.onT[0], s.onT[1]],
      ['Gols esperados (xG)', s.xg[0].toFixed(2), s.xg[1].toFixed(2)], ['Escanteios', s.corners[0], s.corners[1]],
      ['Faltas', s.fouls[0], s.fouls[1]], ['Amarelos', s.yellow[0], s.yellow[1]], ['Vermelhos', s.red[0], s.red[1]],
    ];
    $('#mdStats').innerHTML = rows.map(([l, a, b]) => `<div class="st"><b>${a}</b><span>${l}</span><b>${b}</b></div>`).join('');
  };

  M.ACT.mdTab = (el) => {
    L.feedTab = el.dataset.arg;
    el.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el));
    $('#mdFeed').hidden = L.feedTab !== 'feed';
    $('#mdStats').hidden = L.feedTab !== 'stats';
    if (L.feedTab === 'stats') L.stats();
  };
  M.ACT.mdSpeed = (el) => {
    L.speed = Number(el.dataset.arg);
    el.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el));
  };
  L.setPaused = function (v) {
    L.paused = v;
    const b = $('#mdPlay');
    if (b) b.textContent = v ? '▶ Continuar' : '⏸ Pausar';
  };
  L.overlay = function (html) {
    const o = $('#mdPause');
    if (!html) { o.hidden = true; o.innerHTML = ''; return; }
    o.innerHTML = html;
    o.hidden = false;
  };
  M.ACT.mdPlay = () => {
    if (L.over) return;
    L.setPaused(!L.paused);
    if (!L.paused) L.overlay(null);
  };
  M.ACT.mdResume = () => { L.overlay(null); L.setPaused(false); };
  M.ACT.mdSkip = () => {
    if (L.over) return L.summaryFromLive();
    const sim = L.sim;
    L.overlay(null);
    while (!sim.finished) {
      const evs = sim.step();
      for (const ev of evs) if (ev.type !== 'build') L.feed(ev);
      sim.pendingInjury = null;
    }
    L.hud();
    L.finish();
  };

  // ---------- Substituições ----------
  L.subsModal = function (note) {
    const w = UI.w, sim = L.sim;
    const s = sim.userSide();
    const side = sim.sides[s];
    L.subOut = null; L.subIn = null;
    const on = side.on.map((o) => {
      const p = w.players[o.pid];
      return `<button class="pp" data-act="subOut" data-arg="${p.id}">${UI.pos(M.FORMATIONS[side.formation][o.slot].pos)}<span class="nm">${esc(p.name)}</span>
        ${sim.injuries.some((i) => i.pid === p.id) ? '🩹' : ''}${o.yc ? '🟨' : ''}<span class="fat">${UI.bar(o.fat)}</span>${UI.ovr(p.ovr)}</button>`;
    }).join('');
    const bench = side.bench.map((id) => {
      const p = w.players[id];
      return `<button class="pp" data-act="subIn" data-arg="${p.id}">${UI.pos(p.pos)}<span class="nm">${esc(p.name)}</span><span class="fat">${UI.bar(p.fitness)}</span>${UI.ovr(p.ovr)}</button>`;
    }).join('');
    UI.modal(`<h2>Substituições e tática</h2>
      ${note ? `<div class="alert warn">${esc(note)}</div>` : ''}
      <p class="muted small">Substituições: ${side.subs}/${M.MAX_SUBS}. Escolha quem sai e quem entra.</p>
      <div class="grid2 subs">
        <div><h3 class="sec">Em campo</h3><div class="pick-players">${on}</div></div>
        <div><h3 class="sec">Banco</h3><div class="pick-players">${bench || '<p class="muted">Banco vazio.</p>'}</div></div>
      </div>
      <div class="row-btns"><button class="btn primary" data-act="subDo" ${side.subs >= M.MAX_SUBS ? 'disabled' : ''}>Confirmar substituição</button></div>
      <h3 class="sec">Formação</h3>
      <div class="chips">${Object.keys(M.FORMATIONS).map((f) => `<button class="chip-btn ${side.formation === f ? 'on' : ''}" data-act="liveFormation" data-arg="${f}">${f}</button>`).join('')}</div>
      <h3 class="sec">Estilo</h3>
      <div class="chips">${Object.entries(M.TACTICS).map(([k, t]) => `<button class="chip-btn ${side.tactic === k ? 'on' : ''}" data-act="liveTactic" data-arg="${k}">${t.name}</button>`).join('')}</div>
      <div class="row-btns"><button class="btn" data-act="closeModal">Voltar ao jogo</button></div>`,
    { wide: true, onClose: () => { if (L.sim && L.sim.phase !== 'half' && !L.over) { L.setPaused(false); } } });
    if (!L.paused) L.setPaused(true);
  };
  M.ACT.mdSubs = () => { if (!L.over) L.subsModal(); };
  M.ACT.subOut = (el) => { L.subOut = el.dataset.arg; mark(el); };
  M.ACT.subIn = (el) => { L.subIn = el.dataset.arg; mark(el); };
  function mark(el) {
    el.parentElement.querySelectorAll('.pp').forEach((b) => b.classList.toggle('sel', b === el));
  }
  M.ACT.subDo = () => {
    if (!L.subOut || !L.subIn) { UI.toast('Escolha quem sai e quem entra.'); return; }
    const ok = L.sim.sub(L.subOut, L.subIn);
    if (ok) {
      const evs = L.sim.events.slice(-1);
      evs.forEach((e) => L.feed(e));
      UI.toast('Substituição feita.');
    }
    const keepHalf = L.sim.phase === 'half';
    UI.onModalClose = null;
    L.subsModal();
    if (keepHalf) L.setPaused(true);
  };
  M.ACT.liveFormation = (el) => { L.sim.setFormation(el.dataset.arg); UI.onModalClose = null; L.subsModal(); };
  M.ACT.liveTactic = (el) => { L.sim.setTactic(el.dataset.arg); UI.onModalClose = null; L.subsModal(); };

  // ---------- Fim ----------
  L.finish = function () {
    if (L.over) return;
    L.over = true;
    L.hud();
    snd('whistle', true);
    $('#mdSkip').textContent = 'Ver resumo ▶';
    $('#mdPlay').disabled = true;
    const s = L.sim.score;
    L.overlay(`<b>Fim de jogo</b><span>${s[0]} x ${s[1]}${L.sim.pens ? ` (pên. ${L.sim.pens[0]}-${L.sim.pens[1]})` : ''}</span>
      <div class="row-btns"><button class="btn primary" data-act="mdSkip">Ver resumo ▶</button></div>`);
  };

  L.summaryFromLive = function () {
    const m = L.m, sim = L.sim;
    cancelAnimationFrame(L.raf);
    $('#matchday').hidden = true;
    $('#matchday').innerHTML = '';
    L.cv = null;
    L.sim = null;
    L.end(m, sim);
  };

  L.end = function (m, sim) {
    const w = UI.w;
    const res = sim.result();
    M.applyResult(w, m, res);
    M.simulateWeek(w);
    L.summary(m, sim, res);
  };

  L.summary = function (m, sim, res) {
    const w = UI.w, u = M.user(w);
    const s = u.id === m.h ? 0 : 1;
    const gf = s === 0 ? m.hs : m.as, ga = s === 0 ? m.as : m.hs;
    const won = res.winner === s, lost = res.winner === 1 - s;
    const goals = (side) => res.goals.filter((g) => g.side === side).map((g) => `<div>⚽ ${esc(w.players[g.pid] ? w.players[g.pid].name : '?')} ${g.min}'${g.pen ? ' (pên.)' : ''}</div>`).join('');
    const ratings = res.played[s].map((pid) => ({ p: w.players[pid], r: res.ratings[pid] || 6 })).filter((x) => x.p).sort((a, b) => b.r - a.r);
    const motm = ratings[0];
    const st = res.stats;
    const statsHtml = st ? (() => {
      const tot = st.poss[0] + st.poss[1] || 1;
      return [['Posse', Math.round((st.poss[0] / tot) * 100) + '%', Math.round((st.poss[1] / tot) * 100) + '%'], ['Finalizações', st.shots[0], st.shots[1]], ['No alvo', st.onT[0], st.onT[1]], ['xG', st.xg[0].toFixed(2), st.xg[1].toFixed(2)]]
        .map(([l, a, b]) => `<div class="st"><b>${a}</b><span>${l}</span><b>${b}</b></div>`).join('');
    })() : '';
    const wk = M.currentWeek(w);
    UI.modal(`<div class="sum-head ${won ? 'win' : lost ? 'lose' : 'draw'}">
        <span class="sum-tag">${won ? 'VITÓRIA' : lost ? 'DERROTA' : 'EMPATE'}</span>
        <div class="sum-score">
          <div>${M.crest(w.clubs[m.h], 46)}<b>${esc(w.clubs[m.h].name)}</b><div class="gl">${goals(0)}</div></div>
          <div class="big">${m.hs} - ${m.as}${m.pens ? `<small>pênaltis ${m.pens[0]}-${m.pens[1]}</small>` : ''}</div>
          <div>${M.crest(w.clubs[m.a], 46)}<b>${esc(w.clubs[m.a].name)}</b><div class="gl">${goals(1)}</div></div>
        </div>
        ${m.attendance ? `<small class="muted">Público: ${m.attendance.toLocaleString('pt-BR')}</small>` : ''}
      </div>
      ${statsHtml ? `<div class="md-stats inline">${statsHtml}</div>` : ''}
      <div class="grid2">
        <div><h3 class="sec">Notas do seu time</h3>
          ${ratings.map(({ p, r }) => `<div class="rt"><span>${UI.pos(p.pos)} ${esc(p.name)}${p === motm.p ? ' ⭐' : ''}</span><b class="${r >= 7.5 ? 'hi' : r < 6 ? 'lo' : ''}">${r.toFixed(1)}</b></div>`).join('')}
          ${res.injuries.filter((i) => w.players[i.pid] && w.players[i.pid].clubId === u.id).map((i) => `<div class="alert warn small">🩹 ${esc(w.players[i.pid].name)} fora por ${i.weeks} semana(s).</div>`).join('')}
        </div>
        <div>${UI.roundResultsHTML(w, wk)}</div>
      </div>
      <div class="row-btns"><button class="btn primary" data-act="closeModal">Continuar ▶</button></div>`,
    { wide: true, onClose: () => UI.finishWeek() });
    void gf; void ga;
  };

  // ---------- Desenho do campo ----------
  L.draw = function (dt) {
    const c = L.ctx, sim = L.sim;
    if (!c || !sim) return;
    const { w: W, h: H, dpr } = L.scale;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mx = W * 0.04, my = H * 0.06;
    const fw = W - mx * 2, fh = H - my * 2;
    const X = (x) => mx + (x / 100) * fw, Y = (y) => my + (y / 100) * fh;
    // Gramado
    c.fillStyle = '#1f6b2e'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#2d8d41' : '#33994a'; c.fillRect(X((i * 100) / 12), my, fw / 12 + 1, fh); }
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(1.5, W / 450);
    c.strokeRect(mx, my, fw, fh);
    c.beginPath(); c.moveTo(X(50), my); c.lineTo(X(50), my + fh); c.stroke();
    c.beginPath(); c.arc(X(50), Y(50), fh * 0.14, 0, Math.PI * 2); c.stroke();
    for (const side of [0, 1]) {
      const bx = side ? X(100 - 15.7) : X(0), gx = side ? X(100 - 5.2) : X(0);
      c.strokeRect(bx, Y(21), fw * 0.157, fh * 0.58);
      c.strokeRect(gx, Y(37), fw * 0.052, fh * 0.26);
      c.fillStyle = 'rgba(255,255,255,.25)';
      c.fillRect(side ? X(100) : X(0) - mx * 0.6, Y(44), mx * 0.6, fh * 0.12);
    }
    // Posições dos jogadores
    const k = 1 - Math.exp(-dt * 3);
    const b = sim.ball;
    L.ballD.x += (b.x - L.ballD.x) * (1 - Math.exp(-dt * (b.kind === 'goal' || b.kind === 'shot' || b.kind === 'save' ? 7 : 3.5)));
    L.ballD.y += (b.y - L.ballD.y) * (1 - Math.exp(-dt * 4));
    if (!L.dots) L.dots = {};
    const t = performance.now() / 1000;
    let carrier = null, cd = Infinity;
    sim.sides.forEach((side, s) => {
      const slots = M.FORMATIONS[side.formation];
      for (const o of side.on) {
        const sl = slots[o.slot];
        const gk = sl.pos === 'GOL';
        const shift = (L.ballD.x - 50) * (gk ? 0.08 : 0.34) + (b.side === s ? 5 : -3) * (s === 0 ? 1 : -1) * (gk ? 0.2 : 1);
        let tx = s === 0 ? sl.x : 100 - sl.x;
        let ty = s === 0 ? sl.y : 100 - sl.y;
        tx = U.clamp(tx + shift, 2, 98);
        ty = U.clamp(ty + (L.ballD.y - 50) * (gk ? 0.1 : 0.18) + Math.sin(t * 1.3 + o.slot * 2.1 + s) * 1.4, 3, 97);
        const d = L.dots[o.pid] || (L.dots[o.pid] = { x: tx, y: ty });
        d.x += (tx - d.x) * k; d.y += (ty - d.y) * k;
        if (s === b.side) {
          const dd = Math.hypot(d.x - L.ballD.x, (d.y - L.ballD.y) * 0.65);
          if (dd < cd) { cd = dd; carrier = d; }
        }
        o._d = d;
      }
    });
    const r = Math.max(6, W / 70);
    c.font = `700 ${Math.round(r * 1.05)}px Inter, system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    sim.sides.forEach((side, s) => {
      const kit = L.kits[s];
      for (const o of side.on) {
        const d = o._d, p = UI.w.players[o.pid];
        const px = X(d.x), py = Y(d.y);
        c.fillStyle = 'rgba(0,0,0,.28)';
        c.beginPath(); c.ellipse(px + 2, py + 3, r, r * 0.9, 0, 0, Math.PI * 2); c.fill();
        const gk = M.FORMATIONS[side.formation][o.slot].pos === 'GOL';
        c.fillStyle = gk ? (s === 0 ? '#ffb000' : '#7b2cbf') : kit.fill;
        c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
        c.lineWidth = Math.max(1.5, r / 4); c.strokeStyle = gk ? '#111' : kit.line; c.stroke();
        c.fillStyle = contrast(gk ? (s === 0 ? '#ffb000' : '#7b2cbf') : kit.fill);
        c.fillText(p ? p.num : '', px, py + 0.5);
        if (d === carrier && b.kind !== 'goal') {
          c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2;
          c.beginPath(); c.arc(px, py, r + 4, 0, Math.PI * 2); c.stroke();
        }
      }
    });
    // Bola
    const bx = X(U.clamp(L.ballD.x, -1, 101)), by = Y(L.ballD.y);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(bx + 2, by + 3, r * 0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(bx, by, r * 0.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 1; c.stroke();
  };

  function contrast(hex) {
    const n = parseInt(hex.slice(1), 16);
    const l = ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114;
    return l > 150 ? '#111' : '#fff';
  }
})(window.SCM);

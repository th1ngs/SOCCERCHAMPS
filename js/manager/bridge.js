// Ponte com o futebol de botão: o usuário decide a partida jogando.
(function (M) {
  const U = M.U, UI = M.UI, esc = U.esc;
  const $ = (s) => document.querySelector(s);
  const B = (M.Bridge = {});

  function flagOf(c) {
    const [p, s] = c.colors;
    if (c.pattern === 'v') return { type: 'v', colors: [p, s, p, s, p] };
    if (c.pattern === 'h') return { type: 'h', colors: [p, s, p, s, p] };
    if (c.pattern === 'half') return { type: 'v', colors: [p, s] };
    if (c.pattern === 'sash') return { type: 'cross', bg: p, fg: s };
    return { type: 'circle', bg: p, fg: s };
  }

  function scorerFor(w, club) {
    const slots = M.FORMATIONS[club.formation];
    const pool = club.lineup.map((id, i) => ({ id, pos: slots[i].pos })).filter((x) => x.pos !== 'GOL');
    return U.weighted(pool, (x) => ({ ATA: 5, MEI: 3, VOL: 1.2, LAT: 1, ZAG: 0.7 }[x.pos])).id;
  }

  B.play = function (m, done) {
    const w = UI.w, u = M.user(w);
    const userHome = m.h === u.id;
    const opp = w.clubs[userHome ? m.a : m.h];
    M.ensureLineup(w, u);
    M.autoLineup(w, opp);
    const diffR = M.teamRating(w, opp) - M.teamRating(w, u);
    const lvl = diffR > 3 ? 'hard' : diffR < -3 ? 'easy' : 'medium';
    const el = $('#btnmatch');
    el.hidden = false;
    el.innerHTML = `<div class="bm-hud">
        <div class="bm-t">${M.crest(u, 28)}<b>${esc(u.name)}</b></div>
        <div class="bm-c"><div class="md-sc"><span id="bmS0">0</span><i>-</i><span id="bmS1">0</span></div><small id="bmClock">3:00</small></div>
        <div class="bm-t r"><b>${esc(opp.name)}</b>${M.crest(opp, 28)}</div>
        <button class="icon-btn" id="bmPause" aria-label="Pausar">❚❚</button>
      </div>
      <div id="bmTurn" class="bm-turn"></div>
      <div id="bmStage" class="bm-stage"><canvas id="bmCv"></canvas></div>
      <p class="bm-tip">Arraste para trás a partir de um jogador seu (piscando) e solte para chutar. CPU no nível ${{ easy: 'fácil', medium: 'médio', hard: 'difícil' }[lvl]}.</p>`;
    const cv = $('#bmCv'), ctx = cv.getContext('2d'), stage = $('#bmStage');
    SC.Audio.init();
    const match = new SC.Match({
      teams: [{ id: 'mgr_' + u.id, name: u.name, flag: flagOf(u) }, { id: 'mgr_' + opp.id, name: opp.name, flag: flagOf(opp) }],
      controllers: ['human', 'cpu'],
      difficulty: [lvl, lvl],
      duration: 180,
      goldenGoal: m.comp === 'CUP',
      onEnd: (r) => finish(r),
    });
    B.current = match;

    const F = SC.Phys.F;
    function resize() {
      const V = SC.View;
      const wpx = stage.clientWidth, hpx = stage.clientHeight;
      V.rot = hpx > wpx * 1.15;
      const lw = V.rot ? F.h : F.w, lh = V.rot ? F.w : F.h;
      V.s = Math.min(wpx / lw, hpx / lh);
      V.dpr = Math.min(window.devicePixelRatio || 1, 2);
      V.cw = lw * V.s; V.ch = lh * V.s;
      cv.style.width = V.cw + 'px'; cv.style.height = V.ch + 'px';
      cv.width = Math.round(V.cw * V.dpr); cv.height = Math.round(V.ch * V.dpr);
    }
    const toLogical = (e) => {
      const r = cv.getBoundingClientRect(), V = SC.View;
      const X = ((e.clientX - r.left) / r.width) * V.cw, Y = ((e.clientY - r.top) / r.height) * V.ch;
      return V.rot ? [F.w - Y / V.s, X / V.s] : [X / V.s, Y / V.s];
    };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); match.pointerDown(...toLogical(e)); });
    cv.addEventListener('pointermove', (e) => match.pointerMove(...toLogical(e)));
    cv.addEventListener('pointerup', () => match.pointerUp());
    cv.addEventListener('pointercancel', () => match.cancelDrag());
    $('#bmPause').onclick = () => { match.paused = !match.paused; $('#bmPause').textContent = match.paused ? '▶' : '❚❚'; };
    window.addEventListener('resize', resize);
    requestAnimationFrame(resize);

    let raf, last = performance.now(), ended = false;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      match.update(dt);
      if (ended) return;
      SC.Render.draw(ctx, match, now / 1000);
      $('#bmS0').textContent = match.score[0];
      $('#bmS1').textContent = match.score[1];
      const cs = Math.ceil(match.clock);
      $('#bmClock').textContent = match.overtime ? 'MORTE SÚBITA' : Math.floor(cs / 60) + ':' + String(cs % 60).padStart(2, '0');
      $('#bmTurn').textContent = match.state === 'aim' ? (match.turn === 0 ? `Sua vez • ${Math.ceil(match.turnTimer)}s` : `Vez do ${opp.name}`) : '';
      $('#bmTurn').className = 'bm-turn ' + (match.state === 'aim' && match.turn === 0 ? 'me' : '');
      if (!ended) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function finish(r) {
      ended = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      el.hidden = true;
      el.innerHTML = '';
      const [su, so] = r.score;
      const hs = userHome ? su : so, as = userHome ? so : su;
      const home = w.clubs[m.h], away = w.clubs[m.a];
      const goals = [];
      const mins = [];
      for (let i = 0; i < hs + as; i++) mins.push(U.randi(2, 90));
      mins.sort((a, b) => a - b);
      const order = U.shuffle([...Array(hs).fill(0), ...Array(as).fill(1)]);
      order.forEach((side, i) => goals.push({ side, pid: scorerFor(w, side === 0 ? home : away), min: mins[i], assist: null, pen: false }));
      const winner = hs > as ? 0 : hs < as ? 1 : -1;
      const played = [home.lineup.slice(), away.lineup.slice()];
      const ratings = {}, fat = {};
      played.forEach((list, s) => list.forEach((pid) => {
        ratings[pid] = U.clamp(6.3 + U.gauss() * 0.4 + (winner === s ? 0.4 : winner === 1 - s ? -0.3 : 0), 3, 10);
        fat[pid] = Math.max(20, w.players[pid].fitness - 22);
      }));
      for (const g of goals) ratings[g.pid] = U.clamp(ratings[g.pid] + 1, 3, 10);
      done({ hs, as, pens: null, goals, cards: [], injuries: [], played, ratings, fat, stats: null, winner });
    }
  };
})(window.SCM);

// Interface: telas, seleção de times, HUD, loop principal e entrada.
(function () {
  const SC = window.SC;
  const { F } = SC.Phys;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const SETTINGS_KEY = 'soccerchamps.settings';
  const LEVEL_ORDER = ['easy', 'medium', 'hard'];

  const App = {
    settings: loadSettings(),
    match: null,
    mode: null,         // 'cpu' | 'pvp' | 'cup' | 'demo'
    lastCfg: null,
    sel: { picks: [null, null], step: 0 },
    cup: null,
  };

  function loadSettings() {
    const def = { difficulty: 'medium', duration: 180, sound: true };
    try { return Object.assign(def, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}); } catch (e) { return def; }
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(App.settings)); } catch (e) { /* sem armazenamento */ }
  }

  // ---------- Canvas / redimensionamento ----------
  const cv = $('#cv');
  const ctx = cv.getContext('2d');
  const stage = $('#stage');

  function resize() {
    const V = SC.View;
    const w = stage.clientWidth, h = stage.clientHeight;
    V.rot = h > w * 1.15;
    const lw = V.rot ? F.h : F.w, lh = V.rot ? F.w : F.h;
    V.s = Math.min(w / lw, h / lh);
    V.dpr = Math.min(window.devicePixelRatio || 1, 2);
    V.cw = lw * V.s; V.ch = lh * V.s;
    cv.style.width = V.cw + 'px'; cv.style.height = V.ch + 'px';
    cv.width = Math.round(V.cw * V.dpr); cv.height = Math.round(V.ch * V.dpr);
  }
  window.addEventListener('resize', resize);

  function toLogical(e) {
    const r = cv.getBoundingClientRect(), V = SC.View;
    const X = ((e.clientX - r.left) / r.width) * V.cw, Y = ((e.clientY - r.top) / r.height) * V.ch;
    return V.rot ? [F.w - Y / V.s, X / V.s] : [X / V.s, Y / V.s];
  }

  cv.addEventListener('pointerdown', (e) => {
    SC.Audio.init();
    if (!App.match || App.mode === 'demo') return;
    cv.setPointerCapture(e.pointerId);
    App.match.pointerDown(...toLogical(e));
  });
  cv.addEventListener('pointermove', (e) => { if (App.match && App.mode !== 'demo') App.match.pointerMove(...toLogical(e)); });
  cv.addEventListener('pointerup', () => { if (App.match && App.mode !== 'demo') App.match.pointerUp(); });
  cv.addEventListener('pointercancel', () => { if (App.match) App.match.cancelDrag(); });

  // ---------- Telas ----------
  function show(id) {
    $$('.screen').forEach((s) => s.classList.toggle('hidden', s.id !== id));
  }
  function hideScreens() { show(null); }

  function goMenu() {
    App.mode = 'demo';
    startDemo();
    $('#btnResumeCup').classList.toggle('hidden', !(SC.Cup.load() || {}).status || SC.Cup.load().status !== 'playing');
    show('scr-menu');
  }

  // ---------- Seleção ----------
  function buildTeamGrid() {
    const grid = $('#teamGrid');
    grid.innerHTML = '';
    for (const t of SC.TEAMS) {
      const b = document.createElement('button');
      b.className = 'team-card';
      b.dataset.id = t.id;
      b.innerHTML = `<img src="${SC.Render.flagURL(t)}" alt=""><span>${t.name}</span><small>${'★'.repeat(Math.max(1, Math.round((t.rating - 70) / 5)))}</small>`;
      b.addEventListener('click', () => pickTeam(t.id));
      grid.appendChild(b);
    }
  }

  function openSelect(mode) {
    App.selMode = mode;
    App.sel = { picks: [null, null], step: 0 };
    $('#optDiff').classList.toggle('hidden', mode === 'pvp');
    $('.picks').classList.toggle('hidden', mode === 'cup');
    refreshSelect();
    show('scr-select');
  }

  function refreshSelect() {
    const { picks, step } = App.sel, mode = App.selMode;
    const titles = {
      cpu: ['Escolha sua seleção', 'Escolha o adversário'],
      pvp: ['Jogador 1: escolha sua seleção', 'Jogador 2: escolha sua seleção'],
      cup: ['Escolha sua seleção para a Copa', ''],
    };
    $('#selTitle').textContent = titles[mode][Math.min(step, 1)] || titles[mode][0];
    $('#selSub').textContent = mode === 'cup'
      ? '16 seleções, mata-mata até a final. A dificuldade aumenta a cada fase.'
      : mode === 'pvp' ? 'Os dois jogadores jogam no mesmo aparelho, alternando os turnos.'
      : 'Toque em uma seleção. Toque de novo em outra para trocar o adversário.';
    $$('.team-card').forEach((c) => {
      c.classList.toggle('p0', c.dataset.id === picks[0]);
      c.classList.toggle('p1', c.dataset.id === picks[1]);
    });
    for (const i of [0, 1]) {
      const t = picks[i] && SC.teamById(picks[i]);
      $('#pick' + i).innerHTML = t ? `<img src="${SC.Render.flagURL(t)}" alt=""><span>${t.name}</span>`
        : `<span class="muted">${i === 0 ? (mode === 'pvp' ? 'Jogador 1' : 'Você') : mode === 'pvp' ? 'Jogador 2' : 'CPU'}</span>`;
    }
    const ready = mode === 'cup' ? !!picks[0] : !!(picks[0] && picks[1]);
    $('#btnStart').disabled = !ready;
    $('#btnStart').textContent = mode === 'cup' ? 'Iniciar Copa' : 'Jogar';
    $$('.seg').forEach((seg) => {
      const key = seg.dataset.setting;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(App.settings[key]) === b.dataset.v));
    });
  }

  function pickTeam(id) {
    SC.Audio.init(); SC.Audio.click();
    const s = App.sel;
    if (App.selMode === 'cup') { s.picks[0] = id; refreshSelect(); return; }
    if (s.step === 0) {
      s.picks[0] = id;
      s.step = 1;
      if (App.selMode === 'cpu' && !s.picks[1]) {
        const pool = SC.TEAMS.filter((t) => t.id !== id);
        s.picks[1] = pool[(Math.random() * pool.length) | 0].id;
      }
    } else if (id === s.picks[0]) {
      s.step = 0; // tocar de novo no seu time volta a escolher o time 1
    } else {
      s.picks[1] = id;
    }
    refreshSelect();
  }

  $$('.seg').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const key = seg.dataset.setting;
      App.settings[key] = key === 'duration' ? Number(b.dataset.v) : b.dataset.v;
      saveSettings();
      SC.Audio.click();
      refreshSelect();
    });
  });

  $('#btnStart').addEventListener('click', () => {
    const [a, b] = App.sel.picks;
    if (App.selMode === 'cup') {
      App.cup = SC.Cup.newCup(a);
      SC.Cup.save(App.cup);
      showCup();
      return;
    }
    const lvl = App.settings.difficulty;
    startMatch({
      mode: App.selMode,
      teams: [SC.teamById(a), SC.teamById(b)],
      controllers: App.selMode === 'pvp' ? ['human', 'human'] : ['human', 'cpu'],
      difficulty: [lvl, lvl],
      duration: App.settings.duration,
      goldenGoal: false,
    });
  });

  // ---------- Partidas ----------
  function startMatch(cfg) {
    SC.Audio.init();
    App.mode = cfg.mode;
    App.lastCfg = cfg;
    App.match = new SC.Match(Object.assign({}, cfg, { onEnd: onMatchEnd }));
    setupHud(cfg.teams);
    $('#hud').classList.remove('hidden');
    hideScreens();
    requestAnimationFrame(resize);
  }

  function startDemo() {
    const pool = SC.TEAMS.slice().sort(() => Math.random() - 0.5);
    App.match = new SC.Match({
      teams: [pool[0], pool[1]], controllers: ['cpu', 'cpu'], difficulty: ['medium', 'medium'],
      duration: 99999, goldenGoal: false, silent: true, onEnd: () => {},
    });
    $('#hud').classList.add('hidden');
    requestAnimationFrame(resize);
  }

  function setupHud(teams) {
    for (const i of [0, 1]) {
      const el = $('#hud .t' + i);
      el.querySelector('img').src = SC.Render.flagURL(teams[i]);
      el.querySelector('.name').textContent = teams[i].name;
    }
  }

  function fmtClock(s) {
    const c = Math.ceil(s);
    return Math.floor(c / 60) + ':' + String(c % 60).padStart(2, '0');
  }

  function updateHud() {
    const m = App.match;
    if (!m || App.mode === 'demo') return;
    $('#s0').textContent = m.score[0];
    $('#s1').textContent = m.score[1];
    const clk = $('#clock');
    clk.textContent = m.overtime ? 'MORTE SÚBITA' : fmtClock(m.clock);
    clk.classList.toggle('warn', !m.overtime && m.clock <= 15);
    const aiming = m.state === 'aim';
    $('#hud .t0').classList.toggle('turn', aiming && m.turn === 0);
    $('#hud .t1').classList.toggle('turn', aiming && m.turn === 1);
    const fill = $('#turnfill');
    const frac = aiming && m.isHumanTurn() ? Math.max(0, m.turnTimer / SC.TURN_TIME) : aiming ? 1 : 0;
    fill.style.width = frac * 100 + '%';
    fill.classList.toggle('right', m.turn === 1);
    fill.classList.toggle('low', frac < 0.3);
  }

  function onMatchEnd(res) {
    const cfg = App.lastCfg;
    const [t0, t1] = cfg.teams;
    $('#resFlag0').src = SC.Render.flagURL(t0);
    $('#resFlag1').src = SC.Render.flagURL(t1);
    $('#resName0').textContent = t0.name;
    $('#resName1').textContent = t1.name;
    $('#resS0').textContent = res.score[0];
    $('#resS1').textContent = res.score[1];
    const btns = $('#resButtons');
    btns.innerHTML = '';
    const addBtn = (label, cls, fn) => {
      const b = document.createElement('button');
      b.className = 'btn ' + cls; b.textContent = label;
      b.addEventListener('click', () => { SC.Audio.click(); fn(); });
      btns.appendChild(b);
    };
    let title, note = res.overtime ? 'Decidido na morte súbita.' : '';
    if (cfg.mode === 'pvp') {
      title = res.winner < 0 ? 'Empate!' : `${cfg.teams[res.winner].name} venceu!`;
    } else {
      title = res.winner === 0 ? 'Vitória!' : res.winner === 1 ? 'Derrota' : 'Empate';
    }
    if (cfg.mode === 'cup') {
      const won = SC.Cup.applyPlayerResult(App.cup, res.score[0], res.score[1], res.overtime);
      SC.Cup.save(App.cup);
      if (App.cup.status === 'champion') { title = '🏆 CAMPEÃO DO MUNDO!'; note = 'Você conquistou a Copa!'; }
      else if (App.cup.status === 'runnerUp') { title = 'Vice-campeão'; note = 'Foi por pouco! Tente de novo.'; }
      else if (!won) { note = 'Sua seleção foi eliminada da Copa.'; }
      else note = (note ? note + ' ' : '') + 'Classificado para a ' + SC.Cup.ROUND_NAMES[App.cup.round].toLowerCase() + '!';
      addBtn(App.cup.status === 'playing' ? 'Continuar ▶' : 'Ver chaveamento', 'primary', showCup);
    } else {
      addBtn('↻ Revanche', 'primary', () => startMatch(cfg));
      addBtn('Trocar times', '', () => openSelect(cfg.mode));
    }
    addBtn('Menu principal', 'ghost', goMenu);
    $('#resTitle').textContent = title;
    $('#resTitle').className = res.winner === 0 || cfg.mode === 'pvp' ? 'win' : res.winner === 1 ? 'lose' : '';
    $('#resNote').textContent = note;
    show('scr-result');
  }

  // ---------- Copa ----------
  function teamRow(id, score, isWinner, isPlayer) {
    const t = SC.teamById(id);
    if (!t) return `<div class="row empty"><span>A definir</span></div>`;
    return `<div class="row ${isWinner ? 'won' : ''} ${isPlayer ? 'me' : ''}">
      <img src="${SC.Render.flagURL(t)}" alt=""><span>${t.name}</span><b>${score == null ? '' : score}</b></div>`;
  }

  function showCup() {
    const cup = App.cup;
    const el = $('#bracket');
    el.innerHTML = '';
    for (let r = 0; r < 4; r++) {
      const col = document.createElement('div');
      col.className = 'round';
      col.innerHTML = `<h3>${SC.Cup.ROUND_NAMES[r]}</h3>`;
      const matches = cup.rounds[r] || new Array(8 >> r).fill({});
      for (const m of matches) {
        const mine = m.a === cup.player || m.b === cup.player;
        const box = document.createElement('div');
        box.className = 'match' + (mine && !m.w && r === cup.round ? ' next' : '');
        box.innerHTML = teamRow(m.a, m.sa, m.w && m.w === m.a, m.a === cup.player)
          + teamRow(m.b, m.sb, m.w && m.w === m.b, m.b === cup.player)
          + (m.ot ? '<em>MS</em>' : '');
        col.appendChild(box);
      }
      el.appendChild(col);
    }
    const btn = $('#btnCupNext');
    const me = SC.teamById(cup.player);
    if (cup.status === 'playing') {
      const opp = SC.teamById(SC.Cup.opponentOf(cup));
      $('#cupSub').textContent = `${SC.Cup.ROUND_NAMES[cup.round]} • ${me.name} x ${opp.name}`;
      btn.textContent = `Jogar: ${me.name} x ${opp.name}`;
      btn.onclick = () => {
        const base = LEVEL_ORDER.indexOf(App.settings.difficulty);
        const lvl = LEVEL_ORDER[Math.min(2, base + Math.floor(cup.round / 2))];
        startMatch({
          mode: 'cup', teams: [me, opp], controllers: ['human', 'cpu'],
          difficulty: [lvl, lvl], duration: App.settings.duration, goldenGoal: true,
        });
      };
    } else {
      const champ = SC.teamById(cup.champion);
      $('#cupSub').textContent = cup.status === 'champion' ? `🏆 ${me.name} é campeão do mundo!` : `Campeão: ${champ.name}`;
      btn.textContent = 'Nova Copa';
      btn.onclick = () => { SC.Cup.clear(); openSelect('cup'); };
    }
    show('scr-cup');
  }

  // ---------- Pausa ----------
  function pause() {
    if (!App.match || App.mode === 'demo' || App.match.state === 'over' || App.match.paused) return;
    App.match.paused = true;
    App.match.cancelDrag();
    show('scr-pause');
  }
  function resume() {
    if (App.match) App.match.paused = false;
    hideScreens();
  }

  $('#btnPause').addEventListener('click', pause);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#scr-pause').classList.contains('hidden')) resume(); else pause();
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // ---------- Ações dos botões ----------
  const actions = {
    menu: goMenu,
    cpu: () => openSelect('cpu'),
    pvp: () => openSelect('pvp'),
    cup: () => {
      const saved = SC.Cup.load();
      if (saved && saved.status === 'playing' && !confirm('Começar uma nova Copa? O progresso atual será perdido.')) return;
      SC.Cup.clear();
      openSelect('cup');
    },
    'resume-cup': () => { App.cup = SC.Cup.load(); showCup(); },
    help: () => show('scr-help'),
    resume,
    restart: () => {
      if (App.mode === 'cup') { resume(); return; } // na Copa não dá para reiniciar e fugir da derrota
      startMatch(App.lastCfg);
    },
    quit: () => {
      if (App.mode === 'cup' && !confirm('Sair agora conta como derrota (W.O.) na Copa. Sair mesmo?')) return;
      if (App.mode === 'cup') {
        SC.Cup.applyPlayerResult(App.cup, 0, 3, false);
        SC.Cup.save(App.cup);
      }
      goMenu();
    },
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    SC.Audio.init(); SC.Audio.click();
    actions[b.dataset.action] && actions[b.dataset.action]();
  });

  const soundBtn = $('#btnSound');
  function refreshSound() {
    soundBtn.textContent = App.settings.sound ? '🔊' : '🔇';
    SC.Audio.setEnabled(App.settings.sound);
  }
  soundBtn.addEventListener('click', () => {
    App.settings.sound = !App.settings.sound;
    saveSettings(); refreshSound(); SC.Audio.init(); SC.Audio.click();
  });

  // Restart pausa quando a Copa estiver ativa
  function syncPauseMenu() {
    const r = $('#scr-pause [data-action="restart"]');
    if (r) r.classList.toggle('hidden', App.mode === 'cup');
  }

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (App.match) {
      App.match.update(dt);
      if (App.mode === 'demo' && App.match.state === 'over') startDemo();
      SC.Render.draw(ctx, App.match, now / 1000);
      updateHud();
    }
    syncPauseMenu();
    requestAnimationFrame(frame);
  }

  // Início
  buildTeamGrid();
  refreshSound();
  resize();
  goMenu();
  requestAnimationFrame(frame);

  // Exposto para depuração/testes
  window.SCApp = App;
})();

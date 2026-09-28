// Estrutura da interface: salvamento, navegação, modais, escudos e fluxo da semana.
(function (M) {
  const U = M.U;
  const SAVE_KEY = 'scm.save.v1';
  const $ = (s, r = document) => r.querySelector(s);

  const UI = (M.UI = { tab: 'home', sub: {}, w: null });
  M.ACT = {};

  // ---------- Salvamento ----------
  UI.save = function () {
    if (!UI.w) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(UI.w)); } catch (e) { UI.toast('Não foi possível salvar o jogo neste navegador.'); }
  };
  UI.load = function () {
    try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  };
  UI.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* sem armazenamento */ } };

  // ---------- Escudos ----------
  let crestN = 0;
  const SHIELD = 'M10 8 H90 V58 C90 88 50 114 50 114 C50 114 10 88 10 58 Z';
  M.crest = function (c, size = 36) {
    const [p, s] = c.colors;
    const id = 'cr' + crestN++;
    let fill = '';
    if (c.pattern === 'v') for (let i = 0; i < 7; i++) fill += `<rect x="${i * 14.3}" y="0" width="14.4" height="120" fill="${i % 2 ? s : p}"/>`;
    else if (c.pattern === 'h') for (let i = 0; i < 8; i++) fill += `<rect x="0" y="${i * 15}" width="100" height="15.1" fill="${i % 2 ? s : p}"/>`;
    else if (c.pattern === 'sash') fill = `<rect width="100" height="120" fill="${p}"/><path d="M-10 20 L30 -10 L120 100 L80 130 Z" fill="${s}"/>`;
    else if (c.pattern === 'half') fill = `<rect width="50" height="120" fill="${p}"/><rect x="50" width="50" height="120" fill="${s}"/>`;
    else fill = `<rect width="100" height="120" fill="${p}"/><path d="${SHIELD}" fill="none" stroke="${s}" stroke-width="14"/>`;
    return `<svg class="crest" width="${size}" height="${size * 1.2}" viewBox="0 0 100 120" aria-hidden="true">
      <defs><clipPath id="${id}"><path d="${SHIELD}"/></clipPath></defs>
      <g clip-path="url(#${id})">${fill}<rect x="0" y="64" width="100" height="24" fill="rgba(0,0,0,.45)"/></g>
      <path d="${SHIELD}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="4"/>
      <text x="50" y="82" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="19" fill="#fff">${c.short}</text></svg>`;
  };

  // ---------- Toast e modal ----------
  let toastT = 0;
  UI.toast = function (text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 2600);
  };

  UI.modal = function (html, opts = {}) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-back"><div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      ${opts.noClose ? '' : '<button class="icon-btn modal-x" data-act="closeModal" aria-label="Fechar">✕</button>'}${html}</div></div>`;
    root.hidden = false;
    UI.modalOpen = true;
    UI.onModalClose = opts.onClose || null;
  };
  UI.closeModal = function () {
    const root = $('#modal-root');
    root.hidden = true;
    root.innerHTML = '';
    UI.modalOpen = false;
    const cb = UI.onModalClose;
    UI.onModalClose = null;
    if (cb) cb();
  };
  M.ACT.closeModal = () => UI.closeModal();

  // Confirmação dentro da página (confirm() nativo não funciona em todo lugar).
  UI.confirm = function (title, text, yesLabel, onYes) {
    UI.modal(`<h2>${U.esc(title)}</h2><p class="muted">${U.esc(text)}</p>
      <div class="row-btns"><button class="btn ghost" data-act="closeModal">Cancelar</button>
      <button class="btn danger" id="cfYes">${U.esc(yesLabel)}</button></div>`);
    $('#cfYes').onclick = () => { UI.closeModal(); onYes(); };
  };

  // ---------- Formatação comum ----------
  UI.ovr = (v) => {
    const o = Math.round(v);
    const cls = o >= 80 ? 'o5' : o >= 72 ? 'o4' : o >= 64 ? 'o3' : o >= 56 ? 'o2' : 'o1';
    return `<span class="ovr ${cls}">${o}</span>`;
  };
  UI.pos = (p) => `<span class="pos pos-${p}">${p}</span>`;
  UI.potStars = (p, own) => {
    const v = U.clamp((p.pot - 45) / 10, 0.5, 5);
    const shown = own ? v : Math.round(v * 2) / 2;
    return `<span class="stars" title="Potencial">${U.stars(shown)}</span>`;
  };
  UI.bar = (v, cls = '') => `<span class="bar ${cls} ${v < 55 ? 'low' : v < 75 ? 'mid' : ''}"><i style="width:${U.clamp(v, 0, 100)}%"></i></span>`;
  UI.clubName = (w, id) => (w.clubs[id] ? w.clubs[id].name : '—');
  UI.clubTag = (w, id, size = 20) => `<span class="club-tag">${M.crest(w.clubs[id], size)}<span>${U.esc(w.clubs[id].name)}</span></span>`;
  UI.formChips = (arr) => arr.map((r) => `<span class="fchip f${r}">${r}</span>`).join('');

  // ---------- Casca ----------
  const TABS = [
    ['home', 'Início', '🏠'], ['squad', 'Elenco', '👕'], ['tactics', 'Tática', '📋'], ['youth', 'Base', '🌱'],
    ['market', 'Mercado', '💱'], ['comps', 'Competições', '🏆'], ['club', 'Clube', '🏟️'], ['inbox', 'Mensagens', '✉️'],
  ];

  UI.render = function () {
    const w = UI.w;
    if (!w) return;
    const u = M.user(w);
    const unread = w.inbox.filter((m) => !m.read).length;
    $('#topbar').innerHTML = `
      <div class="tb-club">${M.crest(u, 34)}<div><b>${U.esc(u.name)}</b><small>Série ${u.div} • ${w.season}</small></div></div>
      <div class="tb-info">
        <span class="chip">${M.weekLabel(w)}</span>
        <span class="chip ${u.money < 0 ? 'neg' : ''}" title="Saldo em caixa">💰 ${U.money(u.money)}</span>
        ${M.windowOpen(w) ? '<span class="chip win">Janela aberta</span>' : ''}
      </div>
      <button class="btn primary go" data-act="advance">${UI.advanceLabel()}</button>`;
    $('#tabs').innerHTML = TABS.map(([id, label, ico]) =>
      `<button class="tab ${UI.tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}"><span class="ti">${ico}</span><span>${label}</span>${id === 'inbox' && unread ? `<em>${unread}</em>` : ''}</button>`).join('');
    const view = M.VIEWS[UI.tab] || M.VIEWS.home;
    $('#main').innerHTML = view(w);
    $('#main').scrollTop = 0;
  };

  UI.refresh = function () {
    const st = $('#main').scrollTop;
    UI.render();
    $('#main').scrollTop = st;
    UI.save();
  };

  UI.advanceLabel = function () {
    const w = UI.w;
    if (w.fired) return 'Ver propostas ▶';
    if (w.pendingSeason) return 'Encerrar temporada ▶';
    if (w.week === 0) return 'Iniciar temporada ▶';
    return M.userMatch(w) ? 'Ir para o jogo ▶' : 'Avançar semana ▶';
  };

  M.ACT.tab = (el) => { UI.tab = el.dataset.arg; UI.render(); };
  M.ACT.goto = (el) => { UI.tab = el.dataset.arg; if (el.dataset.sub) UI.sub[UI.tab] = el.dataset.sub; UI.render(); };

  // ---------- Fluxo da semana ----------
  M.ACT.advance = function () {
    const w = UI.w;
    if (w.fired) return UI.showFired();
    if (w.pendingSeason) return UI.showSeasonEnd();
    if (w.week === 0) {
      M.endWeek(w);
      UI.save();
      UI.render();
      UI.toast(`Temporada ${w.season} iniciada. Boa sorte!`);
      return;
    }
    const m = M.userMatch(w);
    if (m) return M.Live.prematch(m);
    M.simulateWeek(w);
    UI.showWeekResults(null);
  };

  UI.finishWeek = function () {
    const w = UI.w;
    const before = w.inbox.length ? w.inbox[0].id : 0;
    const rep = M.endWeek(w);
    UI.save();
    UI.render();
    if (rep.seasonEnd || w.fired) return UI.showSeasonEnd();
    const fresh = w.inbox.filter((m) => m.id > before);
    const offers = fresh.filter((m) => m.offer).length;
    if (offers) UI.toast(`Você recebeu ${offers} proposta(s) por jogadores. Veja em Mensagens.`);
    else if (fresh.length) UI.toast(fresh[0].title);
  };

  // Resultados da rodada (quando o usuário não jogou nesta semana ou após o jogo).
  UI.roundResultsHTML = function (w, wk, highlightId) {
    if (!wk) return '';
    const u = M.user(w);
    const comps = wk.type === 'cup' ? ['CUP'] : [u.div, u.div === 'A' ? 'B' : 'A'];
    return comps.map((comp) => {
      const ms = wk.matches.filter((m) => m.comp === comp && m.played);
      if (!ms.length) return '';
      const title = comp === 'CUP' ? `Copa • ${M.CUP_ROUNDS[wk.round]}` : `Série ${comp} • Rodada ${wk.round}`;
      return `<h3 class="sec">${title}</h3><div class="results">${ms.map((m) => UI.resultRow(w, m, highlightId)).join('')}</div>`;
    }).join('');
  };

  UI.resultRow = function (w, m, hl) {
    const h = w.clubs[m.h], a = w.clubs[m.a];
    const mine = m.h === w.userClub || m.a === w.userClub || m.h === hl || m.a === hl;
    const wonH = m.hs > m.as || (m.pens && m.pens[0] > m.pens[1]);
    const wonA = m.as > m.hs || (m.pens && m.pens[1] > m.pens[0]);
    return `<div class="res ${mine ? 'mine' : ''}">
      <span class="rh ${wonH ? 'w' : ''}">${U.esc(h.name)} ${M.crest(h, 18)}</span>
      <b class="rs">${m.played ? `${m.hs} - ${m.as}` : 'x'}</b>
      <span class="ra ${wonA ? 'w' : ''}">${M.crest(a, 18)} ${U.esc(a.name)}</span>
      ${m.pens ? `<small class="pens">pên. ${m.pens[0]}-${m.pens[1]}</small>` : ''}</div>`;
  };

  UI.showWeekResults = function () {
    const w = UI.w;
    const wk = M.currentWeek(w);
    UI.modal(`<h2>${M.weekLabel(w)}</h2>
      <p class="muted">${wk.type === 'cup' && !w.cup.alive.includes(w.userClub) ? 'Seu time está fora da Copa. Semana de treinos.' : 'Sem jogo para o seu time nesta semana.'}</p>
      ${UI.roundResultsHTML(w, wk)}
      <div class="row-btns"><button class="btn primary" data-act="closeModal">Continuar</button></div>`,
    { wide: true, onClose: () => UI.finishWeek() });
  };

  // ---------- Fim de temporada ----------
  UI.showSeasonEnd = function () {
    const w = UI.w;
    const ps = w.pendingSeason;
    if (!ps) return UI.showFired();
    const u = M.user(w);
    const name = (id) => U.esc(w.clubs[id].name);
    const e = ps.entry;
    const verdict = w.fired
      ? `<div class="alert bad"><b>Você foi demitido.</b> ${U.esc(w.fired.reason)}</div>`
      : ps.success ? `<div class="alert good"><b>Objetivo cumprido!</b> A diretoria esperava ${U.esc(e.user.objective)}.</div>`
        : `<div class="alert warn"><b>Objetivo não cumprido.</b> A meta era ${U.esc(e.user.objective)}. Confiança da diretoria: ${Math.round(w.board.conf)}%.</div>`;
    let choice = '';
    if (w.fired) {
      const offers = M.jobOffers(w);
      choice = `<h3 class="sec">Propostas de emprego</h3><div class="offers">${offers.map((id) => `
        <button class="offer-card" data-act="takeJob" data-arg="${id}">${M.crest(w.clubs[id], 40)}<b>${name(id)}</b><small>Série ${w.clubs[id].div} • reputação ${Math.round(w.clubs[id].rep)}</small></button>`).join('')}</div>`;
    } else if (ps.offer) {
      const oc = w.clubs[ps.offer];
      choice = `<div class="alert info">${M.crest(oc, 28)} <div><b>O ${U.esc(oc.name)} quer contratar você!</b><br><small>Série ${oc.div} • reputação ${Math.round(oc.rep)}. Aceitar muda seu clube na próxima temporada.</small></div>
        <button class="btn" data-act="takeJob" data-arg="${oc.id}">Aceitar</button></div>`;
    }
    UI.modal(`<h2>Fim da temporada ${e.season}</h2>
      <div class="champs">
        <div>${M.crest(w.clubs[e.champA], 44)}<small>Série A</small><b>${name(e.champA)}</b></div>
        <div>${M.crest(w.clubs[e.champB], 44)}<small>Série B</small><b>${name(e.champB)}</b></div>
        ${e.cup ? `<div>${M.crest(w.clubs[e.cup], 44)}<small>Copa</small><b>${name(e.cup)}</b></div>` : ''}
      </div>
      <p class="big-line">${U.esc(u.name)} terminou em <b>${ps.userPos}º</b> na Série ${e.user.div}.</p>
      ${verdict}
      <div class="grid2">
        <div><h3 class="sec">Sobem para a Série A</h3>${ps.promoted.map((id) => `<div class="li up">▲ ${name(id)}</div>`).join('')}</div>
        <div><h3 class="sec">Caem para a Série B</h3>${ps.relegated.map((id) => `<div class="li down">▼ ${name(id)}</div>`).join('')}</div>
      </div>
      <h3 class="sec">Prêmios</h3>
      <div class="awards">
        ${ps.scA ? `<div>⚽ Artilheiro da Série A: <b>${U.esc(ps.scA.name)}</b> (${name(ps.scA.clubId)}), ${ps.scA.s.goals} gols</div>` : ''}
        ${ps.scB ? `<div>⚽ Artilheiro da Série B: <b>${U.esc(ps.scB.name)}</b> (${name(ps.scB.clubId)}), ${ps.scB.s.goals} gols</div>` : ''}
        ${ps.best ? `<div>⭐ Craque da temporada: <b>${U.esc(ps.best.name)}</b> (${name(ps.best.clubId)}), nota média ${(ps.best.s.rsum / ps.best.s.apps).toFixed(2)}</div>` : ''}
      </div>
      ${choice}
      <div class="row-btns">${w.fired ? '' : `<button class="btn primary" data-act="newSeason">Começar temporada ${e.season + 1} ▶</button>`}</div>`,
    { wide: true, noClose: true });
  };

  M.ACT.takeJob = function (el) {
    const w = UI.w;
    const id = el.dataset.arg;
    const wasPending = !!w.pendingSeason;
    UI.closeModal();
    if (wasPending) M.newSeason(w);
    M.switchClub(w, id);
    UI.toast(wasPending ? `Nova temporada no ${w.clubs[id].name}!` : `Você agora treina o ${w.clubs[id].name}.`);
    UI.tab = 'home';
    UI.save();
    UI.render();
  };

  M.ACT.newSeason = function () {
    const w = UI.w;
    UI.closeModal();
    M.newSeason(w);
    UI.tab = 'home';
    UI.save();
    UI.render();
    UI.toast(`Pré-temporada ${w.season}: reforce o elenco e veja a nova safra da base.`);
  };

  UI.showFired = function () {
    const w = UI.w;
    const offers = M.jobOffers(w);
    UI.modal(`<h2>Você foi demitido</h2>
      <p class="muted">${U.esc(w.fired.reason)} Mas o mercado não esquece um bom treinador. Escolha seu próximo desafio:</p>
      <div class="offers">${offers.map((id) => `<button class="offer-card" data-act="takeJob" data-arg="${id}">${M.crest(w.clubs[id], 40)}<b>${U.esc(w.clubs[id].name)}</b><small>Série ${w.clubs[id].div} • reputação ${Math.round(w.clubs[id].rep)}</small></button>`).join('')}</div>`,
    { wide: true, noClose: true });
  };

  // ---------- Tela inicial ----------
  UI.showStart = function () {
    const saved = UI.load();
    $('#shell').hidden = true;
    const st = $('#start');
    st.hidden = false;
    const byDiv = (d) => M.CLUBS.filter((c, i) => (i < 16 ? 'A' : 'B') === d);
    const card = (c) => {
      const i = M.CLUBS.indexOf(c);
      const tier = i < 3 ? 'Favorito ao título' : i < 8 ? 'Candidato ao G8' : i < 16 ? 'Meio de tabela' : i < 21 ? 'Briga pelo acesso' : 'Desafio difícil';
      return `<button class="club-pick" data-act="pickClub" data-arg="${c.id}">${M.crest(c, 38)}<span><b>${U.esc(c.name)}</b><small>${U.esc(c.city)}-${c.uf} • ${tier}</small></span><em>${U.stars(Math.max(1, Math.round((c.rep - 40) / 10)))}</em></button>`;
    };
    st.innerHTML = `<div class="start-wrap">
      <header class="start-head">
        <h1 class="logo"><span>SOCCER CHAMPS</span><b>MANAGER</b></h1>
        <p>Assuma um clube, monte o elenco, revele craques na base e conquiste o Brasil.</p>
      </header>
      ${saved ? `<div class="continue">${M.crest(saved.clubs[saved.userClub], 42)}<div><b>${U.esc(saved.clubs[saved.userClub].name)}</b><small>${U.esc(saved.manager.name)} • Temporada ${saved.season}, ${saved.week === 0 ? 'pré-temporada' : 'semana ' + saved.week}</small></div>
        <button class="btn primary" data-act="continueGame">Continuar carreira ▶</button></div>` : ''}
      <section class="newgame">
        <h2>${saved ? 'Ou comece uma nova carreira' : 'Nova carreira'}</h2>
        <label class="field"><span>Seu nome de treinador</span><input id="mgrName" maxlength="28" placeholder="Ex.: Professor Wesley" value="${U.esc((saved && saved.manager.name) || '')}"></label>
        <p class="muted">Escolha seu clube. Clubes menores começam com pouco dinheiro e metas modestas; os grandes cobram títulos.</p>
        <div class="pick-cols">
          <div><h3 class="sec">Série A</h3><div class="pick-list">${byDiv('A').map(card).join('')}</div></div>
          <div><h3 class="sec">Série B</h3><div class="pick-list">${byDiv('B').map(card).join('')}</div></div>
        </div>
      </section>
      <footer class="start-foot"><a href="botao.html">🎮 Jogar o modo arcade (futebol de botão)</a></footer>
    </div>`;
  };

  M.ACT.continueGame = function () {
    UI.w = UI.load();
    UI.enterGame();
  };

  M.ACT.pickClub = function (el) {
    const id = el.dataset.arg;
    const name = ($('#mgrName').value || '').trim() || 'Treinador';
    const start = () => {
      UI.w = M.newWorld(name, id);
      M.startSeason(UI.w);
      for (const c of Object.values(UI.w.clubs)) M.autoLineup(UI.w, c);
      UI.tab = 'home';
      UI.save();
      UI.enterGame();
      UI.toast(`Bem-vindo ao ${UI.w.clubs[id].name}, ${name}!`);
    };
    if (UI.load()) UI.confirm('Começar nova carreira?', 'A carreira salva atual será substituída.', 'Começar do zero', start);
    else start();
  };

  M.ACT.quitToStart = () => { UI.save(); UI.showStart(); };

  UI.enterGame = function () {
    $('#start').hidden = true;
    $('#shell').hidden = false;
    UI.render();
  };

  // ---------- Eventos ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.classList.contains('modal-back') && e.target !== el) return;
    const fn = M.ACT[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const fn = M.ACT[el.dataset.change];
    if (fn) fn(el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (!el) return;
    const fn = M.ACT[el.dataset.input];
    if (fn) fn(el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && UI.modalOpen && $('.modal-x')) UI.closeModal();
  });

  window.addEventListener('DOMContentLoaded', () => UI.showStart());
})(window.SCM);

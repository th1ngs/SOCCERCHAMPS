// Copa do Mundo: mata-mata com 16 seleções (oitavas → final).
(function () {
  const SC = window.SC;
  const ROUND_NAMES = ['Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
  const STORE_KEY = 'soccerchamps.cup';

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function newCup(playerId) {
    const others = shuffle(SC.TEAMS.filter((t) => t.id !== playerId).map((t) => t.id)).slice(0, 15);
    const all = shuffle([playerId, ...others]);
    const first = [];
    for (let i = 0; i < 8; i++) first.push({ a: all[i * 2], b: all[i * 2 + 1], sa: null, sb: null, w: null, ot: false });
    return { player: playerId, rounds: [first], round: 0, status: 'playing' };
  }

  function playerMatch(cup) {
    const r = cup.rounds[cup.round];
    return r && r.find((m) => m.a === cup.player || m.b === cup.player);
  }

  // Gols simulados com base no rating das seleções.
  function simGoals(r, opp) {
    const exp = Math.max(0.3, 1.3 + (r - opp) / 12);
    let g = 0, L = Math.exp(-exp), p = 1;
    do { g++; p *= Math.random(); } while (p > L && g < 8);
    return g - 1;
  }

  function simulateMatch(m) {
    const ra = SC.teamById(m.a).rating, rb = SC.teamById(m.b).rating;
    m.sa = simGoals(ra, rb);
    m.sb = simGoals(rb, ra);
    if (m.sa === m.sb) {
      const pa = 1 / (1 + Math.pow(10, (rb - ra) / 20));
      if (Math.random() < pa) m.sa++; else m.sb++;
      m.ot = true;
    }
    m.w = m.sa > m.sb ? m.a : m.b;
  }

  function advance(cup) {
    const r = cup.rounds[cup.round];
    for (const m of r) if (!m.w) simulateMatch(m);
    if (cup.round === 3) {
      cup.champion = r[0].w;
      if (r[0].w === cup.player) cup.status = 'champion';
      else if (r[0].a === cup.player || r[0].b === cup.player) cup.status = 'runnerUp';
      return;
    }
    const next = [];
    for (let i = 0; i < r.length; i += 2) next.push({ a: r[i].w, b: r[i + 1].w, sa: null, sb: null, w: null, ot: false });
    cup.rounds.push(next);
    cup.round++;
  }

  // Registra o resultado da partida do jogador (placar do ponto de vista do jogador).
  function applyPlayerResult(cup, myGoals, oppGoals, ot) {
    const m = playerMatch(cup);
    if (m.a === cup.player) { m.sa = myGoals; m.sb = oppGoals; } else { m.sa = oppGoals; m.sb = myGoals; }
    m.ot = ot;
    m.w = myGoals > oppGoals ? cup.player : m.a === cup.player ? m.b : m.a;
    const won = m.w === cup.player;
    if (!won) cup.status = 'out';
    advance(cup);
    // Eliminado: simula o resto do torneio para mostrar o campeão.
    while (cup.status === 'out' && !cup.champion) advance(cup);
    return won;
  }

  function opponentOf(cup) {
    const m = playerMatch(cup);
    return m.a === cup.player ? m.b : m.a;
  }

  function save(cup) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cup)); } catch (e) { /* sem armazenamento */ }
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }
  function clear() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* sem armazenamento */ }
  }

  SC.Cup = { ROUND_NAMES, newCup, playerMatch, opponentOf, applyPlayerResult, save, load, clear };
})();

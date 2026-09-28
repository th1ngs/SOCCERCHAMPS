// Geração do mundo: clubes, elencos, jogadores, base e agentes livres.
(function (M) {
  const U = M.U;
  const SQUAD_TEMPLATE = { GOL: 3, ZAG: 4, LAT: 4, VOL: 4, MEI: 5, ATA: 4 };

  M.wageFor = (ovr) => Math.round((2600 * Math.pow(1.13, ovr - 50)) / 100) * 100;

  M.valueOf = (p) => {
    const growth = Math.max(0, p.pot - p.ovr) * U.clamp((25 - p.age) / 10, 0, 0.6);
    const eff = p.ovr + growth;
    let v = 100000 * Math.pow(1.18, eff - 50);
    if (p.age > 29) v *= Math.pow(0.85, p.age - 29);
    if (p.contract <= 0) v *= 0.4;
    return Math.max(10000, Math.round(v / 10000) * 10000);
  };

  function makeName() {
    if (U.chance(0.18)) return U.pick(M.NICK);
    return U.pick(M.FIRST) + ' ' + U.pick(M.LAST);
  }

  M.newPlayer = function (w, o) {
    const id = 'p' + w.nextId++;
    const p = {
      id,
      name: o.name || makeName(),
      age: o.age,
      pos: o.pos,
      ovr: o.ovr,
      pot: Math.max(Math.round(o.pot), Math.round(o.ovr)),
      clubId: o.clubId || null,
      youth: !!o.youth,
      contract: o.contract != null ? o.contract : U.randi(1, 4),
      fitness: 100,
      morale: 70,
      inj: 0, susp: 0, yc: 0,
      listed: false,
      num: 0,
      s: { apps: 0, goals: 0, assists: 0, rsum: 0 },
      c: { apps: 0, goals: 0, assists: 0 },
      played: false,
    };
    p.wage = o.youth ? 800 : M.wageFor(p.ovr) * U.rand(0.85, 1.15);
    p.wage = Math.round(p.wage / 100) * 100;
    w.players[id] = p;
    return p;
  };

  function randomAge() {
    const r = Math.random();
    if (r < 0.2) return U.randi(18, 21);
    if (r < 0.75) return U.randi(22, 29);
    return U.randi(30, 34);
  }

  function seniorFor(w, club, pos, base, age) {
    let ovr = base + U.gauss() * 4.5;
    if (age < 22) ovr -= (22 - age) * 1.8;
    ovr = U.clamp(ovr, 40, 92);
    const pot = age < 25 ? U.clamp(ovr + U.rand(2, 16) * ((25 - age) / 5), ovr, 95) : ovr + U.rand(0, 2);
    return M.newPlayer(w, { pos, age, ovr, pot, clubId: club.id });
  }

  M.makeYouth = function (w, club, age) {
    const lvl = club.academy;
    let pot = 48 + lvl * 6 + U.rand(-6, 18);
    if (U.chance(0.04 + lvl * 0.01)) pot += U.rand(8, 14); // joia da base
    pot = U.clamp(pot, 45, 96);
    age = age || U.randi(15, 17);
    const ovr = U.clamp(pot * U.rand(0.52, 0.64) + (age - 15) * 2, 30, 70);
    const pos = U.weighted(M.POS, (p) => ({ GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 2.5, ATA: 2.5 }[p]));
    const p = M.newPlayer(w, { pos, age, ovr, pot, clubId: club.id, youth: true, contract: 3 });
    club.youth.push(p.id);
    return p;
  };

  M.assignNumbers = function (w, club) {
    const used = new Set();
    const players = club.squad.map((id) => w.players[id]);
    for (const p of players) if (p.num) used.add(p.num);
    const next = (prefs) => {
      for (const n of prefs) if (!used.has(n)) { used.add(n); return n; }
      for (let n = 2; n < 99; n++) if (!used.has(n)) { used.add(n); return n; }
      return 99;
    };
    const prefs = { GOL: [1, 12, 23], ZAG: [3, 4, 13, 14], LAT: [2, 6, 16], VOL: [5, 8, 15], MEI: [10, 8, 7, 11, 18], ATA: [9, 11, 7, 19, 20] };
    for (const p of players) if (!p.num) p.num = next(prefs[p.pos]);
  };

  M.newWorld = function (managerName, clubId) {
    const w = {
      version: 1,
      manager: { name: managerName || 'Treinador' },
      userClub: clubId,
      season: 2026,
      week: 0,
      clubs: {},
      players: {},
      free: [],
      nextId: 1,
      weeks: [],
      cup: { rounds: [] },
      inbox: [],
      nextMsg: 1,
      history: [],
      board: { conf: 60 },
      finance: [],
      trialUsed: false,
      started: false,
    };
    M.CLUBS.forEach((c, i) => {
      const club = Object.assign({}, c, {
        div: i < 16 ? 'A' : 'B',
        money: Math.round((2 + (c.rep * c.rep) / 200) * 1e6),
        academy: U.clamp(Math.round(c.rep / 25 + U.rand(-0.5, 0.8)), 1, 5),
        training: U.clamp(Math.round(c.rep / 25 + U.rand(-0.5, 0.8)), 1, 5),
        formation: U.pick(['4-4-2', '4-3-3', '4-2-3-1', '4-3-3', '4-4-2', '3-5-2']),
        tactic: 'bal',
        trainingInt: 'mid',
        squad: [], youth: [], lineup: [], bench: [],
        trophies: [],
      });
      w.clubs[c.id] = club;
      const base = 48 + c.rep * 0.32;
      for (const pos in SQUAD_TEMPLATE) {
        for (let k = 0; k < SQUAD_TEMPLATE[pos]; k++) {
          const p = seniorFor(w, club, pos, base, randomAge());
          club.squad.push(p.id);
        }
      }
      // Dois craques por clube
      for (let k = 0; k < 2; k++) {
        const p = w.players[U.pick(club.squad)];
        p.ovr = U.clamp(p.ovr + U.rand(4, 9), 40, 93);
        p.pot = Math.max(p.pot, Math.round(p.ovr));
        p.wage = M.wageFor(p.ovr);
      }
      for (let k = 0; k < 4; k++) M.makeYouth(w, club);
      M.assignNumbers(w, club);
    });
    for (let k = 0; k < 40; k++) M.makeFreeAgent(w);
    return w;
  };

  M.makeFreeAgent = function (w) {
    const age = U.randi(21, 34);
    const pos = U.pick(M.POS);
    const ovr = U.clamp(55 + U.gauss() * 7, 42, 80);
    const p = M.newPlayer(w, { pos, age, ovr, pot: ovr + (age < 24 ? U.rand(2, 8) : 0), contract: 0 });
    w.free.push(p.id);
    return p;
  };
})(window.SCM);

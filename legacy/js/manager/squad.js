// Escalação: disponibilidade, escalação automática e validação.
(function (M) {
  const U = M.U;
  const SLOT_PRIORITY = { GOL: 0, ATA: 1, MEI: 2, ZAG: 3, VOL: 4, LAT: 5 };

  M.available = (p) => p && !p.inj && !p.susp && !p.youth;

  const slotScore = (p, slotPos) => p.ovr * M.fit(p.pos, slotPos) * (0.85 + (0.15 * p.fitness) / 100);

  function fillSlots(w, club, lineup) {
    const slots = M.FORMATIONS[club.formation];
    const used = new Set(lineup.filter(Boolean));
    const pool = club.squad.map((id) => w.players[id]).filter((p) => M.available(p));
    const order = slots.map((s, i) => i).sort((a, b) => SLOT_PRIORITY[slots[a].pos] - SLOT_PRIORITY[slots[b].pos]);
    for (const i of order) {
      if (lineup[i]) continue;
      let best = null, bs = -1;
      for (const p of pool) {
        if (used.has(p.id)) continue;
        const s = slotScore(p, slots[i].pos);
        if (s > bs) { bs = s; best = p; }
      }
      if (best) { lineup[i] = best.id; used.add(best.id); }
    }
    return lineup;
  }

  function fillBench(w, club, lineup, bench) {
    const used = new Set(lineup);
    bench = bench.filter((id) => !used.has(id) && club.squad.includes(id) && M.available(w.players[id]));
    bench.forEach((id) => used.add(id));
    const pool = club.squad.map((id) => w.players[id]).filter((p) => M.available(p) && !used.has(p.id));
    pool.sort((a, b) => b.ovr - a.ovr);
    if (!bench.some((id) => w.players[id].pos === 'GOL')) {
      const gk = pool.find((p) => p.pos === 'GOL');
      if (gk && bench.length < 7) { bench.push(gk.id); used.add(gk.id); }
    }
    for (const p of pool) {
      if (bench.length >= 7) break;
      if (!used.has(p.id)) { bench.push(p.id); used.add(p.id); }
    }
    return bench.slice(0, 7);
  }

  // Elenco curto demais: sobe garotos da base ou contrata amadores para completar 11.
  function emergencyFill(w, club) {
    let avail = club.squad.filter((id) => M.available(w.players[id])).length;
    while (avail < 11) {
      const y = club.youth.map((id) => w.players[id]).filter((p) => !p.inj && !p.susp).sort((a, b) => b.ovr - a.ovr)[0];
      if (y) M.promoteYouth(w, y.id, true);
      else {
        const pos = M.neededPos(w, club);
        const p = M.newPlayer(w, { pos, age: U.randi(20, 30), ovr: U.rand(42, 50), pot: 52, clubId: club.id, contract: 1 });
        club.squad.push(p.id);
        M.assignNumbers(w, club);
        if (club.id === w.userClub) M.msg(w, { kind: 'info', title: 'Reforço emergencial', body: `Sem jogadores suficientes, o clube contratou ${p.name} (${p.pos}) às pressas.` });
      }
      avail++;
    }
  }

  M.autoLineup = function (w, club) {
    emergencyFill(w, club);
    club.lineup = fillSlots(w, club, new Array(11).fill(null));
    club.bench = fillBench(w, club, club.lineup, []);
  };

  // Troca jogadores indisponíveis. Retorna os nomes substituídos.
  M.ensureLineup = function (w, club) {
    const changes = [];
    emergencyFill(w, club);
    let lineup = (club.lineup || []).slice(0, 11);
    while (lineup.length < 11) lineup.push(null);
    const seen = new Set();
    lineup = lineup.map((id) => {
      const p = w.players[id];
      if (!id || seen.has(id) || !club.squad.includes(id) || !M.available(p)) {
        if (p && club.squad.includes(id)) changes.push(p.name);
        return null;
      }
      seen.add(id);
      return id;
    });
    club.lineup = fillSlots(w, club, lineup);
    club.bench = fillBench(w, club, club.lineup, club.bench || []);
    return changes;
  };

  // Força média aproximada do time titular (para exibição e expectativas).
  M.teamRating = function (w, club) {
    const slots = M.FORMATIONS[club.formation];
    const ids = club.lineup && club.lineup.length === 11 ? club.lineup : null;
    if (!ids) {
      const top = club.squad.map((id) => w.players[id]).sort((a, b) => b.ovr - a.ovr).slice(0, 11);
      return U.avg(top, (p) => p.ovr);
    }
    return U.avg(ids.map((id, i) => ({ p: w.players[id], s: slots[i] })), (x) => (x.p ? x.p.ovr * M.fit(x.p.pos, x.s.pos) : 40));
  };
})(window.SCM);

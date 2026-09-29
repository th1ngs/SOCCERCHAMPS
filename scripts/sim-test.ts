// Teste de balanceamento headless do motor do Manager (6 ligas, World v3).
//   npx tsx scripts/sim-test.ts [clubId] [--seasons N] [--checks]
// Sem --checks: simula N temporadas (padrão 3) com todos os clubes no automático e imprime
// campeões, gols por jogo e artilheiros por liga, tempo por temporada e tamanho do JSON.
// Com --checks: exercita a API de mercado/base, uma partida ao vivo interativa, as novidades da v2
// (capitão/batedor, ingresso, empréstimo, clássico, DM) e as da v3 (ligas, copas, acesso, histórico).
import { gzipSync } from 'node:zlib';
import {
  CLUBS, DIVISIONS, DIVISION_IDS, DIVISION_SIZE, IncompatibleSaveError, LEAGUES, LEAGUE_IDS, LOAN_OPTIONS, Sim, TRAITS,
  UPGRADES, WORLD_VERSION, autoLineup, applyResult, clubPlayers, completeBuy, competitionName, contEntrants,
  currentWeek, cupId, divisionFullName, endWeek, ensureLineup, evaluateBid, expectedGate, firstDivisions, formatMoney,
  injuryLabel, injuryWeeks, isCompatible, isDerby, isDivision, jobOffers, loanBalance, migrateWorld, newSeason,
  newWorld, promoteYouth, release, renew, repayLoan, runTrial, setCaptain, setPenTaker, setTicketPrice, simMatch,
  simulateWeek, startSeason, switchClub, table, takeLoan, topScorers, upgrade, user, userCompetitions, userMatch,
} from '../src/game';
import type { DivisionId, LeagueId, Match, SeasonSummary, World } from '../src/game';

const args = process.argv.slice(2);
const clubId = args.find((a) => !a.startsWith('--')) || 'anhangabau';
const seasonsArg = args.indexOf('--seasons');
const SEASONS = seasonsArg >= 0 ? Number(args[seasonsArg + 1]) || 3 : 3;

if (!CLUBS.some((c) => c.id === clubId)) {
  console.error(`Clube desconhecido: ${clubId}. Opções: ${CLUBS.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error('Falhou: ' + msg);
}

const median = (a: number[]): number => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

function freshWorld(): World {
  const w = newWorld('Teste', clubId);
  startSeason(w);
  for (const c of Object.values(w.clubs)) autoLineup(w, c);
  return w;
}

interface LeagueStats { goals: number; games: number; hw: number; dr: number; aw: number }

/** Joga a temporada até o fim (semana a semana) e devolve o resumo e as estatísticas por liga. */
function playSeason(w: World): { ps: SeasonSummary; stats: Record<LeagueId, LeagueStats> } {
  const stats = {} as Record<LeagueId, LeagueStats>;
  for (const lg of LEAGUE_IDS) stats[lg] = { goals: 0, games: 0, hw: 0, dr: 0, aw: 0 };
  for (;;) {
    const wk = currentWeek(w);
    simulateWeek(w);
    if (wk && wk.type === 'league') {
      for (const m of wk.matches) {
        if (!isDivision(m.comp)) continue;
        const st = stats[DIVISIONS[m.comp].league];
        const hs = m.hs as number, as = m.as as number;
        st.games++; st.goals += hs + as;
        if (hs > as) st.hw++; else if (hs < as) st.aw++; else st.dr++;
      }
    }
    const rep = endWeek(w);
    if (rep.seasonEnd) return { ps: rep.seasonEnd, stats };
  }
}

const kb = (n: number): string => (n / 1024).toFixed(0) + ' KB';

function runSeasons(): void {
  let t0 = performance.now();
  const w = freshWorld();
  console.log(`newWorld+startSeason: ${((performance.now() - t0) / 1000).toFixed(2)} s, ${Object.keys(w.clubs).length} clubes, ${Object.keys(w.players).length} jogadores`);
  for (let season = 0; season < SEASONS; season++) {
    t0 = performance.now();
    const { ps, stats } = playSeason(w);
    const tPlay = (performance.now() - t0) / 1000;
    const u = user(w);
    console.log(`season ${w.season} (${tPlay.toFixed(2)} s): user ${u.id} ${divisionFullName(u.div)} pos ${ps.userPos}, conf ${Math.round(w.board.conf)}, fired ${!!w.fired}`);
    let G = 0, N = 0;
    for (const lg of LEAGUE_IDS) {
      const st = stats[lg];
      G += st.goals; N += st.games;
      const pct = (x: number): string => ((x / st.games) * 100).toFixed(0);
      const champs = LEAGUES[lg].divisions.map((d) => { const t = ps.tables[d]; return `${d} ${t[0].id} ${t[0].p}pts (last ${t[t.length - 1].p})`; }).join(' | ');
      const d1 = LEAGUES[lg].divisions[0];
      const sc = ps.scorers[d1];
      const money = Object.values(w.clubs).filter((c) => c.league === lg).map((c) => c.money);
      console.log(`  ${lg}: gpg ${(st.goals / st.games).toFixed(2)} H/D/A ${pct(st.hw)}/${pct(st.dr)}/${pct(st.aw)}% | ${champs}`);
      console.log(`       top ${d1}: ${sc ? `${sc.name} ${sc.s.goals}` : '-'} | cup ${ps.entry.cups[cupId(lg)]} | money min ${formatMoney(Math.min(...money))} med ${formatMoney(median(money))} max ${formatMoney(Math.max(...money))}`);
    }
    console.log(`  all: gpg ${(G / N).toFixed(2)} (${N} jogos de liga) | Copa dos Campeões: ${ps.entry.cups.cont}`);
    const wasFired = !!w.fired;
    t0 = performance.now();
    newSeason(w);
    if (wasFired) switchClub(w, jobOffers(w)[0]);
    const tNew = (performance.now() - t0) / 1000;
    const sizes = Object.values(w.clubs).filter((c) => c.id !== w.userClub).map((c) => c.squad.length);
    t0 = performance.now();
    const json = JSON.stringify(w);
    const gz = gzipSync(json).length;
    const tJson = (performance.now() - t0) / 1000;
    console.log(`  newSeason ${tNew.toFixed(2)} s | AI squads ${Math.min(...sizes)}-${Math.max(...sizes)}, free ${w.free.length}, players ${Object.keys(w.players).length} | JSON ${kb(json.length)} (gzip ${kb(gz)}, ${tJson.toFixed(2)} s)`);
  }
}

function runChecks(): void {
  const w = freshWorld();
  const u = user(w);
  u.money += 50e6; // garante caixa para todas as operações

  // Mercado: agente livre
  const fa = w.free.map((id) => w.players[id]).sort((a, b) => b.ovr - a.ovr)[0];
  const bid = evaluateBid(w, fa.id, 0);
  assert(bid.status === 'accepted' && bid.wage, `evaluateBid em agente livre deveria aceitar (veio ${bid.status})`);
  completeBuy(w, fa.id, 0, bid.wage);
  assert(fa.clubId === u.id && u.squad.includes(fa.id) && !w.free.includes(fa.id), 'completeBuy move o jogador');
  assert(fa.wage === bid.wage, 'completeBuy usa o salário combinado');
  console.log(`evaluateBid/completeBuy ok: ${fa.name} (${fa.pos}, ${Math.round(fa.ovr)}) por ${formatMoney(fa.wage)}/sem`);

  // Base
  const found = runTrial(w);
  assert(found && found.length >= 1 && w.trialUsed, 'runTrial revela garotos');
  assert(runTrial(w) === null, 'runTrial só uma vez por temporada');
  const y = found[0];
  promoteYouth(w, y.id);
  assert(!y.youth && u.squad.includes(y.id) && !u.youth.includes(y.id), 'promoteYouth sobe o garoto');
  console.log(`runTrial ok: ${found.length} garoto(s); promoteYouth ok: ${y.name}`);

  // Contratos
  const pl = clubPlayers(w, u).filter((p) => p.id !== fa.id && p.id !== y.id);
  renew(w, pl[0].id, 3);
  assert(pl[0].contract === 3 && pl[0].renewAsk === null, 'renew');
  const before = u.money;
  release(w, pl[1].id);
  assert(pl[1].clubId === null && w.free.includes(pl[1].id) && u.money < before, 'release');
  console.log(`renew ok: ${pl[0].name}; release ok: ${pl[1].name}`);

  // Estrutura
  const lvl = u.academy, cost = UPGRADES.academy.cost(u);
  const up = upgrade(w, 'academy');
  assert(up === (lvl < 5) && u.academy === Math.min(5, lvl + (up ? 1 : 0)), 'upgrade academy');
  console.log(`upgrade('academy') ${up ? `ok: nível ${lvl} -> ${u.academy} por ${formatMoney(cost)}` : 'recusado (nível máximo)'}`);
  assert((w.finSeason.other || 0) < 0, 'finSeason registra despesas');

  // Partida ao vivo interativa
  endWeek(w); // pré-temporada -> semana 1
  const m = userMatch(w);
  assert(m, 'jogo do usuário na semana 1');
  const sim = new Sim(w, m.h, m.a, { knockout: !isDivision(m.comp), neutral: !!m.neutral, interactive: true });
  const s = sim.userSide();
  assert(s >= 0 && !sim.sides[s].auto, 'lado do usuário é manual');
  let subbed = false, evs = 0;
  while (!sim.finished) {
    evs += sim.step().length;
    if (sim.pendingInjury) sim.pendingInjury = null;
    if (sim.minute === 30) { sim.setFormation('4-3-3'); sim.setTactic('att'); }
    if (sim.minute === 60 && !subbed) {
      const side = sim.sides[s];
      const out = sim.outfield(side)[0];
      const inPid = side.bench.find((id) => w.players[id].pos !== 'GOL') ?? side.bench[0];
      subbed = sim.sub(out.pid, inPid);
      assert(subbed, 'sub() no minuto 60');
      assert(side.on.some((o) => o.pid === inPid), 'reserva entrou');
    }
    if (sim.phase === 'half') assert(sim.minute === 45, 'intervalo no minuto 45');
  }
  assert(sim.sides[s].formation === '4-3-3' && sim.sides[s].tactic === 'att', 'setFormation/setTactic');
  const slots = sim.sides[s].on.map((o) => o.slot);
  assert(new Set(slots).size === slots.length, 'slots únicos após setFormation');
  // sub() fora de step() registra o evento em events (a UI lê events.slice(-1)), não no retorno de step().
  assert(sim.events.length === evs + 1, 'step() devolve todos os eventos novos');
  const res = sim.result();
  applyResult(w, m, res);
  simulateWeek(w);
  endWeek(w);
  assert(m.played && m.hs === res.hs && m.as === res.as, 'applyResult grava o placar');
  console.log(`live Sim ok: ${w.clubs[m.h].name} ${res.hs} x ${res.as} ${w.clubs[m.a].name}, ${sim.events.length} eventos, subs do usuário ${sim.sides[s].subs}`);

  runV2Checks(w);
  runLeagueChecks(w);

  const json = JSON.stringify(w);
  assert(JSON.stringify(JSON.parse(json)) === json, 'World é serializável em JSON');
  console.log(`checks ok (JSON ${(json.length / 1024).toFixed(0)} KB)`);
}

const adhoc = (w: World, h: string, a: string): Match => ({ id: 'chk' + h + a, h, a, comp: w.clubs[h].div, hs: null, as: null, pens: null, played: false, goals: [] });

function runV2Checks(w: World): void {
  const u = user(w);
  assert(w.version === WORLD_VERSION && WORLD_VERSION === 3, 'World v3');

  // Características e Craque
  const all = Object.values(w.players);
  assert(all.every((p) => p.traits.length >= 1 && p.traits.length <= 2 && p.traits.every((t) => t in TRAITS)), '1-2 características válidas');
  const stars = all.filter((p) => p.star).length / all.length;
  assert(stars > 0.005 && stars < 0.08, `~3% de Craques (veio ${(stars * 100).toFixed(1)}%)`);
  console.log(`traits ok: ${all.length} jogadores, ${(stars * 100).toFixed(1)}% Craques`);

  // Capitão e batedor
  for (const c of Object.values(w.clubs)) assert(c.captain && c.penTaker && c.squad.includes(c.captain), `capitão/batedor do ${c.id}`);
  const cands = clubPlayers(w, u).filter((p) => !p.inj && !p.susp && p.id !== u.captain && p.pos !== 'GOL');
  const cap = cands[0], pen = cands[1];
  assert(setCaptain(w, cap.id) && setPenTaker(w, pen.id), 'setCaptain/setPenTaker');
  assert(!setCaptain(w, 'p-nao-existe'), 'setCaptain recusa quem não é do elenco');
  ensureLineup(w, u);
  assert(u.captain === cap.id && u.penTaker === pen.id, 'ensureLineup mantém escolhas disponíveis');
  cap.inj = 2; cap.injType = 'Estiramento';
  ensureLineup(w, u);
  assert(u.captain && u.captain !== cap.id && u.penTaker === pen.id, 'ensureLineup repara capitão indisponível');
  cap.inj = 0; cap.injType = null;
  console.log(`captain/penTaker ok: capitão ${w.players[u.captain].name}, batedor ${pen.name}`);

  // Ingresso e previsão de bilheteria
  const rival = Object.values(w.clubs).find((c) => c.id !== u.id && c.id !== u.rival && c.rival !== u.id) as (typeof u);
  const hm = adhoc(w, u.id, rival.id);
  setTicketPrice(w, 'popular'); const gp = expectedGate(w, hm);
  setTicketPrice(w, 'premium'); const gr = expectedGate(w, hm);
  setTicketPrice(w, 'normal'); const gn = expectedGate(w, hm);
  assert(u.ticketPrice === 'normal' && !gn.derby, 'setTicketPrice');
  assert(gp.attendance >= gn.attendance && gn.attendance >= gr.attendance, 'ingresso popular enche mais');
  assert(gr.income !== gp.income, 'preço muda a renda');
  console.log(`expectedGate ok: popular ${gp.attendance}/${formatMoney(gp.income)}, normal ${gn.attendance}/${formatMoney(gn.income)}, premium ${gr.attendance}/${formatMoney(gr.income)}`);

  // Empréstimo
  const m0 = u.money, l0 = w.finSeason.loan || 0;
  assert(!takeLoan(w, 123), 'takeLoan recusa valor fora de LOAN_OPTIONS');
  assert(takeLoan(w, LOAN_OPTIONS[1]) && u.money === m0 + LOAN_OPTIONS[1], 'takeLoan credita');
  assert(!takeLoan(w, LOAN_OPTIONS[0]), 'takeLoan falha com empréstimo ativo');
  const loan = u.loan;
  assert(loan && loan.weeksLeft === 30 && Math.abs(loan.weekly * 30 - LOAN_OPTIONS[1] * 1.12) < 30, '12% em 30 parcelas');
  const weekly = loan.weekly;
  simulateWeek(w); endWeek(w);
  assert(u.loan && u.loan.weeksLeft === 29, 'parcela descontada no endWeek');
  const due = loanBalance(u);
  assert(repayLoan(w) && u.loan === null && !repayLoan(w), 'repayLoan quita');
  assert(Math.round((w.finSeason.loan || 0) - l0) === Math.round(LOAN_OPTIONS[1] - weekly - due), 'finanças: categoria loan');
  console.log(`loan ok: parcela ${formatMoney(weekly)}, quitado ${formatMoney(due)}`);

  // Clássico
  const dc = Object.values(w.clubs).find((c) => c.id !== u.id && w.clubs[c.rival] && w.clubs[c.rival].id !== u.id) as (typeof u);
  const dm = adhoc(w, dc.id, dc.rival);
  assert(isDerby(w, dm) && isDerby(w, { h: dc.rival, a: dc.id }), 'isDerby nas duas direções');
  const g = expectedGate(w, dm);
  assert(g.derby && g.attendance === w.clubs[dc.id].cap, 'clássico lota o estádio');
  const f0 = [w.clubs[dm.h].fans, w.clubs[dm.a].fans];
  const ds = simMatch(w, dm);
  assert(ds.derby && ds.events.some((e) => e.min === 0 && /cl[aá]ssico|rivalidade/i.test(e.text)), 'narração de clássico');
  assert(dm.attendance === w.clubs[dc.id].cap, 'público do clássico');
  const win = ds.winner();
  const expF = (s: number): number => Math.max(0, Math.min(100, f0[s] + (win === s ? 8 : win === 1 - s ? -8 : 0)));
  assert(Math.abs(w.clubs[dm.h].fans - expF(0)) < 1e-9 && Math.abs(w.clubs[dm.a].fans - expF(1)) < 1e-9, 'torcida ±8 no clássico');
  console.log(`derby ok: ${w.clubs[dm.h].name} ${dm.hs} x ${dm.as} ${w.clubs[dm.a].name}, público ${dm.attendance}`);

  // Departamento médico
  assert(injuryLabel(1) === 'Pancada' && injuryLabel(3) === 'Estiramento' && injuryLabel(5) === 'Distensão' && injuryLabel(8) === 'Fratura', 'injuryLabel');
  assert(injuryWeeks(8, 1) === 8 && injuryWeeks(8, 5) < 8, 'CT reduz o tempo de lesão');
  const im = adhoc(w, u.id, rival.id);
  const isim = new Sim(w, im.h, im.a).runToEnd();
  const res = isim.result();
  const victim = w.players[res.played[0][1]];
  res.injuries = res.injuries.filter((i) => i.pid !== victim.id).concat([{ pid: victim.id, weeks: 5, type: 'Distensão' }]);
  applyResult(w, im, res);
  assert(victim.injType === 'Distensão' && victim.inj === injuryWeeks(5, u.training), 'lesão com tipo e redução');
  const msg = w.inbox.find((x) => x.kind === 'medical' && x.body.startsWith(victim.name));
  assert(msg && msg.body.includes('sofreu uma distensão e fica fora por'), 'mensagem do DM com o tipo');
  console.log(`injury ok: "${msg.body}"`);

  // migrateWorld: v3 com campos ausentes é completado; idempotente.
  const old = JSON.parse(JSON.stringify(w)) as Record<string, unknown> & World;
  for (const c of Object.values(old.clubs) as unknown as Record<string, unknown>[]) {
    for (const k of ['fans', 'ticketPrice', 'captain', 'penTaker', 'loan', 'nickname', 'mascot', 'stadium', 'rival']) delete c[k];
  }
  for (const p of Object.values(old.players) as unknown as Record<string, unknown>[]) {
    for (const k of ['traits', 'star', 'injType', 'nat']) delete p[k];
  }
  delete (old as Record<string, unknown>).finWeek;
  const mig = migrateWorld(old);
  assert(mig.version === 3, 'migrateWorld -> v3');
  assert(Object.values(mig.clubs).every((c) => c.fans === 60 && c.ticketPrice === 'normal' && c.loan === null && !!c.captain && !!c.penTaker && typeof c.rival === 'string'), 'clubes migrados');
  assert(Object.values(mig.players).every((p) => Array.isArray(p.traits) && typeof p.star === 'boolean' && !!p.nat && (p.inj > 0 ? !!p.injType : p.injType === null)), 'jogadores migrados');
  const once = JSON.stringify(mig);
  assert(JSON.stringify(migrateWorld(mig)) === once, 'migrateWorld é idempotente');
  const cur = JSON.stringify(w);
  assert(JSON.stringify(migrateWorld(w)) === cur, 'migrateWorld não altera um World v3 completo');
  simulateWeek(mig); endWeek(mig);
  // Save v2 (sem ligas) é incompatível.
  const v2 = JSON.parse(cur) as Record<string, unknown> & World;
  v2.version = 2;
  for (const c of Object.values(v2.clubs) as unknown as Record<string, unknown>[]) delete c.league;
  assert(!isCompatible(v2) && isCompatible(w), 'isCompatible');
  let threw = false;
  try { migrateWorld(v2); } catch (e) { threw = e instanceof IncompatibleSaveError; }
  assert(threw, 'migrateWorld lança IncompatibleSaveError para v2');
  console.log('migrateWorld ok (v3 completado, idempotente; v2 -> IncompatibleSaveError)');
}

/** Temporada completa com todas as ligas: acesso/rebaixamento, copas, Copa dos Campeões, histórico, mercado. */
function runLeagueChecks(w: World): void {
  // Estrutura
  for (const div of DIVISION_IDS) assert(Object.values(w.clubs).filter((c) => c.div === div).length === DIVISION_SIZE, `${div} com 16 clubes`);
  assert(CLUBS.length === 208 && new Set(CLUBS.map((c) => c.id)).size === 208, '208 clubes com ids únicos');
  for (const c of CLUBS) assert(w.clubs[c.rival] && w.clubs[c.rival].league === c.league && c.rival !== c.id, `rival de ${c.id} na mesma liga`);
  const comps = userCompetitions(w);
  assert(comps[0] === user(w).div, 'userCompetitions começa pela divisão');
  const cont0 = contEntrants(w);
  assert(cont0.length === 16 && new Set(cont0).size === 16 && cont0.every((id) => DIVISIONS[w.clubs[id].div].level === 1), 'Copa dos Campeões: 16 clubes de primeiras divisões');
  const nat0: Record<string, string> = {};
  for (const p of Object.values(w.players)) if (p.clubId) nat0[p.id] = w.clubs[p.clubId].league;
  // Nacionalidades: ~85% domésticos nos elencos
  let dom = 0, tot = 0;
  for (const c of Object.values(w.clubs)) for (const id of c.squad) { tot++; if (w.players[id].nat === c.league) dom++; }
  assert(dom / tot > 0.78 && dom / tot < 0.92, `~85% domésticos (veio ${((dom / tot) * 100).toFixed(1)}%)`);

  const t0 = performance.now();
  const { ps } = playSeason(w);
  console.log(`temporada completa: ${((performance.now() - t0) / 1000).toFixed(2)} s, ${((dom / tot) * 100).toFixed(1)}% domésticos`);

  // Copas
  for (const lg of LEAGUE_IDS) assert(ps.entry.cups[cupId(lg)] && w.clubs[ps.entry.cups[cupId(lg)] as string].league === lg, `campeão da ${competitionName(cupId(lg))}`);
  assert(ps.entry.cups.cont && cont0.includes(ps.entry.cups.cont), 'campeão da Copa dos Campeões');
  // Acesso e rebaixamento
  for (const lg of LEAGUE_IDS) {
    const divs = LEAGUES[lg].divisions;
    const mv = ps.moves.filter((m) => DIVISIONS[m.from].league === lg);
    assert(mv.length === (divs.length - 1) * 6, `${lg}: ${mv.length} trocas de divisão`);
    for (const m of mv) assert(Math.abs(DIVISIONS[m.from].level - DIVISIONS[m.to].level) === 1 && DIVISIONS[m.to].league === lg, 'troca entre divisões vizinhas');
  }
  // Classificação continental
  assert(ps.contNext.length === 16 && new Set(ps.contNext).size === 16, '16 classificados distintos');
  for (const id of ps.contNext) {
    const d = w.clubs[id].div;
    assert(DIVISIONS[d].level === 1 && ps.tables[d].findIndex((r) => r.id === id) < 3, `${id} entre os 3 primeiros de uma primeira divisão`);
  }
  // Histórico
  const h = w.history[w.history.length - 1];
  assert(Object.keys(h).sort().join() === 'best,champions,cups,scorers,season,user', 'chaves do HistoryEntry');
  assert(DIVISION_IDS.every((d) => typeof h.champions[d] === 'string'), 'champions de todas as divisões');
  assert(Object.keys(h.cups).length === 7 && Object.values(h.cups).every((x) => typeof x === 'string'), 'cups: 6 nacionais + cont');
  assert(Object.keys(h.scorers).sort().join() === firstDivisions().slice().sort().join(), 'scorers das primeiras divisões');
  assert(Object.keys(h.user).sort().join() === 'club,div,league,objective,pos,success', 'chaves de user');
  assert(!h.best || (typeof h.best.name === 'string' && typeof h.best.club === 'string' && typeof h.best.avg === 'number'), 'best');
  // Transferências entre ligas
  let cross = 0;
  for (const p of Object.values(w.players)) if (p.clubId && nat0[p.id] && w.clubs[p.clubId].league !== nat0[p.id]) cross++;
  assert(cross > 0, 'houve transferência entre ligas');

  const divBefore: Record<string, DivisionId> = {};
  for (const c of Object.values(w.clubs)) divBefore[c.id] = c.div;
  newSeason(w);
  for (const div of DIVISION_IDS) assert(Object.values(w.clubs).filter((c) => c.div === div).length === DIVISION_SIZE, `${div} com 16 clubes após newSeason`);
  const moved = Object.values(w.clubs).filter((c) => c.div !== divBefore[c.id]).length;
  assert(moved === ps.moves.length, 'newSeason aplica as trocas');
  assert(contEntrants(w).slice().sort().join() === ps.contNext.slice().sort().join(), 'Copa dos Campeões usa os classificados');
  console.log(`league checks ok: ${ps.moves.length} trocas de divisão, ${cross} jogadores em outra liga, Copa dos Campeões ${competitionName('cont')}: ${w.clubs[ps.entry.cups.cont as string].name}`);

  // Troca para um clube estrangeiro
  const u = user(w);
  const foreign = Object.values(w.clubs).find((c) => c.league !== u.league && DIVISIONS[c.div].level === 1);
  assert(foreign, 'clube estrangeiro');
  switchClub(w, foreign.id);
  assert(w.userClub === foreign.id && user(w).league !== u.league && w.board.label && !w.fired, 'switchClub para outra liga');
  endWeek(w); simulateWeek(w); endWeek(w);
  assert(table(w, foreign.div).some((r) => r.id === foreign.id && r.j === 1), 'joga pela nova liga');
  const offers = jobOffers(w);
  assert(offers.length === 3 && new Set(offers).size === 3, 'jobOffers');
  console.log(`switchClub ok: ${foreign.name} (${divisionFullName(foreign.div)}), objetivo "${w.board.label}"; ofertas de ${[...new Set(offers.map((id) => w.clubs[id].league))].join('/')}`);
}

if (args.includes('--checks')) runChecks();
else runSeasons();

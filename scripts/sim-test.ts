// Teste de balanceamento headless do motor do Manager.
//   npx tsx scripts/sim-test.ts [clubId] [--seasons N] [--checks]
// Sem --checks: simula N temporadas (padrão 3) com todos os clubes no automático.
// Com --checks: exercita uma vez a API de mercado/base, uma partida ao vivo interativa
// e as novidades da v2 (capitão/batedor, ingresso, empréstimo, clássico, DM, migrateWorld).
import {
  CLUBS, LOAN_OPTIONS, Sim, TRAITS, UPGRADES, WORLD_VERSION, autoLineup, applyResult, clubPlayers, completeBuy,
  currentWeek, endWeek, ensureLineup, evaluateBid, expectedGate, formatMoney, injuryLabel, injuryWeeks, isDerby,
  jobOffers, loanBalance, migrateWorld, newSeason, newWorld, promoteYouth, release, renew, repayLoan, runTrial,
  setCaptain, setPenTaker, setTicketPrice, simMatch, simulateWeek, startSeason, switchClub, takeLoan, topScorers,
  upgrade, user, userMatch,
} from '../src/game';
import type { Match, World } from '../src/game';

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

function runSeasons(): void {
  const w = freshWorld();
  for (let season = 0; season < SEASONS; season++) {
    let goals = 0, games = 0, hw = 0, dr = 0, aw = 0;
    for (;;) {
      const wk = currentWeek(w);
      simulateWeek(w);
      if (wk) {
        for (const m of wk.matches) {
          if (m.comp === 'CUP') continue;
          const hs = m.hs as number, as = m.as as number;
          games++; goals += hs + as;
          if (hs > as) hw++; else if (hs < as) aw++; else dr++;
        }
      }
      const rep = endWeek(w);
      if (!rep.seasonEnd) continue;
      const ps = rep.seasonEnd;
      const tA = ps.tA;
      const sc = topScorers(w, 'A', 1)[0];
      const pct = (x: number): string => ((x / games) * 100).toFixed(0);
      console.log(`season ${w.season}: gpg ${(goals / games).toFixed(2)} H/D/A ${pct(hw)}/${pct(dr)}/${pct(aw)}% | champA ${tA[0].id} ${tA[0].p}pts, last ${tA[tA.length - 1].p}pts | top scorer ${sc ? sc.s.goals : 0} | userPos ${ps.userPos} (${user(w).id}, Série ${user(w).div}) conf ${Math.round(w.board.conf)} fired ${!!w.fired}`);
      const money = Object.values(w.clubs).map((c) => c.money);
      console.log(`  money min ${formatMoney(Math.min(...money))} median ${formatMoney(median(money))} max ${formatMoney(Math.max(...money))}`);
      const wasFired = !!w.fired;
      newSeason(w);
      if (wasFired) switchClub(w, jobOffers(w)[0]);
      const sizes = Object.values(w.clubs).filter((c) => c.id !== w.userClub).map((c) => c.squad.length);
      const json = JSON.stringify(w);
      console.log(`  AI squads ${Math.min(...sizes)}-${Math.max(...sizes)}, free ${w.free.length}, players ${Object.keys(w.players).length}, JSON ${(json.length / 1024).toFixed(0)} KB`);
      break;
    }
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
  const sim = new Sim(w, m.h, m.a, { knockout: m.comp === 'CUP', neutral: !!m.neutral, interactive: true });
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

  const json = JSON.stringify(w);
  assert(JSON.stringify(JSON.parse(json)) === json, 'World é serializável em JSON');
  console.log(`checks ok (JSON ${(json.length / 1024).toFixed(0)} KB)`);
}

const adhoc = (h: string, a: string): Match => ({ id: 'chk' + h + a, h, a, comp: 'A', hs: null, as: null, pens: null, played: false, goals: [] });

function runV2Checks(w: World): void {
  const u = user(w);
  assert(w.version === WORLD_VERSION && WORLD_VERSION === 2, 'World v2');

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
  const hm = adhoc(u.id, rival.id);
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
  const dm = adhoc(dc.id, dc.rival);
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
  const im = adhoc(u.id, rival.id);
  const isim = new Sim(w, im.h, im.a).runToEnd();
  const res = isim.result();
  const victim = w.players[res.played[0][1]];
  res.injuries = res.injuries.filter((i) => i.pid !== victim.id).concat([{ pid: victim.id, weeks: 5, type: 'Distensão' }]);
  applyResult(w, im, res);
  assert(victim.injType === 'Distensão' && victim.inj === injuryWeeks(5, u.training), 'lesão com tipo e redução');
  const msg = w.inbox.find((x) => x.kind === 'medical' && x.body.startsWith(victim.name));
  assert(msg && msg.body.includes('sofreu uma distensão e fica fora por'), 'mensagem do DM com o tipo');
  console.log(`injury ok: "${msg.body}"`);

  // migrateWorld em um World com formato v1
  const old = JSON.parse(JSON.stringify(w)) as Record<string, unknown> & World;
  old.version = 1;
  for (const c of Object.values(old.clubs) as unknown as Record<string, unknown>[]) {
    for (const k of ['fans', 'ticketPrice', 'captain', 'penTaker', 'loan', 'nickname', 'mascot', 'stadium', 'rival']) delete c[k];
  }
  for (const p of Object.values(old.players) as unknown as Record<string, unknown>[]) {
    for (const k of ['traits', 'star', 'injType']) delete p[k];
  }
  delete (old as Record<string, unknown>).finWeek;
  const mig = migrateWorld(old);
  assert(mig.version === 2, 'migrateWorld -> v2');
  assert(Object.values(mig.clubs).every((c) => c.fans === 60 && c.ticketPrice === 'normal' && c.loan === null && !!c.captain && !!c.penTaker && typeof c.rival === 'string'), 'clubes migrados');
  assert(Object.values(mig.players).every((p) => Array.isArray(p.traits) && typeof p.star === 'boolean' && (p.inj > 0 ? !!p.injType : p.injType === null)), 'jogadores migrados');
  const once = JSON.stringify(mig);
  assert(JSON.stringify(migrateWorld(mig)) === once, 'migrateWorld é idempotente');
  const cur = JSON.stringify(w);
  assert(JSON.stringify(migrateWorld(w)) === cur, 'migrateWorld não altera um World v2');
  simulateWeek(mig); endWeek(mig);
  console.log('migrateWorld ok (v1 -> v2, idempotente, joga uma semana)');
}

if (args.includes('--checks')) runChecks();
else runSeasons();

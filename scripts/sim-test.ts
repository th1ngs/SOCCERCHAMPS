// Teste de balanceamento headless do motor do Manager (6 ligas, World v6).
//   npx tsx scripts/sim-test.ts [clubId] [--seasons N] [--checks]
// Sem --checks: simula N temporadas (padrão 3) com todos os clubes no automático e imprime
// campeões, gols por jogo e artilheiros por liga, tempo por temporada e tamanho do JSON.
// Com --checks: exercita a API de mercado/base, uma partida ao vivo interativa, as novidades da v2
// (capitão/batedor, ingresso, empréstimo, clássico, DM), as da v3 (ligas, copas, acesso, histórico)
// as da v4 (olheiros, base, empréstimos de jogadores, negociação, histórico de transferências)
// as da v5 (atributos, habilidades, batedor de faltas, finanças por clube e teto salarial)
// e as da v6 (instruções táticas, conversas, histórico, recordes, conquistas e Copa das Nações).
import { gzipSync } from 'node:zlib';
import { seasonAwards } from '../src/game/awards';
import * as G from '../src/game';
import {
  CLUBS, DIVISIONS, DIVISION_IDS, DIVISION_SIZE, IncompatibleSaveError, LEAGUES, LEAGUE_IDS, LOAN_OPTIONS, Sim, TRAITS,
  UPGRADES, WORLD_VERSION, autoLineup, applyResult, clubPlayers, completeBuy, competitionName, contEntrants,
  currentWeek, cupId, divisionFullName, endWeek, ensureLineup, evaluateBid, expectedGate, firstDivisions, formatMoney,
  injuryLabel, injuryWeeks, isCompatible, marketPlayers, isDerby, isDivision, jobOffers, loanBalance, migrateWorld, newSeason,
  newWorld, promoteYouth, release, renew, repayLoan, runTrial, setCaptain, setPenTaker, setTicketPrice, simMatch,
  simulateWeek, startSeason, switchClub, table, takeLoan, upgrade, user, userCompetitions, userMatch,
} from '../src/game';
import type { DivisionId, LeagueId, Match, SeasonSummary, TableRow, World } from '../src/game';

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

function checkAwardWeights(): void {
  const w = freshWorld();
  const topClub = Object.values(w.clubs).find((c) => c.div === 'eng1')!;
  const lowClub = Object.values(w.clubs).find((c) => c.div === 'bra3')!;
  const top = w.players[topClub.squad.find((id) => w.players[id].pos === 'ATA')!];
  const low = w.players[lowClub.squad.find((id) => w.players[id].pos === 'ATA')!];
  top.s = { apps: 30, goals: 20, assists: 8, rsum: 225 };
  low.s = { apps: 30, goals: 30, assists: 8, rsum: 225 };
  const tables = Object.fromEntries(DIVISION_IDS.map((div) => [div, table(w, div)])) as Record<DivisionId, TableRow[]>;
  let awards = seasonAwards(w, tables);
  assert(awards.player?.id === top.id, 'Bola de Ouro considera a dificuldade da liga');
  assert(awards.goldenBoot?.id === top.id, 'Chuteira de Ouro pondera gols pela competição');
  low.s.goals = 65;
  awards = seasonAwards(w, tables);
  assert(awards.goldenBoot?.id === low.id, 'produção excepcional na divisão inferior ainda pode vencer');
}

function runSeasons(): void {
  checkAwardWeights();
  let t0 = performance.now();
  const w = freshWorld();
  console.log(`newWorld+startSeason: ${((performance.now() - t0) / 1000).toFixed(2)} s, ${Object.keys(w.clubs).length} clubes, ${Object.keys(w.players).length} jogadores`);
  for (let season = 0; season < SEASONS; season++) {
    t0 = performance.now();
    const { ps, stats } = playSeason(w);
    const awards = ps.entry.awards;
    assert(awards?.player && awards.player.apps >= 8, 'melhor jogador com jogos registrados');
    assert(awards.young && awards.young.age <= 21, 'melhor jovem sub-21');
    assert(awards.goalkeeper?.pos === 'GOL', 'melhor goleiro');
    assert(awards.goldenBoot && awards.goldenBoot.goals > 0, 'chuteira de ouro');
    assert(awards.goldenBootPoints && awards.goldenBootPoints > 0, 'chuteira de ouro ponderada por competição');
    assert(awards.club && awards.manager && awards.team.length === 11, 'clube, manager e seleção do ano');
    assert(new Set(awards.team.map((p) => p.id)).size === 11, 'seleção sem jogadores repetidos');
    const tPlay = (performance.now() - t0) / 1000;
    const u = user(w);
    console.log(`season ${w.season} (${tPlay.toFixed(2)} s): user ${u.id} ${divisionFullName(u.div)} pos ${ps.userPos}, conf ${Math.round(w.board.conf)}, fired ${!!w.fired}`);
    console.log(`  prêmios: Bola de Ouro ${awards.player.name} (${w.clubs[awards.player.club]?.div}), Chuteira de Ouro ${awards.goldenBoot.name} ${awards.goldenBoot.goals} gols / ${awards.goldenBootPoints} pontos`);
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
  runV4Checks();

  const json = JSON.stringify(w);
  assert(JSON.stringify(JSON.parse(json)) === json, 'World é serializável em JSON');
  console.log(`checks ok (JSON ${(json.length / 1024).toFixed(0)} KB)`);
}

const adhoc = (w: World, h: string, a: string): Match => ({ id: 'chk' + h + a, h, a, comp: w.clubs[h].div, hs: null, as: null, pens: null, played: false, goals: [] });

function runV2Checks(w: World): void {
  const u = user(w);
  assert(w.version === WORLD_VERSION && WORLD_VERSION === 6, 'World v6');

  // Características e Craque
  const all = Object.values(w.players);
  assert(all.every((p) => p.traits.length <= 3 && p.traits.every((t) => t in TRAITS)), '0-3 habilidades válidas');
  assert(all.every((p) => Array.isArray(p.at) && p.at.length === G.ATTR_KEYS.length), 'atributos gerados');
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

  // Empréstimo (o clube pode começar endividado: quita a dívida antiga antes do teste)
  Object.assign(u, { loan: null });
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
  assert(mig.version === 6, 'migrateWorld -> v6');
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
  // Mercado com filtros por liga e nacionalidade
  const mk = marketPlayers(w, { league: 'ita', nat: 'arg', limit: 10 });
  assert(mk.every((p) => p.nat === 'arg' && !!p.clubId && w.clubs[p.clubId].league === 'ita'), 'marketPlayers filtra liga e nacionalidade');
  assert(marketPlayers(w, { league: 'free' }).every((p) => !p.clubId), 'marketPlayers: agentes livres');
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
  console.log(`league checks ok: ${ps.moves.length} trocas de divisão, ${cross} jogadores em outra liga, ${competitionName('cont')}: ${w.clubs[ps.entry.cups.cont as string].name}`);

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


/** Avança uma semana (joga a rodada e fecha a semana). */
function advance(w: World): void {
  simulateWeek(w);
  const r = endWeek(w);
  if (r.seasonEnd) newSeason(w);
}
const advanceTo = (w: World, week: number): void => { while (w.week < week) advance(w); };
const lastMsg = (w: World, pred: (m: G.Message) => boolean): G.Message | undefined => w.inbox.find(pred);

/** Base, olheiros e transferências (World v4). */
function runV4Checks(): void {
  const w = freshWorld();
  const u = user(w);
  u.money += 400e6;
  const t0 = performance.now();
  const others = Object.values(w.players).filter((p) => p.clubId && p.clubId !== u.id && !p.youth && w.clubs[p.clubId].rep <= u.rep);

  // ---- potentialRange: contém o real, estável, larguras exatas ----
  for (const p of Object.values(w.players)) {
    const r = G.potentialRange(w, p), r2 = G.potentialRange(w, p);
    assert(r.min <= Math.round(p.pot) && Math.round(p.pot) <= r.max, `faixa contém o potencial real (${p.id})`);
    assert(r.min === r2.min && r.max === r2.max && r.exact === r2.exact, 'faixa estável entre leituras');
  }
  const o1 = others[0];
  assert(G.potentialRange(w, o1).max - G.potentialRange(w, o1).min === 22 && !G.potentialRange(w, o1).exact, 'outro clube, nível 0: largura 22');
  assert(Array.isArray(G.knownTraits(w, o1)) && G.knownAttrs(w, o1) === null, 'habilidades públicas; atributos desconhecidos de outro clube');
  G.observe(w, o1.id);
  assert(G.potentialRange(w, o1).max - G.potentialRange(w, o1).min === 12 && w.scouting[o1.id].level === 1, 'observado: largura 12');
  const mine = clubPlayers(w, u)[0];
  assert(G.potentialRange(w, mine).exact && Array.isArray(G.knownTraits(w, mine)), 'elenco do usuário: exato e características conhecidas');
  const y0 = w.players[u.youth[0]];
  const yw = Math.max(4, 24 - 3 * u.academy - 2 * u.scouting);
  assert(G.potentialRange(w, y0).max - G.potentialRange(w, y0).min === yw, `base: largura ${yw}`);
  console.log(`potentialRange ok: ${Object.keys(w.players).length} jogadores, base com largura ${yw}`);

  // ---- relatório do olheiro ----
  const target = others[1];
  const req = G.requestScoutReport(w, target.id);
  assert(req.ok && req.readyWeek != null && req.readyWeek > w.week && req.readyWeek <= w.week + 2, 'requestScoutReport ok');
  assert(!G.requestScoutReport(w, target.id).ok, 'relatório duplicado recusado');
  const fillers = others.slice(2, 2 + G.scoutSlots(w));
  const results = fillers.map((p) => G.requestScoutReport(w, p.id));
  assert(results.some((r) => !r.ok && /ocupados/.test(r.reason ?? '')), 'limite de olheiros (scoutSlots)');
  assert(!G.potentialRange(w, target).exact, 'ainda não exato antes do relatório');
  const readyWeek = req.readyWeek as number;

  // ---- foco da base, peneira regional/posição, joia ----
  G.setAcademyFocus(w, 'goalkeepers');
  const gen: G.Player[] = [];
  for (let k = 0; k < 400; k++) gen.push(G.makeYouth(w, u, 16));
  const gk = gen.filter((p) => p.pos === 'GOL').length / gen.length;
  for (const p of gen) G.removePlayer(w, p);
  assert(gk > 0.12, `foco em goleiros aumenta a safra de goleiros (${(gk * 100).toFixed(0)}%)`);
  G.setAcademyFocus(w, 'balanced');
  const reg = LEAGUE_IDS.find((l) => l !== u.league) as LeagueId;
  const baseCost = G.trialCost(w), foreignCost = G.trialCost(w, { region: reg });
  assert(Math.abs(foreignCost / baseCost - 1.8) < 0.01 && G.trialCost(u) === baseCost, 'trialCost ×1,8 no exterior (e aceita o clube)');
  w.trialUsed = false;
  const found = runTrial(w, { region: reg, pos: 'ATA' });
  assert(found && found.length >= 1 && found.every((p) => p.nat === reg && p.pos === 'ATA' && p.youth && p.start.season === w.season), 'peneira regional por posição');
  assert(runTrial(w) === null, 'uma peneira por temporada');
  assert(G.isGem({ ...found[0], pot: 85, age: 16 }) && !G.isGem({ ...found[0], pot: 79, age: 16 }), 'isGem');
  console.log(`academy ok: foco goleiros ${(gk * 100).toFixed(0)}% GOL; peneira ${reg}/ATA ${found.length} garoto(s) por ${formatMoney(foreignCost)}`);

  // ---- oferta da CPU por garoto da base ----
  const gem = found[0];
  gem.pot = 88;
  let yo: G.Message | undefined;
  for (let k = 0; k < 400 && !yo; k++) {
    G.aiOffersToUser(w);
    yo = w.inbox.find((m) => m.offer && m.offer.youth && m.offer.pid === gem.id && !m.offer.done);
  }
  assert(yo && yo.kind === 'offer', 'oferta da CPU por garoto da base');
  const yBuyer = (yo.offer as G.Offer).club;
  assert(G.acceptOffer(w, yo) && gem.clubId === yBuyer && w.clubs[yBuyer].youth.includes(gem.id) && !u.youth.includes(gem.id), 'aceitar faz o garoto sair');
  console.log(`youth offer ok: ${gem.name} vendido ao ${w.clubs[yBuyer].name}`);

  // O teto salarial da diretoria é testado nas checagens v5; aqui as contratações em série não podem ser vetadas.
  u.wageCap = 1e9;
  // ---- empréstimos ----
  const sq = clubPlayers(w, u).sort((a, b) => b.ovr - a.ovr);
  // Jogadores do fim do elenco que clubes menores aceitam receber.
  const loanable = sq.slice(8).filter((p) => G.loanOutOffers(w, p.id).length > 0);
  assert(loanable.length >= 2, 'há jogadores emprestáveis');
  const lo = loanable[0];
  const offers = G.loanOutOffers(w, lo.id);
  assert(offers.length >= 1 && offers.length <= 3 && offers.every((o) => { const c = w.clubs[o.club]; return c.rep < u.rep + 3 || (c.league === u.league && G.divisionLevel(c.div) > G.divisionLevel(u.div)); }), 'loanOutOffers');
  assert(JSON.stringify(G.loanOutOffers(w, lo.id)) === JSON.stringify(offers), 'loanOutOffers estável');
  assert(G.loanOut(w, lo.id, offers[0].club), 'loanOut');
  assert(lo.clubId === offers[0].club && lo.loan?.from === u.id && G.loanedOut(w).some((p) => p.id === lo.id) && !u.squad.includes(lo.id), 'emprestado sai do elenco');
  assert(G.recallLoan(w, lo.id) && lo.clubId === u.id && u.squad.includes(lo.id) && !lo.loan, 'recallLoan');
  const lo2 = loanable.slice(1).find((p) => p.contract >= 2 && p.age < 33) ?? loanable[1];
  assert(G.loanOut(w, lo2.id, G.loanOutOffers(w, lo2.id)[0].club), 'loanOut até o fim da temporada');
  const lyouth = w.players[u.youth.find((id) => w.players[id].age >= 17) ?? u.youth[0]];
  if (lyouth.age < 17) lyouth.age = 17;
  const yOffers = G.loanOutOffers(w, lyouth.id);
  const yLoaned = yOffers.length > 0 && G.loanOut(w, lyouth.id, yOffers[0].club);
  const cands = others.filter((p) => p.id !== target.id && p.id !== o1.id && !fillers.some((f) => f.id === p.id)).filter((p) => {
    const c = w.clubs[p.clubId as string];
    return c.squad.filter((id) => w.players[id].ovr > p.ovr).length >= 13;
  });
  const li = cands[0], li2 = cands[1];
  const terms = G.loanInTerms(w, li.id);
  assert(terms.ok && terms.buyOption > 0, 'loanInTerms ok para quem não está entre os 13 melhores');
  const top = others.find((p) => w.clubs[p.clubId as string].squad.filter((id) => w.players[id].ovr > p.ovr).length < 13) as G.Player;
  assert(!G.loanInTerms(w, top.id).ok, 'loanInTerms recusa titulares');
  const liOwner = li.clubId as string;
  assert(G.loanIn(w, li.id, true) && li.clubId === u.id && li.loan?.buyOption === terms.buyOption && (li.loan?.wageShare ?? 0) > terms.wageShare, 'loanIn com opção');
  const m0 = u.money;
  assert(G.exerciseBuyOption(w, li.id) && !li.loan && u.money === m0 - terms.buyOption && u.squad.includes(li.id), 'exerciseBuyOption');
  const li2Owner = li2.clubId as string;
  assert(G.loanIn(w, li2.id, false) && G.loanedIn(w).some((p) => p.id === li2.id), 'loanIn sem opção');
  console.log(`loans ok: out ${lo2.name}${yLoaned ? ` + garoto ${lyouth.name}` : ''}, in ${li2.name}; opção exercida em ${li.name} (${formatMoney(terms.buyOption)}) do ${w.clubs[liOwner].name}`);

  // ---- negociação com o clube: paciência → walkout → cooldown ----
  const nt = others.find((p) => G.askingPrice(w, p) > 2e6 && ![li.id, li2.id, target.id].includes(p.id)) as G.Player;
  const r1 = G.negotiateTransfer(w, nt.id, { fee: 10000, installments: 1 });
  const r2 = G.negotiateTransfer(w, nt.id, { fee: 20000, installments: 1 });
  const r3 = G.negotiateTransfer(w, nt.id, { fee: 20000, installments: 1 });
  assert(r1.status === 'rejected' && r1.patience === 2 && r2.status === 'rejected' && r2.patience === 1, 'propostas baixas consomem paciência');
  assert(r3.status === 'walkout' && r3.patience === 0, 'paciência 0 → walkout');
  assert(G.negotiateTransfer(w, nt.id, { fee: G.askingPrice(w, nt) * 2, installments: 1 }).status === 'walkout', 'cooldown de 4 semanas');
  const ntWeek = w.week;

  // ---- negociação completa em 3 parcelas + contrato + promessa ----
  const bt = others.find((p) => G.askingPrice(w, p) > 3e6 && ![li.id, li2.id, target.id, nt.id].includes(p.id)) as G.Player;
  const ask = G.askingPrice(w, bt);
  const c1 = G.negotiateTransfer(w, bt.id, { fee: Math.round(ask * 0.9), installments: 3 });
  assert(c1.status === 'counter' && (c1.counterFee ?? 0) >= Math.round(ask * 1.05) - 10000, 'contraproposta exige +5% parcelado');
  const acc = G.negotiateTransfer(w, bt.id, { fee: c1.counterFee as number, installments: 3 });
  assert(acc.status === 'accepted', 'clube aceita');
  const cask = G.contractAsk(w, bt.id);
  const ch = [0.7, 0.85, 0.95, 1, 1.1, 1.3].map((f) => G.contractChance(w, bt.id, { ...cask, wage: Math.round(cask.wage * f) }));
  assert(ch.every((c, i) => i === 0 || c >= ch[i - 1]) && ch[0] === 0 && ch[5] === 1, `contractChance monotônica no salário (${ch.map((c) => c.toFixed(2)).join(' ')})`);
  if (cask.role === 'titular') assert(G.contractChance(w, bt.id, { ...cask, role: 'reserva', wage: cask.wage * 3 }) === 0, 'bom jogador recusa ser reserva');
  const promised: G.Terms = { ...cask, wage: Math.round(cask.wage * 1.3), role: 'titular' };
  assert(G.negotiateContract(w, bt.id, promised).status === 'accepted', 'negotiateContract aceito');
  const money0 = u.money, fee = c1.counterFee as number;
  assert(G.completeTransfer(w, bt.id, { ...promised, fee, installments: 3 }), 'completeTransfer');
  const first = Math.round(fee / 3);
  assert(u.money === money0 - first - promised.bonus && bt.clubId === u.id && bt.promise === 'titular' && w.payables.length === 2, '1ª parcela + luvas pagas; 2 parcelas pendentes');
  assert(bt.releaseClause > 0 && bt.start.season === w.season, 'nova multa e start na chegada');
  bt.inj = 30; bt.injType = 'Fratura'; // não vai jogar: a promessa será quebrada

  // ---- multa rescisória e agente livre ----
  const cl = others.find((p) => p.releaseClause > 0 && p.releaseClause < 60e6 && ![li.id, li2.id, target.id, nt.id, bt.id].includes(p.id)) as G.Player;
  const pr = G.payReleaseClause(w, cl.id);
  assert(pr.status === 'accepted', 'payReleaseClause');
  const clTerms = { ...G.contractAsk(w, cl.id) };
  clTerms.wage = Math.round(clTerms.wage * 1.3);
  assert(G.negotiateContract(w, cl.id, clTerms).status === 'accepted' && G.completeTransfer(w, cl.id, { ...clTerms, fee: cl.releaseClause, installments: 1 }), 'contratação pela multa');
  const fa = w.free.map((id) => w.players[id]).sort((a, b) => b.ovr - a.ovr)[0];
  assert(G.negotiateTransfer(w, fa.id, { fee: 0, installments: 1 }).status === 'accepted', 'agente livre: sem clube');
  const faTerms = { ...G.contractAsk(w, fa.id) };
  faTerms.wage = Math.round(faTerms.wage * 1.3);
  assert(G.negotiateContract(w, fa.id, faTerms).status === 'accepted' && G.completeTransfer(w, fa.id, { ...faTerms, fee: 0, installments: 1 }), 'agente livre contratado');
  const kinds = G.transferHistory(w, { clubId: u.id }).map((t) => t.kind);
  assert(['clause', 'free', 'transfer', 'loan'].every((k) => kinds.includes(k as G.TransferKind)), 'histórico registra clause/free/transfer/loan');
  console.log(`negotiation ok: walkout em ${nt.name}; ${bt.name} por ${formatMoney(fee)} em 3×; multa de ${cl.name} (${formatMoney(cl.releaseClause)}); livre ${fa.name}`);

  // ---- contrapropostas às ofertas da CPU ----
  const sellers = clubPlayers(w, u).filter((p) => ![bt.id, cl.id, fa.id, li.id, li2.id].includes(p.id) && !p.loan).sort((a, b) => a.ovr - b.ovr);
  const buyer = Object.values(w.clubs).filter((c) => c.id !== u.id).sort((a, b) => b.money - a.money)[0];
  const mkOffer = (p: G.Player): G.Message => {
    G.pushMessage(w, { kind: 'offer', pid: p.id, title: `Proposta por ${p.name}`, body: 'teste', offer: { pid: p.id, club: buyer.id, fee: G.valueOf(p), expires: w.week + 2, ceiling: G.offerCeiling(p, buyer.id, G.valueOf(p)) } });
    return w.inbox[0];
  };
  const oA = mkOffer(sellers[0]), ceilA = oA.offer?.ceiling as number;
  const wa = G.counterOffer(w, oA.id, ceilA * 3);
  assert(wa.status === 'walkout' && oA.offer?.done && sellers[0].clubId === u.id, 'counterOffer muito alto → walkout');
  const oB = mkOffer(sellers[1]), ceilB = oB.offer?.ceiling as number, feeB0 = oB.offer?.fee as number;
  const im = G.counterOffer(w, oB.id, Math.round(ceilB * 1.1));
  assert(im.status === 'improved' && (im.fee ?? 0) > feeB0 && (im.fee ?? 0) <= ceilB && !oB.offer?.done, 'counterOffer um pouco acima → improved');
  const oC = mkOffer(sellers[2]), ceilC = oC.offer?.ceiling as number;
  const ac = G.counterOffer(w, oC.id, ceilC);
  assert(ac.status === 'accepted' && ac.fee === ceilC && sellers[2].clubId === buyer.id, 'counterOffer até o teto → vendido');
  console.log(`counterOffer ok: walkout / improved ${formatMoney(im.fee ?? 0)} / accepted ${formatMoney(ceilC)}`);

  // ---- lista de observação ----
  const wp = others.find((p) => ![li.id, li2.id, target.id, nt.id, bt.id, cl.id].includes(p.id) && p.clubId !== buyer.id) as G.Player;
  assert(G.toggleWatch(w, wp.id) && w.watchlist.includes(wp.id), 'toggleWatch liga');
  const wp2 = others.find((p) => p.id !== wp.id && ![li.id, li2.id, target.id, nt.id, bt.id, cl.id].includes(p.id) && p.clubId !== buyer.id) as G.Player;
  G.toggleWatch(w, wp2.id);
  assert(!G.toggleWatch(w, wp2.id) && !w.watchlist.includes(wp2.id), 'toggleWatch desliga');
  wp.listed = true;

  // ---- avança: relatório, avisos, dia do fechamento ----
  const idBefore = w.nextMsg;
  advanceTo(w, readyWeek);
  assert(w.scouting[target.id]?.level === 2 && G.potentialRange(w, target).exact && Array.isArray(G.knownTraits(w, target)), 'relatório entregue no endWeek');
  const rep = lastMsg(w, (m) => m.title === `Relatório do olheiro: ${target.name}` && m.pid === target.id);
  assert(rep && /Veredito: /.test(rep.body), 'mensagem do olheiro com veredito');
  // A CPU pode vender o observado na mesma semana (venda em crise): aí o aviso é de troca de clube.
  assert(w.inbox.some((m) => m.id >= idBefore && m.pid === wp.id && /lista de venda|trocou de clube/.test(m.body)), 'aviso: entrou na lista de venda (ou trocou de clube)');
  const dest = Object.values(w.clubs).find((c) => c.id !== u.id && c.id !== wp.clubId && c.squad.length < 30) as G.Club;
  G.transfer(w, wp.id, dest.id, 0, true);
  const id2 = w.nextMsg;
  advance(w);
  assert(w.inbox.some((m) => m.id >= id2 && m.pid === wp.id && /trocou de clube/.test(m.body)), 'aviso: trocou de clube');
  advanceTo(w, 5);
  assert(w.inbox.some((m) => m.title === 'Dia do fechamento da janela' && m.week === 4), 'notícia do dia do fechamento (semana 4)');
  console.log(`scout/watch/deadline ok: "${rep.body.slice(0, 90)}…"`);

  // ---- cooldown expira na janela do meio; parcelas pagas; promessa cobrada ----
  advanceTo(w, 15);
  const again = G.negotiateTransfer(w, nt.id, { fee: G.askingPrice(w, nt), installments: 1 });
  assert(w.week - ntWeek >= 4 && again.status === 'accepted' && again.patience === 3, 'após o cooldown o clube volta a negociar');
  delete w.negotiations[nt.id];
  advanceTo(w, 21);
  assert((w.payables.length as number) === 0, 'parcelas pagas no endWeek');
  const paid = G.transferHistory(w, { clubId: u.id }).length > 0 && w.inbox.filter((m) => m.title === 'Parcela paga').length === 2;
  assert(paid, 'duas parcelas pagas com mensagem');
  assert(w.inbox.some((m) => m.title === `${bt.name} cobra a promessa`), 'promessa de titular cobrada');

  // ---- renovação ----
  const rp = clubPlayers(w, u).find((p) => !p.loan && p.id !== bt.id) as G.Player;
  const ra = G.renewAsk(w, rp.id);
  const rr = G.negotiateRenewal(w, rp.id, { ...ra, wage: Math.round(ra.wage * 1.3), years: ra.years });
  assert(rr.status === 'accepted' && rp.contract === ra.years && rp.releaseClause === ra.releaseClause && rp.promise === ra.role, 'negotiateRenewal');

  // ---- fim da temporada: empréstimos voltam ----
  const season = w.season;
  const spend = G.netSpend(w, u.id, season);
  const manual = w.transfers.filter((t) => t.season === season && t.fee).reduce((s2, t) => s2 + (t.to === u.id ? t.fee : 0) - (t.from === u.id ? t.fee : 0), 0);
  assert(spend === manual, 'netSpend');
  const big = G.biggestDeals(w, season, 5);
  assert(big.length === 5 && big.every((d, i) => i === 0 || d.fee <= big[i - 1].fee), 'biggestDeals ordenado');
  const news = G.marketNews(w, 3);
  assert(news.length <= 3 && news.every((t) => t.fee > 0), 'marketNews');
  const retMsgs = w.nextMsg;
  while (w.season === season) advance(w);
  assert(!lo2.loan && lo2.clubId === u.id && u.squad.includes(lo2.id), `emprestado volta no newSeason (${lo2.clubId})`);
  // (depois de voltar, o dono ainda pode liberá-lo por fim de contrato ou ele pode se aposentar)
  assert(!li2.loan && !u.squad.includes(li2.id) && w.transfers.some((t) => t.pid === li2.id && t.kind === 'loan' && t.from === u.id && t.to === li2Owner), 'emprestado ao usuário volta ao dono');
  if (yLoaned) assert(!lyouth.loan && (u.youth.includes(lyouth.id) || u.squad.includes(lyouth.id)), 'garoto volta à base/elenco');
  const back = w.inbox.find((m) => m.id >= retMsgs && m.pid === lo2.id && /volta/.test(m.title));
  assert(back && /jogo\(s\) e \d+ gol\(s\)/.test(back.body), 'mensagem de retorno com resumo');
  assert(w.transfers.filter((t) => !t.user).length <= G.CPU_HISTORY_MAX && G.transferHistory(w, { season }).length > 0, 'histórico da CPU limitado a 400');
  console.log(`season ok: netSpend ${formatMoney(spend)}; maior negócio ${big[0].name} ${formatMoney(big[0].fee)}; "${back.body}"`);

  // ---- migrateWorld v3 → v4 ----
  const v3 = JSON.parse(JSON.stringify(w)) as Record<string, unknown> & World;
  v3.version = 3;
  for (const k of ['scouting', 'scoutQueue', 'negotiations', 'payables', 'watchlist', 'watchState', 'transfers']) delete (v3 as Record<string, unknown>)[k];
  for (const c of Object.values(v3.clubs) as unknown as Record<string, unknown>[]) { delete c.scouting; delete c.academyFocus; }
  for (const p of Object.values(v3.players) as unknown as Record<string, unknown>[]) {
    for (const k of ['start', 'loan', 'releaseClause', 'joined', 'promise', 'promiseChecked']) delete p[k];
  }
  assert(isCompatible(v3), 'v3 é compatível');
  const m4 = migrateWorld(v3);
  assert(m4.version === 6 && Array.isArray(m4.transfers) && Array.isArray(m4.scoutQueue) && m4.negotiations && m4.scouting, 'campos de World v4');
  assert(Object.values(m4.clubs).every((c) => c.scouting >= 1 && c.scouting <= 5 && c.academyFocus === 'balanced'), 'clubes v4');
  assert(Object.values(m4.players).every((p) => p.start && p.loan === null && typeof p.releaseClause === 'number'), 'jogadores v4');
  const j4 = JSON.stringify(m4);
  assert(JSON.stringify(migrateWorld(m4)) === j4, 'migrateWorld v4 idempotente');
  advance(m4);
  console.log(`v4 checks ok (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
  runV5Checks();
}

/** Atributos, habilidades, batedor de faltas e finanças por clube (World v5). */
function runV5Checks(): void {
  const w = freshWorld();
  const u = user(w);
  const all = Object.values(w.players);
  // Atributos coerentes com a posição: atacantes finalizam melhor que zagueiros; goleiros têm reflexos.
  const avgAttr = (pos: G.Position, k: G.AttrKey) => {
    const ps = all.filter((p) => p.pos === pos && !p.youth);
    return ps.reduce((s, p) => s + G.attr(p, k), 0) / ps.length;
  };
  assert(avgAttr('ATA', 'fin') > avgAttr('ZAG', 'fin') + 15, 'ATA finaliza melhor que ZAG');
  assert(avgAttr('ZAG', 'mar') > avgAttr('ATA', 'mar') + 15, 'ZAG marca melhor que ATA');
  assert(avgAttr('GOL', 'ref') > avgAttr('MEI', 'ref') + 30, 'goleiros têm reflexos');
  assert(all.every((p) => G.ATTR_KEYS.every((k) => { const v = G.attr(p, k); return v >= 1 && v <= 99; })), 'atributos entre 1 e 99');
  // Habilidade reforça o atributo ligado.
  const fk = all.filter((p) => p.traits.includes('faltas') && !p.youth);
  const noFk = all.filter((p) => !p.traits.includes('faltas') && !p.youth && (p.pos === 'MEI'));
  assert(fk.length > 20, 'há batedores de falta');
  const devBp = (ps: G.Player[]) => ps.reduce((s, p) => s + (G.attr(p, 'bp') - p.ovr), 0) / ps.length;
  assert(devBp(fk) > devBp(noFk) + 6, 'Batedor de falta tem bola parada alta');
  const newKeys: G.TraitKey[] = ['faltas', 'motorzinho', 'chuteLonge', 'penalti', 'pegaPenalti', 'lancamento', 'garra', 'coringa'];
  assert(newKeys.every((k) => all.some((p) => p.traits.includes(k))), 'todas as habilidades novas aparecem');
  // Batedor de faltas escolhido e configurável.
  assert(Object.values(w.clubs).every((c) => !!c.fkTaker && c.squad.includes(c.fkTaker)), 'batedor de faltas em todos os clubes');
  const other = u.squad.find((id) => id !== u.fkTaker) as string;
  assert(G.setFkTaker(w, other) && u.fkTaker === other && !G.setFkTaker(w, 'nope'), 'setFkTaker');
  // Coringa perde menos fora da posição.
  const cor = all.find((p) => p.traits.includes('coringa') && p.pos === 'VOL');
  if (cor) assert(G.playerFit(cor, 'ATA') >= 0.9 && G.fit('VOL', 'ATA') < 0.9, 'Coringa: encaixe mínimo de 90%');
  // Conhecimento dos atributos: outro clube sem observação = null; observado = faixa; relatório = exato.
  const stranger = all.find((p) => p.clubId && p.clubId !== u.id && !p.youth) as G.Player;
  assert(G.knownAttrs(w, stranger) === null, 'atributos ocultos sem observação');
  G.observe(w, stranger.id);
  const obs = G.knownAttrs(w, stranger)!;
  assert(obs.every((a) => !a.exact && a.min <= a.value && a.max >= a.value && a.max - a.min <= 12), 'atributos em faixa quando observado');
  const mine = G.knownAttrs(w, w.players[u.squad[0]])!;
  assert(mine.every((a) => a.exact), 'atributos exatos no próprio elenco');
  console.log(`attrs ok: ${fk.length} batedores de falta; bola parada +${devBp(fk).toFixed(1)} vs ${devBp(noFk).toFixed(1)}`);

  // Finanças por clube: ligas ricas pagam e faturam mais; teto salarial e veto da diretoria.
  const rev = (lg: G.LeagueId) => {
    const cs = Object.values(w.clubs).filter((c) => c.league === lg && G.DIVISIONS[c.div].level === 1);
    return cs.reduce((s, c) => s + G.financeProfile(w, c).revenue, 0) / cs.length;
  };
  assert(rev('eng') > rev('bra') * 1.4 && rev('bra') > rev('arg') * 1.2, 'receita: Inglaterra > Brasil > Argentina');
  assert(G.wageFor(75, 'eng') > G.wageFor(75, 'bra') && G.wageFor(75, 'bra') > G.wageFor(75, 'arg'), 'salários por liga');
  assert(Object.values(w.clubs).every((c) => c.sponsor > 0 && c.wageCap > 0 && Number.isFinite(c.money)), 'patrocínio e teto em todos os clubes');
  assert(Object.values(w.clubs).some((c) => c.loan) && Object.values(w.clubs).some((c) => !c.loan), 'alguns clubes começam endividados');
  assert(G.clubWages(w, u) <= u.wageCap, 'usuário começa dentro do teto');
  const veto = G.wageVeto(w, u, u.wageCap);
  assert(!!veto && veto.includes('diretoria vetou') && G.wageVeto(w, u, 0) === null, 'veto da diretoria acima do teto');
  const fin0 = { ...w.finSeason };
  simulateWeek(w); endWeek(w);
  assert((w.finSeason.commercial ?? 0) > (fin0.commercial ?? 0) && (w.finSeason.upkeep ?? 0) < (fin0.upkeep ?? 0), 'sócios/produtos e manutenção semanais');
  // Renovação do patrocínio no fim da temporada.
  const before = u.sponsor;
  const ren = G.renewClubFinances(w, u, true);
  assert(ren.before === before && ren.after > 0 && ren.after <= before * 1.45 + 1000 && ren.after >= before * 0.7 - 1000, 'renovação do patrocínio limitada');
  runV6Checks();
  console.log(`finance ok: receita/sem 1ª div eng ${formatMoney(rev('eng'))}, bra ${formatMoney(rev('bra'))}, arg ${formatMoney(rev('arg'))}; teto ${formatMoney(u.wageCap)}`);
}

if (args.includes('--checks')) runChecks();
else runSeasons();

/** Instruções táticas, conversas, histórico, recordes, conquistas e Copa das Nações (World v6). */
function runV6Checks(): void {
  const w = freshWorld();
  const u = user(w);
  // Instruções: padrão no usuário, CPU escolhe pelo perfil, efeitos coerentes.
  assert(JSON.stringify(u.instr) === JSON.stringify(G.DEFAULT_INSTRUCTIONS), 'instruções padrão do usuário');
  const cpu = Object.values(w.clubs).filter((c) => c.id !== u.id);
  const widths = new Set(cpu.map((c) => c.instr.width)), passes = new Set(cpu.map((c) => c.instr.pass));
  assert(widths.size >= 2 && passes.size >= 2, 'CPU varia as instruções');
  const flat = { wide: 0, pass: 0, speed: 0, mark: 0, defSpeed: 0, aerial: 0 };
  const longo = G.instructionMods({ ...G.DEFAULT_INSTRUCTIONS, pass: 'longo' }, { ...flat, speed: 1 });
  const curto = G.instructionMods({ ...G.DEFAULT_INSTRUCTIONS, pass: 'curto' }, flat);
  assert(longo.counterFor > 1.5 && longo.mid < 1 && curto.mid > 1 && curto.counterFor < 1, 'bola longa x toque curto');
  const alta = G.instructionMods({ ...G.DEFAULT_INSTRUCTIONS, line: 'alta' }, { ...flat, defSpeed: -1 });
  const altaRapida = G.instructionMods({ ...G.DEFAULT_INSTRUCTIONS, line: 'alta' }, { ...flat, defSpeed: 1 });
  assert(alta.counterAgainst > altaRapida.counterAgainst && altaRapida.counterAgainst > 1, 'linha alta pune zagueiros lentos');
  assert(G.instructionMods({ ...G.DEFAULT_INSTRUCTIONS, mark: 'individual' }, flat).foul > 1, 'marcação individual faz mais faltas');
  assert(G.instructionMods({ ...G.DEFAULT_INSTRUCTIONS, width: 'pontas' }, flat).cross > 0 && G.instructionMods(G.DEFAULT_INSTRUCTIONS, flat).cross === 0, 'cruzamentos só pelas pontas');
  G.setInstructions(w, { width: 'pontas', pass: 'longo' });
  assert(u.instr.width === 'pontas' && u.instr.pass === 'longo' && u.instr.line === 'media', 'setInstructions parcial');
  assert(G.instructionAdvice(w, u).length > 0, 'dicas de instrução');
  // Com pontas, cruzamentos aparecem na narração.
  let crosses = 0;
  for (let k = 0; k < 40; k++) {
    const opp = cpu[k % cpu.length];
    const sim = new Sim(w, u.id, opp.id).runToEnd();
    crosses += sim.events.filter((e) => /cruzamento|Cruzamento|Bola alçada/.test(e.text)).length;
  }
  assert(crosses > 5, `cruzamentos com jogo pelas pontas (${crosses})`);

  // Conversa no vestiário: efeito no Sim só na semana em que foi dada.
  advance(w);
  const um = userMatch(w);
  if (um) {
    const t = G.giveTeamTalk(w, um, 'motivar');
    assert(t.mult >= 1 && G.teamTalkMult(w) === t.mult, 'teamTalk registrado');
    const sim = new Sim(w, um.h, um.a);
    const side = sim.sides.find((sd) => sd.user);
    assert(side && side.talk === t.mult, 'teamTalk aplicado ao lado do usuário');
  }

  // Conversas com jogadores: respostas mudam moral e estado.
  const p = w.players[u.squad[5]];
  w.inbox.unshift({ id: w.nextMsg++, season: w.season, week: w.week, read: false, kind: 'board', title: 't', body: 'b', pid: p.id,
    talk: { kind: 'bench', pid: p.id, options: [{ key: 'prometer', label: 'x', hint: 'y' }], expires: w.week + 2 } });
  const m0 = p.morale;
  const r1 = G.answerTalk(w, w.inbox[0].id, 'prometer');
  assert(r1.ok && p.morale > m0 && !!p.chance && !G.answerTalk(w, w.inbox[0].id, 'prometer').ok, 'resposta a conversa (uma vez)');
  w.inbox.unshift({ id: w.nextMsg++, season: w.season, week: w.week, read: false, kind: 'board', title: 't', body: 'b', pid: p.id,
    talk: { kind: 'raise', pid: p.id, options: [], expires: w.week + 2, amount: 1e9 } });
  assert(!G.answerTalk(w, w.inbox[0].id, 'dar').ok, 'aumento absurdo vetado pelo teto');
  w.inbox[0].talk!.expires = w.week - 1;
  const m1 = p.morale;
  G.expireTalks(w);
  assert(w.inbox[0].talk?.answer === 'ignored' && p.morale < m1, 'conversa ignorada expira com moral −8');

  // Temporada completa: histórico, recordes, conquistas e Copa das Nações (2026).
  let talks = 0;
  for (;;) {
    simulateWeek(w);
    const rep = endWeek(w);
    talks = Math.max(talks, w.inbox.filter((m) => m.talk).length);
    if (rep.seasonEnd) break;
  }
  assert(w.pendingSeason, 'fim da temporada');
  const withHist = Object.values(w.players).filter((x) => x.hist?.some((r) => r[0] === w.season)).length;
  assert(withHist > 3000, `histórico gravado (${withHist} jogadores)`);
  const champ = w.pendingSeason.entry.champions[u.div];
  const champPlayer = w.clubs[champ].squad.map((id) => w.players[id]).find((x) => x.s.apps >= 3);
  assert(champPlayer?.hist?.at(-1)?.[6]?.includes(G.competitionName(u.div)), 'título no histórico do campeão');
  assert(w.records && w.records.matches.played >= 30 && w.records.biggestWin !== undefined, 'recordes da carreira');
  assert((w.achievements ?? []).some((a) => a.key === 'primeira_vitoria'), 'conquista: primeira vitória');
  assert(talks > 0, 'jogadores pedem conversas durante a temporada');
  const before = Object.keys(w.clubs).length;
  G.newSeason(w);
  const e = w.nations?.[0];
  assert(e && e.season === w.season - 1 && e.table.length === 6 && e.matches.length === 16, 'Copa das Nações: 15 jogos + final');
  assert(Object.keys(w.clubs).length === before && !Object.keys(w.clubs).some((id) => id.startsWith('nat:')), 'seleções temporárias removidas');
  assert(e.squads[e.champion].some((pid) => w.players[pid]?.hist?.some((r) => r[6]?.includes(G.NATIONS_NAME))), 'título da Copa das Nações no histórico');
  assert(Object.values(w.players).some((x) => (x.intl?.[0] ?? 0) > 0), 'jogos pela seleção');
  assert(!G.runNationsCup(w) && G.isNationsSeason(2030) && !G.isNationsSeason(2027), 'Copa das Nações a cada 4 anos');
  const car = G.playerCareer(w, champPlayer!);
  assert(car[0].current && car.some((r) => !r.current), 'carreira do jogador: atual + passadas');
  assert(G.clubIdols(w, u.id, 5).length > 0, 'ídolos do clube');
  const json = JSON.stringify(w);
  assert(JSON.stringify(G.migrateWorld(JSON.parse(json))) === json, 'migrateWorld v6 idempotente');
  console.log(`v6 ok: cruzamentos ${crosses}, conversas ${talks}, histórico ${withHist}, Copa das Nações ${e.season}: ${e.champion}`);
}

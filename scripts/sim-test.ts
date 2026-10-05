// Teste de balanceamento headless do motor do Manager (13 ligas, World v9).
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
import { postMatchInsights } from '../src/components/match/postMatch';
import { calendarHighlights } from '../src/components/home/calendarEvents';
import * as G from '../src/game';
import {
  CLUBS, DIVISIONS, DIVISION_IDS, DIVISION_SIZE, LEAGUE_ROUNDS, PROMOTION_SPOTS, IncompatibleSaveError, LEAGUES, LEAGUE_IDS, LOAN_OPTIONS, Sim, TRAITS,
  UPGRADES, WORLD_VERSION, advanceCalendarDay, autoLineup, applyResult, calendarDate, clubPlayers, completeBuy, competitionName, contEntrants,
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

function checkCalendar(): void {
  const w = freshWorld();
  w.week = 1;
  w.inbox.unshift({ id: w.nextMsg++, season: w.season - 1, week: 39, kind: 'award', title: 'Gala', body: 'Bola de Ouro: Teste', read: false });
  const highlights = calendarHighlights(w);
  assert(highlights.events.some((event) => event.title.includes('Bola de Ouro')), 'calendário destaca premiações');
  assert(highlights.events.some((event) => event.title.includes('Janela de transferências')), 'calendário destaca janela aberta');
  w.calendarSeenMessageId = highlights.latestMessageId;
  assert(!calendarHighlights(w).events.some((event) => event.title.includes('Bola de Ouro')), 'premiação não reaparece toda semana');
  w.week = 0;
  for (const div of DIVISION_IDS) {
    const matches = w.weeks.flatMap((week) => week?.matches.filter((m) => m.comp === div) ?? []);
    for (const club of Object.values(w.clubs).filter((c) => c.div === div)) {
      const sequence = matches.filter((m) => m.h === club.id || m.a === club.id).map((m) => m.h === club.id ? 'H' : 'A').join('');
      assert(sequence.length === LEAGUE_ROUNDS, `${club.id}: ${LEAGUE_ROUNDS} jogos de liga`);
      assert((sequence.match(/H/g) ?? []).length === LEAGUE_ROUNDS / 2, `${club.id}: metade dos jogos em casa`);
      assert(Math.max(...(sequence.match(/H+|A+/g) ?? []).map((run) => run.length)) <= 2, `${club.id}: sem longa sequência de mandos`);
    }
  }
  assert(calendarDate(w.season, 2, 0).getTime() - calendarDate(w.season, 1, 0).getTime() === 7 * 86400000, 'calendário avança sete dias por semana');
  w.week = 1;
  const p = w.players[w.clubs[w.userClub].squad[0]];
  p.fitness = 40;
  assert(advanceCalendarDay(w) && w.day === 1 && p.fitness > 40, 'descanso diário recupera condicionamento');
  for (let i = 1; i < 6; i++) assert(advanceCalendarDay(w), 'dias de preparação avançam');
  assert(Number(w.day) === 6 && !advanceCalendarDay(w), 'domingo aguarda o jogo');

  const legacy = freshWorld();
  let round = 0;
  for (const week of legacy.weeks) {
    if (week?.type !== 'league') continue;
    const match = week.matches.find((m) => m.h === legacy.userClub || m.a === legacy.userClub)!;
    if ((round < LEAGUE_ROUNDS / 2 && match.h === legacy.userClub) || (round >= LEAGUE_ROUNDS / 2 && match.a === legacy.userClub)) [match.h, match.a] = [match.a, match.h];
    if (round < 3) match.played = true;
    round++;
  }
  legacy.scheduleRevision = undefined;
  migrateWorld(legacy);
  const repaired = legacy.weeks.flatMap((week) => week?.type === 'league' ? week.matches.filter((m) => m.h === legacy.userClub || m.a === legacy.userClub) : []);
  assert(repaired.slice(0, 3).every((m) => m.played && m.a === legacy.userClub), 'migração preserva jogos disputados');
  assert((repaired.filter((m) => m.h === legacy.userClub)).length === LEAGUE_ROUNDS / 2, 'migração mantém metade dos mandos');
  const future = repaired.slice(3).map((m) => m.h === legacy.userClub ? 'H' : 'A').join('');
  assert(Math.max(...(future.match(/H+|A+/g) ?? []).map((run) => run.length)) <= 3, 'migração intercala jogos futuros');
}

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
  assert(awards.ranking?.[0]?.player.id === top.id, 'ranking acompanha vencedor da Bola de Ouro');
  assert(awards.ranking?.[0]?.breakdown.goals && awards.ranking[0].breakdown.goals > 0, 'ranking explica pontos dos gols');
  assert(awards.goldenBoot?.id === top.id, 'Chuteira de Ouro pondera gols pela competição');
  low.s.goals = 65;
  awards = seasonAwards(w, tables);
  assert(awards.goldenBoot?.id === low.id, 'produção excepcional na divisão inferior ainda pode vencer');
}

function runSeasons(): void {
  checkCalendar();
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
    assert(awards.ranking?.length === 10 && awards.ranking[0].player.id === awards.player.id, 'top 10 corresponde ao vencedor');
    assert(awards.ranking.every((row, i) => i === 0 || awards.ranking![i - 1].points >= row.points), 'top 10 em ordem de pontos');
    assert(awards.ranking.every((row) => Math.abs(Object.values(row.breakdown).reduce((sum, value) => sum + value, 0) - row.points) <= 0.3), 'parcelas explicam pontuação');
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
  checkCalendar();
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
  assert(found && found.length >= 1 && w.trialsUsed === 1, 'runTrial revela garotos');
  let extra = 0;
  while (runTrial(w)) extra++;
  assert(extra + 1 === G.trialsMax(w) && G.trialsMax(w) >= 3 && runTrial(w) === null, `várias peneiras por temporada (${G.trialsMax(w)})`);
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
  assert(res.substitutions?.some((sub) => sub.side === s && sub.min === 60), 'resultado registra substituição');
  assert(res.tactics?.some((change) => change.side === s && change.min === 30 && change.tactic === 'att'), 'resultado registra mudança tática');
  const insights = postMatchInsights(w, res, s);
  assert(insights.some((item) => item.title === 'Leitura tática'), 'pós-jogo interpreta estatísticas');
  assert(insights.some((item) => item.title === 'Substituições' || item.title === 'Impacto da substituição'), 'pós-jogo analisa substituição');
  const penaltySim = new Sim(w, m.h, m.a);
  penaltySim.cur = [penaltySim.strength(0), penaltySim.strength(1)];
  penaltySim.shot(s, 1, true);
  const penaltyEvent = penaltySim.events.at(-1);
  assert(penaltyEvent?.penalty?.shooterId && ['goal', 'save', 'miss'].includes(penaltyEvent.penalty.outcome), 'pênalti comum fornece o resultado da cena');
  penaltySim.penalties();
  const kicks = penaltySim.events.filter((event) => event.penalty?.shootoutScore);
  assert(kicks.length >= 6 && kicks.every((event) => event.penalty?.round && event.penalty.shooterId), 'disputa fornece cada cobrança para a animação');
  assert(JSON.stringify(kicks.at(-1)?.penalty?.shootoutScore) === JSON.stringify(penaltySim.pens), 'placar da disputa chega ao resultado final');
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
  assert(w.version === WORLD_VERSION && WORLD_VERSION === 10, 'World v10');

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
  assert(mig.version === WORLD_VERSION, 'migrateWorld -> versão atual');
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

/** Qualidade das ligas: elencos, prestígio, vontade de trocar de liga e agentes livres. */
function runLeagueQualityChecks(w: World): void {
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const ovr11 = (c: G.Club) => avg(c.squad.map((id) => w.players[id].ovr).sort((a, b) => b - a).slice(0, 11));
  const strength = (lg: LeagueId) => avg(Object.values(w.clubs).filter((c) => c.div === LEAGUES[lg].divisions[0]).map(ovr11));
  const rank = G.leagueRanking(w);
  assert(rank.length === LEAGUE_IDS.length && rank.every((r, i) => r.rank === i + 1 && (i === 0 || r.strength <= rank[i - 1].strength)), 'leagueRanking ordenado');
  // A ordem de qualidade aparece nos elencos (com folga de ruído entre ligas vizinhas).
  const order = LEAGUE_IDS.slice().sort((a, b) => LEAGUES[b].quality - LEAGUES[a].quality);
  const top4 = order.slice(0, 4), bottom4 = order.slice(-4);
  assert(avg(top4.map(strength)) - avg(bottom4.map(strength)) > 6, `ligas fortes > ligas fracas (${avg(top4.map(strength)).toFixed(1)} x ${avg(bottom4.map(strength)).toFixed(1)})`);
  assert(strength('eng') > strength('bra') + 3 && strength('bra') > strength('gre') + 2, 'Inglaterra > Brasil > Grécia');
  assert(rank[0].id === 'eng' || rank[0].id === 'esp', `topo do ranking é eng/esp (veio ${rank[0].id})`);
  assert(G.leagueStars('eng') === 5 && G.leagueStars('gre') === 1 && G.leagueTier('eng') === 'Elite mundial' && G.leagueTier('gre') === 'Emergente', 'estrelas e rótulos das ligas');
  // A diferença vale também nas divisões de baixo (menor).
  const d2 = (lg: LeagueId) => avg(Object.values(w.clubs).filter((c) => c.div === LEAGUES[lg].divisions[1]).map(ovr11));
  assert(d2('eng') - d2('gre') > 2 && d2('eng') - d2('gre') < strength('eng') - strength('gre'), 'diferença menor na 2ª divisão');
  // Prestígio entre países.
  const fra = Object.values(w.clubs).find((c) => c.league === 'eng')!, gre = Object.values(w.clubs).find((c) => c.league === 'gre')!;
  const eq = { ...gre, rep: fra.rep, league: 'gre' as LeagueId }, eq2 = { ...fra, rep: fra.rep };
  assert(G.prestigeOf(eq2) - G.prestigeOf(eq) > 15, 'mesma reputação: liga forte vale mais');
  assert(G.qualityBonus({ league: 'eng', div: 'eng1' }) > G.qualityBonus({ league: 'eng', div: 'eng2' }) && G.qualityBonus({ league: 'gre', div: 'gre1' }) < 0, 'bônus de qualidade por divisão');
  // Vontade de trocar de liga: jovem evita liga bem mais fraca; veterano aceita; liga mais forte sempre.
  const young = { age: 25 } as G.Player, vet = { age: 33 } as G.Player;
  const engClub = Object.values(w.clubs).find((c) => c.league === 'eng')!, greClub = Object.values(w.clubs).find((c) => c.league === 'gre')!;
  let okDown = 0, okUp = 0, okVet = 0;
  for (let k = 0; k < 400; k++) { if (G.willingToMove(young, engClub, greClub)) okDown++; if (G.willingToMove(young, greClub, engClub)) okUp++; if (G.willingToMove(vet, engClub, greClub)) okVet++; }
  assert(okUp === 400 && okVet === 400 && okDown < 60, `willingToMove (desce ${okDown}/400, sobe ${okUp}/400, veterano ${okVet}/400)`);
  // Agentes livres: astro acima do nível do clube não assina com ele.
  const weak = Object.values(w.clubs).find((c) => c.league === 'gre' && G.DIVISIONS[c.div].level === 2)!;
  const star = G.newPlayer(w, { pos: 'ATA', age: 26, ovr: 86, pot: 87, contract: 0, nat: 'bra' });
  w.free.push(star.id);
  assert(G.freeAgentFor(w, weak, 'ATA')?.id !== star.id, 'astro livre não assina com clube fraco');
  assert(G.freeAgentFor(w, Object.values(w.clubs).find((c) => c.rep >= 94 && c.league === 'eng')!, 'ATA')?.id === star.id, 'astro livre assina com o clube de topo');
  w.free = w.free.filter((id) => id !== star.id); delete w.players[star.id];
  // Base: potencial médio da base acompanha a qualidade; países de talento têm mais joias.
  const yPot = (lg: LeagueId) => avg(Object.values(w.clubs).filter((c) => c.league === lg).flatMap((c) => c.youth.map((id) => w.players[id].pot)));
  assert(yPot('eng') > yPot('gre') + 3, `potencial da base: eng ${yPot('eng').toFixed(1)} > gre ${yPot('gre').toFixed(1)}`);
  console.log(`league quality ok: ${rank.map((r) => `${r.id} ${r.strength.toFixed(1)}`).join(' | ')}`);
}

/** Temporada completa com todas as ligas: acesso/rebaixamento, copas, Copa dos Campeões, histórico, mercado. */
function runLeagueChecks(w: World): void {
  // Estrutura
  for (const div of DIVISION_IDS) assert(Object.values(w.clubs).filter((c) => c.div === div).length === DIVISION_SIZE, `${div} com ${DIVISION_SIZE} clubes`);
  assert(CLUBS.length === DIVISION_IDS.length * DIVISION_SIZE && new Set(CLUBS.map((c) => c.id)).size === CLUBS.length, `${CLUBS.length} clubes com ids únicos`);
  for (const c of CLUBS) assert(w.clubs[c.rival] && w.clubs[c.rival].league === c.league && c.rival !== c.id, `rival de ${c.id} na mesma liga`);
  const comps = userCompetitions(w);
  assert(comps[0] === user(w).div, 'userCompetitions começa pela divisão');
  const cont0 = contEntrants(w);
  assert(cont0.length === 32 && new Set(cont0).size === 32 && cont0.every((id) => DIVISIONS[w.clubs[id].div].level === 1 && !G.isSouthAmerican(w.clubs[id].league)), 'Liga dos Campeões: 32 clubes europeus de primeiras divisões');
  const lib0 = w.cups.lib?.entrants ?? [];
  assert(lib0.length === 16 && lib0.every((id) => G.isSouthAmerican(w.clubs[id].league)), 'Libertadores: 16 clubes do Brasil e da Argentina');
  const allCont = [...cont0, ...lib0, ...(w.cups.eur2?.entrants ?? []), ...(w.cups.sud?.entrants ?? [])];
  assert(new Set(allCont).size === allCont.length && allCont.length === 96, 'ninguém em dois continentais (32+32+16+16)');
  const nat0: Record<string, string> = {};
  for (const p of Object.values(w.players)) if (p.clubId) nat0[p.id] = w.clubs[p.clubId].league;
  // Nacionalidades: cada liga tem a sua parcela de jogadores locais (Brasil quase só local; Inglaterra importa muito)
  let dom = 0, tot = 0;
  for (const c of Object.values(w.clubs)) for (const id of c.squad) { tot++; if (w.players[id].nat === c.league) dom++; }
  for (const lg of LEAGUE_IDS) {
    let d = 0, n = 0;
    for (const c of Object.values(w.clubs)) if (c.league === lg) for (const id of c.squad) { n++; if (w.players[id].nat === lg) d++; }
    assert(Math.abs(d / n - LEAGUES[lg].domestic) < 0.09, `${lg}: ~${Math.round(LEAGUES[lg].domestic * 100)}% domésticos (veio ${((d / n) * 100).toFixed(1)}%)`);
  }
  runLeagueQualityChecks(w);

  const t0 = performance.now();
  const { ps } = playSeason(w);
  console.log(`temporada completa: ${((performance.now() - t0) / 1000).toFixed(2)} s, ${((dom / tot) * 100).toFixed(1)}% domésticos`);

  // Copas
  for (const lg of LEAGUE_IDS) assert(ps.entry.cups[cupId(lg)] && w.clubs[ps.entry.cups[cupId(lg)] as string].league === lg, `campeão da ${competitionName(cupId(lg))}`);
  assert(ps.entry.cups.cont && cont0.includes(ps.entry.cups.cont), 'campeão da Liga dos Campeões');
  assert(ps.entry.cups.lib && lib0.includes(ps.entry.cups.lib), 'campeão da Libertadores');
  const inter = ps.entry.cups.inter;
  assert(!inter || inter === ps.entry.cups.cont || inter === ps.entry.cups.lib, 'Intercontinental entre os campeões continentais');
  for (const k of Object.keys(ps.entry.cups)) assert(G.isKnockout(k), `copa conhecida: ${k}`);
  assert(Object.keys(ps.entry.cups).some((k) => k.startsWith('est:')) && Object.keys(ps.entry.cups).some((k) => k.startsWith('sup:')) && 'ne' in ps.entry.cups && 'lcup:eng' in ps.entry.cups, 'estaduais, supercopas, Copa do Nordeste e copas da liga no histórico');
  // Acesso e rebaixamento
  for (const lg of LEAGUE_IDS) {
    const divs = LEAGUES[lg].divisions;
    const mv = ps.moves.filter((m) => DIVISIONS[m.from].league === lg);
    assert(mv.length === (divs.length - 1) * PROMOTION_SPOTS * 2, `${lg}: ${mv.length} trocas de divisão`);
    for (const m of mv) assert(Math.abs(DIVISIONS[m.from].level - DIVISIONS[m.to].level) === 1 && DIVISIONS[m.to].league === lg, 'troca entre divisões vizinhas');
  }
  // Classificação continental
  const q = ps.qualified!;
  assert(q.cont!.length === 32 && q.eur2!.length === 32 && q.lib!.length === 16 && q.sud!.length === 16, 'classificados: 32 + 32 + 16 + 16');
  for (const id of q.cont!) {
    const d = w.clubs[id].div;
    assert(DIVISIONS[d].level === 1 && ps.tables[d].findIndex((r) => r.id === id) < (G.CONT_SLOTS[w.clubs[id].league] ?? 0), `${id} nas vagas da Liga dos Campeões`);
  }
  for (const id of q.lib!) assert(ps.tables[w.clubs[id].div].findIndex((r) => r.id === id) < 8, `${id} entre os 8 primeiros (Libertadores)`);
  // Histórico
  const h = w.history[w.history.length - 1];
  assert(Object.keys(h).sort().join() === 'awards,best,champions,cups,scorers,season,user', 'chaves do HistoryEntry');
  assert(DIVISION_IDS.every((d) => typeof h.champions[d] === 'string'), 'champions de todas as divisões');
  assert(LEAGUE_IDS.every((lg) => typeof h.cups[cupId(lg)] === 'string') && Object.keys(h.cups).length > 40, `cups: ${Object.keys(h.cups).length} mata-matas`);
  assert(Object.keys(h.scorers).sort().join() === firstDivisions().slice().sort().join(), 'scorers das primeiras divisões');
  assert(Object.keys(h.user).sort().join() === 'club,div,goals,league,objective,pos,success', 'chaves de user');
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
  for (const div of DIVISION_IDS) assert(Object.values(w.clubs).filter((c) => c.div === div).length === DIVISION_SIZE, `${div} com ${DIVISION_SIZE} clubes após newSeason`);
  const moved = Object.values(w.clubs).filter((c) => c.div !== divBefore[c.id]).length;
  assert(moved === ps.moves.length, 'newSeason aplica as trocas');
  assert(contEntrants(w).slice().sort().join() === ps.qualified!.cont!.slice().sort().join(), 'Liga dos Campeões usa os classificados');
  assert((w.cups.lib?.entrants ?? []).slice().sort().join() === ps.qualified!.lib!.slice().sort().join(), 'Libertadores usa os classificados');
  console.log(`league checks ok: ${ps.moves.length} trocas de divisão, ${cross} jogadores em outra liga, ${competitionName('cont')}: ${w.clubs[ps.entry.cups.cont as string].name}`);

  // Troca para um clube estrangeiro
  const u = user(w);
  const foreign = Object.values(w.clubs).find((c) => c.league !== u.league && DIVISIONS[c.div].level === 1);
  assert(foreign, 'clube estrangeiro');
  switchClub(w, foreign.id);
  assert(w.userClub === foreign.id && user(w).league !== u.league && w.board.label && !w.fired, 'switchClub para outra liga');
  endWeek(w);
  while (currentWeek(w)?.type !== 'league') { simulateWeek(w); endWeek(w); }
  simulateWeek(w); endWeek(w);
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
  const yw = Math.max(4, 24 - 3 * u.academy - 2 * Math.max(1, G.bestScoutSkill(w)));
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
  const reg = LEAGUE_IDS.find((l) => l !== u.league && !G.specialistFor(w, l)) as LeagueId;
  const baseCost = G.trialCost(w), foreignCost = G.trialCost(w, { region: reg });
  assert(Math.abs(foreignCost / baseCost - 1.8) < 0.01 && G.trialCost(u) === baseCost, 'trialCost ×1,8 no exterior (e aceita o clube)');
  w.trialsUsed = 0;
  const found = runTrial(w, { region: reg, pos: 'ATA' });
  assert(found && found.length >= 1 && found.every((p) => p.nat === reg && p.pos === 'ATA' && p.youth && p.start.season === w.season), 'peneira regional por posição');
  w.trialsUsed = G.trialsMax(w);
  assert(runTrial(w) === null, 'peneiras esgotadas na temporada');
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
  assert(offers.length >= 1 && offers.length <= 3 && offers.every((o) => { const c = w.clubs[o.club]; return G.prestigeOf(c) < G.prestigeOf(u) + 3 || (c.league === u.league && G.divisionLevel(c.div) > G.divisionLevel(u.div)); }), 'loanOutOffers');
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
  const rep = lastMsg(w, (m) => m.title.startsWith("Relatório ") && m.title.endsWith(`: ${target.name}`) && m.pid === target.id);
  assert(rep && /Veredito: /.test(rep.body), 'mensagem do olheiro com veredito');
  // A CPU pode vender o observado na mesma semana (venda em crise): aí o aviso é de troca de clube.
  // Se a CPU tirou o jogador da lista (ou ele saiu do mundo) antes do fechamento da semana, não há aviso a dar.
  const wpNow = w.players[wp.id];
  assert(!wpNow || !wpNow.listed || w.inbox.some((m) => m.id >= idBefore && m.pid === wp.id && /lista de venda|trocou de clube|sem clube/.test(m.body)), 'aviso: entrou na lista de venda (ou trocou de clube)');
  const dest = Object.values(w.clubs).find((c) => c.id !== u.id && c.id !== wp.clubId && c.squad.length < 30) as G.Club;
  G.transfer(w, wp.id, dest.id, 0, true);
  const id2 = w.nextMsg;
  advance(w);
  assert(w.inbox.some((m) => m.id >= id2 && m.pid === wp.id && /trocou de clube/.test(m.body)), 'aviso: trocou de clube');
  advanceTo(w, G.WINDOWS[0][1] + 1);
  assert(w.inbox.some((m) => m.title === 'Dia do fechamento da janela' && m.week === G.WINDOWS[0][1]), 'notícia do dia do fechamento');
  console.log(`scout/watch/deadline ok: "${rep.body.slice(0, 90)}…"`);

  // ---- cooldown expira na janela do meio; parcelas pagas; promessa cobrada ----
  advanceTo(w, G.WINDOWS[1][0]);
  const again = G.negotiateTransfer(w, nt.id, { fee: G.askingPrice(w, nt), installments: 1 });
  assert(w.week - ntWeek >= 4 && again.status === 'accepted' && again.patience === 3, 'após o cooldown o clube volta a negociar');
  delete w.negotiations[nt.id];
  advanceTo(w, G.PROMISE_CHECK_WEEK + 1);
  assert((w.payables.length as number) === 0, 'parcelas pagas no endWeek');
  const paid = G.transferHistory(w, { clubId: u.id }).length > 0 && w.inbox.filter((m) => m.title === 'Parcela paga').length === 2;
  assert(paid, 'duas parcelas pagas com mensagem');
  assert(w.inbox.some((m) => m.title === `${bt.name} cobra a promessa`), 'promessa de titular cobrada');

  // ---- renovação ----
  const rp = clubPlayers(w, u).find((p) => !p.loan && p.id !== bt.id) as G.Player;
  const ra = G.renewAsk(w, rp.id);
  const rr = G.negotiateRenewal(w, rp.id, { ...ra, wage: Math.round(ra.wage * 1.3), years: ra.years });
  assert(rr.status === 'accepted' && rp.contract === G.renewedContract(w, ra.years) && rp.releaseClause === ra.releaseClause && rp.promise === ra.role, 'negotiateRenewal');

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
  assert(m4.version === WORLD_VERSION && Array.isArray(m4.transfers) && Array.isArray(m4.scoutQueue) && m4.negotiations && m4.scouting, 'campos de World v4');
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

  // Fora da posição de origem o jogador perde pontos: na escalação e no jogo.
  const zag = all.find((p) => p.pos === 'ZAG' && !p.youth && !p.traits.includes('coringa'))!;
  assert(G.slotOvr(zag, 'ZAG') === Math.round(zag.ovr), 'na posição de origem não perde');
  assert(G.slotOvr(zag, 'ATA') < zag.ovr - 8, 'zagueiro no ataque perde pontos');
  assert(G.slotOvr(zag, 'GOL') < zag.ovr * 0.4, 'jogador de linha no gol perde muito');
  const opp = Object.values(w.clubs).find((c) => c.div === u.div && c.id !== u.id)!;
  const pointsWith = (shuffle: boolean) => {
    G.autoLineup(w, u); G.autoLineup(w, opp);
    if (shuffle) {
      // Gira os 10 de linha: cada um vai para a vaga do seguinte (zagueiro no meio, atacante na zaga…).
      const out = u.lineup.slice(1);
      u.lineup = [u.lineup[0], ...out.slice(3), ...out.slice(0, 3)];
    }
    let pts = 0;
    for (let i = 0; i < 300; i++) {
      const r = new G.Sim(w, u.id, opp.id, {}).runToEnd().result();
      pts += r.hs > r.as ? 3 : r.hs === r.as ? 1 : 0;
    }
    return pts / 300;
  };
  const natural = pointsWith(false), messy = pointsWith(true);
  G.autoLineup(w, u);
  assert(natural > messy + 0.4, `time fora de posição rende menos (${natural.toFixed(2)} vs ${messy.toFixed(2)})`);
  console.log(`posição ok: ${zag.name} ZAG ${Math.round(zag.ovr)} → ATA ${G.slotOvr(zag, 'ATA')}; pontos/jogo ${natural.toFixed(2)} escalado certo vs ${messy.toFixed(2)} fora de posição`);

  // Finanças por clube: ligas ricas pagam e faturam mais; teto salarial e veto da diretoria.
  const rev = (lg: G.LeagueId) => {
    const cs = Object.values(w.clubs).filter((c) => c.league === lg && G.DIVISIONS[c.div].level === 1);
    return cs.reduce((s, c) => s + G.financeProfile(w, c).revenue, 0) / cs.length;
  };
  assert(rev('eng') > rev('bra') * 1.4 && rev('bra') > rev('arg') * 1.2, 'receita: Inglaterra > Brasil > Argentina');
  const avgWage = (lg: LeagueId) => { const ps = Object.values(w.clubs).filter((c) => c.div === LEAGUES[lg].divisions[0]).flatMap((c) => c.squad.map((id) => w.players[id].wage)); return ps.reduce((x, y) => x + y, 0) / ps.length; };
  assert(avgWage('eng') > avgWage('bra') * 1.2 && avgWage('bra') > avgWage('arg') * 1.2 && avgWage('bra') > avgWage('gre'), 'salário médio por liga: eng > bra > arg/gre');
  assert(Object.values(w.clubs).every((c) => c.sponsor > 0 && c.wageCap > 0 && Number.isFinite(c.money)), 'patrocínio e teto em todos os clubes');
  assert(Object.values(w.clubs).some((c) => c.loan) && Object.values(w.clubs).some((c) => !c.loan), 'alguns clubes começam endividados');
  assert(G.clubWages(w, u) <= u.wageCap, `usuário começa dentro do teto (${u.id} ${u.div}: folha ${G.clubWages(w, u)} teto ${u.wageCap})`);
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
  runV8Checks();
  runV9Checks();
  runShapeChecks();
  runV10Checks();
  runPlayerCareerChecks();
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
  assert(e && e.season === w.season - 1 && e.table.length === LEAGUE_IDS.length && e.matches.length === LEAGUE_IDS.length * (LEAGUE_IDS.length - 1) / 2 + 1, 'Copa das Nações: todos contra todos + final');
  const group = e.matches.filter((m) => m.round > 0);
  assert(new Set(group.map((m) => [m.h, m.a].sort().join('|'))).size === group.length && e.table.every((r) => r.j === LEAGUE_IDS.length - 1), 'Copa das Nações: cada seleção enfrenta todas as outras uma vez');
  assert(Object.keys(w.clubs).length === before && !Object.keys(w.clubs).some((id) => id.startsWith('nat:')), 'seleções temporárias removidas');
  assert(e.squads[e.champion].some((pid) => w.players[pid]?.hist?.some((r) => r[6]?.includes(G.NATIONS_NAME))), 'título da Copa das Nações no histórico');
  assert(Object.values(w.players).some((x) => (x.intl?.[0] ?? 0) > 0), 'jogos pela seleção');
  assert(G.isNationsSeason(2030) && !G.isNationsSeason(2027) && G.nationsKindOf(2028) === 'euro' && G.nationsKindOf(2027) === 'league' && G.editionName(e) === 'Copa do Mundo', 'Copa do Mundo a cada 4 anos; Eurocopa e Liga das Nações entre elas');
  const prevSeason = w.season;
  w.season = 2028;
  const euro = G.runNationsCup(w);
  w.season = prevSeason;
  assert(euro && euro.kind === 'euro' && euro.table.every((r) => !G.isSouthAmerican(r.id)) && euro.table.length === LEAGUE_IDS.length - 2, 'Eurocopa só com seleções europeias');
  const car = G.playerCareer(w, champPlayer!);
  assert(car[0].current && car.some((r) => !r.current), 'carreira do jogador: atual + passadas');
  assert(G.clubIdols(w, u.id, 5).length > 0, 'ídolos do clube');
  const json = JSON.stringify(w);
  assert(JSON.stringify(G.migrateWorld(JSON.parse(json))) === json, 'migrateWorld idempotente');
  console.log(`v7 ok: cruzamentos ${crosses}, conversas ${talks}, histórico ${withHist}, Copa das Nações ${e.season}: ${e.champion}`);
}

/** Olheiros contratados, várias peneiras por temporada e salários da base (World v8). */
function runV8Checks(): void {
  const w = freshWorld();
  const u = user(w);
  // Carreira nova: equipe inicial de olheiros, mercado de olheiros e nada de "departamento por nível".
  const staff0 = G.scoutStaff(w);
  assert(staff0.length >= 1 && staff0.every((s) => s.skill >= 1 && s.skill <= 5 && s.wage > 0), 'equipe inicial de olheiros');
  assert((w.scoutMarket ?? []).length === G.SCOUT_MARKET_SIZE, 'mercado de olheiros');
  assert(u.scouting === 0 && !('scouting' in G.UPGRADES), 'sem melhoria de departamento de olheiros');
  assert(G.scoutSlots(w) === staff0.length, 'um relatório por olheiro');
  // Contratar: paga luvas, entra na equipe, sai do mercado; o salário entra na folha semanal.
  u.money = 1e9;
  const cand = (w.scoutMarket ?? [])[0];
  const before = u.money;
  assert(G.hireScout(w, cand.id).ok && G.scoutStaff(w).some((s) => s.id === cand.id) && !(w.scoutMarket ?? []).some((s) => s.id === cand.id), 'hireScout');
  assert(before - u.money === G.scoutHireFee(cand), 'luvas do olheiro');
  // Especialista: relatório em 1 semana de jogador do país dele.
  const spec = G.scoutStaff(w).find((s) => s.nat !== u.league) ?? G.scoutStaff(w)[0];
  const foreign = Object.values(w.players).find((p) => p.clubId && p.clubId !== u.id && !p.youth && p.nat === spec.nat && G.scoutLevel(w, p.id) < 2)!;
  w.scoutQueue = [];
  const req = G.requestScoutReport(w, foreign.id);
  assert(req.ok && req.readyWeek === w.week + 1, 'especialista entrega em 1 semana');
  // Especialista barateia a peneira no país dele e traz +1 garoto.
  if (spec.nat !== u.league) {
    assert(Math.abs(G.trialCost(w, { region: spec.nat }) / G.trialCost(w) - G.TRIAL_SPECIALIST_MULT) < 0.01, 'peneira com especialista ×1,2');
    assert(G.trialKids(w, { region: spec.nat }).min >= 2, 'especialista: +1 garoto');
  }
  // Dispensar: paga multa e libera a vaga.
  const n = G.scoutStaff(w).length;
  assert(G.fireScout(w, cand.id).ok && G.scoutStaff(w).length === n - 1, 'fireScout');
  // Sem olheiros, não há relatório.
  const saved = w.scoutStaff;
  w.scoutStaff = [];
  w.scoutQueue = [];
  const none = G.requestScoutReport(w, Object.values(w.players).find((p) => p.clubId && p.clubId !== u.id && !p.youth && G.scoutLevel(w, p.id) < 2)!.id);
  assert(!none.ok && /Contrate/.test(none.reason ?? ''), 'sem olheiros, sem relatório');
  w.scoutStaff = saved;
  // Salários da base: bem acima dos antigos R$ 800/sem e crescendo com o overall.
  const youth = u.youth.map((id) => w.players[id]);
  assert(youth.every((p) => p.wage >= 1500), 'salário da base maior');
  assert(G.youthWage(65, u.league) > G.youthWage(45, u.league), 'salário da base cresce com o overall');
  // Save v7: ganha olheiros, contador de peneiras e salários novos na base.
  const old = JSON.parse(JSON.stringify(w)) as World & { trialUsed?: boolean };
  old.version = 7;
  delete old.scoutStaff;
  delete old.scoutMarket;
  delete old.trialsUsed;
  old.trialUsed = true;
  old.clubs[old.userClub].scouting = 4;
  for (const id of old.clubs[old.userClub].youth) old.players[id].wage = 800;
  G.migrateWorld(old);
  assert(G.scoutStaff(old).length === 2 && G.bestScoutSkill(old) === 4 && old.clubs[old.userClub].scouting === 0, 'migração: olheiros pelo nível antigo');
  assert(old.trialsUsed === 1 && G.trialsLeft(old) === G.trialsMax(old) - 1, 'migração: peneira já feita conta');
  assert(old.clubs[old.userClub].youth.every((id) => old.players[id].wage > 800), 'migração: salário da base reajustado');
  const avgYouth = youth.reduce((s, p) => s + p.wage, 0) / Math.max(1, youth.length);
  console.log(`v8 ok: ${staff0.length} olheiro(s) iniciais, ${G.trialsMax(w)} peneiras/temporada, base ${formatMoney(avgYouth)}/sem em média, folha de olheiros ${formatMoney(G.scoutPayroll(w))}/sem`);
}

/** Carreira de jogador: criação, clube dirigido pela CPU, temporada completa, propostas e fim de contrato. */
function runPlayerCareerChecks(): void {
  const t0 = Date.now();
  const start = G.startingClubs('bra');
  assert(start.length === 3 && new Set(start).size === 3, 'três clubes para começar');
  const w = G.newPlayerCareer({ name: 'Teste Craque', pos: 'ATA', nat: 'bra', clubId: start[0] });
  const c = w.playerCareer!;
  const p = w.players[c.pid];
  assert(p && p.age === G.CAREER_START_AGE && p.clubId === start[0] && w.clubs[start[0]].squad.includes(p.id) && p.name === 'Teste Craque', 'protagonista no elenco');
  assert(!G.managesClub(w, start[0]) && G.isProtagonist(w, p.id), 'clube do protagonista é da CPU');
  p.ovr = Math.max(p.ovr, G.clubBaseOvr(w.clubs[start[0]]) + 6); // garante minutos para a checagem
  G.setCareerTraining(w, 'fin', 'forte');
  const fin0 = G.attr(p, 'fin');
  let reports = 0, played = 0, accepted = 0;
  let guard = 0;
  while (!w.pendingSeason && guard++ < 80) {
    const before: string | null = p.clubId;
    const r = G.playCareerWeek(w);
    assert(w.players[c.pid] === p, 'protagonista continua no mundo');
    assert(p.clubId === before || p.clubId === null, 'a CPU não vende o protagonista');
    if (r.report) { reports++; if (r.report.rating != null) played++; }
    const o = c.offers.find((x) => x.kind !== 'renew');
    if (o && accepted === 0 && G.windowOpen(w)) { assert(G.acceptCareerOffer(w, o.id).ok && p.clubId === o.club && w.userClub === o.club, 'aceitar proposta transfere'); accepted++; }
  }
  assert(!!w.pendingSeason && !w.fired, 'temporada termina sem demissão');
  assert(reports >= 25 && played >= 10, `relatórios de jogo (${reports}, jogou ${played})`);
  assert(G.attr(p, 'fin') > fin0, 'treino em foco melhora o atributo');
  const row = c.seasons.at(-1)!;
  assert(row.season === w.season && row.apps === p.s.apps && row.goals === p.s.goals, 'temporada gravada na carreira');
  assert(w.inbox.every((m) => !m.talk), 'sem conversas de elenco na carreira de jogador');
  // Fim de contrato sem renovação: fica livre e recebe propostas.
  p.contract = 1;
  c.offers = [];
  G.careerNewSeason(w);
  assert(w.season === row.season + 1 && !w.pendingSeason, 'nova temporada');
  assert(p.clubId === null && c.offers.length >= 1 && c.offers.every((o) => o.kind === 'free'), 'sem contrato: propostas como agente livre');
  const free = c.offers[0];
  assert(G.acceptCareerOffer(w, free.id).ok && p.clubId === free.club && p.contract === free.years && p.wage === free.wage, 'assina como agente livre');
  // Aposentadoria só a partir dos 33.
  assert(!G.canRetire(w), 'jovem não se aposenta');
  p.age = 34;
  assert(G.canRetire(w), 'veterano pode se aposentar');
  G.retireCareer(w);
  assert(c.retired && G.playCareerWeek(w).report === null, 'carreira encerrada não avança');
  // Save idempotente na migração.
  const json = JSON.stringify(w);
  assert(JSON.stringify(G.migrateWorld(JSON.parse(json))) === json, 'migrateWorld preserva a carreira de jogador');
  console.log(`player career ok: ${reports} jogos, ${row.apps} em campo, ${row.goals} gols, ${accepted} transferência(s), ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

/** Expansão (20 clubes por divisão, mais divisões), estrelas pela força dos titulares e renovações em lote (World v9). */
function runV9Checks(): void {
  const w = freshWorld();
  const u = user(w);
  // Estrutura e calendário
  assert(G.seasonWeeks(w) === G.TOTAL_WEEKS && G.leagueRounds(w) === LEAGUE_ROUNDS && LEAGUE_ROUNDS === (DIVISION_SIZE - 1) * 2, `temporada de ${G.TOTAL_WEEKS} semanas e ${LEAGUE_ROUNDS} rodadas`);
  for (const lg of LEAGUE_IDS) {
    const cup = w.cups[cupId(lg)]!;
    assert(cup.entrants.length === 32 && new Set(cup.entrants).size === 32, `${lg}: Copa Nacional com 32 clubes`);
  }
  // Estrelas: até 5, ligas fracas e divisões de baixo com menos estrelas.
  const stars = (div: DivisionId) => Object.values(w.clubs).filter((c) => c.div === div).map((c) => G.clubStars(w, c));
  const eng1 = stars('eng1'), gre1 = stars('gre1'), bra4 = stars('bra4');
  assert(Math.max(...eng1) >= 4.5 && Math.max(...eng1) <= 5, `estrelas até 5 (eng1 máx ${Math.max(...eng1)})`);
  assert(Math.max(...gre1) <= 3.5 && Math.max(...bra4) <= 2.5, `ligas fracas sem tantas estrelas (gre1 ${Math.max(...gre1)}, bra4 ${Math.max(...bra4)})`);
  // A força é a dos titulares: reservas ruins não mudam, titulares sim.
  const xi0 = G.teamRating(w, u);
  const benchGuy = w.players[u.squad.find((id) => !u.lineup.includes(id))!];
  const ovr0 = benchGuy.ovr;
  benchGuy.ovr = 30;
  assert(G.teamRating(w, u) === xi0, 'reserva não muda a força do time');
  benchGuy.ovr = ovr0;
  const starter = w.players[u.lineup.find(Boolean)!];
  starter.ovr -= 20;
  assert(G.teamRating(w, u) < xi0, 'titular muda a força do time');
  starter.ovr += 20;

  // Migração v8 -> v9 na pré-temporada: clubes novos e divisões de 20.
  const old = JSON.parse(JSON.stringify(w)) as World;
  // Save antigo: sem os clubes novos e com 16 clubes por divisão.
  const legacyWorld = (x: World) => {
    for (const id of Object.keys(x.clubs)) if (/-n\d\d$/.test(id)) delete x.clubs[id];
    for (const lg of LEAGUE_IDS) {
      const divs = LEAGUES[lg].divisions;
      Object.values(x.clubs).filter((c) => c.league === lg).sort((a, b) => b.rep - a.rep).forEach((c, i) => { c.div = divs[Math.floor(i / 16)]; });
    }
  };
  legacyWorld(old);
  old.version = 8;
  old.week = 0;
  const mig = G.migrateWorld(old);
  assert(Object.keys(mig.clubs).length === CLUBS.length && DIVISION_IDS.every((d) => Object.values(mig.clubs).filter((c) => c.div === d).length === DIVISION_SIZE), 'migração v9: 20 clubes em cada divisão');
  assert(mig.inbox[0].title === 'As ligas cresceram' && mig.weeks.length === G.TOTAL_WEEKS + 1, 'migração v9 refaz o calendário e avisa');
  const mid = JSON.parse(JSON.stringify(w)) as World;
  legacyWorld(mid);
  mid.version = 8;
  mid.week = 12;
  const mig2 = G.migrateWorld(mid);
  assert(Object.keys(mig2.clubs).length < CLUBS.length && mig2.inbox[0].title === 'As ligas vão crescer', 'no meio da temporada a expansão fica para a próxima');
  const added = G.seedMissingClubs(mig2);
  assert(added > 0 && G.rebalanceDivisions(mig2) && DIVISION_IDS.every((d) => Object.values(mig2.clubs).filter((c) => c.div === d).length === DIVISION_SIZE), 'newSeason completa e reorganiza as divisões');

  // Renovações: plano, lote e avisos.
  const mine = clubPlayers(w, u).filter((p) => !p.loan).sort((a, b) => b.ovr - a.ovr).slice(0, 6);
  for (const p of mine) { p.contract = 1; p.renewAsk = null; p.morale = 70; }
  u.money += 50_000_000;
  const plan = G.renewalPlan(w, 1.12);
  assert(plan.length >= 6 && plan.every((r) => r.terms.wage > 0 && r.chance >= 0 && r.chance <= 1), 'renewalPlan');
  const wk = G.renewalWeeks(w);
  w.week = wk.first;
  const m0 = w.nextMsg;
  G.renewalReminders(w);
  const warn = w.inbox.find((m) => m.id >= m0 && m.link?.href.includes('renovacoes'));
  assert(warn && /contratos? no último ano/.test(warn.title), 'aviso de contratos no início da temporada');
  const ids = mine.slice(0, 4).map((p) => p.id);
  const res = G.bulkRenew(w, ids, 1.12);
  assert(res.renewed.length + res.failed.length === 4 && res.renewed.length >= 2, `renovação em lote (${res.renewed.length}/4)`);
  assert(res.renewed.every((r) => w.players[r.pid].contract === G.renewedContract(w, r.years) && w.players[r.pid].wage === r.wage), 'renovados com os novos termos');
  w.autoRenew = 'all';
  w.week = wk.last;
  const m1 = w.nextMsg;
  G.renewalReminders(w);
  const auto = w.inbox.find((m) => m.id >= m1);
  assert(auto && auto.title.startsWith('Renovação automática'), 'renovação automática na reta final');
  console.log(`v9 ok: ${CLUBS.length} clubes, ${DIVISION_IDS.length} divisões; estrelas eng1 ${Math.min(...eng1)}–${Math.max(...eng1)}, gre1 ${Math.min(...gre1)}–${Math.max(...gre1)}, bra4 ${Math.min(...bra4)}–${Math.max(...bra4)}; lote ${res.renewed.length}/4; "${auto.title}"`);
}

/** Formação personalizada: funções por linha, limites, escalação automática e partida com o desenho próprio. */
function runShapeChecks(): void {
  for (const f of G.FORMATION_KEYS) assert(G.shapeIssue(G.FORMATIONS[f]) === null, `${f} é um desenho válido`);
  const base = G.FORMATIONS['4-4-2'].map((s) => ({ ...s }));
  // Lateral (slot 1) sobe para o meio: continua LAT (ala); atacante (slot 9) recua para o meio: vira meia/volante.
  const ala = G.moveSlot(base, 1, 40, 10)!;
  assert(ala && ala[1].pos === 'LAT' && G.lineOf(ala[1].x) === 'mid', 'lateral vira ala no meio');
  const back = G.moveSlot(base, 9, 60, 50)!;
  assert(back && ['VOL', 'MEI'].includes(back[9].pos), 'atacante que recua ganha função de meio');
  assert(G.moveSlot(base, 0, 40, 50) === null, 'goleiro fixo');
  // Defesa com 4: tirar 2 zagueiros deixa 2 atrás (mínimo 3).
  const three = G.moveSlot(base, 2, 36, 50)!;
  assert(three && G.moveSlot(three, 3, 36, 70) === null, 'defesa precisa de ao menos 3');
  assert(G.moveSlot(base, 6, 45, 58) === null, 'duas posições não se sobrepõem');
  assert(G.setSlotRole(base, 9, 'ZAG') === null && G.setSlotRole(base, 9, 'MEI')?.[9].pos === 'MEI', 'só funções da linha');
  assert(G.shapeLabel(G.FORMATIONS['4-2-3-1']) === '4-2-3-1' && G.shapeLabel(G.FORMATIONS['4-3-3']) === '4-3-3', 'rótulo do desenho');

  const w = freshWorld();
  const u = user(w);
  let shape = G.FORMATIONS['4-4-2'].map((s) => ({ ...s }));
  shape = G.moveSlot(shape, 3, 36, 50)!; // um zagueiro vira volante
  shape = G.moveSlot(shape, 2, 22, 50)!; // o outro vai ao centro da defesa
  shape = G.moveSlot(shape, 5, 72, 20)!; // meia aberto vira ponta
  assert(!!shape && G.shapeIssue(shape) === null, 'desenho personalizado válido');
  u.shape = shape; u.shapeOn = true;
  autoLineup(w, u);
  assert(G.shapeOf(u) === shape && G.formationLabel(u).endsWith('personalizada'), 'clube usa o desenho personalizado');
  const pos = (i: number) => w.players[u.lineup[i]!]?.pos;
  assert(shape.every((s, i) => s.pos === 'GOL' ? pos(i) === 'GOL' : !!u.lineup[i]), 'escalação automática preenche o desenho');
  const opp = Object.values(w.clubs).find((c) => c.div === u.div && c.id !== u.id)!;
  autoLineup(w, opp);
  const sim = new Sim(w, u.id, opp.id);
  const side = sim.sides[0];
  assert(JSON.stringify(side.shape) === JSON.stringify(shape), 'a partida usa o desenho personalizado');
  sim.setFormation('4-3-3');
  assert(side.shape === G.FORMATIONS['4-3-3'], 'trocar a formação no jogo troca o desenho');
  sim.setShape(shape);
  sim.runToEnd();
  assert(sim.finished, 'partida termina com o desenho personalizado');
  u.shapeOn = false;
  assert(G.shapeOf(u) === G.FORMATIONS[u.formation] && !!u.shape, 'desligar mantém o desenho guardado');
  console.log(`shape ok: ${G.shapeLabel(shape)} personalizada, ${sim.score[0]} x ${sim.score[1]}`);
}

/** Competições novas, patrocínio, teto salarial fixo, metas da diretoria e vagas de treinador (World v10). */
function runV10Checks(): void {
  const w = freshWorld();
  const u = user(w);
  // Calendário: 55 semanas, nenhum clube com dois jogos na mesma semana, copas nas semanas certas.
  assert(G.seasonWeeks(w) === 55 && G.leagueRounds(w) === 38, 'temporada de 55 semanas e 38 rodadas');
  assert(G.weekComps(w.weeks[1]).every((c) => c.startsWith('sup:')) && G.weekComps(w.weeks[55]).join() === 'inter', 'supercopas abrem e Intercontinental fecha');
  assert(Object.keys(w.cups).some((c) => c.startsWith('est:')) && !!w.cups.ne && !!w.cups['lcup:eng'], 'estaduais, Copa do Nordeste e copas da liga');
  assert(G.competitionName('cup:bra') === 'Copa do Brasil' && G.competitionName('est:SP') === 'Campeonato Paulista' && G.competitionName('lib') === 'Copa Libertadores', 'nomes reais das copas');
  // Teto salarial fixo por liga e divisão.
  assert(u.wageCap === G.leagueWageCap(u) && G.leagueWageCap({ league: 'eng', div: 'eng1' }) > G.leagueWageCap({ league: 'gre', div: 'gre1' }), 'teto fixo da divisão do usuário');
  const same = Object.values(w.clubs).find((c) => c.div === u.div && c.id !== u.id)!;
  assert(G.leagueWageCap(same) === u.wageCap, 'mesmo teto para a divisão inteira');
  // Patrocínio: três propostas, assinatura, bônus.
  assert(w.sponsorOffers?.length === 3 && new Set(w.sponsorOffers.map((d) => d.kind)).size === 3, 'três propostas de patrocínio');
  const perf = w.sponsorOffers.find((d) => d.kind === 'desempenho')!;
  assert(G.chooseSponsor(w, perf.id) && u.sponsorDeal?.brand === perf.brand && u.sponsor === perf.weekly && !w.sponsorOffers, 'assina o patrocínio');
  const m0 = u.money;
  G.sponsorWin(w);
  assert(u.money === m0 + perf.winBonus && perf.winBonus > 0, 'bônus por vitória');
  // Metas da diretoria.
  const goals = w.board.goals ?? [];
  assert(goals[0]?.kind === 'league' && goals.some((g) => g.kind === 'cup') && goals.some((g) => g.kind === 'finance') && goals.some((g) => g.kind === 'derby'), 'metas: liga, copa, finanças, clássico');
  assert(goals.every((g) => ['done', 'on', 'risk', 'failed'].includes(G.goalProgress(w, g).state)), 'progresso das metas');
  const ev = G.evaluateGoals(w);
  assert(ev.results.length === goals.length - 1 && Number.isFinite(ev.delta), 'avaliação das metas extras');
  // Vagas de treinador.
  assert((w.vacancies?.length ?? 0) > 0 && w.vacancies!.every((v) => v.club !== u.id), 'vagas abertas');
  const rep = G.managerRep(w);
  assert(rep >= 20 && rep <= 100, `reputação do treinador (${rep})`);
  const easiest = w.vacancies!.slice().sort((a, b) => G.jobChance(w, b.club) - G.jobChance(w, a.club))[0];
  assert(G.applyForJob(w, easiest.club) === null && G.applyForJob(w, easiest.club) !== null, 'candidatura (e não repete)');
  w.week = 1;
  G.processApplications(w);
  const app = w.applications!.find((a) => a.club === easiest.club)!;
  assert(app.status === 'offer' || app.status === 'rejected', `resposta da candidatura (${app.status})`);
  // Migração v9 -> v10: calendário antigo na pré-temporada vira o novo.
  const old = JSON.parse(JSON.stringify(freshWorld())) as World;
  old.version = 9;
  old.week = 0;
  for (const wk of old.weeks) if (wk && wk.type !== 'league') { delete wk.comps; wk.type = 'cup'; }
  const u2 = old.clubs[old.userClub];
  delete u2.sponsorDeal; delete old.sponsorOffers; delete old.board.goals; delete old.vacancies;
  const mig = G.migrateWorld(old);
  assert(mig.version === WORLD_VERSION && mig.weeks.every((wk) => !wk || wk.type === 'league' || !!wk.comps) && !!mig.board.goals?.length && !!mig.sponsorOffers?.length, 'migração v10 na pré-temporada');
  console.log(`v10 ok: ${Object.keys(w.cups).length} copas, teto ${formatMoney(u.wageCap)}/sem, patrocínio ${perf.brand}, ${goals.length} metas, reputação ${rep}, candidatura: ${app.status}`);
}

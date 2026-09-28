// Teste de balanceamento headless do motor do Manager.
//   npx tsx scripts/sim-test.ts [clubId] [--seasons N] [--checks]
// Sem --checks: simula N temporadas (padrão 3) com todos os clubes no automático.
// Com --checks: exercita uma vez a API de mercado/base e uma partida ao vivo interativa.
import {
  CLUBS, Sim, UPGRADES, autoLineup, applyResult, clubPlayers, completeBuy, currentWeek, endWeek, evaluateBid,
  formatMoney, jobOffers, newSeason, newWorld, promoteYouth, release, renew, runTrial, simulateWeek, startSeason,
  switchClub, topScorers, upgrade, user, userMatch,
} from '../src/game';
import type { World } from '../src/game';

const args = process.argv.slice(2);
const clubId = args.find((a) => !a.startsWith('--')) || 'guanabara';
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

  const json = JSON.stringify(w);
  assert(JSON.stringify(JSON.parse(json)) === json, 'World é serializável em JSON');
  console.log(`checks ok (JSON ${(json.length / 1024).toFixed(0)} KB)`);
}

if (args.includes('--checks')) runChecks();
else runSeasons();

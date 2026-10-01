// Testes dos lances em 3D (sem navegador): taxa de gol por nível do bot (precisa cair com a
// dificuldade), dificuldade automática, gesto de chute e a súmula do Manager montada com os lances.
// Uso: npx tsx scripts/lances-test.ts
import { Difficulty, botParams } from '../src/lances/difficulty';
import { Chance, GOAL_Z, type LanceResult, type ScenarioKind } from '../src/lances/engine';
import { contrastKit, genericChance } from '../src/lances/scenario';
import { swipeToShot } from '../src/lances/runner';
import { chanceMinutes } from '../src/lances/series';
import { lancesMatchResult, prepareLances } from '../src/components/match/lancesResult';
import { autoLineup, newWorld, nextFixture, startSeason } from '../src/game';

function check(cond: unknown, msg: string): void {
  if (!cond) throw new Error('Falhou: ' + msg);
}

/** Gerador determinístico (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const team = (id: string, rating: number) => ({ id, rating, club: { name: id, short: id.slice(0, 3).toUpperCase(), colors: ['#fff', '#000'], pattern: 'solid', league: 'bra' as const } });

/** Jogador-robô quase perfeito: passa quando apertado, chuta no canto oposto ao goleiro. */
function playBot(c: Chance, rng: () => number): LanceResult {
  let passed = false, shot = false, t = 0;
  while (c.phase !== 'done' && t < 25) {
    c.update(1 / 60); t += 1 / 60;
    if (c.phase !== 'play') continue;
    const car = c.actors[c.carrier];
    const near = Math.min(...c.defenders.map((d) => Math.hypot(d.x - car.x, d.z - car.z)));
    if (!passed && c.clock > 1.2 && near < 3) {
      const mates = c.attackers.filter((a) => a.i !== c.carrier).map((a) => ({ a, free: Math.min(...c.defenders.map((d) => Math.hypot(d.x - a.x, d.z - a.z))) }));
      mates.sort((x, y) => y.free - x.free);
      if (mates[0] && mates[0].free > 2.5) { c.commandPass(mates[0].a.i); passed = true; continue; }
    }
    if (!shot && car.z > GOAL_Z - 20 && (c.clock > 3 || near < 1.6)) {
      c.commandShot({ tx: c.keeper.x > 0 ? -2.9 : 2.9, ty: 0.4 + rng() * 1.6, power: 0.75, curve: 0 });
      shot = true;
    }
  }
  check(c.phase === 'done' && c.result, 'o lance precisa terminar');
  return c.result!;
}

const t0 = performance.now();

// 1) Taxa de gol por nível: precisa cair a cada nível, e ficar em faixas jogáveis.
const N = 300;
const rates: number[] = [];
for (const lvl of [0, 1, 2, 3]) {
  const rng = seeded(1000 + lvl);
  const out: Record<string, number> = {};
  for (let k = 0; k < N; k++) {
    const r = playBot(new Chance(genericChance(team('a', 78), team('b', 78), botParams(lvl), rng), rng), rng);
    out[r.outcome] = (out[r.outcome] ?? 0) + 1;
    if (r.goal) check(r.outcome === 'goal' && r.scorer, 'gol precisa ter autor');
  }
  const rate = (out.goal ?? 0) / N;
  rates.push(rate);
  console.log(`nível ${lvl}: gol ${(rate * 100).toFixed(0)}%`, JSON.stringify(out));
}
for (let i = 1; i < rates.length; i++) check(rates[i] < rates[i - 1], `taxa de gol cai do nível ${i - 1} para o ${i}`);
check(rates[0] > 0.7 && rates[0] < 0.99, 'fácil: robô perfeito marca quase sempre');
check(rates[3] > 0.1 && rates[3] < 0.45, 'lendário: difícil, mas possível');

// 2) Todos os cenários terminam (inclusive sem fazer nada: tempo esgotado ou desarme).
for (const kind of ['centro', 'ponta', 'contra', 'entrada'] as ScenarioKind[]) {
  const rng = seeded(7);
  const c = new Chance(genericChance(team('a', 70), team('b', 70), botParams(1.5), rng, kind), rng);
  for (let t = 0; t < 20 && c.phase !== 'done'; t += 1 / 60) c.update(1 / 60);
  check(c.phase === 'done' && c.result && !c.result.goal, `${kind}: parado não marca e termina`);
}

// 3) Dificuldade automática: sobe com gols, desce com erros; fixa não muda.
const auto = new Difficulty('auto', 1);
for (let i = 0; i < 6; i++) auto.record(true);
check(auto.level === 3, 'automático sobe até lendário');
for (let i = 0; i < 20; i++) auto.record(false);
check(auto.level === 0, 'automático desce até fácil');
const fixed = new Difficulty('dificil');
fixed.record(true);
check(fixed.level === 2, 'nível fixo não muda');

// 4) Gesto: direção escolhe o lado, comprimento escolhe a altura, curva dá efeito.
const ball = { x: 400, y: 700 }, goal = { x: 400, y: 300 };
const swipe = (dx: number, dy: number, bend = 0, ms = 160) => {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const f = i / 10;
    pts.push({ x: 400 + dx * f + bend * Math.sin(Math.PI * f), y: 700 + dy * f, t: ms * f });
  }
  return swipeToShot(pts, ball, goal, 800);
};
check(swipe(0, 4) === null && swipe(5, -10) === null, 'toque ou gesto para baixo não chuta');
const mid = swipe(0, -240)!, right = swipe(60, -240)!, left = swipe(-60, -240)!;
check(Math.abs(mid.screenX - 400) < 1, 'reto mira no meio');
check(right.screenX > 450 && left.screenX < 350, 'inclinar o gesto muda o lado');
const low = swipe(0, -100)!, high = swipe(0, -400)!;
check(low.height < 0.6 && mid.height > 1 && mid.height < 2 && high.height > 2.44, 'curto rasteiro, médio meia altura, longo por cima');
check(swipe(0, -240, 0, 80)!.power > swipe(0, -240, 0, 600)!.power, 'gesto rápido chuta mais forte');
check(swipe(0, -240, -60)!.curve < 0 && swipe(0, -240, 60)!.curve > 0 && mid.curve === 0, 'curvatura do gesto dá efeito');

// 5) Uniformes: a defesa nunca veste o mesmo que o ataque.
{
  const k = (c0: string, c1: string) => ({ name: 'x', short: 'X', colors: [c0, c1] as [string, string], pattern: 'stripes' });
  const same = contrastKit(k('#1e3a8a', '#ffffff'), k('#1e3a8a', '#ffffff'));
  check(same.colors[0] !== '#1e3a8a' && same.colors[0] !== '#ffffff', 'mesmo time: reserva');
  check(contrastKit(k('#ffffff', '#c00000'), k('#1e3a8a', '#ffffff')).colors[0] === '#ffffff', 'cores diferentes: mantém');
  const sameChance = genericChance(team('a', 70), team('a', 70), botParams(1));
  check(sameChance.attack.kit.colors[0] !== sameChance.defense.kit.colors[0], 'duelo do mesmo time com uniformes diferentes');
}

// 5b) Minutos dos lances: distintos, em ordem e espalhados pelo jogo.
for (let s = 0; s < 200; s++) {
  const n = 3 + (s % 7);
  const mins = chanceMinutes(n, seeded(s));
  check(mins.length === n && mins.every((m, i) => m >= 3 && m <= 90 && (i === 0 || m > mins[i - 1])), 'minutos distintos e ordenados');
  check(mins[0] < 3 + 86 / n + 1 && mins[n - 1] >= 3 + (86 * (n - 1)) / n - 1, 'um lance em cada trecho do jogo');
}

// 6) Manager: a súmula usa os gols do adversário da simulação e os gols dos lances.
const w = newWorld('Teste', 'anhangabau');
startSeason(w);
for (const c of Object.values(w.clubs)) autoLineup(w, c);
const m = nextFixture(w)!.m;
check(m, 'primeiro jogo do usuário');
const prep = prepareLances(w, m);
check(prep.plan.chances.length >= 3 && prep.plan.chances.length <= 7, '3 a 7 lances por jogo');
const setup = prep.plan.setup('centro', prep.plan.difficulty.params(), 0);
check(setup.attack.players.length >= 2 && setup.attack.players.every((p) => w.clubs[w.userClub].squad.includes(p.id)), 'atacantes saem do elenco do usuário');
const u = prep.userSide;
const scorer = setup.attack.players[0].id;
const goalAt = (min: number, pid: string | null) => ({ min, simulated: pid === null, result: { outcome: 'goal' as const, goal: true, scorer: pid, assist: null, text: 'Gol' } });
const miss = (min: number) => ({ min, simulated: false, result: { outcome: 'save' as const, goal: false, scorer: null, assist: null, text: 'Defesa' } });
const res = lancesMatchResult(w, m, prep, { results: [goalAt(12, scorer), miss(40), goalAt(77, null)], userGoals: 2, oppGoals: prep.plan.oppGoals.length, tiebreak: null });
const mine = u === 0 ? res.hs : res.as, theirs = u === 0 ? res.as : res.hs;
check(mine === 2 && theirs === prep.plan.oppGoals.length, 'placar = lances do usuário x simulação do adversário');
check(res.goals.length === res.hs + res.as && res.goals.every((g, i) => i === 0 || res.goals[i - 1].min <= g.min), 'gols em ordem');
check(res.goals.filter((g) => g.side === u).every((g) => res.played[u].includes(g.pid)), 'autores dos gols constam em campo');
check(res.winner === (mine > theirs ? u : mine < theirs ? 1 - u : -1), 'vencedor coerente');
check(res.stats ? res.stats.onT[u] === 3 : true, 'finalizações no alvo contam gols e defesas');
check(setup.attack.players.some((p) => p.id === scorer) && res.goals.some((g) => g.pid === scorer && g.min === 12), 'gol do lance com o autor certo');

console.log(`lances ok (${((performance.now() - t0) / 1000).toFixed(1)} s)`);

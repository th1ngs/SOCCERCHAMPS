// Testes dos lances em 3D (sem navegador): taxa de gol por nível do bot (precisa cair com a
// dificuldade), dificuldade automática, gesto de chute e a súmula do Manager montada com os lances.
// Uso: npx tsx scripts/lances-test.ts
import { Difficulty, botParams } from '../src/lances/difficulty';
import { Chance, GOAL_Z, type ScenarioKind } from '../src/lances/engine';
import { playBot } from './lances-bot';
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
check(rates[0] > 0.75 && rates[0] < 0.99, 'fácil: robô perfeito marca quase sempre');
check(rates[3] > 0.15 && rates[3] < 0.45, 'lendário: difícil, mas possível');

// 2) Todos os cenários terminam (inclusive sem fazer nada: tempo esgotado ou desarme).
for (const kind of ['centro', 'ponta', 'contra', 'entrada'] as ScenarioKind[]) {
  const rng = seeded(7);
  const c = new Chance(genericChance(team('a', 70), team('b', 70), botParams(1.5), rng, kind), rng);
  for (let t = 0; t < 20 && c.phase !== 'done'; t += 1 / 60) c.update(1 / 60);
  check(c.phase === 'done' && c.result && !c.result.goal, `${kind}: parado não marca e termina`);
}

// 2b) Mecânicas: impedimento, passe por cima, de primeira, cabeceio, cavadinha, drible e arrancada.
const playing = (kind: ScenarioKind, lvl: number, seed: number) => {
  const rng = seeded(seed);
  const c = new Chance(genericChance(team('a', 75), team('b', 75), botParams(lvl), rng, kind), rng);
  while (c.phase !== 'play') c.update(1 / 60);
  return c;
};
const runOut = (c: Chance, max = 12) => { for (let t = 0; t < max && c.phase !== 'done'; t += 1 / 60) c.update(1 / 60); return c.result!; };
{
  // Companheiro à frente da linha no momento do passe: impedimento.
  const c = playing('centro', 0, 11);
  const m = c.attackers.find((a) => a.i !== c.carrier)!;
  for (const d of c.defenders) d.x = 25;
  m.x = -20; m.z = c.offsideLine() + 3;
  check(c.isOffside(m), 'atacante à frente da linha está em impedimento');
  c.commandPass(m.i);
  check(runOut(c).outcome === 'offside', 'passe para o impedido vira impedimento');
}
{
  // Mesmo passe com ele atrás da linha: recebe normalmente.
  const c = playing('centro', 0, 12);
  const m = c.attackers.find((a) => a.i !== c.carrier)!;
  for (const d of c.defenders) d.x = 25;
  m.x = -20; m.z = c.offsideLine() - 2;
  check(!c.isOffside(m), 'atrás da linha está em condição');
  c.commandPass(m.i);
  for (let t = 0; t < 4 && c.phase === 'pass'; t += 1 / 60) c.update(1 / 60);
  check(c.carrier === m.i && c.phase === 'play', 'em condição: o companheiro domina a bola');
}
{
  // Os companheiros do usuário respeitam a linha: no fácil (sem linha em bloco) quase nunca ficam impedidos.
  let ticks = 0, off = 0;
  for (let s = 0; s < 40; s++) {
    const c = playing((['centro', 'ponta', 'entrada', 'contra'] as ScenarioKind[])[s % 4], 0, 100 + s);
    for (let t = 0; t < 6 && c.phase === 'play'; t += 1 / 60) {
      c.update(1 / 60);
      if (c.clock < 1.5) continue;
      for (const a of c.attackers) if (a.i !== c.carrier) { ticks++; if (c.isOffside(a)) off++; }
    }
  }
  check(off / ticks < 0.03, `companheiros evitam o impedimento (${((off / ticks) * 100).toFixed(1)}% do tempo impedidos)`);
}
{
  // Passe por cima passa sobre um defensor no meio do caminho; o rasteiro é cortado bem mais vezes.
  const trial = (lofted: boolean, seed: number) => {
    const c = playing('centro', 3, seed);
    const car = c.actors[c.carrier];
    const m = c.attackers.find((a) => a.i !== c.carrier)!;
    m.x = car.x - 14; m.z = car.z; m.vx = 0; m.vz = 0;
    const [d0, ...rest] = c.defenders;
    for (const d of rest) d.x = 28;
    d0.x = car.x - 7; d0.z = car.z;
    c.keeper.z = GOAL_Z - 1;
    c.commandPass(m.i, lofted);
    for (let t = 0; t < 4 && c.phase === 'pass'; t += 1 / 60) c.update(1 / 60);
    return c.carrier === m.i;
  };
  let low = 0, high = 0;
  for (let s = 0; s < 60; s++) { if (trial(false, 300 + s)) low++; if (trial(true, 300 + s)) high++; }
  check(high > low + 15 && high >= low * 3, `passe por cima evita o corte (rasteiro ${low}/60, por cima ${high}/60)`);
}
{
  // Chute pedido durante o passe: sai de primeira (bola rasteira) ou de cabeça (bola alta).
  const firstTime = (lofted: boolean) => {
    const c = playing('centro', 0, 21);
    const m = c.attackers.find((a) => a.i !== c.carrier)!;
    for (const d of c.defenders) d.x = 28;
    m.x = c.actors[c.carrier].x - 8; m.z = c.offsideLine() - 1.5; m.vx = 0; m.vz = 0;
    c.commandPass(m.i, lofted);
    check(c.commandShot({ tx: 2, ty: 1, power: 0.8, curve: 0 }), 'chute aceito durante o passe');
    for (let t = 0; t < 4 && c.phase === 'pass'; t += 1 / 60) c.update(1 / 60);
    return c;
  };
  const v = firstTime(false);
  check(v.phase === 'shot' && v.shotKind === 'volley', 'chute de primeira');
  const hd = firstTime(true);
  check(hd.phase === 'shot' && hd.shotKind === 'header', `cabeceio quando a bola chega alta (${hd.phase}/${hd.shotKind})`);
}
{
  // Cavadinha: gesto lento e comprido sobe a bola acima de 2,8 m.
  const c = playing('entrada', 0, 31);
  c.commandShot({ tx: 1, ty: 2, power: 0.3, curve: 0 });
  check(c.shotKind === 'chip', 'cavadinha reconhecida');
  let top = 0;
  for (let t = 0; t < 3 && c.phase === 'shot'; t += 1 / 60) { c.update(1 / 60); top = Math.max(top, c.ball.y); }
  check(top > 2.8, `cavadinha sobe (${top.toFixed(1)} m)`);
}
{
  // Drible: deixa o marcador no chão parte das vezes, tem recarga; arrancada é mais rápida que conduzir normal.
  let stunned = 0;
  for (let s = 0; s < 80; s++) {
    const c = playing('centro', 1, 400 + s);
    const car = c.actors[c.carrier], d = c.defenders[0];
    d.x = car.x + 0.6; d.z = car.z + 1.2;
    check(c.commandDribble(), 'drible aceito');
    check(!c.commandDribble(), 'drible tem recarga');
    if (d.stunT > 0) stunned++;
  }
  check(stunned > 15 && stunned < 75, `drible às vezes dá certo (${stunned}/80)`);
  const run = (sprint: boolean) => {
    const c = playing('contra', 0, 50);
    const car = c.actors[c.carrier];
    const z0 = car.z;
    for (let t = 0; t < 1.5; t += 1 / 60) { c.commandMove(car.x, car.z + 10, sprint); c.update(1 / 60); }
    return car.z - z0;
  };
  check(run(true) > run(false) + 0.3, 'segurar e arrastar corre mais que tocar no gramado');
}

// 2c) Goleiro: mergulha no tempo certo e só defende onde está.
{
  let early = 0, longShots = 0, badSaves = 0, saves = 0, letGo = 0, offTarget = 0;
  for (let s = 0; s < 240; s++) {
    const rng = seeded(900 + s);
    const c = new Chance(genericChance(team('a', 75), team('b', 75), botParams(s % 4), rng, 'centro'), rng);
    while (c.phase !== 'play') c.update(1 / 60);
    for (const d of c.defenders) d.x = 30;
    const car = c.actors[c.carrier];
    const far = s % 2 === 0;
    car.x = (rng() - 0.5) * 10; car.z = far ? GOAL_Z - 25 : GOAL_Z - 15;
    c.ball.x = car.x; c.ball.z = car.z + 0.5;
    for (let t = 0; t < 1; t += 1 / 60) { c.commandStop(); c.update(1 / 60); }
    const wide = s % 5 === 4;
    c.commandShot({ tx: wide ? 6 : (rng() - 0.5) * 6, ty: wide ? 1 : 0.3 + rng() * 1.6, power: 0.8, curve: 0 });
    const k = c.keeper;
    let diveAt = -1, passAt = -1, t = 0;
    for (; t < 3 && (c.phase as string) === 'shot'; t += 1 / 120) {
      c.update(1 / 120);
      if (diveAt < 0 && k.state === 'dive' && !k.dive?.stand) diveAt = t;
      if (passAt < 0 && c.ball.z >= k.z - 0.1) passAt = t;
    }
    if (far && diveAt >= 0 && passAt >= 0) { longShots++; if (passAt - diveAt > 0.65) early++; }
    if (c.result?.outcome === 'save') { saves++; if (Math.abs(c.ball.x - k.x) > 2.1) badSaves++; }
    if (wide && c.result?.outcome === 'miss') { offTarget++; if (k.dive?.stand) letGo++; }
  }
  check(longShots > 20 && early === 0, `goleiro não cai antes da bola chegar (${early}/${longShots} chutes de longe)`);
  check(saves > 10 && badSaves === 0, `defesa só com a bola perto dele (${badSaves}/${saves})`);
  check(offTarget > 5 && letGo === offTarget, `bola para fora: ele não se atira (${letGo}/${offTarget})`);
}

// 2d) Qualidades mudam o jogo: velocidade, fôlego e finalização.
{
  const withAttrs = (patch: Partial<Record<'vel' | 'fol' | 'fin', number>>, seed = 5) => {
    const rng = seeded(seed);
    const setup = genericChance(team('a', 70), team('b', 70), botParams(0), rng, 'contra');
    Object.assign(setup.attack.players[0].attrs, patch);
    const c = new Chance(setup, rng);
    while (c.phase !== 'play') c.update(1 / 60);
    for (const d of c.defenders) { d.x = 30; d.z = 10; }
    return c;
  };
  const sprint = (c: Chance, secs: number) => {
    const a = c.actors[c.carrier], z0 = a.z;
    for (let t = 0; t < secs; t += 1 / 60) { c.commandMove(a.x, a.z + 6, true); c.update(1 / 60); }
    return { dist: a.z - z0, stamina: a.stamina };
  };
  const slow = sprint(withAttrs({ vel: 45, fol: 70 }), 2), fast = sprint(withAttrs({ vel: 92, fol: 70 }), 2);
  check(fast.dist > slow.dist + 1.5, `velocidade: rápido corre mais (${fast.dist.toFixed(1)} m x ${slow.dist.toFixed(1)} m em 2 s)`);
  const tired = sprint(withAttrs({ vel: 70, fol: 35 }), 3), fit = sprint(withAttrs({ vel: 70, fol: 92 }), 3);
  check(fit.stamina > tired.stamina + 0.12, `fôlego: quem tem mais cansa menos (${fit.stamina.toFixed(2)} x ${tired.stamina.toFixed(2)})`);
  const exhausted = withAttrs({ vel: 80, fol: 30 });
  const r1 = sprint(exhausted, 5), r2 = sprint(exhausted, 1);
  check(r1.stamina <= 0.15 && r2.dist < 7.2, `sem fôlego não arranca (${r2.dist.toFixed(1)} m/s)`);
  const shotSpeed = (fin: number) => {
    const c = withAttrs({ fin }, 9);
    c.commandShot({ tx: 1, ty: 1, power: 0.8, curve: 0 });
    return Math.hypot(c.ball.vx, c.ball.vz);
  };
  check(shotSpeed(95) > shotSpeed(45) + 1.5, `finalização: chute mais forte (${shotSpeed(95).toFixed(1)} x ${shotSpeed(45).toFixed(1)} m/s)`);
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

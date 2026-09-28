// Motor de partida minuto a minuto. Usado tanto no jogo ao vivo quanto na simulação rápida.
import { FORMATIONS, SECTOR, TACTICS, fit, say } from './data';
import { autoLineup, available, ensureLineup } from './squad';
import type {
  Ball, BallKind, FormationKey, MatchResult, MatchStats, OnField, Player, Position, SectorWeights, SideStrength,
  SimCard, SimEvent, SimEventType, SimGoal, SimInjury, SimOptions, SimPhase, SimSide, TacticKey, World,
} from './types';
import { clamp, gauss, pick, rand, randi, weighted } from './util';

const SHOOT_W: Record<Position, number> = { GOL: 0, ZAG: 0.5, LAT: 0.8, VOL: 1.1, MEI: 3, ATA: 6 };
const ASSIST_W: Record<Position, number> = { GOL: 0.05, ZAG: 0.4, LAT: 2, VOL: 1.4, MEI: 4, ATA: 2.2 };
const FOUL_W: Record<Position, number> = { GOL: 0.1, ZAG: 3, LAT: 2, VOL: 3, MEI: 1.2, ATA: 0.8 };
export const MAX_SUBS = 5;

type Volume = Required<SectorWeights>;
let BASE: Volume | null = null;
function baseVolume(): Volume {
  if (BASE) return BASE;
  const b: Volume = { d: 0, m: 0, a: 0 };
  for (const s of FORMATIONS['4-4-2']) {
    const wt = SECTOR[s.pos];
    b.d += wt.d || 0; b.m += wt.m || 0; b.a += wt.a || 0;
  }
  BASE = b;
  return b;
}

export class Sim {
  w: World;
  opts: SimOptions;
  sides: [SimSide, SimSide];
  minute = 0;
  stoppage: number;
  score: [number, number] = [0, 0];
  stats: MatchStats = { poss: [0, 0], shots: [0, 0], onT: [0, 0], fouls: [0, 0], yellow: [0, 0], red: [0, 0], corners: [0, 0], xg: [0, 0] };
  events: SimEvent[] = [];
  goals: SimGoal[] = [];
  cards: SimCard[] = [];
  injuries: SimInjury[] = [];
  ratings: Record<string, number> = {};
  /** Fadiga final de quem saiu de campo (substituído ou expulso). */
  endFat: Record<string, number> = {};
  phase: SimPhase = 'first';
  finished = false;
  pens: [number, number] | null = null;
  ball: Ball = { x: 50, y: 50, side: 0, kind: 'mid' };
  /** Eventos gerados no último step(). */
  fresh: SimEvent[] | null = null;
  /** Forças calculadas no minuto atual. */
  cur: SideStrength[] = [];
  /** Lesão no time do usuário (modo interativo) aguardando substituição manual. */
  pendingInjury: { side: number; pid: string } | null = null;

  constructor(w: World, homeId: string, awayId: string, opts: SimOptions = {}) {
    this.w = w;
    this.opts = opts;
    this.sides = [this.makeSide(homeId), this.makeSide(awayId)];
    this.stoppage = randi(1, 5);
    for (const s of this.sides) for (const o of s.on) this.ratings[o.pid] = 6.2;
  }

  makeSide(clubId: string): SimSide {
    const w = this.w, club = w.clubs[clubId];
    const user = clubId === w.userClub;
    if (user) ensureLineup(w, club); else autoLineup(w, club);
    // emergencyFill garante 11 disponíveis, então a escalação não tem vagas abertas.
    const on: OnField[] = club.lineup.map((pid, slot) => ({ pid: pid as string, slot, fat: w.players[pid as string].fitness, yc: 0 }));
    return {
      clubId, club, user,
      auto: !(user && this.opts.interactive),
      formation: club.formation, tactic: club.tactic, baseTactic: club.tactic,
      on, bench: club.bench.slice(), subs: 0, played: on.map((o) => o.pid),
    };
  }

  P(pid: string): Player { return this.w.players[pid]; }
  slotPos(side: SimSide, o: OnField): Position { return FORMATIONS[side.formation][o.slot].pos; }

  log(type: SimEventType, side: number | null, text: string): SimEvent {
    const ev: SimEvent = { min: this.minute, type, side, text };
    this.events.push(ev);
    if (this.fresh) this.fresh.push(ev);
    return ev;
  }

  strength(i: number): SideStrength {
    const s = this.sides[i], B = baseVolume();
    let d = 0, m = 0, a = 0, dw = 0, mw = 0, aw = 0, g = 35;
    for (const o of s.on) {
      const p = this.P(o.pid), sp = this.slotPos(s, o);
      const eff = p.ovr * fit(p.pos, sp) * (0.7 + (0.3 * o.fat) / 100) * (0.95 + (0.1 * p.morale) / 100);
      o.eff = eff;
      if (sp === 'GOL') { g = eff; continue; }
      const wt = SECTOR[sp];
      if (wt.d) { d += eff * wt.d; dw += wt.d; }
      if (wt.m) { m += eff * wt.m; mw += wt.m; }
      if (wt.a) { a += eff * wt.a; aw += wt.a; }
    }
    const vol = (total: number, wsum: number, base: number): number => (wsum ? total / wsum : 30) * (0.7 + 0.3 * Math.min(1.25, wsum / base));
    const t = TACTICS[s.tactic];
    let D = vol(d, dw, B.d) * t.def, Mi = vol(m, mw, B.m) * (t.mid || 1), A = vol(a, aw, B.a) * t.att;
    if (!this.opts.neutral && i === 0) { A *= 1.04; D *= 1.03; Mi *= 1.03; }
    return { A, D, M: Mi, G: g };
  }

  step(): SimEvent[] {
    const fresh: SimEvent[] = [];
    this.fresh = fresh;
    if (this.finished) return fresh;
    if (this.phase === 'half') { this.phase = 'second'; this.log('info', null, say('second')); }
    if (this.minute === 0) this.log('info', null, say('kickoff'));
    this.minute++;
    this.cur = [this.strength(0), this.strength(1)];
    const c3 = (x: number): number => x * x * x;
    const pHome = c3(this.cur[0].M) / (c3(this.cur[0].M) + c3(this.cur[1].M));
    const s = Math.random() < pHome ? 0 : 1;
    this.stats.poss[s]++;
    this.fatigue();

    let kind: BallKind = 'mid';
    if (Math.random() < 0.52) kind = this.attack(s);
    if (Math.random() < 0.11) { const k = this.foul(1 - s, s); if (k) kind = k; }
    if (Math.random() < 0.004) this.injury();
    this.autoManage();
    this.setBall(s, kind);

    if (this.minute === 45) { this.log('info', null, say('half')); this.phase = 'half'; }
    if (this.minute >= 90 + this.stoppage) this.finish();
    return fresh;
  }

  fatigue(): void {
    for (const s of this.sides) {
      const t = TACTICS[s.tactic].fatigue;
      for (const o of s.on) {
        const p = this.P(o.pid);
        const drain = (this.slotPos(s, o) === 'GOL' ? 0.08 : 0.3) * t * (p.age > 31 ? 1.15 : 1);
        o.fat = Math.max(10, o.fat - drain);
      }
    }
  }

  outfield(side: SimSide): OnField[] { return side.on.filter((o) => this.slotPos(side, o) !== 'GOL'); }

  attack(s: number): BallKind {
    const ratio = this.cur[s].A / this.cur[1 - s].D;
    const pShot = clamp(0.31 * Math.pow(ratio, 2.4), 0.07, 0.75);
    if (Math.random() >= pShot) {
      if (Math.random() < 0.15) {
        const o = pick(this.outfield(this.sides[s]));
        if (o) this.log('build', s, say('build', { t: this.sides[s].club.name, p: this.P(o.pid).name }));
      }
      return 'attack';
    }
    return this.shot(s, ratio, false);
  }

  shot(s: number, ratio: number, penalty: boolean): BallKind {
    const side = this.sides[s], opp = this.sides[1 - s];
    const field = this.outfield(side);
    if (!field.length) return 'mid';
    const shooterO = penalty
      ? field.slice().sort((a, b) => this.P(b.pid).ovr * SHOOT_W[this.P(b.pid).pos] - this.P(a.pid).ovr * SHOOT_W[this.P(a.pid).pos])[0]
      : (weighted(field, (o) => SHOOT_W[this.slotPos(side, o)] * Math.pow(this.P(o.pid).ovr / 70, 2)) as OnField);
    const shooter = this.P(shooterO.pid);
    const gkO = opp.on.find((o) => this.slotPos(opp, o) === 'GOL');
    const gkName = gkO ? this.P(gkO.pid).name : 'o goleiro improvisado';
    const gkEff = this.cur[1 - s].G;
    const shEff = shooterO.eff || shooter.ovr;
    const xg = penalty ? 0.76 : clamp((Math.pow(Math.random(), 1.7) * 0.26 + 0.025) * Math.pow(shEff / gkEff, 1.3) * Math.pow(ratio, 0.5), 0.02, 0.7);
    this.stats.shots[s]++;
    this.stats.xg[s] += xg;
    const vars = { p: shooter.name, t: side.club.name, g: gkName };
    const r = Math.random();
    if (r < xg) { this.goal(s, shooterO, penalty); return 'goal'; }
    if (penalty) {
      this.log('miss', s, say('penMiss', vars));
      if (gkO) this.ratings[gkO.pid] += 0.8;
      this.ratings[shooter.id] -= 0.6;
      return 'save';
    }
    if (r < xg + 0.3) {
      this.stats.onT[s]++;
      if (gkO) this.ratings[gkO.pid] += 0.18;
      this.ratings[shooter.id] += 0.05;
      this.log('save', s, say('save', vars));
      if (Math.random() < 0.3) this.corner(s);
      return 'save';
    }
    if (r < xg + 0.45) {
      this.log('miss', s, say('block', vars));
      if (Math.random() < 0.4) this.corner(s);
      return 'shot';
    }
    this.log('miss', s, say('miss', vars));
    this.ratings[shooter.id] -= 0.05;
    return 'shot';
  }

  corner(s: number): void {
    this.stats.corners[s]++;
    if (Math.random() < 0.3) this.log('info', s, say('corner', { t: this.sides[s].club.name }));
  }

  goal(s: number, shooterO: OnField, penalty: boolean): void {
    const side = this.sides[s], opp = this.sides[1 - s];
    const shooter = this.P(shooterO.pid);
    this.score[s]++;
    this.stats.onT[s]++;
    let assist: Player | null = null;
    if (!penalty && Math.random() < 0.78) {
      const mates = side.on.filter((o) => o.pid !== shooter.id);
      const a = weighted(mates, (o) => ASSIST_W[this.slotPos(side, o)] * (this.P(o.pid).ovr / 70));
      if (a) assist = this.P(a.pid);
    }
    this.goals.push({ side: s, pid: shooter.id, min: this.minute, assist: assist && assist.id, pen: penalty });
    this.ratings[shooter.id] += 1.1;
    if (assist) this.ratings[assist.id] += 0.6;
    for (const o of opp.on) {
      const sp = this.slotPos(opp, o);
      if (sp === 'GOL') this.ratings[o.pid] -= 0.45;
      else if (sp === 'ZAG' || sp === 'LAT') this.ratings[o.pid] -= 0.15;
    }
    let text = penalty ? say('penGoal', { p: shooter.name }) : say('goal', { p: shooter.name, t: side.club.name });
    if (assist) text += say('assist', { a: assist.name });
    this.log('goal', s, text);
  }

  foul(defS: number, attS: number): BallKind | null {
    const side = this.sides[defS];
    const o = weighted(side.on, (x) => FOUL_W[this.slotPos(side, x)]);
    if (!o) return null;
    const p = this.P(o.pid);
    this.stats.fouls[defS]++;
    const r = Math.random();
    if (r < 0.012 || (r < 0.19 && o.yc === 1)) {
      this.stats.red[defS]++;
      this.ratings[p.id] -= 1.5;
      this.cards.push({ pid: p.id, type: o.yc === 1 && r >= 0.012 ? 'yy' : 'red' });
      this.log('red', defS, say('red', { p: p.name }));
      this.sendOff(defS, o);
    } else if (r < 0.19) {
      o.yc = 1;
      this.stats.yellow[defS]++;
      this.ratings[p.id] -= 0.3;
      this.cards.push({ pid: p.id, type: 'yellow' });
      this.log('yellow', defS, say('yellow', { p: p.name }));
    } else if (Math.random() < 0.25) {
      this.log('info', defS, say('foul', { p: p.name }));
    }
    if (Math.random() < 0.035) {
      // Legado: `.replace(' vai para a cobrança', '')` deixava "PÊNALTI para o X!  ." (ponto solto).
      this.log('info', attS, say('penalty', { t: this.sides[attS].club.name, p: '' }).replace(' vai para a cobrança.', '').trim());
      return this.shot(attS, 1, true);
    }
    return null;
  }

  sendOff(s: number, o: OnField): void {
    const side = this.sides[s];
    const wasGK = this.slotPos(side, o) === 'GOL';
    this.endFat[o.pid] = o.fat;
    side.on = side.on.filter((x) => x !== o);
    if (wasGK && side.subs < MAX_SUBS) {
      const gk = side.bench.map((id) => this.P(id)).find((p) => p.pos === 'GOL');
      const out = this.outfield(side).sort((a, b) => a.fat - b.fat)[0];
      if (gk && out) {
        this.doSub(s, out.pid, gk.id);
        const nw = side.on.find((x) => x.pid === gk.id);
        if (nw) nw.slot = o.slot;
      }
    }
  }

  injury(): void {
    const s = randi(0, 1), side = this.sides[s];
    const o = pick(side.on);
    if (!o) return;
    const p = this.P(o.pid);
    if (this.injuries.some((i) => i.pid === p.id)) return;
    const W = [1, 2, 3, 4, 6, 8], P = [5, 4, 3, 2, 1, 0.5];
    const weeks = weighted(W, (x) => P[W.indexOf(x)]) as number;
    this.injuries.push({ pid: p.id, weeks });
    this.log('injury', s, say('injury', { p: p.name }));
    o.fat = Math.min(o.fat, 25);
    if (side.auto) this.autoSubFor(s, o);
    else this.pendingInjury = { side: s, pid: p.id };
  }

  bestBenchFor(side: SimSide, slotPos: Position): Player | null {
    let best: Player | null = null, bs = -1;
    for (const id of side.bench) {
      const p = this.P(id);
      if (!available(p)) continue;
      const sc = p.ovr * fit(p.pos, slotPos) * (0.85 + (0.15 * p.fitness) / 100);
      if (sc > bs) { bs = sc; best = p; }
    }
    return best;
  }

  autoSubFor(s: number, o: OnField): boolean {
    const side = this.sides[s];
    if (side.subs >= MAX_SUBS) return false;
    const inP = this.bestBenchFor(side, this.slotPos(side, o));
    if (!inP) return false;
    this.doSub(s, o.pid, inP.id);
    return true;
  }

  doSub(s: number, outPid: string, inPid: string): boolean {
    const side = this.sides[s];
    const o = side.on.find((x) => x.pid === outPid);
    if (!o || side.subs >= MAX_SUBS || !side.bench.includes(inPid)) return false;
    side.bench = side.bench.filter((id) => id !== inPid);
    this.endFat[outPid] = o.fat;
    o.pid = inPid;
    o.fat = this.P(inPid).fitness;
    o.yc = 0;
    side.subs++;
    side.played.push(inPid);
    if (this.ratings[inPid] == null) this.ratings[inPid] = 6.2;
    this.log('sub', s, say('sub', { t: side.club.name, o: this.P(outPid).name, p: this.P(inPid).name }));
    return true;
  }

  // Substituições e mudanças táticas da CPU (e do usuário na simulação rápida).
  autoManage(): void {
    this.sides.forEach((side, s) => {
      if (!side.auto) return;
      if (this.minute >= 58 && this.minute % 4 === 0 && side.subs < MAX_SUBS) {
        const tired = this.outfield(side).filter((o) => o.fat < 68).sort((a, b) => a.fat - b.fat)[0];
        if (tired) this.autoSubFor(s, tired);
      }
      if (this.minute >= 70) {
        const diff = this.score[s] - this.score[1 - s];
        side.tactic = diff < 0 ? 'att' : diff > 0 && this.minute >= 78 ? 'def' : side.baseTactic;
      }
    });
  }

  setBall(s: number, kind: BallKind): void {
    const fwd = (v: number): number => (s === 0 ? v : 100 - v);
    let x: number, y = rand(18, 82);
    if (kind === 'goal') { x = fwd(101); y = rand(44, 56); }
    else if (kind === 'save' || kind === 'shot') { x = fwd(rand(86, 95)); y = rand(34, 66); }
    else if (kind === 'attack') x = fwd(rand(60, 84));
    else x = fwd(rand(35, 60));
    this.ball = { x, y, side: s, kind };
  }

  // ---------- Controles do usuário ----------
  userSide(): number { return this.sides.findIndex((s) => s.user); }
  sub(outPid: string, inPid: string): boolean { return this.doSub(this.userSide(), outPid, inPid); }
  setTactic(t: TacticKey): void { const s = this.sides[this.userSide()]; s.tactic = t; s.baseTactic = t; }
  setFormation(f: FormationKey): void {
    const side = this.sides[this.userSide()];
    side.formation = f;
    const slots = FORMATIONS[f];
    const free = slots.map((sl, i) => i);
    const players = side.on.slice().sort((a, b) => (this.P(a.pid).pos === 'GOL' ? -1 : 0) - (this.P(b.pid).pos === 'GOL' ? -1 : 0));
    for (const o of players) {
      const p = this.P(o.pid);
      let best = free[0], bs = -1;
      for (const i of free) { const sc = fit(p.pos, slots[i].pos); if (sc > bs) { bs = sc; best = i; } }
      o.slot = best;
      free.splice(free.indexOf(best), 1);
    }
  }

  finish(): void {
    if (this.opts.knockout && this.score[0] === this.score[1]) this.penalties();
    this.finished = true;
    this.phase = 'done';
    this.log('info', null, say('full'));
    const win = this.winner();
    this.sides.forEach((side, s) => {
      for (const pid of side.played) {
        let r = this.ratings[pid] + (win === s ? 0.35 : win === 1 - s ? -0.25 : 0);
        if (this.score[1 - s] === 0 && ['GOL', 'ZAG', 'LAT'].includes(this.P(pid).pos)) r += 0.4;
        this.ratings[pid] = clamp(r + gauss() * 0.25, 3, 10);
      }
    });
  }

  penalties(): void {
    const pens: [number, number] = [0, 0];
    const takers = this.sides.map((side) => this.outfield(side).map((o) => this.P(o.pid)).sort((a, b) => b.ovr - a.ovr));
    const kick = (s: number, k: number): boolean => {
      const t = takers[s][k % Math.max(1, takers[s].length)];
      const ok = Math.random() < clamp(0.72 + ((t ? t.ovr : 60) - this.cur[1 - s].G) / 250, 0.55, 0.9);
      if (ok) pens[s]++;
      return ok;
    };
    let k = 0;
    for (; k < 5; k++) {
      kick(0, k); kick(1, k);
      const left = 4 - k;
      if (pens[0] > pens[1] + left || pens[1] > pens[0] + left) break;
    }
    while (pens[0] === pens[1]) { kick(0, k); kick(1, k); k++; }
    this.pens = pens;
    const wName = this.sides[pens[0] > pens[1] ? 0 : 1].club.name;
    this.log('pens', null, `Pênaltis: ${pens[0]} x ${pens[1]}. ${wName} se classifica!`);
  }

  winner(): number {
    if (this.score[0] !== this.score[1]) return this.score[0] > this.score[1] ? 0 : 1;
    if (this.pens) return this.pens[0] > this.pens[1] ? 0 : 1;
    return -1;
  }

  runToEnd(): this {
    while (!this.finished) this.step();
    return this;
  }

  result(): MatchResult {
    const fat: Record<string, number> = { ...this.endFat };
    for (const side of this.sides) for (const o of side.on) fat[o.pid] = o.fat;
    return {
      fat,
      hs: this.score[0], as: this.score[1], pens: this.pens,
      goals: this.goals, cards: this.cards, injuries: this.injuries,
      played: [this.sides[0].played, this.sides[1].played], ratings: this.ratings,
      stats: this.stats, winner: this.winner(),
    };
  }
}

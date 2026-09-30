// Motor de partida minuto a minuto. Usado tanto no jogo ao vivo quanto na simulação rápida.
import { ATTR_INDEX, ATTR_KEYS, ATTR_PROFILE, FORMATIONS, SECTOR, TACTICS, fit, injuryLabel, injuryPhrase, say } from './data';
import { attr, hasTrait, playerFit } from './gen';
import { autoLineup, available, ensureLineup } from './squad';
import { DEFAULT_INSTRUCTIONS, instructionMods, squadProfile } from './tactics';
import type {
  AttrKey, Ball, InstructionMods, Instructions, BallKind, FormationKey, MatchResult, MatchStats, OnField, Player, Position, SectorWeights, SideStrength,
  SimCard, SimEvent, SimEventType, SimGoal, SimInjury, SimOptions, SimPhase, SimSide, TacticKey, World,
} from './types';
import { clamp, gauss, pick, rand, randi, weighted } from './util';

const SHOOT_W: Record<Position, number> = { GOL: 0, ZAG: 0.5, LAT: 0.8, VOL: 1.1, MEI: 3, ATA: 6 };
const ASSIST_W: Record<Position, number> = { GOL: 0.05, ZAG: 0.4, LAT: 2, VOL: 1.4, MEI: 4, ATA: 2.2 };
const FOUL_W: Record<Position, number> = { GOL: 0.1, ZAG: 3, LAT: 2, VOL: 3, MEI: 1.2, ATA: 0.8 };
export const MAX_SUBS = 5;

// Efeitos de características, Craque e capitão.
const STAR_BONUS = 3;
const TRAIT_SECTOR = 0.04; // drible/velocidade (ataque), marcação/desarme (defesa)
const TRAIT_PASS_MID = 0.05; // passe (meio-campo)
const TRAIT_PASS_ASSIST = 1.5;
const TRAIT_FINISH_XG = 1.12;
const TRAIT_REFLEX_XG = 0.9;
const TRAIT_STAMINA = 0.8;
// Motorzinho: presença nos dois lados do campo e menos desgaste.
const MOTOR_SECTOR = 0.03;
const MOTOR_STAMINA = 0.9;
const GARRA_BONUS = 1.06;
const LANCADOR_ASSIST = 1.3;
// Atributos: cada ponto acima/abaixo do perfil da posição vale 0,4% no setor.
const ATTR_SECTOR = 0.004;
// Bola parada e lances especiais.
const FK_CHANCE = 0.09; // falta perigosa (perto da área)
const FK_DRIBBLER = 0.03; // cada driblador em campo cava mais faltas perigosas (até 2)
const FK_XG = 0.036;
const FK_TRAIT = 1.7;
const LONG_CHANCE = 0.018;
const LONG_TRAIT_CHANCE = 0.025;
const LONG_XG = 0.035;
const COUNTER_CHANCE = 0.014;
const PEN_BASE = 0.7;
// Cruzamentos (instrução "pelas pontas"): chance por ataque sem finalização.
const CROSS_CHANCE = 0.025;
const CAPTAIN_BONUS = 0.015;
const CAPTAIN_LEADER_BONUS = 0.03;
// Cabeceio: chance de uma cabeçada perigosa após escanteio, se houver cabeceador em campo.
const HEADER_CHANCE = 0.16;
const HEADER_XG = 0.12;

/** Overall efetivo em partidas (Craque +3). */
// Funções auxiliares fora dos métodos quentes (evita recriar closures a cada minuto).
const vol = (total: number, wsum: number, base: number): number => (wsum ? total / wsum : 30) * (0.7 + 0.3 * Math.min(1.25, wsum / base));
const c3 = (x: number): number => x * x * x;

export const matchOvr = (p: Player): number => p.ovr + (p.star ? STAR_BONUS : 0);

/** Desvio de um atributo em relação ao perfil da posição (só o que é individual do jogador). */
function dev(p: Player, k: AttrKey): number {
  const i = ATTR_INDEX[k];
  return p.at && p.at.length > i ? p.at[i] - ATTR_PROFILE[p.pos][i] : 0;
}
const devAvg = (p: Player, ks: AttrKey[]): number => ks.reduce((s, k) => s + dev(p, k), 0) / ks.length;
/** Multiplicador de desgaste pelo fôlego (50 → 1; 85 → ~0,79; 30 → ~1,12). */
const staminaMult = (p: Player): number => clamp(1.3 - attr(p, 'fol') / 166, 0.72, 1.15);

/** Clássico entre dois clubes (um tem o outro como rival). */
export function isDerbyClubs(w: World, a: string, b: string): boolean {
  const ca = w.clubs[a], cb = w.clubs[b];
  return !!ca && !!cb && (ca.rival === b || cb.rival === a);
}

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
  substitutions: NonNullable<MatchResult['substitutions']> = [];
  tactics: NonNullable<MatchResult['tactics']> = [];
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
  /** Clássico (rivais). */
  derby: boolean;
  /** Lado com a bola no fim do minuto (muda num contra-ataque). */
  private ballSide = 0;

  constructor(w: World, homeId: string, awayId: string, opts: SimOptions = {}) {
    this.w = w;
    this.opts = opts;
    this.sides = [this.makeSide(homeId), this.makeSide(awayId)];
    this.tactics = this.sides.map((side, index) => ({ side: index, min: 0, tactic: side.tactic }));
    this.stoppage = randi(1, 5);
    this.derby = isDerbyClubs(w, homeId, awayId);
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
      instr: { ...(club.instr ?? DEFAULT_INSTRUCTIONS) }, mods: null,
      talk: user && w.teamTalk && w.teamTalk.season === w.season && w.teamTalk.week === w.week ? w.teamTalk.mult : 1,
      on, bench: club.bench.slice(), subs: 0, played: on.map((o) => o.pid),
    };
  }

  P(pid: string): Player { return this.w.players[pid]; }
  slotPos(side: SimSide, o: OnField): Position { return o.sp ?? FORMATIONS[side.formation][o.slot].pos; }

  /** Calcula o cache do jogador em campo (posição do slot, força base, características, desgaste). */
  private prep(side: SimSide, o: OnField): void {
    const p = this.P(o.pid);
    const sp = FORMATIONS[side.formation][o.slot].pos;
    o.sp = sp;
    // Moral pesa de verdade: 30 → −2,8%; 90 → +5,6%.
    o.k = matchOvr(p) * playerFit(p, sp) * (0.93 + (0.14 * p.morale) / 100);
    const motor = hasTrait(p, 'motorzinho') && (sp === 'LAT' || sp === 'VOL' || sp === 'MEI') ? MOTOR_SECTOR : 0;
    o.dm = (1 + (hasTrait(p, 'marcacao') ? TRAIT_SECTOR : 0) + (hasTrait(p, 'desarme') ? TRAIT_SECTOR : 0) + motor) * (1 + ATTR_SECTOR * devAvg(p, ['mar', 'cab', 'vel']));
    o.mm = (1 + (hasTrait(p, 'passe') ? TRAIT_PASS_MID : 0)) * (1 + ATTR_SECTOR * devAvg(p, ['pas', 'fol']));
    o.am = (1 + (hasTrait(p, 'drible') ? TRAIT_SECTOR : 0) + (hasTrait(p, 'velocidade') ? TRAIT_SECTOR : 0) + motor) * (1 + ATTR_SECTOR * devAvg(p, ['fin', 'dri', 'vel']));
    o.drain = (sp === 'GOL' ? 0.08 : 0.3) * (p.age > 31 ? 1.15 : 1) * (hasTrait(p, 'resistencia') ? TRAIT_STAMINA : 1) * (motor ? MOTOR_STAMINA : 1) * (sp === 'GOL' ? 1 : staminaMult(p));
    o.garra = hasTrait(p, 'garra');
    o.av = ATTR_KEYS.map((k) => attr(p, k));
  }

  /** Invalida o cache (troca de jogador, slot ou formação). */
  private dirty(o: OnField): void {
    o.sp = undefined; o.k = undefined; o.av = undefined;
  }

  /** Atributo do jogador em campo (do cache do prep; os lances chamam isso a cada minuto). */
  private A(side: SimSide, o: OnField, k: AttrKey): number {
    if (!o.av) this.prep(side, o);
    return (o.av as number[])[ATTR_INDEX[k]];
  }

  log(type: SimEventType, side: number | null, text: string): SimEvent {
    const ev: SimEvent = { min: this.minute, type, side, text };
    this.events.push(ev);
    if (this.fresh) this.fresh.push(ev);
    return ev;
  }

  strength(i: number): SideStrength {
    const s = this.sides[i], B = baseVolume();
    let d = 0, m = 0, a = 0, dw = 0, mw = 0, aw = 0, g = 35;
    const behind = this.score[i] < this.score[1 - i];
    for (const o of s.on) {
      if (o.k === undefined) this.prep(s, o);
      const sp = o.sp as Position;
      const eff = (o.k as number) * (0.7 + (0.3 * o.fat) / 100) * (behind && o.garra ? GARRA_BONUS : 1);
      o.eff = eff;
      if (sp === 'GOL') { g = eff; continue; }
      const wt = SECTOR[sp];
      if (wt.d) { d += eff * (o.dm as number) * wt.d; dw += wt.d; }
      if (wt.m) { m += eff * (o.mm as number) * wt.m; mw += wt.m; }
      if (wt.a) { a += eff * (o.am as number) * wt.a; aw += wt.a; }
    }
    const t = TACTICS[s.tactic];
    const im = this.mods(i);
    const tk = s.talk ?? 1;
    let D = vol(d, dw, B.d) * t.def * im.def * tk, Mi = vol(m, mw, B.m) * (t.mid || 1) * im.mid * tk, A = vol(a, aw, B.a) * t.att * im.att * tk;
    if (!this.opts.neutral && i === 0) { A *= 1.04; D *= 1.03; Mi *= 1.03; }
    const cap = this.captainOn(i);
    if (cap) {
      const b = 1 + (hasTrait(cap, 'lideranca') ? CAPTAIN_LEADER_BONUS : CAPTAIN_BONUS);
      A *= b; D *= b; Mi *= b;
    }
    return { A, D, M: Mi, G: g };
  }

  /** Efeitos das instruções táticas do lado i (cache até o time ou as instruções mudarem). */
  mods(i: number): InstructionMods {
    const s = this.sides[i];
    if (!s.mods) {
      const slots = FORMATIONS[s.formation];
      s.mods = instructionMods(s.instr, squadProfile(s.on.map((o) => ({ p: this.P(o.pid), slot: slots[o.slot] }))));
    }
    return s.mods;
  }

  /** Capitão do lado i, se estiver em campo. */
  captainOn(i: number): Player | null {
    const s = this.sides[i], cid = s.club.captain;
    return cid && s.on.some((o) => o.pid === cid) ? this.P(cid) : null;
  }

  /** xG multiplicado pelo reflexo do goleiro adversário. */
  private keeperMult(gkO: OnField | undefined): number {
    return gkO && hasTrait(this.P(gkO.pid), 'reflexo') ? TRAIT_REFLEX_XG : 1;
  }

  step(): SimEvent[] {
    const fresh: SimEvent[] = [];
    this.fresh = fresh;
    if (this.finished) return fresh;
    if (this.phase === 'half') { this.phase = 'second'; this.log('info', null, say('second')); }
    if (this.minute === 0) {
      this.log('info', null, say('kickoff'));
      if (this.derby) this.log('info', null, say('derby', { h: this.sides[0].club.name, a: this.sides[1].club.name }));
    }
    this.minute++;
    this.cur = [this.strength(0), this.strength(1)];
    const pHome = c3(this.cur[0].M) / (c3(this.cur[0].M) + c3(this.cur[1].M));
    const s = Math.random() < pHome ? 0 : 1;
    this.stats.poss[s]++;
    this.fatigue();

    let kind: BallKind = 'mid';
    this.ballSide = s;
    if (Math.random() < 0.52) kind = this.attack(s);
    if (Math.random() < 0.11 * this.mods(1 - s).foul) { this.ballSide = s; const k = this.foul(1 - s, s); if (k) kind = k; }
    if (Math.random() < 0.004) this.injury();
    this.autoManage();
    this.setBall(this.ballSide, kind);

    if (this.minute === 45) { this.log('info', null, say('half')); this.phase = 'half'; }
    if (this.minute >= 90 + this.stoppage) this.finish();
    return fresh;
  }

  fatigue(): void {
    for (const s of this.sides) {
      const t = TACTICS[s.tactic].fatigue;
      for (const o of s.on) {
        if (o.k === undefined) this.prep(s, o);
        o.fat = Math.max(10, o.fat - (o.drain as number) * t);
      }
    }
  }

  outfield(side: SimSide): OnField[] { return side.on.filter((o) => this.slotPos(side, o) !== 'GOL'); }

  attack(s: number): BallKind {
    const ratio = this.cur[s].A / this.cur[1 - s].D;
    const pShot = clamp(0.28 * Math.pow(ratio, 2.4), 0.07, 0.75);
    if (Math.random() >= pShot) {
      const side = this.sides[s];
      // Chute de longe: mais comum com quem tem a habilidade.
      const longers = this.outfield(side).filter((o) => hasTrait(this.P(o.pid), 'chuteLonge')).length;
      if (Math.random() < LONG_CHANCE + LONG_TRAIT_CHANCE * Math.min(2, longers)) return this.longShot(s);
      // Jogo pelas pontas: cruzamento para os bons de cabeça.
      const cross = this.mods(s).cross;
      if (cross && Math.random() < CROSS_CHANCE * cross) return this.cross(s);
      // Contra-ataque do adversário: velocidade dele contra a marcação de quem atacou.
      if (Math.random() < this.counterChance(1 - s)) return this.counter(1 - s);
      if (Math.random() < 0.15) {
        const o = pick(this.outfield(side));
        if (o) this.log('build', s, say('build', { t: side.club.name, p: this.P(o.pid).name }));
      }
      return 'attack';
    }
    return this.shot(s, ratio, false);
  }

  /** Chance de contra-ataque do lado s: velocistas e lançadores puxam; a marcação adversária segura. */
  private counterChance(s: number): number {
    const side = this.sides[s], opp = this.sides[1 - s];
    let speed = 0, n = 0, bonus = 0;
    for (const o of side.on) {
      const sp = this.slotPos(side, o);
      const p = this.P(o.pid);
      if (sp === 'ATA' || sp === 'MEI' || sp === 'LAT') { speed += this.A(side, o, 'vel'); n++; }
      if (hasTrait(p, 'velocidade')) bonus += 0.003;
      if (hasTrait(p, 'lancamento')) bonus += 0.003;
    }
    let mark = 0, m = 0;
    for (const o of opp.on) {
      const sp = this.slotPos(opp, o);
      if (sp === 'ZAG' || sp === 'VOL') { mark += (this.A(opp, o, 'mar') + this.A(opp, o, 'vel')) / 2; m++; }
    }
    const r = (n ? speed / n : 60) / (m ? mark / m : 60);
    const base = clamp(COUNTER_CHANCE * Math.pow(r, 3) + Math.min(0.01, bonus), 0.004, 0.05);
    return clamp(base * this.mods(s).counterFor * this.mods(1 - s).counterAgainst, 0.002, 0.09);
  }

  /** Cruzamento para a área (instrução pelas pontas): cabeçada de quem é bom no alto. */
  cross(s: number): BallKind {
    const side = this.sides[s];
    const field = this.outfield(side);
    const target = weighted(field, (o) => Math.pow(this.A(side, o, 'cab') / 70, 4) * (hasTrait(this.P(o.pid), 'cabeceio') ? 2 : 1)) as OnField | undefined;
    if (!target) return 'attack';
    this.log('build', s, say('cross', { p: this.P(target.pid).name }));
    return this.header(s, target);
  }

  counter(s: number): BallKind {
    const side = this.sides[s];
    const field = this.outfield(side);
    const runner = weighted(field, (o) => (this.slotPos(side, o) === 'ATA' ? 3 : this.slotPos(side, o) === 'MEI' || this.slotPos(side, o) === 'LAT' ? 1.5 : 0.2) * Math.pow(this.A(side, o, 'vel') / 70, 3)) as OnField | undefined;
    if (!runner) return 'mid';
    this.ballSide = s;
    this.log('build', s, say('counter', { t: side.club.name, p: this.P(runner.pid).name }));
    // Defesa desarrumada: a chance vale mais que um ataque normal.
    const ratio = (this.cur[s].A / this.cur[1 - s].D) * 1.25;
    return this.shot(s, ratio, false, runner);
  }

  /** Chute de fora da área (finalização e Chute de longe). */
  longShot(s: number): BallKind {
    const side = this.sides[s], opp = this.sides[1 - s];
    const field = this.outfield(side);
    const o = weighted(field, (x) => {
      const sp = this.slotPos(side, x), p = this.P(x.pid);
      const posW = sp === 'MEI' || sp === 'VOL' ? 1.5 : sp === 'ATA' ? 1 : 0.35;
      return posW * Math.pow(this.A(side, x, 'fin') / 70, 2) * (hasTrait(p, 'chuteLonge') ? 4 : 1);
    }) as OnField | undefined;
    if (!o) return 'attack';
    const p = this.P(o.pid);
    const gkO = opp.on.find((x) => this.slotPos(opp, x) === 'GOL');
    const gkName = gkO ? this.P(gkO.pid).name : 'o goleiro improvisado';
    const xg = clamp(LONG_XG * Math.pow(attr(p, 'fin') / 75, 2) * (hasTrait(p, 'chuteLonge') ? 1.8 : 1) * Math.pow(70 / Math.max(40, this.cur[1 - s].G), 0.8), 0.008, 0.12) * this.keeperMult(gkO);
    this.stats.shots[s]++;
    this.stats.xg[s] += xg;
    this.log('build', s, say('longShot', { p: p.name }));
    const vars = { p: p.name, t: side.club.name, g: gkName };
    const r = Math.random();
    if (r < xg) { this.goal(s, o, false, false, say('longGoal', vars)); return 'goal'; }
    if (r < xg + 0.35) {
      this.stats.onT[s]++;
      if (gkO) this.ratings[gkO.pid] += 0.12;
      this.log('save', s, say('save', vars));
      return 'save';
    }
    this.log('miss', s, say('miss', vars));
    return 'shot';
  }

  /** Falta perigosa: cobrança direta pelo batedor de faltas. */
  freeKick(s: number): BallKind {
    const side = this.sides[s], opp = this.sides[1 - s];
    const field = this.outfield(side);
    if (!field.length) return 'attack';
    const taker = field.find((o) => o.pid === side.club.fkTaker) ||
      field.slice().sort((a, b) => this.fkRating(this.P(b.pid)) - this.fkRating(this.P(a.pid)))[0];
    const p = this.P(taker.pid);
    const gkO = opp.on.find((x) => this.slotPos(opp, x) === 'GOL');
    const gkName = gkO ? this.P(gkO.pid).name : 'o goleiro improvisado';
    const xg = clamp(FK_XG * Math.pow(attr(p, 'bp') / 75, 3) * (hasTrait(p, 'faltas') ? FK_TRAIT : 1) * Math.pow(70 / Math.max(40, this.cur[1 - s].G), 0.8), 0.012, 0.17) * this.keeperMult(gkO);
    const vars = { p: p.name, t: side.club.name, g: gkName };
    this.log('info', s, say('fk', vars));
    this.stats.shots[s]++;
    this.stats.xg[s] += xg;
    const r = Math.random();
    if (r < xg) { this.goal(s, taker, false, false, say('fkGoal', vars), true); return 'goal'; }
    if (r < xg + 0.3) {
      this.stats.onT[s]++;
      if (gkO) this.ratings[gkO.pid] += 0.15;
      this.log('save', s, say('fkSave', vars));
      if (Math.random() < 0.35) return this.corner(s) || 'save';
      return 'save';
    }
    this.log('miss', s, say('fkMiss', vars));
    return 'shot';
  }

  private fkRating(p: Player): number { return attr(p, 'bp') + (hasTrait(p, 'faltas') ? 15 : 0); }
  private penRating(p: Player): number { return attr(p, 'bp') * 0.6 + attr(p, 'fin') * 0.4 + (hasTrait(p, 'penalti') ? 12 : 0); }

  /** Chance de converter um pênalti: bola parada do batedor contra o goleiro. */
  private penChance(p: Player | undefined, gk: Player | undefined, gkEff: number): number {
    const bp = p ? attr(p, 'bp') * 0.6 + attr(p, 'fin') * 0.4 : 60;
    let c = PEN_BASE + (bp - 65) / 300 - (gkEff - 70) / 400;
    if (p && hasTrait(p, 'penalti')) c += 0.1;
    if (gk && hasTrait(gk, 'pegaPenalti')) c -= 0.1;
    return clamp(c, 0.5, 0.93);
  }

  shot(s: number, ratio: number, penalty: boolean, forced?: OnField): BallKind {
    const side = this.sides[s], opp = this.sides[1 - s];
    const field = this.outfield(side);
    if (!field.length) return 'mid';
    const taker = penalty ? field.find((o) => o.pid === side.club.penTaker) : undefined;
    const shooterO = forced ?? (penalty
      ? taker || field.slice().sort((a, b) => this.penRating(this.P(b.pid)) - this.penRating(this.P(a.pid)))[0]
      : (weighted(field, (o) => SHOOT_W[this.slotPos(side, o)] * Math.pow(this.A(side, o, 'fin') / 70, 2)) as OnField));
    const shooter = this.P(shooterO.pid);
    const gkO = opp.on.find((o) => this.slotPos(opp, o) === 'GOL');
    const gkName = gkO ? this.P(gkO.pid).name : 'o goleiro improvisado';
    const gkEff = this.cur[1 - s].G;
    const shEff = shooterO.eff || shooter.ovr;
    const gkP = gkO ? this.P(gkO.pid) : undefined;
    let xg = penalty
      ? this.penChance(shooter, gkP, gkEff)
      : clamp((Math.pow(Math.random(), 1.7) * 0.26 + 0.025) * Math.pow(shEff / gkEff, 1.3) * Math.pow(ratio, 0.5), 0.02, 0.7);
    if (!penalty) {
      // Finalização acima/abaixo do esperado para o overall muda a qualidade do chute.
      xg *= clamp(Math.pow(attr(shooter, 'fin') / (shooter.ovr + 3), 0.7), 0.7, 1.15);
      if (hasTrait(shooter, 'finalizacao')) xg = Math.min(0.7, xg * TRAIT_FINISH_XG);
      xg *= this.keeperMult(gkO);
    }
    this.stats.shots[s]++;
    this.stats.xg[s] += xg;
    const vars = { p: shooter.name, t: side.club.name, g: gkName };
    const r = Math.random();
    if (r < xg) {
      this.goal(s, shooterO, penalty);
      if (penalty) this.events[this.events.length - 1].penalty = { shooterId: shooter.id, keeperId: gkO?.pid ?? null, outcome: 'goal' };
      return 'goal';
    }
    if (penalty) {
      const saved = Math.random() < 0.7;
      if (saved) this.stats.onT[s]++;
      const event = this.log(saved ? 'save' : 'miss', s, saved ? `${gkName} se estica e defende o pênalti de ${shooter.name}!` : `${shooter.name} manda a cobrança para fora!`);
      event.penalty = { shooterId: shooter.id, keeperId: gkO?.pid ?? null, outcome: saved ? 'save' : 'miss' };
      if (gkO) this.ratings[gkO.pid] += 0.8;
      this.ratings[shooter.id] -= 0.6;
      return saved ? 'save' : 'shot';
    }
    if (r < xg + 0.3) {
      this.stats.onT[s]++;
      if (gkO) this.ratings[gkO.pid] += 0.18;
      this.ratings[shooter.id] += 0.05;
      this.log('save', s, say('save', vars));
      if (Math.random() < 0.3) return this.corner(s) || 'save';
      return 'save';
    }
    if (r < xg + 0.45) {
      this.log('miss', s, say('block', vars));
      if (Math.random() < 0.4) return this.corner(s) || 'shot';
      return 'shot';
    }
    this.log('miss', s, say('miss', vars));
    this.ratings[shooter.id] -= 0.05;
    return 'shot';
  }

  /** Escanteio. Com um cabeceador em campo, pode virar cabeçada (retorna o tipo de lance, ou null). */
  corner(s: number): BallKind | null {
    this.stats.corners[s]++;
    if (Math.random() < 0.3) this.log('info', s, say('corner', { t: this.sides[s].club.name }));
    const side = this.sides[s];
    const field = this.outfield(side);
    if (!field.length) return null;
    // Todos sobem, mas os bons de cabeça são o alvo; cabeceadores aumentam a chance de a jogada sair.
    const aerial = field.reduce((mx, o) => Math.max(mx, this.A(side, o, 'cab') + (hasTrait(this.P(o.pid), 'cabeceio') ? 10 : 0)), 0);
    if (Math.random() >= HEADER_CHANCE * clamp((aerial - 40) / 40, 0.4, 1.4)) return null;
    return this.header(s, weighted(field, (o) => Math.pow(this.A(side, o, 'cab') / 70, 4) * (hasTrait(this.P(o.pid), 'cabeceio') ? 2 : 1)) as OnField);
  }

  header(s: number, o: OnField): BallKind {
    const side = this.sides[s], opp = this.sides[1 - s];
    const p = this.P(o.pid);
    const gkO = opp.on.find((x) => this.slotPos(opp, x) === 'GOL');
    const gkName = gkO ? this.P(gkO.pid).name : 'o goleiro improvisado';
    const xg = clamp(HEADER_XG * Math.pow((o.eff || matchOvr(p)) / this.cur[1 - s].G, 1.3) * Math.pow(attr(p, 'cab') / 72, 1.5) * (hasTrait(p, 'cabeceio') ? 1.2 : 1), 0.02, 0.35) * this.keeperMult(gkO);
    this.stats.shots[s]++;
    this.stats.xg[s] += xg;
    const vars = { p: p.name, t: side.club.name, g: gkName };
    const r = Math.random();
    if (r < xg) { this.goal(s, o, false, true); return 'goal'; }
    if (r < xg + 0.3) {
      this.stats.onT[s]++;
      if (gkO) this.ratings[gkO.pid] += 0.18;
      this.log('save', s, say('headSave', vars));
      return 'save';
    }
    this.log('miss', s, say('headMiss', vars));
    return 'shot';
  }

  goal(s: number, shooterO: OnField, penalty: boolean, header = false, customText?: string, direct = false): void {
    const side = this.sides[s], opp = this.sides[1 - s];
    const shooter = this.P(shooterO.pid);
    this.score[s]++;
    this.stats.onT[s]++;
    let assist: Player | null = null;
    if (!penalty && !direct && Math.random() < 0.78) {
      const mates = side.on.filter((o) => o.pid !== shooter.id);
      const a = weighted(mates, (o) => {
        const mp = this.P(o.pid);
        return ASSIST_W[this.slotPos(side, o)] * Math.pow(this.A(side, o, 'pas') / 70, 2) * (hasTrait(mp, 'passe') ? TRAIT_PASS_ASSIST : 1) * (hasTrait(mp, 'lancamento') ? LANCADOR_ASSIST : 1);
      });
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
    let text = customText ?? (penalty ? say('penGoal', { p: shooter.name }) : say(header ? 'header' : 'goal', { p: shooter.name, t: side.club.name }));
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
      this.ballSide = attS;
      return this.shot(attS, 1, true);
    }
    const att = this.sides[attS];
    const dribblers = this.outfield(att).filter((x) => hasTrait(this.P(x.pid), 'drible')).length;
    if (Math.random() < FK_CHANCE + FK_DRIBBLER * Math.min(2, dribblers)) {
      this.ballSide = attS;
      return this.freeKick(attS);
    }
    return null;
  }

  sendOff(s: number, o: OnField): void {
    const side = this.sides[s];
    const wasGK = this.slotPos(side, o) === 'GOL';
    this.endFat[o.pid] = o.fat;
    side.on = side.on.filter((x) => x !== o);
    side.mods = null;
    if (wasGK && side.subs < MAX_SUBS) {
      const gk = side.bench.map((id) => this.P(id)).find((p) => p.pos === 'GOL');
      const out = this.outfield(side).sort((a, b) => a.fat - b.fat)[0];
      if (gk && out) {
        this.doSub(s, out.pid, gk.id);
        const nw = side.on.find((x) => x.pid === gk.id);
        if (nw) { nw.slot = o.slot; this.dirty(nw); }
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
    const type = injuryLabel(weeks);
    this.injuries.push({ pid: p.id, weeks, type });
    this.log('injury', s, say('injury', { p: p.name, i: injuryPhrase(type) }));
    o.fat = Math.min(o.fat, 25);
    if (side.auto) this.autoSubFor(s, o);
    else this.pendingInjury = { side: s, pid: p.id };
  }

  bestBenchFor(side: SimSide, slotPos: Position): Player | null {
    let best: Player | null = null, bs = -1;
    for (const id of side.bench) {
      const p = this.P(id);
      if (!available(p)) continue;
      const sc = p.ovr * playerFit(p, slotPos) * (0.85 + (0.15 * p.fitness) / 100);
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
    this.dirty(o);
    side.mods = null;
    side.subs++;
    side.played.push(inPid);
    this.substitutions.push({ side: s, min: this.minute, out: outPid, player: inPid });
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
        const next = diff < 0 ? 'att' : diff > 0 && this.minute >= 78 ? 'def' : side.baseTactic;
        if (side.tactic !== next) this.tactics.push({ side: s, min: this.minute, tactic: next });
        side.tactic = next;
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
  setTactic(t: TacticKey): void {
    const side = this.userSide();
    const s = this.sides[side];
    if (s.tactic !== t) this.tactics.push({ side, min: this.minute, tactic: t });
    s.tactic = t; s.baseTactic = t;
  }
  setInstructions(instr: Partial<Instructions>): void { const s = this.sides[this.userSide()]; s.instr = { ...s.instr, ...instr }; s.mods = null; }
  setFormation(f: FormationKey): void {
    const side = this.sides[this.userSide()];
    side.formation = f;
    side.mods = null;
    const slots = FORMATIONS[f];
    const free = slots.map((sl, i) => i);
    const players = side.on.slice().sort((a, b) => (this.P(a.pid).pos === 'GOL' ? -1 : 0) - (this.P(b.pid).pos === 'GOL' ? -1 : 0));
    for (const o of players) {
      const p = this.P(o.pid);
      let best = free[0], bs = -1;
      for (const i of free) { const sc = fit(p.pos, slots[i].pos); if (sc > bs) { bs = sc; best = i; } }
      o.slot = best;
      this.dirty(o);
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
    // Batedor oficial (se em campo) abre a série; depois, os de maior overall.
    const takers = this.sides.map((side) => this.outfield(side).map((o) => this.P(o.pid))
      .sort((a, b) => (a.id === side.club.penTaker ? -1 : 0) - (b.id === side.club.penTaker ? -1 : 0) || this.penRating(b) - this.penRating(a)));
    const keepers = this.sides.map((side) => {
      const g = side.on.find((o) => this.slotPos(side, o) === 'GOL');
      return g ? this.P(g.pid) : undefined;
    });
    const kick = (s: number, k: number): boolean => {
      const t = takers[s][k % Math.max(1, takers[s].length)];
      const ok = Math.random() < this.penChance(t, keepers[1 - s], this.cur[1 - s].G) + 0.02;
      if (ok) pens[s]++;
      const keeper = keepers[1 - s];
      const outcome = ok ? 'goal' : Math.random() < 0.65 ? 'save' : 'miss';
      const text = outcome === 'goal' ? `${t?.name ?? 'Batedor'} converte a cobrança!` : outcome === 'save' ? `${keeper?.name ?? 'O goleiro'} defende a cobrança de ${t?.name ?? 'o batedor'}!` : `${t?.name ?? 'Batedor'} manda a cobrança para fora!`;
      const event = this.log('pens', s, text);
      event.penalty = { shooterId: t?.id ?? '', keeperId: keeper?.id ?? null, outcome, shootoutScore: [pens[0], pens[1]], round: k + 1 };
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
      stats: this.stats, winner: this.winner(), substitutions: this.substitutions, tactics: this.tactics,
    };
  }
}

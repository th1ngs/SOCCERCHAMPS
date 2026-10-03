// Controlador da partida ao vivo: guarda o Sim, roda o laço rAF e expõe um snapshot
// (atualizado por minuto de jogo) para a interface via useSyncExternalStore.
import { Sim } from "@/game";
import type { FormationKey, FormationSlot, Match, MatchResult, MatchStats, SimEvent, SimGoal, Instructions, TacticKey, World } from "@/game/types";
import { Audio } from "@/arcade/audio";
import { kits, pct, simOptions, type Kit } from "../matchUtils";
import { PITCH_RATIO, drawLivePitch, type PitchAnim, type PitchScale } from "./drawPitch";

/** Segundos reais por minuto de jogo (1x, 2x, 4x). */
export const SPEEDS = [0.9, 0.42, 0.14] as const;
export type SpeedIndex = 0 | 1 | 2;

export interface FeedItem extends SimEvent {
  key: number;
}

export interface PenaltyScene {
  key: number;
  side: number;
  shooter: string;
  keeper: string;
  outcome: 'goal' | 'save' | 'miss';
  round: number | null;
  shootoutScore: [number, number] | null;
  duration: number;
}

export type LiveOverlay = "half" | "end" | null;

/** Comemoração de um gol (todos os gols ganham a sua, em fila; o relógio espera). */
export interface GoalFlash {
  key: number;
  side: number;
  label: string;
  scorer: string | null;
  assist: string | null;
  minuteText: string;
  /** Placar logo após este gol. */
  score: [number, number];
  /** Duração em ms (mais curta no 4x e no resumo de "Até o fim"). */
  dur: number;
  /** Comemorações ainda na fila depois desta. */
  more: number;
}

const minuteLabel = (min: number): string => (min > 90 ? `90+${min - 90}'` : `${min}'`);

/** Rótulo pelo tipo do lance narrado. */
function goalLabel(text: string): string {
  const upper = text.toLocaleUpperCase('pt-BR');
  return upper.includes('FALTA') ? 'GOL DE FALTA!' : upper.includes('CABEÇA') || upper.includes('CABECEADA') ? 'GOL DE CABEÇA!' : upper.includes('GOLAÇO') || upper.includes('DE LONGE') ? 'GOLAÇO!' : 'GOOOOL!';
}

export interface LiveSnapshot {
  rev: number;
  minute: number;
  minuteText: string;
  score: [number, number];
  pens: [number, number] | null;
  poss: [number, number];
  stats: MatchStats;
  feed: FeedItem[];
  speed: SpeedIndex;
  paused: boolean;
  over: boolean;
  overlay: LiveOverlay;
  flash: GoalFlash | null;
  penaltyScene: PenaltyScene | null;
  moment: { key: number; title: string; text: string; side: number | null; tone: 'gold' | 'red' | 'blue' } | null;
  subsOpen: boolean;
  subsNote: string | null;
}

const cloneStats = (s: MatchStats): MatchStats => ({
  poss: [s.poss[0], s.poss[1]], shots: [s.shots[0], s.shots[1]], onT: [s.onT[0], s.onT[1]],
  fouls: [s.fouls[0], s.fouls[1]], yellow: [s.yellow[0], s.yellow[1]], red: [s.red[0], s.red[1]],
  corners: [s.corners[0], s.corners[1]], xg: [s.xg[0], s.xg[1]],
});

export class LiveController {
  readonly w: World;
  readonly m: Match;
  readonly sim: Sim;
  readonly kits: [Kit, Kit];
  speed: SpeedIndex = 1;
  paused = false;
  over = false;
  overlay: LiveOverlay = null;
  flash: GoalFlash | null = null;
  subsOpen = false;
  subsNote: string | null = null;
  private resumeOnClose = false;
  private feed: FeedItem[] = [];
  private feedSeq = 0;
  private acc = 0;
  private rev = 0;
  private started = false;
  private anim: PitchAnim = { dots: new Map(), ball: { x: 50, y: 50 }, trail: [], target: "", pulse: null, flight: null };
  private scale: PitchScale = { w: 1, h: 1, dpr: 1 };
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  private flashQueue: Omit<GoalFlash, 'more'>[] = [];
  private flashSeq = 0;
  private sceneTimer: ReturnType<typeof setTimeout> | null = null;
  private momentTimer: ReturnType<typeof setTimeout> | null = null;
  private moment: LiveSnapshot['moment'] = null;
  private momentSeq = 0;
  private sceneQueue: SimEvent[] = [];
  private postSceneFeed: SimEvent[] = [];
  private currentSceneEvent: SimEvent | null = null;
  private sceneSeq = 0;
  private scene: PenaltyScene | null = null;
  private shownPens: [number, number] | null = null;
  private hiddenScore: [number, number] | null = null;
  private listeners = new Set<() => void>();
  private snap: LiveSnapshot;

  constructor(w: World, m: Match) {
    this.w = w;
    this.m = m;
    this.sim = new Sim(w, m.h, m.a, { ...simOptions(m), interactive: true });
    this.kits = kits(w.clubs[m.h], w.clubs[m.a]);
    this.snap = this.build();
  }

  // ---------- Store ----------
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = (): LiveSnapshot => this.snap;

  private build(): LiveSnapshot {
    const sim = this.sim;
    const min = sim.minute;
    const minuteText = this.scene && sim.finished ? this.scene.round ? "Pênaltis" : `${min}'` : sim.finished ? "Encerrado" : sim.phase === "half" ? "Intervalo" : min > 90 ? `90+${min - 90}'` : `${min}'`;
    return {
      rev: this.rev,
      minute: min,
      minuteText,
      score: this.hiddenScore ?? [sim.score[0], sim.score[1]],
      pens: this.shownPens ?? (this.scene || this.sceneQueue.length ? null : sim.pens ? [sim.pens[0], sim.pens[1]] : null),
      poss: pct(sim.stats.poss[0], sim.stats.poss[1]),
      stats: cloneStats(sim.stats),
      feed: this.feed,
      speed: this.speed,
      paused: this.paused,
      over: this.over,
      overlay: this.overlay,
      flash: this.flash,
      penaltyScene: this.scene,
      moment: this.moment,
      subsOpen: this.subsOpen,
      subsNote: this.subsNote,
    };
  }

  /** Recalcula o snapshot e avisa a interface. */
  emit(): void {
    this.rev++;
    this.snap = this.build();
    for (const fn of this.listeners) fn();
  }

  // ---------- Canvas e laço ----------
  attach(canvas: HTMLCanvasElement, box: HTMLElement): () => void {
    const ctx = canvas.getContext("2d");
    const resize = () => {
      const rect = box.getBoundingClientRect();
      let wpx = rect.width, hpx = rect.width / PITCH_RATIO;
      if (hpx > rect.height) {
        hpx = rect.height;
        wpx = hpx * PITCH_RATIO;
      }
      wpx = Math.max(1, wpx);
      hpx = Math.max(1, hpx);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = `${wpx}px`;
      canvas.style.height = `${hpx}px`;
      canvas.width = Math.round(wpx * dpr);
      canvas.height = Math.round(hpx * dpr);
      this.scale = { w: wpx, h: hpx, dpr };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    if (!this.started) {
      this.started = true;
      Audio.init();
      Audio.whistle(false);
    }

    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const sim = this.sim;
      if (!this.paused && !this.scene && !this.flash && !sim.finished) {
        this.acc += dt;
        const dur = SPEEDS[this.speed];
        while (this.acc >= dur && !this.paused && !this.scene && !this.flash && !sim.finished) {
          this.acc -= dur;
          this.minute();
        }
      }
      if (ctx) drawLivePitch(ctx, this.scale, sim, this.w, this.kits, this.anim, dt, now, SPEEDS[this.speed] * 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }

  /** Limpeza final (timers). */
  dispose(): void {
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = null;
    if (this.sceneTimer) clearTimeout(this.sceneTimer);
    this.sceneTimer = null;
    if (this.momentTimer) clearTimeout(this.momentTimer);
    this.momentTimer = null;
  }

  // ---------- Comemorações de gol ----------
  private flashDur(fast: boolean): number {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 900;
    return fast ? 1300 : this.speed === 2 ? 1700 : 2600;
  }

  private queueGoal(g: SimGoal | undefined, side: number, label: string, score: [number, number], fast = false): void {
    const name = (pid: string | null | undefined) => (pid ? this.w.players[pid]?.name ?? null : null);
    this.flashQueue.push({
      key: ++this.flashSeq, side, label,
      scorer: name(g?.pid), assist: name(g?.assist),
      minuteText: minuteLabel(g?.min ?? this.sim.minute),
      score, dur: this.flashDur(fast),
    });
    if (!this.flash) this.nextFlash();
  }

  private nextFlash(): void {
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = null;
    const next = this.flashQueue.shift();
    if (!next) {
      this.flash = null;
      this.settleBreaks();
      this.emit();
      return;
    }
    this.flash = { ...next, more: this.flashQueue.length };
    Audio.goal();
    this.flashTimer = setTimeout(() => this.nextFlash(), next.dur);
    this.emit();
  }

  /** Pula as comemorações pendentes (toque na tela do gol). */
  skipFlashes(): void {
    if (!this.flash) return;
    this.flashQueue = [];
    this.nextFlash();
  }

  /** Intervalo e apito final só aparecem depois das cenas de pênalti e das comemorações. */
  private settleBreaks(): void {
    if (this.scene || this.flash) return;
    if (this.sim.finished) this.finish();
    else if (this.sim.phase === 'half' && !this.overlay) { this.paused = true; this.overlay = 'half'; }
  }

  private pushFeed(ev: SimEvent): void {
    if (ev.type === "build" && this.speed === 2) return;
    this.feed = [{ ...ev, key: ++this.feedSeq }, ...this.feed].slice(0, 120);
  }

  private showNextScene(): void {
    const event = this.sceneQueue.shift();
    if (!event?.penalty) {
      for (const deferred of this.postSceneFeed) this.pushFeed(deferred);
      this.postSceneFeed = [];
      this.currentSceneEvent = null;
      this.scene = null;
      this.hiddenScore = null;
      this.settleBreaks();
      this.emit();
      return;
    }
    const detail = event.penalty;
    this.currentSceneEvent = event;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 500 : this.speed === 2 ? 2400 : 3600;
    this.scene = {
      key: ++this.sceneSeq,
      side: event.side ?? 0,
      shooter: this.w.players[detail.shooterId]?.name ?? 'Batedor',
      keeper: detail.keeperId ? this.w.players[detail.keeperId]?.name ?? 'Goleiro' : 'Goleiro',
      outcome: detail.outcome,
      round: detail.round ?? null,
      shootoutScore: detail.shootoutScore ?? null,
      duration,
    };
    this.sceneTimer = setTimeout(() => this.completeScene(event), duration);
    this.emit();
  }

  private completeScene(event: SimEvent): void {
    this.sceneTimer = null;
    this.currentSceneEvent = null;
    this.pushFeed(event);
    if (event.penalty?.shootoutScore) this.shownPens = event.penalty.shootoutScore;
    if (event.penalty?.outcome === 'goal') {
      this.hiddenScore = null;
      if (!event.penalty.shootoutScore) {
        const shooter = event.penalty.shooterId;
        const g = this.sim.goals.findLast((x) => x.pen && x.pid === shooter);
        this.queueGoal(g, event.side ?? 0, 'GOL DE PÊNALTI!', [this.sim.score[0], this.sim.score[1]]);
      } else Audio.kick(0.8);
    } else Audio.kick(0.6);
    this.showNextScene();
  }

  /** Encerra as cenas restantes e revela os resultados sem alterar a simulação. */
  skipScenes(): void {
    if (!this.scene) return;
    if (this.sceneTimer) clearTimeout(this.sceneTimer);
    this.sceneTimer = null;
    // O evento atual fica guardado separadamente para preservar a ordem do relato.
    if (this.currentSceneEvent) this.pushFeed(this.currentSceneEvent);
    for (const event of this.sceneQueue) this.pushFeed(event);
    for (const event of this.postSceneFeed) this.pushFeed(event);
    this.sceneQueue = [];
    this.postSceneFeed = [];
    this.currentSceneEvent = null;
    this.scene = null;
    this.hiddenScore = null;
    this.shownPens = this.sim.pens ? [...this.sim.pens] : null;
    this.settleBreaks();
    this.emit();
  }

  private minute(): void {
    const sim = this.sim;
    const scoreBefore: [number, number] = [sim.score[0], sim.score[1]];
    const goalsBefore = sim.goals.length;
    const evs = sim.step();
    const hasPenaltyScene = evs.some((event) => !!event.penalty);
    for (const ev of evs) {
      if (ev.penalty) this.sceneQueue.push(ev);
      else if (hasPenaltyScene && (ev.type === 'pens' || sim.finished && ev.type === 'info')) this.postSceneFeed.push(ev);
      else this.pushFeed(ev);
    }
    const penaltyGoal = evs.some((event) => event.penalty?.outcome === 'goal' && !event.penalty.shootoutScore);
    if (penaltyGoal) this.hiddenScore = scoreBefore;
    if (this.sceneQueue.length && !this.scene) {
      Audio.whistle(false);
      this.showNextScene();
    }
    const featured = evs.filter((event) => !event.penalty && ['save', 'miss', 'red', 'yellow', 'injury'].includes(event.type)).at(-1);
    if (featured && !this.scene) {
      const title = featured.type === 'save' ? 'Defesaça!' : featured.type === 'miss' ? 'Quase gol!' : featured.type === 'red' ? 'Expulsão!' : featured.type === 'yellow' ? 'Cartão amarelo' : 'Atendimento médico';
      this.moment = { key: ++this.momentSeq, title, text: featured.text, side: featured.side, tone: featured.type === 'red' || featured.type === 'injury' ? 'red' : featured.type === 'save' ? 'blue' : 'gold' };
      if (this.momentTimer) clearTimeout(this.momentTimer);
      this.momentTimer = setTimeout(() => { this.moment = null; this.emit(); }, this.speed === 2 ? 1100 : 2100);
    }
    // Cada gol de bola rolando ganha a sua comemoração, na ordem (os de pênalti vêm depois da cena).
    const running: [number, number] = [scoreBefore[0], scoreBefore[1]];
    const fieldGoals = sim.goals.slice(goalsBefore).filter((g) => !g.pen);
    evs.filter((e) => e.type === "goal" && !e.penalty).forEach((ev, i) => {
      const side = ev.side ?? 0;
      running[side]++;
      this.queueGoal(fieldGoals[i], side, goalLabel(ev.text), [running[0], running[1]]);
    });
    if (evs.some((e) => !e.penalty && (e.type === "save" || e.type === "miss"))) Audio.kick(0.6);
    if (sim.pendingInjury) {
      const pi = sim.pendingInjury;
      sim.pendingInjury = null;
      this.paused = true;
      this.openSubs(`${this.w.players[pi.pid]?.name ?? "Um jogador"} se machucou. Faça uma substituição.`, true);
    }
    this.settleBreaks();
    this.emit();
  }

  private finish(): void {
    if (this.over) return;
    this.over = true;
    this.paused = true;
    this.overlay = "end";
    this.subsOpen = false;
    Audio.whistle(true);
  }

  // ---------- Controles ----------
  setSpeed(i: SpeedIndex): void {
    this.speed = i;
    this.emit();
  }

  togglePause(): void {
    if (this.over || this.scene) return;
    this.paused = !this.paused;
    if (!this.paused) this.overlay = null;
    this.emit();
  }

  /** "2º tempo" no intervalo. */
  resume(): void {
    if (this.over) return;
    this.overlay = null;
    this.paused = false;
    this.emit();
  }

  /** Simula direto até o apito final. */
  skip(): void {
    if (this.over) return;
    if (this.scene) this.skipScenes();
    const sim = this.sim;
    this.overlay = null;
    this.subsOpen = false;
    const goalsBefore = sim.goals.length;
    const running: [number, number] = [sim.score[0], sim.score[1]];
    while (!sim.finished) {
      const evs = sim.step();
      for (const ev of evs) if (ev.type !== "build") this.pushFeed(ev);
      sim.pendingInjury = null;
    }
    // Resumo rápido: os gols que faltavam passam um a um antes do apito final.
    for (const g of sim.goals.slice(goalsBefore)) {
      running[g.side]++;
      this.queueGoal(g, g.side, g.pen ? 'GOL DE PÊNALTI!' : 'GOL!', [running[0], running[1]], true);
    }
    this.settleBreaks();
    this.emit();
  }

  openSubs(note: string | null = null, forced = false): void {
    if (this.over) return;
    // Ao fechar, volta a rolar se estava rolando (ou se a pausa foi por lesão), exceto no intervalo.
    this.resumeOnClose = forced || !this.paused;
    this.paused = true;
    this.subsOpen = true;
    this.subsNote = note;
    this.emit();
  }

  closeSubs(): void {
    this.subsOpen = false;
    this.subsNote = null;
    if (this.resumeOnClose && this.sim.phase !== "half" && !this.over) this.paused = false;
    this.resumeOnClose = false;
    this.emit();
  }

  sub(outPid: string, inPid: string): boolean {
    const n = this.sim.events.length;
    const ok = this.sim.sub(outPid, inPid);
    if (ok) for (const ev of this.sim.events.slice(n)) this.pushFeed(ev);
    this.emit();
    return ok;
  }

  setFormation(f: FormationKey): void {
    this.sim.setFormation(f);
    this.emit();
  }

  /** Volta ao desenho personalizado do clube. */
  setShape(shape: FormationSlot[]): void {
    this.sim.setShape(shape);
    this.emit();
  }

  setTactic(t: TacticKey): void {
    this.sim.setTactic(t);
    this.emit();
  }

  setInstructions(instr: Partial<Instructions>): void {
    this.sim.setInstructions(instr);
    this.emit();
  }

  result(): MatchResult {
    return this.sim.result();
  }
}

// Controlador da partida ao vivo: guarda o Sim, roda o laço rAF e expõe um snapshot
// (atualizado por minuto de jogo) para a interface via useSyncExternalStore.
import { Sim } from "@/game";
import type { FormationKey, Match, MatchResult, MatchStats, SimEvent, TacticKey, World } from "@/game/types";
import { Audio } from "@/arcade/audio";
import { kits, pct, simOptions, type Kit } from "../matchUtils";
import { PITCH_RATIO, drawLivePitch, type PitchAnim, type PitchScale } from "./drawPitch";

/** Segundos reais por minuto de jogo (1x, 2x, 4x). */
export const SPEEDS = [0.9, 0.42, 0.14] as const;
export type SpeedIndex = 0 | 1 | 2;

export interface FeedItem extends SimEvent {
  key: number;
}

export type LiveOverlay = "half" | "end" | null;

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
  flash: { side: number; key: number } | null;
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
  flash: { side: number; key: number } | null = null;
  subsOpen = false;
  subsNote: string | null = null;
  private resumeOnClose = false;
  private feed: FeedItem[] = [];
  private feedSeq = 0;
  private acc = 0;
  private rev = 0;
  private started = false;
  private anim: PitchAnim = { dots: new Map(), ball: { x: 50, y: 50 } };
  private scale: PitchScale = { w: 1, h: 1, dpr: 1 };
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
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
    const minuteText = sim.finished ? "Encerrado" : sim.phase === "half" ? "Intervalo" : min > 90 ? `90+${min - 90}'` : `${min}'`;
    return {
      rev: this.rev,
      minute: min,
      minuteText,
      score: [sim.score[0], sim.score[1]],
      pens: sim.pens ? [sim.pens[0], sim.pens[1]] : null,
      poss: pct(sim.stats.poss[0], sim.stats.poss[1]),
      stats: cloneStats(sim.stats),
      feed: this.feed,
      speed: this.speed,
      paused: this.paused,
      over: this.over,
      overlay: this.overlay,
      flash: this.flash,
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
      if (!this.paused && !sim.finished) {
        this.acc += dt;
        const dur = SPEEDS[this.speed];
        while (this.acc >= dur && !this.paused && !sim.finished) {
          this.acc -= dur;
          this.minute();
        }
      }
      if (ctx) drawLivePitch(ctx, this.scale, sim, this.w, this.kits, this.anim, dt, now);
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
  }

  private pushFeed(ev: SimEvent): void {
    if (ev.type === "build" && this.speed === 2) return;
    this.feed = [{ ...ev, key: ++this.feedSeq }, ...this.feed].slice(0, 120);
  }

  private minute(): void {
    const sim = this.sim;
    const evs = sim.step();
    for (const ev of evs) this.pushFeed(ev);
    const goals = evs.filter((e) => e.type === "goal");
    if (goals.length) {
      const g = goals[goals.length - 1];
      this.flash = { side: g.side ?? 0, key: this.feedSeq };
      if (this.flashTimer) clearTimeout(this.flashTimer);
      this.flashTimer = setTimeout(() => {
        this.flash = null;
        this.emit();
      }, 2200);
      Audio.goal();
      if (this.speed === 2) this.acc = -1.2; // respiro para ver o gol no 4x
    }
    if (evs.some((e) => e.type === "save" || e.type === "miss")) Audio.kick(0.6);
    if (sim.pendingInjury) {
      const pi = sim.pendingInjury;
      sim.pendingInjury = null;
      this.paused = true;
      this.openSubs(`${this.w.players[pi.pid]?.name ?? "Um jogador"} se machucou. Faça uma substituição.`, true);
    }
    if (sim.phase === "half") {
      this.paused = true;
      this.overlay = "half";
    }
    if (sim.finished) this.finish();
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
    if (this.over) return;
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
    const sim = this.sim;
    this.overlay = null;
    this.subsOpen = false;
    while (!sim.finished) {
      const evs = sim.step();
      for (const ev of evs) if (ev.type !== "build") this.pushFeed(ev);
      sim.pendingInjury = null;
    }
    this.finish();
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

  setTactic(t: TacticKey): void {
    this.sim.setTactic(t);
    this.emit();
  }

  result(): MatchResult {
    return this.sim.result();
  }
}

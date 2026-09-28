// Laço de jogo do futebol de botão ligado a um <canvas>: rAF, redimensionamento, ponteiro e HUD.
// A interface React assina o HUD (useSyncExternalStore); nada de estado React por quadro.
import { Audio } from "./audio";
import { TURN_TIME, type Match, type MatchState } from "./game";
import { createView, draw, fitView, toLogical, type View } from "./render";

export interface ArcadeHud {
  score: [number, number];
  clockText: string;
  /** Últimos 15 segundos. */
  clockWarn: boolean;
  overtime: boolean;
  state: MatchState;
  turn: number;
  aiming: boolean;
  /** A vez atual é de um humano. */
  human: boolean;
  /** Segundos restantes da vez (arredondado para cima). */
  turnSecs: number;
  /** Fração da barra de tempo da vez (0-1). */
  turnFrac: number;
  paused: boolean;
}

const EMPTY_HUD: ArcadeHud = {
  score: [0, 0], clockText: "0:00", clockWarn: false, overtime: false, state: "intro",
  turn: 0, aiming: false, human: false, turnSecs: TURN_TIME, turnFrac: 0, paused: false,
};

export function fmtClock(s: number): string {
  const c = Math.ceil(s);
  return Math.floor(c / 60) + ":" + String(c % 60).padStart(2, "0");
}

export interface RunnerOptions {
  /** Chamado a cada quadro depois de update() (ex.: reiniciar a demonstração). */
  onTick?: (m: Match) => void;
  /** Pausa a partida quando a aba fica oculta (só em partidas com humanos). */
  pauseOnHide?: boolean;
}

export class ArcadeRunner {
  match: Match | null = null;
  /** false = demonstração (ignora o ponteiro). */
  interactive = true;
  readonly view: View = createView();
  private opts: RunnerOptions;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private raf = 0;
  private last = 0;
  private hud: ArcadeHud = EMPTY_HUD;
  private hudKey = "";
  private listeners = new Set<() => void>();

  constructor(opts: RunnerOptions = {}) {
    this.opts = opts;
  }

  // ---------- Store do HUD ----------
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = (): ArcadeHud => this.hud;
  getServerSnapshot = (): ArcadeHud => EMPTY_HUD;

  private computeHud(): void {
    const m = this.match;
    if (!m) return;
    const aiming = m.state === "aim";
    const human = m.isHumanTurn();
    const frac = aiming && human ? Math.max(0, m.turnTimer / TURN_TIME) : aiming ? 1 : 0;
    const next: ArcadeHud = {
      score: [m.score[0], m.score[1]],
      clockText: m.overtime ? "MORTE SÚBITA" : fmtClock(m.clock),
      clockWarn: !m.overtime && m.clock <= 15,
      overtime: m.overtime,
      state: m.state,
      turn: m.turn,
      aiming,
      human,
      turnSecs: Math.max(0, Math.ceil(m.turnTimer)),
      turnFrac: Math.round(frac * 48) / 48,
      paused: m.paused,
    };
    const key = `${next.score}|${next.clockText}|${next.clockWarn}|${next.state}|${next.turn}|${human}|${next.turnSecs}|${next.turnFrac}|${next.paused}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    this.hud = next;
    for (const fn of this.listeners) fn();
  }

  // ---------- Partida ----------
  setMatch(m: Match | null, interactive = true): void {
    this.match = m;
    this.interactive = interactive;
    this.hudKey = "";
    this.computeHud();
  }

  setPaused(v: boolean): void {
    const m = this.match;
    if (!m || m.state === "over") return;
    m.paused = v;
    if (v) m.cancelDrag();
    this.computeHud();
  }

  // ---------- Canvas ----------
  /** Liga o laço ao canvas. Devolve a função de limpeza (rAF, listeners, observer). */
  attach(canvas: HTMLCanvasElement, stage: HTMLElement): () => void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    const resize = () => {
      const cs = getComputedStyle(stage);
      const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      fitView(this.view, canvas, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const logical = (e: PointerEvent) => toLogical(this.view, canvas, e.clientX, e.clientY);
    const down = (e: PointerEvent) => {
      Audio.init();
      const m = this.match;
      if (!m || !this.interactive) return;
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ponteiro já liberado */
      }
      m.pointerDown(...logical(e));
    };
    const move = (e: PointerEvent) => {
      if (this.match && this.interactive) this.match.pointerMove(...logical(e));
    };
    const up = () => {
      if (this.match && this.interactive) this.match.pointerUp();
    };
    const cancel = () => this.match?.cancelDrag();
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);

    const onVis = () => {
      if (document.hidden && this.opts.pauseOnHide && this.interactive && this.match && this.match.state !== "over") this.setPaused(true);
    };
    document.addEventListener("visibilitychange", onVis);

    this.last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      const m = this.match;
      if (m) {
        m.update(dt);
        this.opts.onTick?.(m);
        const cur = this.match;
        if (cur && this.ctx) draw(this.ctx, cur, now / 1000, this.view);
        this.computeHud();
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(this.raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      document.removeEventListener("visibilitychange", onVis);
      this.canvas = null;
      this.ctx = null;
    };
  }
}

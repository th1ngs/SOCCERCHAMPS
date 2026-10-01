// Laço do lance ligado ao canvas: gestos (deslizar = chute, tocar no companheiro = passe,
// tocar no gramado = conduzir), atualização do motor, render 3D, sons e HUD para o React.
import { Audio } from "@/arcade/audio";
import { BALL_R, Chance, GOAL_Z, type ChanceSetup, type LanceResult, type Phase } from "./engine";
import { LanceScene } from "./render3d";

export interface LanceHud {
  phase: Phase;
  timeLeft: number;
  timeFrac: number;
  carrier: string;
  result: LanceResult | null;
}

const EMPTY: LanceHud = { phase: "intro", timeLeft: 0, timeFrac: 1, carrier: "", result: null };

interface Sample { x: number; y: number; t: number }

/**
 * Mira, altura, força e efeito a partir do gesto (exportado para testes).
 * - Direção do deslize: o lado do gol (a reta do gesto, saindo da bola, cruza a linha do gol na tela).
 * - Comprimento: a altura (curto = rasteiro, médio = meia altura, longo = no ângulo, exagerado = por cima).
 * - Velocidade: a força. Curvatura do gesto: o efeito.
 */
export function swipeToShot(samples: Sample[], ball: { x: number; y: number }, goal: { x: number; y: number }, ref: number): { screenX: number; screenY: number; height: number; power: number; curve: number } | null {
  if (samples.length < 2) return null;
  const a = samples[0], z = samples[samples.length - 1];
  const cx = z.x - a.x, cy = z.y - a.y;
  const chord = Math.sqrt(cx * cx + cy * cy);
  if (chord < 24 || cy > -8) return null; // precisa ser para cima
  let len = 0;
  for (let i = 1; i < samples.length; i++) len += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
  const dur = Math.max(40, z.t - a.t);
  const dx = cx / chord, dy = cy / chord;
  // Onde a reta do gesto (saindo da bola) cruza a altura do gol na tela.
  const rise = ball.y - goal.y;
  const t = rise > 4 ? rise / -dy : Math.hypot(goal.x - ball.x, goal.y - ball.y);
  const screenX = ball.x + dx * t;
  // Comprimento relativo à altura da tela (os gestos são verticais).
  const k = chord / ref;
  const height = 0.15 + Math.max(0, Math.min(1.5, (k - 0.08) / 0.34)) * 2.5;
  const speed = len / dur; // px/ms
  const power = Math.max(0.2, Math.min(1, 0.25 + Math.min(1, speed / 1.6) * 0.75));
  // Curva: maior desvio do gesto em relação à reta (com sinal). Desvio para a esquerda = bola curva para a direita.
  let dev = 0;
  for (const p of samples) {
    const d = (cx * (p.y - a.y) - cy * (p.x - a.x)) / chord;
    if (Math.abs(d) > Math.abs(dev)) dev = d;
  }
  const curve = Math.max(-1, Math.min(1, (dev / chord) * 4.5));
  return { screenX, screenY: goal.y, height, power, curve: Math.abs(curve) < 0.08 ? 0 : curve };
}

export class LanceRunner {
  chance: Chance | null = null;
  private scene: LanceScene | null = null;
  private hud: LanceHud = EMPTY;
  private hudKey = "";
  private listeners = new Set<() => void>();
  /** Chamado quando o lance termina (depois da comemoração). */
  private onDone: (r: LanceResult) => void = () => {};

  setOnDone(fn: (r: LanceResult) => void): void {
    this.onDone = fn;
  }
  private doneFired = false;
  private samples: Sample[] = [];
  private trail: { x: number; y: number; t: number }[] = [];
  private overlay: CanvasRenderingContext2D | null = null;
  private w = 1;
  private h = 1;
  private raf = 0;
  private hold = 2.6;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };
  getSnapshot = (): LanceHud => this.hud;
  getServerSnapshot = (): LanceHud => EMPTY;

  /** Começa um lance novo (pode ser chamado com o canvas já ligado). */
  start(setup: ChanceSetup): void {
    this.chance = new Chance(setup);
    this.doneFired = false;
    this.scene?.setChance(this.chance);
    this.computeHud(true);
  }

  /** Encerra a comemoração e segue (toque na tela depois do resultado). */
  skip(): void {
    const c = this.chance;
    if (c?.phase === "done" && c.doneT > 0.6) c.doneT = this.hold;
  }

  private computeHud(force = false): void {
    const c = this.chance;
    if (!c) return;
    const next: LanceHud = {
      phase: c.phase,
      timeLeft: Math.ceil(c.timeLeft),
      timeFrac: Math.round((c.timeLeft / c.timeLimit) * 60) / 60,
      carrier: `${c.actors[c.carrier].p.num || ""} ${c.actors[c.carrier].p.name}`.trim(),
      result: c.result,
    };
    const key = `${next.phase}|${next.timeLeft}|${next.timeFrac}|${next.carrier}|${next.result?.outcome ?? ""}`;
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    this.hud = next;
    for (const fn of this.listeners) fn();
  }

  attach(canvas: HTMLCanvasElement, overlay: HTMLCanvasElement, stage: HTMLElement): () => void {
    const scene = new LanceScene(canvas);
    this.scene = scene;
    if (this.chance) scene.setChance(this.chance);
    this.overlay = overlay.getContext("2d");
    const resize = () => {
      const r = stage.getBoundingClientRect();
      this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
      const dpr = window.devicePixelRatio || 1;
      scene.resize(this.w, this.h, dpr);
      overlay.width = Math.round(this.w * dpr); overlay.height = Math.round(this.h * dpr);
      overlay.style.width = `${this.w}px`; overlay.style.height = `${this.h}px`;
      this.overlay?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
    };
    const down = (e: PointerEvent) => {
      Audio.init();
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
      if (this.chance?.phase === "done") { this.skip(); return; }
      this.samples = [local(e)];
    };
    const move = (e: PointerEvent) => {
      if (!this.samples.length) return;
      const p = local(e);
      this.samples.push(p);
      this.trail.push(p);
      this.previewAim();
    };
    const up = (e: PointerEvent) => {
      if (!this.samples.length) return;
      this.samples.push(local(e));
      this.gesture(this.samples);
      this.samples = [];
      scene.setAim(null);
    };
    const cancel = () => { this.samples = []; scene.setAim(null); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = this.chance;
      if (c) {
        c.update(dt);
        for (const ev of c.drainEvents()) this.sound(ev.type);
        if (c.phase === "done" && c.doneT >= this.hold && !this.doneFired && c.result) {
          this.doneFired = true;
          this.onDone(c.result);
        }
      }
      scene.render(dt, now / 1000);
      this.drawOverlay(now);
      this.computeHud();
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
      scene.dispose();
      this.scene = null;
    };
  }

  private sound(type: string): void {
    switch (type) {
      case "whistle": Audio.whistle(false); break;
      case "pass": Audio.kick(0.35); break;
      case "kick": Audio.kick(0.9); break;
      case "goal": Audio.goal(); break;
      case "save": case "block": Audio.hit({ type: "ball", v: 1600 }); Audio.ooh(); break;
      case "post": Audio.post(); Audio.ooh(); break;
      case "tackle": case "intercept": Audio.hit({ type: "disc", v: 900 }); break;
    }
  }

  private shotFrom(samples: Sample[]) {
    const c = this.chance, s = this.scene;
    if (!c || !s) return null;
    const ball = s.toScreen(c.ball.x, BALL_R, c.ball.z);
    const goal = s.toScreen(0, 1.2, GOAL_Z);
    const g = swipeToShot(samples, ball, goal, this.h);
    if (!g) return null;
    const aim = s.goalPlaneAt(g.screenX, g.screenY);
    if (!aim) return null;
    return { tx: Math.max(-9, Math.min(9, aim.x)), ty: Math.max(0.1, Math.min(4.5, g.height)), power: g.power, curve: g.curve };
  }

  private previewAim(): void {
    const c = this.chance;
    if (!c || c.phase !== "play" || !this.scene) return;
    const shot = this.shotFrom(this.samples);
    this.scene.setAim(shot ? { x: shot.tx, y: shot.ty } : null);
  }

  private gesture(samples: Sample[]): void {
    const c = this.chance, s = this.scene;
    if (!c || !s || c.phase !== "play") return;
    const a = samples[0], z = samples[samples.length - 1];
    let len = 0;
    for (let i = 1; i < samples.length; i++) len += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
    if (len < 16 && z.t - a.t < 450) {
      // Toque: companheiro perto do toque recebe o passe; senão, conduz até o ponto do gramado.
      let best = -1, bd = 64;
      for (const p of c.attackers) {
        if (p.i === c.carrier) continue;
        const sp = s.toScreen(p.x, 1.0, p.z);
        const d = Math.hypot(sp.x - z.x, sp.y - z.y);
        if (d < bd) { bd = d; best = p.i; }
      }
      if (best >= 0) { c.commandPass(best); return; }
      const g = s.groundAt(z.x, z.y);
      if (g) c.commandMove(g.x, g.z);
      return;
    }
    const shot = this.shotFrom(samples);
    if (shot) c.commandShot(shot);
  }

  private drawOverlay(now: number): void {
    const o = this.overlay;
    if (!o) return;
    o.clearRect(0, 0, this.w, this.h);
    this.trail = this.trail.filter((p) => now - p.t < 380);
    if (this.trail.length < 2) return;
    o.lineCap = "round"; o.lineJoin = "round";
    for (let i = 1; i < this.trail.length; i++) {
      const p0 = this.trail[i - 1], p1 = this.trail[i];
      const f = 1 - (now - p1.t) / 380;
      o.strokeStyle = `rgba(255,214,70,${0.75 * f})`;
      o.lineWidth = 3 + 9 * f;
      o.beginPath(); o.moveTo(p0.x, p0.y); o.lineTo(p1.x, p1.y); o.stroke();
    }
  }
}

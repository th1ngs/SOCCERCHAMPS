// Laço do lance ligado ao canvas: gestos, teclado, atualização do motor, render 3D, sons e HUD para o React.
// Gestos: deslizar = chute (durante um passe, de primeira); tocar no companheiro = passe rasteiro;
// segurar no companheiro = passe por cima; tocar no gramado = conduzir até lá; segurar e arrastar = conduzir
// seguindo o dedo (em velocidade); dois toques em quem tem a bola = drible.
import { Audio } from "@/arcade/audio";
import { BALL_R, Chance, GOAL_Z, type ChanceSetup, type LanceResult, type Phase } from "./engine";
import { LanceScene, type CameraView } from "./render3d";

export interface LanceHud {
  phase: Phase;
  timeLeft: number;
  timeFrac: number;
  carrier: string;
  result: LanceResult | null;
  /** Drible disponível (sem recarga). */
  dribble: boolean;
}

const EMPTY: LanceHud = { phase: "intro", timeLeft: 0, timeFrac: 1, carrier: "", result: null, dribble: true };

/** Segurar no companheiro por este tempo = passe por cima (ms). */
export const LOB_HOLD_MS = 320;
/** Segurar parado no gramado por este tempo = conduzir seguindo o dedo (ms). */
const STEER_HOLD_MS = 190;
/** Movimento (px) que transforma o toque em deslize. */
const SWIPE_PX = 26;

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

  private view: CameraView = "top";
  /** Troca a câmera (alta ou atrás do jogador). */
  setView(v: CameraView): void {
    this.view = v;
    this.scene?.setView(v);
  }
  private doneFired = false;
  private paused = false;
  /** Pausa o lance (ajuda aberta). */
  setPaused(p: boolean): void {
    this.paused = p;
    this.press = null;
    this.keys.clear();
  }
  /** Toque em andamento: começo, amostras e o que ele virou. */
  private press: { samples: Sample[]; mode: "pending" | "swipe" | "steer"; mate: number | null; onCarrier: boolean } | null = null;
  private lastCarrierTap = 0;
  private steerAt: { x: number; y: number } | null = null;
  private keys = new Set<string>();
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
    this.press = null;
    this.scene?.setChance(this.chance);
    this.computeHud(true);
  }

  /** Encerra a comemoração e segue (toque na tela depois do resultado). */
  skip(): void {
    const c = this.chance;
    if (c?.phase === "done" && c.doneT > 0.6) c.doneT = this.hold;
  }

  /** Drible pelo botão da tela (mesmo efeito de dois toques em quem tem a bola). */
  dribble(): void {
    this.chance?.commandDribble();
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
      dribble: c.dribbleCd === 0,
    };
    const key = `${next.phase}|${next.timeLeft}|${next.timeFrac}|${next.carrier}|${next.result?.outcome ?? ""}|${next.dribble}`;
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    this.hud = next;
    for (const fn of this.listeners) fn();
  }

  /**
   * Posição de um companheiro na tela; fora dela, preso na borda (seta indicadora, que também recebe o toque).
   */
  private mateScreen(i: number): { x: number; y: number; edge: boolean; ang: number } | null {
    const c = this.chance, s = this.scene;
    if (!c || !s) return null;
    const m = c.actors[i];
    const sp = s.toScreen(m.x, 1.0, m.z);
    const x0 = 26, x1 = this.w - 26, y0 = 120, y1 = this.h - 26;
    if (!sp.behind && sp.x >= x0 && sp.x <= x1 && sp.y >= y0 && sp.y <= y1) return { x: sp.x, y: sp.y, edge: false, ang: 0 };
    const cx = this.w / 2, cy = this.h / 2;
    let dx = sp.x - cx, dy = sp.y - cy;
    if (sp.behind) { dx = -dx; dy = -dy; }
    const k = Math.min(Math.abs((dx > 0 ? x1 - cx : x0 - cx) / (dx || 1e-6)), Math.abs((dy > 0 ? y1 - cy : y0 - cy) / (dy || 1e-6)));
    return { x: cx + dx * k, y: cy + dy * k, edge: true, ang: Math.atan2(dy, dx) };
  }

  /** Companheiro (não quem conduz) mais perto do ponto da tela, dentro de `radius` px. */
  private mateAt(x: number, y: number, radius = 60): number | null {
    const c = this.chance;
    if (!c) return null;
    let best: number | null = null, bd = radius;
    for (const p of c.attackers) {
      if (p.i === c.carrier) continue;
      const sp = this.mateScreen(p.i);
      if (!sp) continue;
      const d = Math.hypot(sp.x - x, sp.y - y);
      if (d < bd) { bd = d; best = p.i; }
    }
    return best;
  }

  private onCarrier(x: number, y: number): boolean {
    const c = this.chance, s = this.scene;
    if (!c || !s) return false;
    const a = c.actors[c.carrier];
    const sp = s.toScreen(a.x, 0.9, a.z);
    return Math.hypot(sp.x - x, sp.y - y) < 52;
  }

  attach(canvas: HTMLCanvasElement, overlay: HTMLCanvasElement, stage: HTMLElement): () => void {
    const scene = new LanceScene(canvas);
    this.scene = scene;
    scene.setView(this.view);
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

    // Hora em que o evento aconteceu (não quando foi tratado): em aparelho lento os eventos chegam atrasados, em lote.
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const t = e.timeStamp > 0 && e.timeStamp <= performance.now() + 50 ? e.timeStamp : performance.now();
      return { x: e.clientX - r.left, y: e.clientY - r.top, t };
    };
    const down = (e: PointerEvent) => {
      Audio.init();
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
      if (this.paused) return;
      if (this.chance?.phase === "done") { this.skip(); return; }
      const p = local(e);
      this.press = { samples: [p], mode: "pending", mate: this.mateAt(p.x, p.y), onCarrier: this.onCarrier(p.x, p.y) };
    };
    const move = (e: PointerEvent) => {
      const pr = this.press;
      if (!pr) return;
      const p = local(e);
      pr.samples.push(p);
      const a = pr.samples[0];
      if (pr.mode === "pending" && Math.hypot(p.x - a.x, p.y - a.y) > SWIPE_PX) pr.mode = "swipe";
      if (pr.mode === "swipe") { this.trail.push(p); this.previewAim(pr.samples); }
      else if (pr.mode === "steer") this.steerTo(p.x, p.y);
    };
    const up = (e: PointerEvent) => {
      const pr = this.press;
      if (!pr) return;
      pr.samples.push(local(e));
      this.release(pr);
      this.press = null;
      this.steerAt = null;
      scene.setAim(null);
    };
    const cancel = () => { this.press = null; this.steerAt = null; scene.setAim(null); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);

    // Teclado (computador): WASD/setas conduzem (Shift = arrancada), Espaço dribla.
    const KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"];
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (this.paused) return;
      if (k === " ") { e.preventDefault(); this.chance?.commandDribble(); return; }
      if (KEYS.includes(k)) { this.keys.add(k); if (k.startsWith("arrow")) e.preventDefault(); }
    };
    const ku = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
    const blur = () => this.keys.clear();
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = this.paused ? null : this.chance;
      if (c) {
        // Quadro lento: pode haver toques ainda na fila; espera antes de decidir que o dedo está parado.
        if (dt < 0.07) this.holdChecks(now);
        this.keyboard();
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
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
      scene.dispose();
      this.scene = null;
    };
  }

  /** Segurar parado no gramado vira condução seguindo o dedo. */
  private holdChecks(now: number): void {
    const pr = this.press, c = this.chance;
    if (!pr || !c || pr.mode !== "pending" || pr.mate !== null || pr.onCarrier) return;
    if (now - pr.samples[0].t >= STEER_HOLD_MS && c.phase === "play") {
      pr.mode = "steer";
      const p = pr.samples[pr.samples.length - 1];
      this.steerTo(p.x, p.y);
    }
  }

  private steerTo(x: number, y: number): void {
    const c = this.chance, s = this.scene;
    if (!c || !s) return;
    this.steerAt = { x, y };
    const g = s.groundAt(x, y);
    if (g) c.commandMove(g.x, g.z, true);
  }

  private keyboard(): void {
    const c = this.chance;
    if (!c || c.phase !== "play" || !this.keys.size) return;
    const k = this.keys;
    // Câmera atrás do ataque: para cima = rumo ao gol (+z); direita da tela = −x.
    const fz = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    const fx = (k.has("a") || k.has("arrowleft") ? 1 : 0) - (k.has("d") || k.has("arrowright") ? 1 : 0);
    if (!fx && !fz) return;
    const a = c.actors[c.carrier];
    const l = Math.hypot(fx, fz);
    c.commandMove(a.x + (fx / l) * 3, a.z + (fz / l) * 3, k.has("shift"));
  }

  /** Fim do toque: decide entre chute, passe (rasteiro ou por cima), drible, parar ou conduzir. */
  private release(pr: NonNullable<LanceRunner["press"]>): void {
    const c = this.chance, s = this.scene;
    if (!c || !s) return;
    const a = pr.samples[0], z = pr.samples[pr.samples.length - 1];
    if (pr.mode === "swipe") {
      const shot = this.shotFrom(pr.samples);
      if (shot) c.commandShot(shot);
      return;
    }
    if (pr.mode === "steer") {
      // Conduzindo e terminou com um puxão rápido para cima: chuta (conduzir e chutar no mesmo gesto).
      const recent = pr.samples.filter((p) => z.t - p.t <= 150);
      const r0 = recent[0];
      if (r0 && recent.length >= 2 && r0.y - z.y > 60 && Math.hypot(z.x - r0.x, z.y - r0.y) / (z.t - r0.t + 1) > 0.6) {
        const shot = this.shotFrom(recent);
        if (shot) { c.commandShot(shot); return; }
      }
      // Soltou: termina a corrida até o último ponto, sem arrancada.
      const g = s.groundAt(z.x, z.y);
      if (g) c.commandMove(g.x, g.z, false);
      return;
    }
    if (c.phase !== "play") return;
    if (pr.mate !== null) { c.commandPass(pr.mate, z.t - a.t >= LOB_HOLD_MS); return; }
    if (pr.onCarrier) {
      // Dois toques em quem tem a bola: drible; um toque: segura a bola.
      if (z.t - this.lastCarrierTap < 380) { c.commandDribble(); this.lastCarrierTap = 0; }
      else { c.commandStop(); this.lastCarrierTap = z.t; }
      return;
    }
    const g = s.groundAt(z.x, z.y);
    if (g) c.commandMove(g.x, g.z);
  }

  private sound(type: string): void {
    switch (type) {
      case "whistle": Audio.whistle(false); break;
      case "offside": Audio.whistle(true); break;
      case "pass": Audio.kick(0.35); break;
      case "lob": Audio.kick(0.5); break;
      case "dribble": Audio.kick(0.18); break;
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

  private previewAim(samples: Sample[]): void {
    const c = this.chance;
    if (!c || (c.phase !== "play" && c.phase !== "pass") || !this.scene) return;
    const shot = this.shotFrom(samples);
    this.scene.setAim(shot ? { x: shot.tx, y: shot.ty } : null);
  }

  private drawOverlay(now: number): void {
    const o = this.overlay;
    if (!o) return;
    o.clearRect(0, 0, this.w, this.h);
    const pr = this.press, c = this.chance, s = this.scene;
    // Companheiros fora da tela: seta na borda com o número (vermelha se estiver impedido).
    if (c && s && (c.phase === "play" || c.phase === "pass")) {
      for (const m of c.attackers) {
        if (m.i === c.carrier) continue;
        const sp = this.mateScreen(m.i);
        if (!sp?.edge) continue;
        const off = c.isOffside(m);
        o.save();
        o.translate(sp.x, sp.y);
        o.fillStyle = off ? "rgba(220,38,38,0.92)" : "rgba(5,10,18,0.82)";
        o.strokeStyle = off ? "#fecaca" : "#ffd23f"; o.lineWidth = 2;
        o.beginPath(); o.arc(0, 0, 17, 0, Math.PI * 2); o.fill(); o.stroke();
        o.rotate(sp.ang);
        o.fillStyle = off ? "#fecaca" : "#ffd23f";
        o.beginPath(); o.moveTo(25, 0); o.lineTo(17, -6); o.lineTo(17, 6); o.closePath(); o.fill();
        o.restore();
        o.fillStyle = "#fff"; o.font = "800 13px system-ui, sans-serif"; o.textAlign = "center"; o.textBaseline = "middle";
        o.fillText(String(m.p.num || "•"), sp.x, sp.y + 1);
      }
    }
    // Segurando no companheiro: anel que enche até virar passe por cima.
    if (pr && pr.mode === "pending" && pr.mate !== null && c && s) {
      const sp = this.mateScreen(pr.mate) ?? { x: 0, y: 0 };
      const f = Math.min(1, (now - pr.samples[0].t) / LOB_HOLD_MS);
      o.lineWidth = 5; o.lineCap = "round";
      o.strokeStyle = "rgba(255,255,255,0.25)";
      o.beginPath(); o.arc(sp.x, sp.y, 30, 0, Math.PI * 2); o.stroke();
      o.strokeStyle = f >= 1 ? "#7dd3fc" : "#ffd23f";
      o.beginPath(); o.arc(sp.x, sp.y, 30, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); o.stroke();
      if (f >= 1) { o.fillStyle = "#7dd3fc"; o.font = "800 12px system-ui, sans-serif"; o.textAlign = "center"; o.fillText("POR CIMA", sp.x, sp.y - 38); }
    }
    // Conduzindo com o dedo: alvo sob o dedo.
    if (this.steerAt) {
      const p = this.steerAt, pulse = 0.5 + 0.5 * Math.sin(now / 90);
      o.strokeStyle = `rgba(125,211,252,${0.6 + pulse * 0.3})`; o.lineWidth = 3;
      o.beginPath(); o.arc(p.x, p.y, 22 + pulse * 4, 0, Math.PI * 2); o.stroke();
    }
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

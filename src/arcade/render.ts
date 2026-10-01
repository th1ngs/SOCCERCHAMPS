// Desenho do campo, bandeiras, discos, bola, mira e efeitos. Porta do antigo js/render.js.
// O estado da tela (View) é uma instância passada pelo chamador, não um global.
import type { Flag, Match, Team } from "./game";
import { F, P, type Body } from "./physics";

/** Estado da tela: escala lógica->CSS, devicePixelRatio e rotação (modo retrato). */
export interface View {
  s: number;
  dpr: number;
  rot: boolean;
  cw: number;
  ch: number;
  /** Cache do gramado desenhado nesta escala. */
  pitch: HTMLCanvasElement | null;
  pitchKey: string;
}

export function createView(): View {
  return { s: 1, dpr: 1, rot: false, cw: F.w, ch: F.h, pitch: null, pitchKey: "" };
}

/** Ajusta a View e o canvas ao tamanho disponível (gira o campo em telas em pé). */
export function fitView(view: View, canvas: HTMLCanvasElement, availW: number, availH: number): void {
  const w = Math.max(1, availW), h = Math.max(1, availH);
  view.rot = h > w * 1.15;
  const lw = view.rot ? F.h : F.w, lh = view.rot ? F.w : F.h;
  view.s = Math.min(w / lw, h / lh);
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.cw = lw * view.s;
  view.ch = lh * view.s;
  canvas.style.width = view.cw + "px";
  canvas.style.height = view.ch + "px";
  canvas.width = Math.round(view.cw * view.dpr);
  canvas.height = Math.round(view.ch * view.dpr);
}

/** Converte um ponto da tela (clientX/Y) para as coordenadas lógicas do campo. */
export function toLogical(view: View, canvas: HTMLCanvasElement, clientX: number, clientY: number): [number, number] {
  const r = canvas.getBoundingClientRect();
  const X = ((clientX - r.left) / (r.width || 1)) * view.cw, Y = ((clientY - r.top) / (r.height || 1)) * view.ch;
  return view.rot ? [F.w - Y / view.s, X / view.s] : [X / view.s, Y / view.s];
}

const sprites = new Map<string, HTMLCanvasElement>();

let fontCache = "";
/** Fonte de títulos do app (next/font gera um nome com hash, exposto em --font-head). */
export function displayFont(): string {
  if (fontCache) return fontCache;
  let fam = "";
  try {
    fam = getComputedStyle(document.documentElement).getPropertyValue("--font-head").trim();
  } catch {
    fam = "";
  }
  fontCache = (fam ? fam + ", " : "") + '"Arial Black", system-ui, sans-serif';
  return fontCache;
}

// ---------- Bandeiras ----------
function starPath(c: CanvasRenderingContext2D, cx: number, cy: number, R: number, r: number): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    c.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  c.closePath();
}

export function drawFlag(c: CanvasRenderingContext2D, flag: Flag, x: number, y: number, w: number, h: number): void {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  const m = Math.min(w, h);
  switch (flag.type) {
    case "h": {
      const n = flag.colors.length;
      flag.colors.forEach((col, i) => { c.fillStyle = col; c.fillRect(x, y + (h * i) / n, w, h / n + 1); });
      break;
    }
    case "v": {
      const n = flag.colors.length;
      flag.colors.forEach((col, i) => { c.fillStyle = col; c.fillRect(x + (w * i) / n, y, w / n + 1, h); });
      break;
    }
    case "cross": {
      c.fillStyle = flag.bg; c.fillRect(x, y, w, h);
      c.fillStyle = flag.fg; const t = m * 0.2;
      c.fillRect(x, y + h / 2 - t / 2, w, t); c.fillRect(x + w / 2 - t / 2, y, t, h);
      break;
    }
    case "nordic": {
      c.fillStyle = flag.bg; c.fillRect(x, y, w, h);
      c.fillStyle = flag.fg; const t = m * 0.18;
      c.fillRect(x, y + h / 2 - t / 2, w, t); c.fillRect(x + w * 0.36 - t / 2, y, t, h);
      break;
    }
    case "swiss": {
      c.fillStyle = flag.bg; c.fillRect(x, y, w, h);
      c.fillStyle = flag.fg; const s = m * 0.6, t = s * 0.32, cx = x + w / 2, cy = y + h / 2;
      c.fillRect(cx - t / 2, cy - s / 2, t, s); c.fillRect(cx - s / 2, cy - t / 2, s, t);
      break;
    }
    case "circle": {
      c.fillStyle = flag.bg; c.fillRect(x, y, w, h);
      c.fillStyle = flag.fg; c.beginPath(); c.arc(x + w / 2, y + h / 2, m * 0.3, 0, Math.PI * 2); c.fill();
      break;
    }
    case "star": {
      c.fillStyle = flag.bg; c.fillRect(x, y, w, h);
      starPath(c, x + w / 2, y + h / 2, m * 0.32, m * 0.13);
      c.strokeStyle = flag.fg; c.lineWidth = Math.max(1.5, m * 0.06); c.lineJoin = "round"; c.stroke();
      break;
    }
    case "brazil": {
      c.fillStyle = "#009c3b"; c.fillRect(x, y, w, h);
      c.fillStyle = "#ffdf00"; c.beginPath();
      c.moveTo(x + w * 0.08, y + h / 2); c.lineTo(x + w / 2, y + h * 0.1);
      c.lineTo(x + w * 0.92, y + h / 2); c.lineTo(x + w / 2, y + h * 0.9); c.closePath(); c.fill();
      c.fillStyle = "#002776"; c.beginPath(); c.arc(x + w / 2, y + h / 2, m * 0.23, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#ffffff"; c.lineWidth = Math.max(1, m * 0.035);
      c.beginPath(); c.arc(x + w / 2, y + h * 0.78, m * 0.34, Math.PI * 1.3, Math.PI * 1.7); c.stroke();
      break;
    }
    case "usa": {
      for (let i = 0; i < 13; i++) {
        c.fillStyle = i % 2 ? "#ffffff" : "#b22234";
        c.fillRect(x, y + (h * i) / 13, w, h / 13 + 1);
      }
      c.fillStyle = "#3c3b6e"; c.fillRect(x, y, w * 0.45, (h * 7) / 13);
      c.fillStyle = "#ffffff";
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.arc(x + w * 0.06 + k * w * 0.105, y + h * 0.07 + r * h * 0.125, m * 0.022, 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
    default:
      c.fillStyle = "#888"; c.fillRect(x, y, w, h);
  }
  c.restore();
}

const flagCache = new Map<string, string>();
export function flagURL(team: Team, w = 60, h = 40): string {
  const key = team.id + w + "x" + h;
  const hit = flagCache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return "";
  const cv = document.createElement("canvas");
  cv.width = w * 2;
  cv.height = h * 2;
  const c = cv.getContext("2d");
  if (!c) return "";
  drawFlag(c, team.flag, 0, 0, w * 2, h * 2);
  const url = cv.toDataURL();
  flagCache.set(key, url);
  return url;
}

// ---------- Campo ----------
function drawPitch(c: CanvasRenderingContext2D): void {
  const { left: L, right: R, top: T, bottom: B, cx, cy, goalTop: gt, goalBottom: gb, goalDepth: gd } = F;
  c.fillStyle = "#1f6b2e"; c.fillRect(0, 0, F.w, F.h);
  const n = 14, sw = (R - L) / n;
  for (let i = 0; i < n; i++) {
    c.fillStyle = i % 2 ? "#2e9243" : "#35a24b";
    c.fillRect(L + i * sw, T, sw + 0.5, B - T);
  }
  // Vinheta suave
  const vg = c.createRadialGradient(cx, cy, 120, cx, cy, 640);
  vg.addColorStop(0, "rgba(255,255,255,0.06)"); vg.addColorStop(1, "rgba(0,0,0,0.18)");
  c.fillStyle = vg; c.fillRect(0, 0, F.w, F.h);

  c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 3; c.lineCap = "round";
  c.strokeRect(L, T, R - L, B - T);
  c.beginPath(); c.moveTo(cx, T); c.lineTo(cx, B); c.stroke();
  c.beginPath(); c.arc(cx, cy, 85, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "rgba(255,255,255,0.9)";
  c.beginPath(); c.arc(cx, cy, 4, 0, Math.PI * 2); c.fill();

  const arcA = Math.acos(40 / 85);
  for (const side of [0, 1]) {
    const gx = side === 0 ? L : R, dir = side === 0 ? 1 : -1;
    c.strokeRect(side === 0 ? L : R - 150, cy - 165, 150, 330);
    c.strokeRect(side === 0 ? L : R - 55, cy - 105, 55, 210);
    const px = gx + dir * 110;
    c.beginPath(); c.arc(px, cy, 4, 0, Math.PI * 2); c.fill();
    c.beginPath();
    if (side === 0) c.arc(px, cy, 85, -arcA, arcA);
    else c.arc(px, cy, 85, Math.PI - arcA, Math.PI + arcA);
    c.stroke();
  }
  // Escanteios
  c.beginPath(); c.arc(L, T, 15, 0, Math.PI / 2); c.stroke();
  c.beginPath(); c.arc(R, T, 15, Math.PI / 2, Math.PI); c.stroke();
  c.beginPath(); c.arc(L, B, 15, -Math.PI / 2, 0); c.stroke();
  c.beginPath(); c.arc(R, B, 15, Math.PI, Math.PI * 1.5); c.stroke();

  // Gols com rede
  for (const side of [0, 1]) {
    const x0 = side === 0 ? L - gd : R;
    c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(x0, gt, gd, gb - gt);
    c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 1;
    c.beginPath();
    for (let x = x0; x <= x0 + gd + 0.1; x += 9) { c.moveTo(x, gt); c.lineTo(x, gb); }
    for (let y = gt; y <= gb + 0.1; y += 9) { c.moveTo(x0, y); c.lineTo(x0 + gd, y); }
    c.stroke();
    c.strokeStyle = "#ffffff"; c.lineWidth = 5; c.lineJoin = "round";
    c.beginPath();
    if (side === 0) { c.moveTo(L, gt); c.lineTo(L - gd, gt); c.lineTo(L - gd, gb); c.lineTo(L, gb); }
    else { c.moveTo(R, gt); c.lineTo(R + gd, gt); c.lineTo(R + gd, gb); c.lineTo(R, gb); }
    c.stroke();
    const px = side === 0 ? L : R;
    for (const py of [gt, gb]) {
      c.fillStyle = "#ffffff"; c.beginPath(); c.arc(px, py, 6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(0,0,0,0.4)"; c.lineWidth = 1.5; c.stroke();
    }
  }
}

function getPitch(view: View): HTMLCanvasElement {
  const k = view.s * view.dpr;
  const key = k.toFixed(4);
  if (view.pitch && view.pitchKey === key) return view.pitch;
  const pitch = document.createElement("canvas");
  pitch.width = Math.ceil(F.w * k);
  pitch.height = Math.ceil(F.h * k);
  const c = pitch.getContext("2d");
  if (c) {
    c.scale(k, k);
    drawPitch(c);
  }
  view.pitch = pitch;
  view.pitchKey = key;
  return pitch;
}

// ---------- Discos ----------
const SPR = 144, SPR_R = SPR / 2 - 4;
export function discSprite(team: Team, side: number): HTMLCanvasElement {
  const key = team.id + ":" + side;
  const hit = sprites.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = cv.height = SPR;
  const x = cv.getContext("2d");
  if (!x) return cv;
  const c0 = SPR / 2;
  const g = x.createLinearGradient(0, 0, SPR, SPR);
  if (side === 0) { g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, "#aeb9c6"); g.addColorStop(1, "#eef2f6"); }
  else { g.addColorStop(0, "#fff1a8"); g.addColorStop(0.5, "#c98f00"); g.addColorStop(1, "#ffe066"); }
  x.beginPath(); x.arc(c0, c0, SPR_R, 0, Math.PI * 2); x.fillStyle = g; x.fill();
  const ir = SPR_R * 0.76;
  x.save();
  x.beginPath(); x.arc(c0, c0, ir, 0, Math.PI * 2); x.clip();
  drawFlag(x, team.flag, c0 - ir, c0 - ir, ir * 2, ir * 2);
  const gl = x.createRadialGradient(c0 - ir * 0.4, c0 - ir * 0.5, 2, c0, c0, ir * 1.15);
  gl.addColorStop(0, "rgba(255,255,255,0.55)");
  gl.addColorStop(0.45, "rgba(255,255,255,0.06)");
  gl.addColorStop(1, "rgba(0,0,0,0.28)");
  x.fillStyle = gl; x.fillRect(0, 0, SPR, SPR);
  x.restore();
  x.beginPath(); x.arc(c0, c0, ir, 0, Math.PI * 2);
  x.lineWidth = 3; x.strokeStyle = "rgba(0,0,0,0.35)"; x.stroke();
  x.beginPath(); x.arc(c0, c0, SPR_R, 0, Math.PI * 2);
  x.lineWidth = 2; x.strokeStyle = "rgba(0,0,0,0.45)"; x.stroke();
  sprites.set(key, cv);
  return cv;
}

function polygon(c: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, a0: number): void {
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = a0 + (i * Math.PI * 2) / n;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}

function drawBall(c: CanvasRenderingContext2D, b: Body): void {
  const r = b.r;
  c.save();
  c.translate(b.x, b.y);
  const g = c.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.7, "#e6e6e6"); g.addColorStop(1, "#8f8f8f");
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = g; c.fill();
  c.save(); c.clip(); c.rotate(b.rot);
  c.fillStyle = "#1b1b1b";
  polygon(c, 0, 0, r * 0.36, 5, -Math.PI / 2); c.fill();
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + Math.PI / 5 + (k * Math.PI * 2) / 5;
    polygon(c, Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98, r * 0.33, 5, a + Math.PI);
    c.fill();
  }
  c.restore();
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2);
  c.lineWidth = 1.2; c.strokeStyle = "rgba(0,0,0,0.5)"; c.stroke();
  c.restore();
}

function shadow(c: CanvasRenderingContext2D, b: Body): void {
  c.beginPath();
  c.ellipse(b.x + 3, b.y + 5, b.r * 1.02, b.r * 0.95, 0, 0, Math.PI * 2);
  c.fill();
}

function drawAim(c: CanvasRenderingContext2D, m: Match): void {
  const d = m.drag;
  if (!d || !d.disc) return;
  const disc = d.disc;
  if (d.px != null && d.py != null) {
    c.save();
    c.setLineDash([6, 7]); c.lineWidth = 2; c.strokeStyle = "rgba(255,255,255,0.4)";
    c.beginPath(); c.moveTo(disc.x, disc.y); c.lineTo(d.px, d.py); c.stroke();
    c.restore();
  }
  if (d.power <= 0) return;
  const hue = 120 - 120 * d.power;
  const col = `hsl(${hue},95%,55%)`;
  const L = disc.r + 22 + d.power * 210;
  const sx = disc.x + d.dx * (disc.r + 4), sy = disc.y + d.dy * (disc.r + 4);
  const ex = disc.x + d.dx * L, ey = disc.y + d.dy * L;
  c.save();
  c.setLineDash([2, 11]); c.lineCap = "round"; c.lineWidth = 3; c.strokeStyle = "rgba(255,255,255,0.55)";
  c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + d.dx * 260, ey + d.dy * 260); c.stroke();
  c.setLineDash([]);
  c.lineWidth = 11; c.strokeStyle = "rgba(0,0,0,0.35)";
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
  c.lineWidth = 7; c.strokeStyle = col;
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
  const ax = -d.dy, ay = d.dx;
  c.fillStyle = col; c.strokeStyle = "rgba(0,0,0,0.4)"; c.lineWidth = 2;
  c.beginPath();
  c.moveTo(ex + d.dx * 20, ey + d.dy * 20);
  c.lineTo(ex + ax * 13, ey + ay * 13);
  c.lineTo(ex - ax * 13, ey - ay * 13);
  c.closePath(); c.fill(); c.stroke();
  c.restore();
}

function worldTransform(c: CanvasRenderingContext2D, view: View): void {
  const k = view.s * view.dpr;
  if (view.rot) c.setTransform(0, -k, k, 0, 0, F.w * k);
  else c.setTransform(k, 0, 0, k, 0, 0);
}

function toScreen(view: View, x: number, y: number): [number, number] {
  return view.rot ? [y * view.s, (F.w - x) * view.s] : [x * view.s, y * view.s];
}

function drawBanner(c: CanvasRenderingContext2D, m: Match, now: number, view: View): void {
  const b = m.banner;
  if (!b) return;
  const age = now - b.t0;
  if (age > b.dur) { m.banner = null; return; }
  const inT = Math.min(1, Math.max(0, age) / 0.25), outT = Math.min(1, (b.dur - age) / 0.3);
  const a = Math.min(inT, outT);
  const scale = 0.6 + 0.4 * (1 - Math.pow(1 - inT, 3)) + (b.big ? Math.sin(age * 8) * 0.03 : 0);
  const cx = view.cw / 2, cy = view.ch / 2;
  const base = Math.min(view.cw, view.ch);
  c.save();
  c.globalAlpha = a;
  c.translate(cx, cy);
  c.scale(scale, scale);
  if (b.big) {
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.fillRect(-view.cw, -base * 0.16, view.cw * 2, base * 0.32);
  }
  const fs = base * (b.big ? 0.17 : 0.075);
  c.font = `italic 800 ${fs}px ${displayFont()}`;
  c.textAlign = "center"; c.textBaseline = "middle";
  c.lineJoin = "round"; c.lineWidth = fs * 0.14; c.strokeStyle = "rgba(0,0,0,0.75)";
  c.strokeText(b.text, 0, b.sub ? -fs * 0.18 : 0);
  c.fillStyle = b.color || "#ffffff";
  c.fillText(b.text, 0, b.sub ? -fs * 0.18 : 0);
  if (b.sub) {
    const fs2 = base * 0.045;
    c.font = `700 ${fs2}px ${displayFont()}`;
    c.lineWidth = fs2 * 0.18;
    c.strokeText(b.sub, 0, fs * 0.5);
    c.fillStyle = "#ffffff"; c.fillText(b.sub, 0, fs * 0.5);
  }
  c.restore();
}

/** Desenha um quadro da partida. `now` em segundos (performance.now() / 1000). */
export function draw(c: CanvasRenderingContext2D, m: Match, now: number, view: View): void {
  worldTransform(c, view);
  c.drawImage(getPitch(view), 0, 0, F.w, F.h);

  const bodies = m.bodies;
  const aiming = m.state === "aim";

  // Rastro da bola
  if (m.trail.length > 1) {
    c.lineCap = "round";
    for (let i = 1; i < m.trail.length; i++) {
      const p0 = m.trail[i - 1], p1 = m.trail[i];
      c.strokeStyle = `rgba(255,255,255,${(i / m.trail.length) * 0.35})`;
      c.lineWidth = (i / m.trail.length) * 16;
      c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke();
    }
  }

  c.fillStyle = "rgba(0,0,0,0.28)";
  for (const b of bodies) shadow(c, b);

  // Indicador de vez
  if (aiming) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 6);
    const human = m.isHumanTurn();
    for (let i = 1; i < bodies.length; i++) {
      const b = bodies[i];
      if (b.team !== m.turn) continue;
      const sel = !!m.drag && m.drag.disc === b;
      c.beginPath(); c.arc(b.x, b.y, b.r + 5 + (sel ? 2 : pulse * 3), 0, Math.PI * 2);
      c.lineWidth = sel ? 4 : 3;
      c.strokeStyle = sel ? "rgba(255,255,255,0.95)"
        : human ? `rgba(255,225,60,${0.45 + pulse * 0.5})` : `rgba(255,255,255,${0.15 + pulse * 0.2})`;
      c.stroke();
    }
  }

  drawAim(c, m);

  for (let i = 1; i < bodies.length; i++) {
    const b = bodies[i];
    const spr = discSprite(m.teams[b.team], b.team);
    const size = (SPR * b.r) / SPR_R;
    // Mantém as bandeiras e os números "em pé" quando o campo está girado (modo retrato).
    c.save(); c.translate(b.x, b.y);
    if (view.rot) c.rotate(Math.PI / 2);
    c.drawImage(spr, -size / 2, -size / 2, size, size);
    const team = m.teams[b.team];
    if (team.players || b.r < P.playerR) {
      const num = team.players?.[b.slot]?.num ?? b.slot + 1;
      if (b.slot === 0) {
        // Goleiro: aro verde, como a camisa diferente do arqueiro.
        c.beginPath(); c.arc(0, 0, b.r - 1.5, 0, Math.PI * 2);
        c.lineWidth = 3; c.strokeStyle = "#4ade80"; c.stroke();
      }
      c.font = `800 ${Math.round(b.r * 0.82)}px ${displayFont()}`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.lineWidth = 3.5; c.strokeStyle = "rgba(0,0,0,0.8)";
      c.strokeText(String(num), 0, 1);
      c.fillStyle = "#fff"; c.fillText(String(num), 0, 1);
    }
    c.restore();
  }
  drawBall(c, bodies[0]);

  for (const p of m.particles) {
    c.save();
    c.translate(p.x, p.y); c.rotate(p.rot);
    c.globalAlpha = Math.min(1, p.life);
    c.fillStyle = p.c;
    c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    c.restore();
  }

  // Camada de tela (textos sem rotação)
  c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  if (m.drag && m.drag.disc && m.drag.power > 0) {
    const [sx, sy] = toScreen(view, m.drag.disc.x, m.drag.disc.y);
    const fs = Math.max(12, view.s * 20);
    c.font = `700 ${fs}px ${displayFont()}`;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = 4; c.strokeStyle = "rgba(0,0,0,0.7)";
    const txt = Math.round(m.drag.power * 100) + "%";
    c.strokeText(txt, sx, sy - view.s * 48);
    c.fillStyle = "#fff"; c.fillText(txt, sx, sy - view.s * 48);
  }
  drawBanner(c, m, now, view);
}

export const Render = { draw, drawFlag, flagURL, discSprite, createView, fitView, toLogical };

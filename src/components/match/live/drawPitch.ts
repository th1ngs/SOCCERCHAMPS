// Desenho do campo da partida ao vivo (porta de L.draw no antigo js/manager/live.js).
import { FORMATIONS, clamp } from "@/game";
import type { Sim } from "@/game";
import type { World } from "@/game/types";

let fontCache = "";
/** Fonte de títulos do app (next/font gera um nome com hash, exposto em --font-head). */
function displayFont(): string {
  if (fontCache) return fontCache;
  let fam = "";
  try { fam = getComputedStyle(document.documentElement).getPropertyValue("--font-head").trim(); } catch { fam = ""; }
  fontCache = (fam ? fam + ", " : "") + '"Arial Black", system-ui, sans-serif';
  return fontCache;
}
import { contrast, type Kit } from "../matchUtils";

export interface PitchScale {
  w: number;
  h: number;
  dpr: number;
}

/** Posições suavizadas dos jogadores e da bola (persistem entre quadros). */
export interface PitchAnim {
  dots: Map<string, { x: number; y: number }>;
  ball: { x: number; y: number };
  trail: { x: number; y: number }[];
  target: string;
  pulse: { x: number; y: number; at: number; kind: string } | null;
  flight: { fromX: number; fromY: number; toX: number; toY: number; at: number; duration: number; bend: number } | null;
}

export const PITCH_RATIO = 105 / 68;
const GK_COLORS = ["#ffb000", "#7b2cbf"];

export function drawLivePitch(c: CanvasRenderingContext2D, sc: PitchScale, sim: Sim, w: World, kits: [Kit, Kit], anim: PitchAnim, dt: number, now: number, minuteMs: number): void {
  const { w: W, h: H, dpr } = sc;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mx = W * 0.04, my = H * 0.06;
  const fw = W - mx * 2, fh = H - my * 2;
  const X = (x: number) => mx + (x / 100) * fw, Y = (y: number) => my + (y / 100) * fh;

  // Gramado
  c.fillStyle = "#1f6b2e";
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 12; i++) {
    c.fillStyle = i % 2 ? "#2d8d41" : "#33994a";
    c.fillRect(X((i * 100) / 12), my, fw / 12 + 1, fh);
  }
  c.strokeStyle = "rgba(255,255,255,.85)";
  c.lineWidth = Math.max(1.5, W / 450);
  c.strokeRect(mx, my, fw, fh);
  c.beginPath(); c.moveTo(X(50), my); c.lineTo(X(50), my + fh); c.stroke();
  c.beginPath(); c.arc(X(50), Y(50), fh * 0.14, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "rgba(255,255,255,.85)";
  c.beginPath(); c.arc(X(50), Y(50), Math.max(1.5, W / 300), 0, Math.PI * 2); c.fill();
  for (const side of [0, 1]) {
    const bx = side ? X(100 - 15.7) : X(0), gx = side ? X(100 - 5.2) : X(0);
    c.strokeRect(bx, Y(21), fw * 0.157, fh * 0.58);
    c.strokeRect(gx, Y(37), fw * 0.052, fh * 0.26);
    c.fillStyle = "rgba(255,255,255,.25)";
    c.fillRect(side ? X(100) : X(0) - mx * 0.6, Y(44), mx * 0.6, fh * 0.12);
  }

  // Posições dos jogadores: o bloco se desloca na direção da bola.
  const k = 1 - Math.exp(-dt * 3);
  const b = sim.ball, bd = anim.ball;
  const target = `${sim.minute}:${b.x}:${b.y}:${b.kind}`;
  if (target !== anim.target) {
    anim.target = target;
    const fastPlay = b.kind === "goal" || b.kind === "shot" || b.kind === "save";
    anim.flight = {
      fromX: bd.x, fromY: bd.y, toX: b.x, toY: b.y, at: now,
      duration: Math.max(110, minuteMs * (fastPlay ? 0.75 : 0.9)),
      bend: fastPlay ? (b.y >= 50 ? -1 : 1) * (7 + sim.minute % 6) : b.kind === "attack" ? (sim.minute % 2 ? 7 : -7) : (sim.minute % 3 - 1) * 3,
    };
    anim.trail = [];
    if (b.kind === "shot" || b.kind === "save" || b.kind === "goal") anim.pulse = { x: b.x, y: b.y, at: now, kind: b.kind };
  }
  const fast = b.kind === "goal" || b.kind === "shot" || b.kind === "save";
  if (anim.flight) {
    const play = anim.flight;
    const progress = clamp((now - play.at) / play.duration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    bd.x = play.fromX + (play.toX - play.fromX) * eased;
    bd.y = play.fromY + (play.toY - play.fromY) * eased + Math.sin(Math.PI * progress) * play.bend;
  }
  anim.trail.push({ x: bd.x, y: bd.y });
  if (anim.trail.length > 12) anim.trail.shift();
  const t = now / 1000;
  let carrier: { x: number; y: number } | null = null, cd = Infinity;
  const placed: { d: { x: number; y: number }; num: number; gk: boolean; s: number }[] = [];
  sim.sides.forEach((side, s) => {
    const slots = FORMATIONS[side.formation];
    const nearest = side.on
      .filter((o) => slots[o.slot].pos !== "GOL" || (s === 0 ? bd.x < 20 : bd.x > 80))
      .reduce<{ slot: number; distance: number } | null>((best, o) => {
        const sl = slots[o.slot];
        const sx = s === 0 ? sl.x : 100 - sl.x;
        const sy = s === 0 ? sl.y : 100 - sl.y;
        const distance = Math.hypot(sx - bd.x, (sy - bd.y) * 0.75);
        return !best || distance < best.distance ? { slot: o.slot, distance } : best;
      }, null)?.slot;
    for (const o of side.on) {
      const sl = slots[o.slot];
      const gk = sl.pos === "GOL";
      const shift = (bd.x - 50) * (gk ? 0.08 : 0.34) + (b.side === s ? 5 : -3) * (s === 0 ? 1 : -1) * (gk ? 0.2 : 1);
      let tx = s === 0 ? sl.x : 100 - sl.x;
      let ty = s === 0 ? sl.y : 100 - sl.y;
      tx = clamp(tx + shift, 2, 98);
      ty = clamp(ty + (bd.y - 50) * (gk ? 0.1 : 0.18) + Math.sin(t * 1.3 + o.slot * 2.1 + s) * 1.4, 3, 97);
      if (o.slot === nearest) {
        const chase = b.side === s ? 0.58 : 0.34;
        tx = clamp(tx + (bd.x - tx) * chase, 2, 98);
        ty = clamp(ty + (bd.y - ty) * chase, 3, 97);
      }
      let d = anim.dots.get(o.pid);
      if (!d) {
        d = { x: tx, y: ty };
        anim.dots.set(o.pid, d);
      }
      d.x += (tx - d.x) * k;
      d.y += (ty - d.y) * k;
      if (s === b.side) {
        const dd = Math.hypot(d.x - bd.x, (d.y - bd.y) * 0.65);
        if (dd < cd) { cd = dd; carrier = d; }
      }
      placed.push({ d, num: w.players[o.pid]?.num ?? 0, gk, s });
    }
  });

  // Raio mínimo generoso: no celular o campo é estreito e os números precisam ser legíveis.
  const r = Math.max(9.5, Math.min(W / 58, 16));
  // Rastro de bola e onda do lance, visíveis mesmo em velocidade alta.
  if (anim.trail.length > 1) {
    c.lineCap = "round";
    for (let i = 1; i < anim.trail.length; i++) {
      const from = anim.trail[i - 1], to = anim.trail[i];
      c.strokeStyle = `rgba(255,255,255,${(i / anim.trail.length) * (fast ? 0.52 : 0.25)})`;
      c.lineWidth = Math.max(1, r * 0.5 * i / anim.trail.length);
      c.beginPath(); c.moveTo(X(from.x), Y(from.y)); c.lineTo(X(to.x), Y(to.y)); c.stroke();
    }
  }
  if (anim.pulse) {
    const age = (now - anim.pulse.at) / 850;
    if (age >= 1) anim.pulse = null;
    else {
      c.strokeStyle = anim.pulse.kind === "goal" ? `rgba(255,205,70,${0.8 * (1 - age)})` : `rgba(255,255,255,${0.65 * (1 - age)})`;
      c.lineWidth = Math.max(2, r * 0.24);
      c.beginPath(); c.arc(X(anim.pulse.x), Y(anim.pulse.y), r * (0.8 + age * 2.6), 0, Math.PI * 2); c.stroke();
    }
  }
  c.font = `700 ${Math.round(r * 1.1)}px ${displayFont()}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  for (const p of placed) {
    const px = X(p.d.x), py = Y(p.d.y);
    c.fillStyle = "rgba(0,0,0,.28)";
    c.beginPath(); c.ellipse(px + 2, py + 3, r, r * 0.9, 0, 0, Math.PI * 2); c.fill();
    const kit = kits[p.s];
    const fill = p.gk ? GK_COLORS[p.s] : kit.fill;
    c.fillStyle = fill;
    c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
    c.lineWidth = Math.max(1.5, r / 4);
    c.strokeStyle = p.gk ? "#111" : kit.line;
    c.stroke();
    c.fillStyle = contrast(fill);
    c.fillText(p.num ? String(p.num) : "", px, py + 0.5);
    if (p.d === carrier && b.kind !== "goal") {
      c.strokeStyle = `rgba(255,255,255,${0.7 + 0.25 * Math.sin(t * 7)})`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(px, py, r + 4 + Math.sin(t * 7) * 1.5, 0, Math.PI * 2); c.stroke();
    }
  }

  // Bola
  const bx = X(clamp(bd.x, -1, 101)), by = Y(bd.y);
  c.fillStyle = "rgba(0,0,0,.35)";
  c.beginPath(); c.arc(bx + 2, by + 3, r * 0.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#ffffff";
  c.beginPath(); c.arc(bx, by, r * 0.5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#222";
  c.lineWidth = 1;
  c.stroke();
}

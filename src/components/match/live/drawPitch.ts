// Desenho do campo da partida ao vivo (porta de L.draw em legacy/js/manager/live.js).
import { FORMATIONS, clamp } from "@/game";
import type { Sim } from "@/game";
import type { World } from "@/game/types";
import { displayFont } from "@/arcade/render";
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
}

export const PITCH_RATIO = 105 / 68;
const GK_COLORS = ["#ffb000", "#7b2cbf"];

export function drawLivePitch(c: CanvasRenderingContext2D, sc: PitchScale, sim: Sim, w: World, kits: [Kit, Kit], anim: PitchAnim, dt: number, now: number): void {
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
  const fast = b.kind === "goal" || b.kind === "shot" || b.kind === "save";
  bd.x += (b.x - bd.x) * (1 - Math.exp(-dt * (fast ? 7 : 3.5)));
  bd.y += (b.y - bd.y) * (1 - Math.exp(-dt * 4));
  const t = now / 1000;
  let carrier: { x: number; y: number } | null = null, cd = Infinity;
  const placed: { d: { x: number; y: number }; num: number; gk: boolean; s: number }[] = [];
  sim.sides.forEach((side, s) => {
    const slots = FORMATIONS[side.formation];
    for (const o of side.on) {
      const sl = slots[o.slot];
      const gk = sl.pos === "GOL";
      const shift = (bd.x - 50) * (gk ? 0.08 : 0.34) + (b.side === s ? 5 : -3) * (s === 0 ? 1 : -1) * (gk ? 0.2 : 1);
      let tx = s === 0 ? sl.x : 100 - sl.x;
      let ty = s === 0 ? sl.y : 100 - sl.y;
      tx = clamp(tx + shift, 2, 98);
      ty = clamp(ty + (bd.y - 50) * (gk ? 0.1 : 0.18) + Math.sin(t * 1.3 + o.slot * 2.1 + s) * 1.4, 3, 97);
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

  const r = Math.max(6, W / 70);
  c.font = `700 ${Math.round(r * 1.05)}px ${displayFont()}`;
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
      c.strokeStyle = "rgba(255,255,255,.9)";
      c.lineWidth = 2;
      c.beginPath(); c.arc(px, py, r + 4, 0, Math.PI * 2); c.stroke();
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

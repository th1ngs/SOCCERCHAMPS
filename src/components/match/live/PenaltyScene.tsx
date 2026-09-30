"use client";

import { useEffect, useRef, useState } from "react";
import { FastForward, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Kit } from "../matchUtils";
import type { PenaltyScene as Scene } from "./controller";

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

function person(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, lean = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(lean);
  c.fillStyle = "#071a16";
  c.beginPath(); c.ellipse(0, size * 0.65, size * 0.47, size * 0.1, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = color;
  c.lineWidth = Math.max(3, size * 0.17);
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(0, -size * 0.48); c.lineTo(0, size * 0.12);
  c.moveTo(0, -size * 0.22); c.lineTo(-size * 0.36, size * 0.03);
  c.moveTo(0, -size * 0.22); c.lineTo(size * 0.36, size * 0.03);
  c.moveTo(0, size * 0.1); c.lineTo(-size * 0.24, size * 0.58);
  c.moveTo(0, size * 0.1); c.lineTo(size * 0.25, size * 0.57);
  c.stroke();
  c.fillStyle = "#d7a879";
  c.beginPath(); c.arc(0, -size * 0.62, size * 0.17, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** Cobrança vista de trás do batedor, com campo, gol e bola projetados em perspectiva. */
function draw(c: CanvasRenderingContext2D, w: number, h: number, t: number, scene: Scene, kits: [Kit, Kit]) {
  c.clearRect(0, 0, w, h);
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#04101e"); sky.addColorStop(0.44, "#102d34"); sky.addColorStop(1, "#114325");
  c.fillStyle = sky; c.fillRect(0, 0, w, h);

  // Arquibancada e refletores, com padrão fixo para não cintilar entre quadros.
  c.fillStyle = "#071720";
  c.fillRect(0, h * 0.18, w, h * 0.27);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 85; col++) {
    const lit = ((col * 23 + row * 37 + scene.key * 11) % 13) < 6;
    c.fillStyle = lit ? "rgba(240,220,155,.25)" : "rgba(93,139,154,.21)";
    c.fillRect((col / 84) * w, h * (0.23 + row * 0.034), Math.max(2, w / 250), Math.max(2, h / 140));
  }
  for (const x of [w * 0.1, w * 0.9]) {
    const light = c.createRadialGradient(x, h * 0.13, 2, x, h * 0.13, w * 0.23);
    light.addColorStop(0, "rgba(255,245,208,.37)"); light.addColorStop(1, "rgba(255,245,208,0)");
    c.fillStyle = light; c.fillRect(x - w * 0.23, 0, w * 0.46, h * 0.45);
    c.fillStyle = "#fff4d6"; c.fillRect(x - 7, h * 0.11, 14, 5);
  }

  const horizon = h * 0.43, bottom = h * 1.04;
  const ground = c.createLinearGradient(0, horizon, 0, bottom);
  ground.addColorStop(0, "#2d9950"); ground.addColorStop(1, "#16572e");
  c.fillStyle = ground;
  c.beginPath(); c.moveTo(w * 0.12, horizon); c.lineTo(w * 0.88, horizon); c.lineTo(w * 1.2, bottom); c.lineTo(-w * 0.2, bottom); c.closePath(); c.fill();
  const project = (x: number, z: number) => ({ x: w / 2 + x * w * (0.23 + z * 0.45), y: horizon + z * (bottom - horizon) });
  for (let stripe = 0; stripe < 7; stripe++) {
    const z0 = stripe / 7, z1 = (stripe + 1) / 7;
    if (stripe % 2) {
      c.fillStyle = "rgba(255,255,255,.035)";
      const a = project(-1, z0), b = project(1, z0), d = project(-1, z1), e = project(1, z1);
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(e.x, e.y); c.lineTo(d.x, d.y); c.fill();
    }
  }
  c.strokeStyle = "rgba(238,255,231,.72)"; c.lineWidth = Math.max(2, w / 260);
  const line = (a: {x:number;y:number}, b: {x:number;y:number}) => { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
  line(project(-0.95, 0.27), project(0.95, 0.27));
  line(project(-0.95, 0.27), project(-0.95, 0.69));
  line(project(0.95, 0.27), project(0.95, 0.69));
  line(project(-0.35, 0.12), project(0.35, 0.12));
  line(project(-0.35, 0.12), project(-0.35, 0.25));
  line(project(0.35, 0.12), project(0.35, 0.25));
  c.fillStyle = "#f4f9e7";
  c.beginPath(); c.arc(w * 0.5, h * 0.76, Math.max(3, w / 170), 0, Math.PI * 2); c.fill();

  // Rede com profundidade visível nas laterais.
  const left = w * 0.36, right = w * 0.64, top = h * 0.285, base = h * 0.455;
  c.fillStyle = "rgba(225,242,255,.055)";
  c.fillRect(left, top, right - left, base - top);
  c.strokeStyle = "rgba(226,239,255,.28)"; c.lineWidth = 1;
  for (let i = 1; i < 12; i++) line({x:left + (right-left)*i/12,y:top}, {x:left + (right-left)*i/12,y:base});
  for (let i = 1; i < 7; i++) line({x:left,y:top + (base-top)*i/7}, {x:right,y:top + (base-top)*i/7});
  c.strokeStyle = "rgba(210,238,255,.55)";
  line({x:left,y:top},{x:left-w*0.025,y:top-h*0.025});
  line({x:right,y:top},{x:right+w*0.025,y:top-h*0.025});
  line({x:left-w*0.025,y:top-h*0.025},{x:right+w*0.025,y:top-h*0.025});
  c.strokeStyle = "#f7fcff"; c.lineWidth = Math.max(4, w / 150);
  line({x:left,y:base},{x:left,y:top}); line({x:left,y:top},{x:right,y:top}); line({x:right,y:top},{x:right,y:base});

  const kick = ease((t - 0.37) / 0.3);
  const diving = ease((t - 0.48) / 0.23);
  const direction = scene.key % 2 ? 1 : -1;
  const keeperDirection = scene.outcome === 'save' ? direction : -direction;
  person(c, w * 0.5 + keeperDirection * diving * w * 0.077, h * 0.41 + diving * h * 0.015, Math.min(w, h) * 0.105, scene.side === 0 ? "#a34dce" : "#e9b136", keeperDirection * diving * 0.85);
  if (t < 0.63) person(c, w * 0.5 - Math.max(0, 0.35 - t) * w * 0.14, h * 0.84, Math.min(w, h) * 0.28, kits[scene.side].fill, -0.13 + kick * 0.27);

  let ballX = w * 0.5 + direction * kick * w * (scene.outcome === 'miss' ? 0.21 : 0.095);
  let ballY = h * 0.76 - kick * h * 0.36 - Math.sin(kick * Math.PI) * h * 0.09;
  if (scene.outcome === 'save' && t > 0.69) { ballX += direction * (t - 0.69) * w * 0.32; ballY += (t - 0.69) * h * 0.4; }
  const ballR = Math.max(4, Math.min(w, h) * (0.036 - kick * 0.023));
  if (t > 0.36) {
    c.strokeStyle = "rgba(255,248,196,.38)"; c.lineWidth = ballR * 1.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(ballX - direction * ballR * 2.5, ballY + ballR * 2); c.lineTo(ballX, ballY); c.stroke();
  }
  c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(ballX + 4, ballY + ballR * 1.5, ballR * 1.1, ballR * 0.35, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.arc(ballX, ballY, ballR, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#152328"; c.beginPath(); c.arc(ballX + ballR * 0.16, ballY - ballR * 0.1, ballR * 0.36, 0, Math.PI * 2); c.fill();

  if (t > 0.7 && scene.outcome === 'goal') {
    const glow = c.createRadialGradient(ballX, ballY, 4, ballX, ballY, w * 0.25);
    glow.addColorStop(0, "rgba(255,210,81,.65)"); glow.addColorStop(1, "rgba(255,210,81,0)");
    c.fillStyle = glow; c.fillRect(0, 0, w, h);
  }
}

export function PenaltyScene({ scene, kits, team, onSkip }: { scene: Scene; kits: [Kit, Kit]; team: string; onSkip: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const context = ctx;
    let raf = 0;
    let width = 1, height = 1;
    const resize = () => {
      const rect = el.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    const started = performance.now();
    const frame = (now: number) => {
      draw(context, width, height, Math.min(1, (now - started) / scene.duration), scene, kits);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const timer = window.setTimeout(() => setReveal(true), scene.duration * 0.72);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); observer.disconnect(); };
  }, [scene, kits]);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl bg-ink-950" role="group" aria-label={`Cobrança de pênalti de ${scene.shooter}`}>
      <canvas ref={canvas} className="h-full w-full" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-ink-950/95 via-ink-950/45 to-transparent px-4 pb-8 pt-4 text-center">
        <div className="flex items-center justify-center gap-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-300"><Target className="size-4" /> {scene.round ? `Disputa de pênaltis • rodada ${scene.round}` : "Pênalti"}</div>
        <strong className="mt-1 block font-display text-xl font-extrabold uppercase text-snow sm:text-3xl">{scene.shooter} <span className="text-mist">x</span> {scene.keeper}</strong>
        <span className="block text-xs font-semibold text-snow/70">{team}</span>
      </div>
      {reveal && <div className="pointer-events-none absolute inset-x-0 bottom-12 animate-pop text-center" role="status">
        <strong className={`rounded-xl bg-ink-950/85 px-5 py-2 font-display text-3xl font-extrabold uppercase italic shadow-2xl sm:text-5xl ${scene.outcome === 'goal' ? 'text-gold-400' : 'text-snow'}`}>
          {scene.outcome === 'goal' ? 'GOOOL!' : scene.outcome === 'save' ? 'DEFENDEU!' : 'PARA FORA!'}
        </strong>
      </div>}
      <Button variant="ghost" size="sm" icon={<FastForward />} onClick={onSkip} className="absolute bottom-2 right-2 bg-ink-950/80">Pular cenas</Button>
    </div>
  );
}

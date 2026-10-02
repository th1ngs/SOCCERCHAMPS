"use client";

import { useRef, useState } from "react";
import { Zap } from "lucide-react";
import type { DribbleMove } from "@/lances/engine";
import { cn } from "@/lib/cn";

/** Arrasto mínimo (px) para virar um drible com direção. */
const DRAG = 18;

/**
 * Botão de drible com opções: tocar = pedalada; arrastar a partir dele escolhe o lance
 * (← → corte para o lado, ↑ chapéu, ↓ roleta). Funciona correndo, junto com o joystick.
 * Posicione pelo `className` (ex.: `absolute bottom-1 right-1`): os rótulos precisam de um pai posicionado.
 */
export function DribblePad({ onMove, ready, className }: { onMove: (move: DribbleMove, side?: -1 | 1) => void; ready: boolean; className?: string }) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [aim, setAim] = useState<DribbleMove | "corteL" | "corteR" | null>(null);

  const pick = (dx: number, dy: number): DribbleMove | "corteL" | "corteR" | null => {
    if (Math.hypot(dx, dy) < DRAG) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "corteL" : "corteR";
    return dy < 0 ? "chapeu" : "roleta";
  };
  const fire = (m: DribbleMove | "corteL" | "corteR" | null) => {
    if (m === null) onMove("toque");
    else if (m === "corteL") onMove("corte", -1);
    else if (m === "corteR") onMove("corte", 1);
    else onMove(m, 1);
  };

  const label = "pointer-events-none absolute font-display text-[10px] font-extrabold uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]";
  return (
    <div className={cn("pointer-events-none grid size-36 place-items-center [@media(max-height:500px)]:size-32", className)}>
      <span className={cn(label, "top-0", aim === "chapeu" ? "text-gold-300" : "text-snow/80")}>↑ Chapéu</span>
      <span className={cn(label, "bottom-0", aim === "roleta" ? "text-gold-300" : "text-snow/80")}>↓ Roleta</span>
      <span className={cn(label, "left-0 top-1/2 -translate-y-1/2", aim === "corteL" ? "text-gold-300" : "text-snow/80")}>←</span>
      <span className={cn(label, "right-0 top-1/2 -translate-y-1/2", aim === "corteR" ? "text-gold-300" : "text-snow/80")}>→</span>
      <button
        type="button"
        disabled={!ready}
        aria-label="Driblar: toque = pedalada; arraste para os lados = corte, para cima = chapéu, para baixo = roleta"
        className="pointer-events-auto grid size-[4.5rem] touch-none select-none place-items-center rounded-full bg-gold-400/90 font-display text-[11px] font-extrabold uppercase text-ink-950 shadow-lg ring-2 ring-gold-200/60 transition-opacity disabled:opacity-40"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (s && s.id === e.pointerId) setAim(pick(e.clientX - s.x, e.clientY - s.y));
        }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          setAim(null);
          if (!s || s.id !== e.pointerId) return;
          fire(pick(e.clientX - s.x, e.clientY - s.y));
        }}
        onPointerCancel={() => { start.current = null; setAim(null); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onMove("toque"); } }}
      >
        <span className="flex flex-col items-center leading-none"><Zap className="mb-0.5 size-5" />{aim === "corteL" || aim === "corteR" ? "Corte" : aim === "chapeu" ? "Chapéu" : aim === "roleta" ? "Roleta" : "Drible"}</span>
      </button>
    </div>
  );
}

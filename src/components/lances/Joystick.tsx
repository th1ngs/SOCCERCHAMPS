"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/** Curso máximo do botão (px) a partir do centro da base. */
const TRAVEL = 46;
/** A partir daqui (fração do curso) é arrancada. */
const SPRINT = 0.88;

/**
 * Joystick de condução: arrastar o botão move quem tem a bola na direção da tela; no fim do curso, arranca.
 * Funciona junto com os gestos do campo (outro dedo desliza para chutar ou toca para passar).
 * Posicione pelo `className` (ex.: `absolute bottom-4 left-4`): a base precisa ser posicionada.
 */
export function Joystick({ onChange, active, className }: { onChange: (v: { x: number; y: number } | null) => void; active: boolean; className?: string }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);

  const update = (clientX: number, clientY: number) => {
    const base = baseRef.current, knob = knobRef.current;
    if (!base || !knob) return;
    const r = base.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2), dy = clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > TRAVEL) { dx = (dx / d) * TRAVEL; dy = (dy / d) * TRAVEL; }
    const m = Math.min(1, d / TRAVEL);
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    base.dataset.sprint = m >= SPRINT ? "1" : "0";
    onChange({ x: dx / TRAVEL, y: dy / TRAVEL });
  };
  const release = () => {
    pointer.current = null;
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
    if (baseRef.current) baseRef.current.dataset.sprint = "0";
    onChange(null);
  };

  return (
    <div
      ref={baseRef}
      data-sprint="0"
      role="group"
      aria-label="Joystick de condução: arraste para mover quem tem a bola; no fim do curso, arrancada"
      className={cn(
        "group pointer-events-auto grid size-32 touch-none select-none place-items-center rounded-full bg-ink-950/45 ring-2 ring-white/20 backdrop-blur-[2px] transition-opacity",
        "data-[sprint=1]:ring-gold-400/80",
        !active && "opacity-40",
        className,
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        pointer.current = e.pointerId;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => { if (pointer.current === e.pointerId) update(e.clientX, e.clientY); }}
      onPointerUp={(e) => { if (pointer.current === e.pointerId) release(); }}
      onPointerCancel={release}
      onLostPointerCapture={() => { if (pointer.current !== null) release(); }}
    >
      {/* Setas-guia e anel interno. */}
      <span className="pointer-events-none absolute inset-3 rounded-full ring-1 ring-white/10" aria-hidden />
      {(["top-1.5 left-1/2 -translate-x-1/2 border-b-white/35 border-x-transparent border-t-0 border-b-[7px] border-x-[6px]",
        "bottom-1.5 left-1/2 -translate-x-1/2 border-t-white/35 border-x-transparent border-b-0 border-t-[7px] border-x-[6px]",
        "left-1.5 top-1/2 -translate-y-1/2 border-r-white/35 border-y-transparent border-l-0 border-r-[7px] border-y-[6px]",
        "right-1.5 top-1/2 -translate-y-1/2 border-l-white/35 border-y-transparent border-r-0 border-l-[7px] border-y-[6px]"] as const).map((c) => (
        <span key={c} className={cn("pointer-events-none absolute size-0", c)} aria-hidden />
      ))}
      <div
        ref={knobRef}
        className="pointer-events-none size-14 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff3b0,#f5b70a_55%,#b77905)] shadow-[0_4px_14px_rgba(0,0,0,0.45)] ring-2 ring-white/50 transition-[box-shadow] group-data-[sprint=1]:shadow-[0_0_22px_rgba(255,210,63,0.9)]"
        aria-hidden
      />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { divisionName } from "@/game";
import type { RecordBreak } from "@/game/types";
import { Audio } from "@/arcade/audio";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";

const fmt = (b: RecordBreak, v: RecordBreak["now"] | null): string => {
  if (!v) return "—";
  if (b.key === "biggestWin") return (v.score ?? "").split(" no ")[0] || "—";
  return String(v.value);
};

/** Recorde quebrado: a placa antiga racha, o número antigo é riscado e o novo carimbado em dourado. */
export function RecordView({ b, onClose }: { b: RecordBreak; onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    Audio.init();
    Audio.goal();
    ref.current?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [onClose]);
  const unit = b.key === "points" ? "pontos" : b.key === "titles" ? "títulos" : b.key === "biggestWin" ? "" : "gols";
  return (
    <div role="dialog" aria-modal="true" aria-label={`Recorde quebrado: ${b.title}`} className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[radial-gradient(circle_at_50%_35%,#1f2937_0%,#050b14_75%)] p-4">
      <Confetti seed={b.season * 7 + b.week} colors={["#facc15", "#fde68a", "#ffffff"]} count={40} duration={3.4} />
      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <span className="animate-stamp font-display text-5xl font-extrabold uppercase italic text-gold-400 drop-shadow-[0_4px_0_rgb(0_0_0/0.45)] sm:text-6xl">Recorde!</span>
        <p className="animate-slide-up mt-1 text-sm uppercase tracking-[0.2em] text-mist" style={{ animationDelay: "200ms" }}>{divisionName(b.div)} • {b.title}</p>

        {/* Placa de mármore */}
        <div className="relative mt-5 w-full overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#e7e5e4_0%,#a8a29e_45%,#f5f5f4_60%,#78716c_100%)] p-[3px] shadow-2xl">
          <div className="relative rounded-[14px] bg-[linear-gradient(160deg,#292524,#0c0a09)] px-4 py-5">
            <svg viewBox="0 0 300 140" className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
              <path className="record-crack" d="M150 0 L142 30 L158 52 L138 78 L150 104 L136 140" />
              <path className="record-crack" style={{ animationDelay: "0.95s" }} d="M142 30 L110 40 L92 28 M158 52 L196 60 L214 48 M138 78 L104 92" />
            </svg>
            <span className="block text-xs uppercase tracking-wider text-mist">Antes</span>
            <span className="relative inline-block font-display text-3xl font-extrabold text-snow/60 tabular">
              {fmt(b, b.old)} {unit}
              <span aria-hidden className="record-strike absolute left-[-6%] top-1/2 h-1 w-[112%] -rotate-6 rounded bg-danger-500" />
            </span>
            <span className="block truncate text-sm text-mist">{b.old?.name}{b.old?.season ? ` • ${b.old.season}` : ""}</span>
            <span className="mt-4 block text-xs uppercase tracking-wider text-gold-300">Agora</span>
            <span className="animate-stamp block font-display text-6xl font-extrabold text-gold-400 tabular drop-shadow-[0_0_24px_rgb(250_204_21/0.45)]" style={{ animationDelay: "1.3s" }}>
              {fmt(b, b.now)}
              {unit && <span className="ml-1 text-2xl">{unit}</span>}
            </span>
            <span className="animate-slide-up block truncate text-lg font-bold" style={{ animationDelay: "1.5s" }}>{b.now.name}</span>
          </div>
        </div>
        <p className="animate-slide-up mt-4 text-sm text-mist" style={{ animationDelay: "1.7s" }}>{b.text}.</p>
        <Button ref={ref} variant="primary" icon={<ChevronRight />} className="animate-slide-up mt-5" style={{ animationDelay: "1.9s" }} onClick={onClose}>Continuar</Button>
      </div>
    </div>
  );
}

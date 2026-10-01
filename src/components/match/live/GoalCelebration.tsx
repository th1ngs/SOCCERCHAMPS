"use client";

import type { CSSProperties } from "react";
import type { Club } from "@/game/types";
import { Crest } from "@/components/ui/Crest";
import { Confetti } from "@/components/ui/Confetti";
import { cn } from "@/lib/cn";
import type { GoalFlash } from "./controller";

/** Comemoração de gol sobre o campo: escudo, autor, garçom e placar. Toque para pular. */
export function GoalCelebration({ flash, home, away, onSkip }: { flash: GoalFlash; home: Club; away: Club; onSkip: () => void }) {
  const club = flash.side === 0 ? home : away;
  const [c1, c2] = club.colors;
  const fast = flash.dur < 2000;
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-live="assertive"
      aria-label={`${flash.label} ${flash.scorer ?? club.name}. Toque para pular.`}
      className="absolute inset-0 overflow-hidden rounded-xl text-center"
      style={{ background: `radial-gradient(circle at 50% 45%, color-mix(in srgb, ${c1} 80%, transparent) 0%, color-mix(in srgb, ${c1} 33%, transparent) 32%, rgb(5 10 18 / 0.88) 72%)` }}
    >
      {/* Raios girando atrás do escudo */}
      <span
        aria-hidden
        className="animate-celebrate-rays absolute left-1/2 top-1/2 -ml-[75vmax] -mt-[75vmax] size-[150vmax] opacity-25"
        style={{ background: `repeating-conic-gradient(from 0deg, ${c2} 0deg 6deg, transparent 6deg 18deg)` }}
      />
      <span aria-hidden className="animate-celebrate-sweep absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent" />
      {!fast && <Confetti seed={flash.key} colors={[c1, c2, "#ffd23f", "#ffffff"]} count={30} duration={flash.dur / 1000} />}

      <span className="relative flex h-full flex-col items-center justify-center gap-1 px-4 py-3 sm:gap-2">
        <span className="animate-celebrate-in">
          <Crest club={club} size={fast ? 44 : 64} className="drop-shadow-[0_6px_18px_rgb(0_0_0/0.6)]" />
        </span>
        <b
          className={cn(
            "animate-celebrate-in font-display font-extrabold italic leading-none text-gold-400 [text-shadow:0_4px_0_rgb(0_0_0/0.45),0_0_30px_rgb(255_210_63/0.45)]",
            fast ? "text-3xl sm:text-5xl" : "text-4xl sm:text-7xl",
          )}
          style={{ animationDelay: "80ms" }}
        >
          {flash.label}
        </b>
        {flash.scorer && (
          <span className="animate-slide-up font-display text-xl font-extrabold uppercase leading-tight drop-shadow sm:text-3xl" style={{ animationDelay: "220ms" }}>
            ⚽ {flash.scorer} <span className="text-gold-300">{flash.minuteText}</span>
          </span>
        )}
        {flash.assist && (
          <span className="animate-slide-up text-sm text-snow/85 sm:text-base" style={{ animationDelay: "320ms" }}>
            Assistência: <b className="text-snow">{flash.assist}</b>
          </span>
        )}
        <span className="animate-slide-up mt-1 flex items-center gap-2 rounded-full bg-ink-950/75 px-3 py-1 font-display text-lg font-extrabold tabular ring-1 ring-white/15 sm:text-2xl" style={{ animationDelay: "380ms" }}>
          <span className={cn("max-w-28 truncate sm:max-w-none", flash.side === 0 ? "text-gold-400" : "text-snow/80")}>{home.short}</span>
          {flash.score[0]} x {flash.score[1]}
          <span className={cn("max-w-28 truncate sm:max-w-none", flash.side === 1 ? "text-gold-400" : "text-snow/80")}>{away.short}</span>
        </span>
        <span className="mt-1 text-xs text-snow/70">
          {flash.more > 0 ? `Mais ${flash.more} ${flash.more === 1 ? "gol" : "gols"} • ` : ""}toque para pular
        </span>
      </span>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-gold-400/90 animate-celebrate-bar" style={{ "--bar": `${flash.dur}ms` } as CSSProperties} />
    </button>
  );
}

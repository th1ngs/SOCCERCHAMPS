"use client";

import { FORMATIONS, FORMATION_INFO, FORMATION_KEYS } from "@/game";
import type { FormationKey } from "@/game/types";
import { cn } from "@/lib/cn";

/** Mini campo com os 11 pontos da formação (ataque para cima). */
function FormationDiagram({ formation, on }: { formation: FormationKey; on: boolean }) {
  return (
    <svg viewBox="0 0 40 52" className="h-12 w-9 shrink-0" aria-hidden>
      <rect x="0.5" y="0.5" width="39" height="51" rx="3" className={on ? "fill-pitch-700" : "fill-pitch-700/45"} stroke="currentColor" strokeOpacity="0.25" />
      <line x1="0.5" y1="26" x2="39.5" y2="26" stroke="currentColor" strokeOpacity="0.25" />
      <circle cx="20" cy="26" r="5" fill="none" stroke="currentColor" strokeOpacity="0.25" />
      {FORMATIONS[formation].map((s, i) => (
        <circle key={i} cx={3 + (s.y / 100) * 34} cy={49 - (s.x / 100) * 46} r="2.4" className={s.pos === "GOL" ? "fill-pitch-400" : on ? "fill-gold-400" : "fill-snow/85"} />
      ))}
    </svg>
  );
}

/** Grade de formações com desenho, número e apelido; a descrição da escolhida aparece embaixo. */
export function FormationPicker({ value, onChange, className }: { value: FormationKey; onChange: (f: FormationKey) => void; className?: string }) {
  return (
    <div className={cn("@container", className)}>
      <div role="radiogroup" aria-label="Formação" className="grid grid-cols-3 gap-1.5 @lg:grid-cols-4 @2xl:grid-cols-7">
        {FORMATION_KEYS.map((f) => {
          const on = f === value;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${f} • ${FORMATION_INFO[f].name}`}
              onClick={() => onChange(f)}
              className={cn(
                "flex min-w-0 items-center gap-1.5 rounded-xl p-1.5 text-left ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
                on ? "bg-gold-400/15 text-gold-400 ring-gold-400/70" : "bg-ink-950/50 text-mist ring-white/8 hover:bg-white/6 hover:text-snow",
              )}
            >
              <FormationDiagram formation={f} on={on} />
              <span className="min-w-0 leading-tight">
                <span className={cn("block whitespace-nowrap font-display text-sm font-extrabold tabular", on ? "text-gold-400" : "text-snow")}>{f}</span>
                <span className="block truncate text-[10px]">{FORMATION_INFO[f].name}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-mist" aria-live="polite">
        <b className="text-snow">{FORMATION_INFO[value].name}:</b> {FORMATION_INFO[value].desc}
      </p>
    </div>
  );
}

"use client";

import { Check, Crosshair, Hand, Scale, Shield, Workflow, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/primitives";
import { FOCUS_KEYS, focusDesc, focusName, type AcademyFocusKey } from "./derive";

const ICONS: Record<string, LucideIcon> = {
  balanced: Scale,
  attack: Crosshair,
  midfield: Workflow,
  defense: Shield,
  goalkeepers: Hand,
};

/** Foco da base: muda as posições da próxima safra e acelera a evolução do setor escolhido. */
export function FocusPicker({ value, onChange }: { value: AcademyFocusKey; onChange: (f: AcademyFocusKey) => void }) {
  return (
    <Card title="Foco da base">
      <p className="mb-3 text-sm text-mist">
        Define as posições mais comuns nas próximas safras e peneiras. Garotos do setor em foco evoluem 15% mais rápido.
      </p>
      <div role="radiogroup" aria-label="Foco da base" className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        {FOCUS_KEYS.map((f) => {
          const on = f === value;
          const Icon = ICONS[f] ?? Scale;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => !on && onChange(f)}
              className={cn(
                "relative flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl p-2.5 sm:items-start sm:gap-3 sm:p-3 text-left ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400 xl:flex-col xl:gap-2",
                on ? "bg-gold-400/12 ring-gold-400/70" : "bg-ink-900/50 ring-white/8 hover:bg-white/5 hover:ring-white/20",
              )}
            >
              <span className={cn("grid size-8 shrink-0 sm:size-9 place-items-center rounded-lg", on ? "bg-gold-400 text-ink-950" : "bg-white/8 text-mist")}>
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-display text-[13px] font-bold uppercase tracking-wide sm:text-sm">
                  {focusName(f)}
                  {on && <Check className="size-4 text-gold-300" aria-label="(atual)" />}
                </span>
                <span className="mt-0.5 hidden text-xs leading-snug text-mist sm:block">{focusDesc(f)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-mist sm:hidden" aria-live="polite">
        <strong className="text-snow">{focusName(value)}:</strong> {focusDesc(value)}
      </p>
    </Card>
  );
}

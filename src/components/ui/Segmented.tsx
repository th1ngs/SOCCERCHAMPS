"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

/** Grupo de opções exclusivas (formação, estilo, velocidade, sub-abas). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  itemClassName,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  /** Classes extras de cada opção (ex.: altura maior em grade no celular). */
  itemClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex flex-wrap gap-1 rounded-xl bg-ink-950/60 p-1 ring-1 ring-inset ring-white/8", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg font-display font-bold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-gold-400 disabled:opacity-40",
              size === "sm" ? "h-9 px-3 text-xs" : "h-10 px-3.5 text-sm",
              on ? "bg-gold-400 text-ink-950 shadow-sm" : "text-mist hover:bg-white/6 hover:text-snow",
              itemClassName,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

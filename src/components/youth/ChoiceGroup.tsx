"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Choice<T extends string> {
  value: T;
  label: ReactNode;
  /** Texto extra acessível (ex.: contagem). */
  hint?: string;
  disabled?: boolean;
}

/**
 * Grupo de opções exclusivas com alvos de 40px (radiogroup com setas do teclado).
 * `cols` distribui as opções em grade (útil em telas estreitas).
 */
export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  itemClassName,
}: {
  options: Choice<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
  itemClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const enabled = options.filter((o) => !o.disabled);
    const i = enabled.findIndex((o) => o.value === value);
    const next = enabled[(i + dir + enabled.length) % enabled.length];
    if (!next) return;
    onChange(next.value);
    ref.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  };
  return (
    <div ref={ref} role="radiogroup" aria-label={ariaLabel} onKeyDown={onKey} className={cn("flex flex-wrap gap-1 rounded-xl bg-ink-950/60 p-1 ring-1 ring-inset ring-white/8", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.hint}
            tabIndex={on ? 0 : -1}
            data-value={o.value}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-3 font-display text-sm font-bold uppercase tracking-wide transition-colors",
              "focus-visible:outline-2 focus-visible:outline-gold-400 disabled:cursor-not-allowed disabled:opacity-40",
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

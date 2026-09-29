"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** Inicia um novo grupo visual (separador antes do item). */
  group?: boolean;
  /** Marca discreta (ex.: a liga do usuário). */
  mark?: boolean;
}

/**
 * Faixa de abas com rolagem horizontal própria (a página nunca rola de lado),
 * alvos de 40px e navegação por setas.
 */
export function TabStrip<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: "md" | "sm";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = items.findIndex((x) => x.value === value);
    const next = items[(i + d + items.length) % items.length].value;
    onChange(next);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(`[data-value="${next}"]`)?.focus());
  };
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 [scrollbar-width:thin] sm:mx-0 sm:px-0", className)}>
      <div
        ref={ref}
        role="tablist"
        aria-label={ariaLabel}
        className="inline-flex min-w-max items-center gap-1 rounded-xl bg-ink-950/60 p-1 ring-1 ring-inset ring-white/8"
      >
        {items.map((it) => {
          const on = it.value === value;
          return (
            <span key={it.value} className="contents">
              {it.group && <span className="mx-1 h-6 w-px shrink-0 bg-white/12" aria-hidden />}
              <button
                type="button"
                role="tab"
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                data-value={it.value}
                onClick={() => onChange(it.value)}
                onKeyDown={onKey}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg font-display font-bold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-gold-400 [&_svg.lucide]:size-4",
                  size === "sm" ? "h-10 px-3 text-[13px]" : "h-10 px-3.5 text-sm",
                  on ? "bg-gold-400 text-ink-950 shadow-sm" : "text-mist hover:bg-white/6 hover:text-snow",
                )}
              >
                {it.label}
                {it.mark && (
                  <>
                    <span className={cn("size-1.5 rounded-full", on ? "bg-ink-950" : "bg-gold-400")} aria-hidden />
                    <span className="sr-only">(seu clube)</span>
                  </>
                )}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

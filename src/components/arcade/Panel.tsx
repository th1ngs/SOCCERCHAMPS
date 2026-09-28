import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const WIDTHS = { md: "max-w-md", xl: "max-w-5xl", "2xl": "max-w-6xl" } as const;

/** Tela sobreposta ao campo (menu, seleção, chaveamento, resultado, pausa). */
export function Panel({ children, className, label, width = "md" }: { children: ReactNode; className?: string; label: string; width?: keyof typeof WIDTHS }) {
  return (
    <section
      aria-label={label}
      className="absolute inset-0 z-20 flex items-center justify-center bg-ink-950/55 p-3 backdrop-blur-[3px] sm:p-4"
    >
      <div
        className={cn(
          "relative flex max-h-full w-full animate-pop flex-col overflow-y-auto rounded-[22px] bg-ink-850/95 p-5 shadow-[0_30px_80px_rgba(0,0,0,.55)] ring-1 ring-white/10 sm:p-7",
          WIDTHS[width],
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function PanelTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <h2 className="font-display text-2xl font-extrabold uppercase italic leading-tight sm:text-3xl">{children}</h2>
      {sub && <p className="mt-0.5 text-sm text-mist">{sub}</p>}
    </div>
  );
}

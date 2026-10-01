import type { ReactNode } from "react";

/** Etapa numerada das telas de nova carreira. */
export function Step({ n, title, aside, children }: { n: number; title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-gold-400">
          <span className="grid size-7 place-items-center rounded-full bg-gold-400 text-sm font-extrabold tracking-normal text-ink-950" aria-hidden>{n}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

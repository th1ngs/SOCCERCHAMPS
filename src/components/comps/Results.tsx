"use client";

import { useMemo } from "react";
import { isDerby, user } from "@/game";
import type { Match } from "@/game/types";
import { Crest } from "@/components/ui/Crest";
import { EmptyState, SectionTitle } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { compLabel, weekComps, winnerSide } from "./derive";

/** Uma linha de resultado: mandante, placar (e pênaltis) e visitante. */
export function ResultRow({ m, highlight }: { m: Match; highlight?: string | null }) {
  const { world: w } = useWorld();
  const h = w.clubs[m.h], a = w.clubs[m.a];
  if (!h || !a) return null;
  const mine = [w.userClub, highlight].some((id) => !!id && (m.h === id || m.a === id));
  const win = winnerSide(m);
  const derby = isDerby(w, m);
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg px-2 py-2 text-sm sm:gap-3 sm:px-3",
        mine ? "bg-gold-400/10 ring-1 ring-inset ring-gold-400/30" : "odd:bg-white/[0.03]",
      )}
    >
      <span className={cn("flex min-w-0 items-center justify-end gap-2 text-right", win === 0 ? "font-bold text-snow" : "text-snow/85")}>
        <span className="truncate">{h.name}</span>
        <Crest club={h} size={18} className="shrink-0" />
      </span>
      <span className="flex min-w-14 flex-col items-center leading-none">
        {derby && <span className="mb-1 font-display text-[10px] font-bold uppercase tracking-wider text-warn-400">Clássico</span>}
        <span className="rounded-md bg-ink-950/70 px-2 py-1 font-display text-base font-extrabold tabular ring-1 ring-inset ring-white/8">
          {m.played ? `${m.hs} – ${m.as}` : "x"}
        </span>
        {m.pens && <span className="mt-1 text-[11px] text-mist tabular">pên. {m.pens[0]}–{m.pens[1]}</span>}
      </span>
      <span className={cn("flex min-w-0 items-center gap-2", win === 1 ? "font-bold text-snow" : "text-snow/85")}>
        <Crest club={a} size={18} className="shrink-0" />
        <span className="truncate">{a.name}</span>
      </span>
    </li>
  );
}

/** Lista de resultados com título. */
export function ResultList({ title, matches, highlight }: { title?: string; matches: Match[]; highlight?: string | null }) {
  return (
    <div className="min-w-0">
      {title && <SectionTitle className="mb-2">{title}</SectionTitle>}
      <ul className="flex flex-col gap-1">
        {matches.map((m) => (
          <ResultRow key={m.id} m={m} highlight={highlight} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Resultados de uma semana (padrão: a semana atual): divisão do usuário e depois a outra,
 * ou a fase da Copa. Só mostra partidas já disputadas.
 */
export function RoundResults({ weekIndex, highlight }: { weekIndex?: number; highlight?: string | null }) {
  const { world: w, version } = useWorld();
  const idx = weekIndex ?? w.week;
  const groups = useMemo(() => {
    void version;
    const wk = w.weeks[idx];
    if (!wk) return [];
    return weekComps(wk, user(w).div)
      .map((comp) => {
        const matches = wk.matches.filter((m) => m.comp === comp && m.played);
        return { comp, matches, title: matches.length ? compLabel(matches[0], wk) : "" };
      })
      .filter((g) => g.matches.length > 0);
  }, [w, idx, version]);

  if (!groups.length) return <EmptyState>Nenhum resultado nesta semana.</EmptyState>;
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <ResultList key={g.comp} title={g.title} matches={g.matches} highlight={highlight} />
      ))}
    </div>
  );
}

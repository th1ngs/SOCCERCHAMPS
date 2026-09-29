"use client";

import { useMemo } from "react";
import { isDerby } from "@/game";
import { Badge, FormChips } from "@/components/ui/primitives";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { resultFor, userFixtures } from "./derive";
import { CompName } from "./labels";

/** Calendário do usuário semana a semana em todas as competições, com resultados e a semana atual destacada. */
export function FixturesView() {
  const { world: w, version } = useWorld();
  const rows = useMemo(() => {
    void version;
    return userFixtures(w);
  }, [w, version]);

  return (
    <ol className="flex flex-col gap-1.5">
      {rows.map(({ week, comp, round, match: m, note }) => {
        const cur = week === w.week;
        const base = cn(
          "grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 text-sm ring-1 ring-inset sm:grid-cols-[64px_minmax(0,210px)_minmax(0,1fr)_auto]",
          cur ? "bg-gold-400/10 ring-gold-400/40" : "bg-ink-800 ring-white/6",
        );
        const weekCell = (
          <span className="font-display text-xs font-bold uppercase tracking-wider text-mist">
            Sem. {week}
            {cur && <span className="block text-gold-400">Atual</span>}
          </span>
        );
        const label = (
          <span className="flex min-w-0 flex-col leading-tight">
            <CompName comp={comp} className="text-snow/90" />
            <span className="truncate text-xs text-mist">{round}</span>
          </span>
        );
        if (!m) {
          return (
            <li key={week} className={cn(base, "text-mist")} aria-current={cur ? "true" : undefined}>
              {weekCell}
              {label}
              <span className="col-start-3 text-right text-xs sm:col-start-auto sm:col-span-2 sm:text-left sm:text-sm">{note}</span>
            </li>
          );
        }
        const home = m.h === w.userClub;
        const opp = w.clubs[home ? m.a : m.h];
        const r = resultFor(m, w.userClub);
        const gf = home ? m.hs : m.as, ga = home ? m.as : m.hs;
        return (
          <li key={week} className={base} aria-current={cur ? "true" : undefined}>
            {weekCell}
            <span className="col-start-2 row-start-2 min-w-0 text-xs sm:col-start-auto sm:row-start-auto sm:text-sm">{label}</span>
            <span className="col-start-2 row-start-1 flex min-w-0 items-center gap-2 sm:col-start-auto sm:row-start-auto">
              <span className="w-6 shrink-0 text-xs font-semibold text-mist">{m.neutral ? "N" : home ? "vs" : "@"}</span>
              <Crest club={opp} size={18} className="shrink-0" />
              {comp === "cont" && <Flag code={opp.league} />}
              <span className="truncate font-semibold">{opp.name}</span>
              {isDerby(w, m) && <Badge tone="orange" className="shrink-0">Clássico</Badge>}
            </span>
            <span className="col-start-3 row-span-2 row-start-1 flex items-center justify-end gap-2 sm:col-start-auto sm:row-span-1 sm:row-start-auto">
              {r ? (
                <>
                  <FormChips form={[r]} />
                  <b className="font-display text-base tabular">{gf} – {ga}</b>
                  {m.pens && <small className="text-mist">(pên.)</small>}
                </>
              ) : (
                <span className="text-xs text-mist">{home ? "Em casa" : m.neutral ? "Neutro" : "Fora"}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

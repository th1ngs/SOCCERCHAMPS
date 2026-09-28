"use client";

import { formatMoney } from "@/game";
import { OvrBadge, PosBadge, Stars } from "@/components/ui/primitives";
import { potentialStars } from "@/components/player/playerInfo";
import { ClubCell, StarMark } from "./MarketTable";
import type { MarketRow } from "./marketFilter";

/** Resultados do mercado em cartões (celular). */
export function MarketCards({ rows, onOpen }: { rows: MarketRow[]; onOpen: (pid: string) => void }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.p.id}>
          <button
            type="button"
            onClick={() => onOpen(r.p.id)}
            className="flex w-full items-center gap-3 rounded-xl bg-ink-800 px-3 py-2.5 text-left shadow-card ring-1 ring-inset ring-white/8 transition-colors hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-gold-400"
          >
            <PosBadge pos={r.p.pos} />
            <span className="min-w-0 flex-1 space-y-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-semibold">{r.p.name}</span>
                {r.p.star && <StarMark />}
              </span>
              <span className="flex min-w-0 text-xs text-mist">
                <ClubCell row={r} />
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-mist">
                <span>{r.p.age} anos</span>
                <span aria-hidden>•</span>
                <span className="tabular text-snow">{formatMoney(r.value)}</span>
                <span aria-hidden>•</span>
                <Stars value={potentialStars(r.p, false)} className="text-[11px]" />
              </span>
            </span>
            <OvrBadge value={r.p.ovr} />
          </button>
        </li>
      ))}
    </ul>
  );
}

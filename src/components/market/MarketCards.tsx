"use client";

import { formatMoney } from "@/game";
import { Flag } from "@/components/ui/Flag";
import { OvrBadge, PosBadge } from "@/components/ui/primitives";
import { ClubCell, PotCell, ScoutCell, StarMark } from "./MarketTable";
import type { MarketRow } from "./marketFilter";
import { WatchButton } from "./WatchButton";
import { TraitChips } from "@/components/player/TraitChips";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";

/** Resultados do mercado em cartões (celular). O cartão abre a ficha; a estrela observa. */
export function MarketCards({ rows, onOpen }: { rows: MarketRow[]; onOpen: (pid: string) => void }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.p.id} className="flex items-stretch gap-1 rounded-xl bg-ink-800 shadow-card ring-1 ring-inset ring-white/8">
          <button
            type="button"
            onClick={() => onOpen(r.p.id)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2.5 pl-3 text-left transition-colors hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-gold-400"
          >
            <PlayerAvatar player={r.p} size={36} />
            <PosBadge pos={r.p.pos} />
            <span className="min-w-0 flex-1 space-y-1">
              <span className="flex items-center gap-1.5">
                <Flag code={r.p.nat} />
                <span className="truncate font-semibold">{r.p.name}</span>
                {r.p.star && <StarMark />}
              </span>
              <span className="flex min-w-0 text-xs text-mist">
                <ClubCell row={r} />
              </span>
              <TraitChips traits={r.p.traits} />
              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-mist">
                <span>{r.p.age} anos</span>
                <span className="tabular text-snow">{formatMoney(r.value)}</span>
                <span>
                  Pot. <PotCell row={r} />
                </span>
                <ScoutCell row={r} />
              </span>
            </span>
            <OvrBadge value={r.p.ovr} />
          </button>
          <div className="flex items-center pr-1">
            <WatchButton pid={r.p.id} name={r.p.name} watched={r.watched} />
          </div>
        </li>
      ))}
    </ul>
  );
}

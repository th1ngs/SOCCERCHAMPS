"use client";

import { formatMoney } from "@/game";
import { Flag } from "@/components/ui/Flag";
import { Meter, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { contractText } from "@/components/player/playerInfo";
import { StatusTags } from "./StatusTagBadges";
import type { SquadRow } from "./SquadTable";
import { LoanBadge, PromiseBadge } from "./TransferMarkBadges";
import { useTransferMarks } from "./transferMarks";
import { TraitChips } from "@/components/player/TraitChips";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";

/** Lista compacta do elenco para celulares (< 640 px): cada cartão abre a ficha. */
export function SquadCards({ rows, onOpen }: { rows: SquadRow[]; onOpen: (pid: string) => void }) {
  const marks = useTransferMarks(rows.map((r) => r.p));
  return (
    <ul className="space-y-2">
      {rows.map(({ p, value, tags }) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpen(p.id)}
            className="flex w-full items-center gap-3 rounded-xl bg-ink-800 px-3 py-2.5 text-left shadow-card ring-1 ring-inset ring-white/8 transition-colors hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-gold-400"
          >
            <div className="flex w-9 shrink-0 flex-col items-center gap-1">
              <PosBadge pos={p.pos} />
              <span className="text-xs tabular text-mist">{p.num || "—"}</span>
            </div>
            <PlayerAvatar player={p} size={36} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <Flag code={p.nat} />
                <span className="truncate font-semibold">{p.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-mist">
                <span>{p.age} anos</span>
                <Meter value={p.fitness} label={`Condição ${Math.round(p.fitness)}%`} className="w-12" />
                <span className="tabular">{formatMoney(value)}</span>
                <span className={p.contract <= 1 ? "text-warn-400" : undefined}>{contractText(p.contract)}</span>
              </div>
              <span className="flex flex-wrap items-center gap-1">
                <StatusTags tags={tags} />
                <TraitChips traits={p.traits} />
                {marks.get(p.id)?.promise && <PromiseBadge marks={marks.get(p.id)} />}
                <LoanBadge marks={marks.get(p.id)} />
              </span>
            </div>
            <OvrBadge value={p.ovr} />
          </button>
        </li>
      ))}
    </ul>
  );
}

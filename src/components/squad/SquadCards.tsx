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
import { cn } from "@/lib/cn";

/** Cartões do elenco (celular e visão por posição): cada cartão abre a ficha; a faixa verde marca os titulares. */
export function SquadCards({ rows, onOpen, className }: { rows: SquadRow[]; onOpen: (pid: string) => void; className?: string }) {
  const marks = useTransferMarks(rows.map((r) => r.p));
  return (
    <ul className={cn("space-y-2", className)}>
      {rows.map(({ p, value, tags }) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpen(p.id)}
            className={cn(
              "relative flex h-full w-full items-center gap-3 overflow-hidden rounded-xl bg-ink-800 px-3 py-2.5 text-left shadow-card ring-1 ring-inset ring-white/8 transition-colors hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-gold-400",
              (p.inj > 0 || p.susp > 0) && "opacity-75",
            )}
          >
            {tags.some((t) => t.key === "tit") && <span className="absolute inset-y-0 left-0 w-1 bg-pitch-400" aria-hidden />}
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
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-mist">
                <span>{p.age} anos</span>
                <span aria-hidden>•</span>
                <span className="tabular">{formatMoney(value)}</span>
                <span aria-hidden>•</span>
                <span className={p.contract <= 1 ? "text-warn-400" : undefined}>{contractText(p.contract)}</span>
                <Meter value={p.fitness} label={`Condição ${Math.round(p.fitness)}%`} className="w-10" />
              </div>
              {p.s.apps > 0 && (
                <div className="flex flex-wrap gap-x-3 text-xs tabular text-mist">
                  <span title="Jogos">Jogos <b className="text-snow">{p.s.apps}</b></span>
                  <span title="Gols">Gols <b className="text-snow">{p.s.goals}</b></span>
                  <span title="Assistências">Assist. <b className="text-snow">{p.s.assists}</b></span>
                </div>
              )}
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

"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { divisionName, LEAGUE_IDS, LEAGUES, topScorers, user } from "@/game";
import type { DivisionId } from "@/game/types";
import { Card, EmptyState, PosBadge } from "@/components/ui/primitives";
import { Crest } from "@/components/ui/Crest";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { DivisionName } from "./labels";

function ScorerColumn({ div }: { div: DivisionId }) {
  const { world: w, version, setOverlay } = useWorld();
  const list = useMemo(() => {
    void version;
    return topScorers(w, div, 15);
  }, [w, div, version]);

  return (
    <Card title={<DivisionName div={div} country />} action={<span className="text-xs text-mist">Gols • assist.</span>}>
      {list.length ? (
        <ol className="flex flex-col">
          {list.map((p, i) => {
            const club = p.clubId ? w.clubs[p.clubId] : null;
            const mine = p.clubId === w.userClub;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setOverlay({ kind: "player", pid: p.id })}
                  className={cn(
                    "group flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-white/6 focus-visible:outline-2 focus-visible:outline-gold-400",
                    mine && "bg-gold-400/10",
                  )}
                >
                  <span className="w-5 shrink-0 text-right font-display font-bold text-mist tabular">{i + 1}</span>
                  <PosBadge pos={p.pos} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate", mine && "font-semibold")}>{p.name}</span>
                    {club && (
                      <span className="flex items-center gap-1.5 truncate text-xs text-mist">
                        <Crest club={club} size={12} /> {club.name}
                      </span>
                    )}
                  </span>
                  <span className="font-display text-xl font-extrabold text-gold-400 tabular">{p.s.goals}</span>
                  <span className="w-5 text-right text-xs text-mist tabular">{p.s.assists}</span>
                  <ChevronRight className="size-4 shrink-0 text-mist opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState>Sem gols ainda.</EmptyState>
      )}
    </Card>
  );
}

/** Artilharia de uma divisão (padrão: a do usuário); toque no jogador para abrir a ficha. */
export function ScorersView() {
  const { world: w } = useWorld();
  const id = useId();
  const [div, setDiv] = useState<DivisionId>(() => user(w).div);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={id} className="text-sm text-mist">Divisão</label>
        <span className="relative">
          <select
            id={id}
            value={div}
            onChange={(e) => setDiv(e.target.value as DivisionId)}
            className="h-10 appearance-none rounded-xl bg-ink-950/70 pl-3 pr-9 text-sm font-semibold text-snow ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-2 focus:ring-gold-400"
          >
            {LEAGUE_IDS.map((lg) => (
              <optgroup key={lg} label={LEAGUES[lg].name}>
                {LEAGUES[lg].divisions.map((d) => (
                  <option key={d} value={d}>
                    {divisionName(d)} ({LEAGUES[lg].name})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-mist" aria-hidden />
        </span>
      </div>
      <div className="max-w-2xl">
        <ScorerColumn key={div} div={div} />
      </div>
    </div>
  );
}

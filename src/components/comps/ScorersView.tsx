"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { topScorers } from "@/game";
import type { Division } from "@/game/types";
import { Card, EmptyState, PosBadge } from "@/components/ui/primitives";
import { Crest } from "@/components/ui/Crest";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";

function ScorerColumn({ div }: { div: Division }) {
  const { world: w, version, setOverlay } = useWorld();
  const list = useMemo(() => {
    void version;
    return topScorers(w, div, 15);
  }, [w, div, version]);

  return (
    <Card title={`Série ${div}`} action={<span className="text-xs text-mist">Gols • assist.</span>}>
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

/** Artilharia das duas divisões; toque no jogador para abrir a ficha. */
export function ScorersView() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ScorerColumn div="A" />
      <ScorerColumn div="B" />
    </div>
  );
}

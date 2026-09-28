"use client";

import { Crest } from "@/components/ui/Crest";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";

/** Escudo + nome do clube (nome truncado quando falta espaço). */
export function ClubTag({ id, size = 18, className, bold }: { id: string; size?: number; className?: string; bold?: boolean }) {
  const { world: w } = useWorld();
  const c = w.clubs[id];
  if (!c) return <span className="text-mist">—</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Crest club={c} size={size} className="shrink-0" />
      <span className={cn("truncate", bold && "font-semibold")}>{c.name}</span>
    </span>
  );
}

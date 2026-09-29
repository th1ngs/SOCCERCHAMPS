"use client";

import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";

/** Escudo + nome do clube (nome truncado quando falta espaço). `flag` acrescenta a bandeira da liga. */
export function ClubTag({ id, size = 18, className, bold, flag }: { id: string | null | undefined; size?: number; className?: string; bold?: boolean; flag?: boolean }) {
  const { world: w } = useWorld();
  const c = id ? w.clubs[id] : null;
  if (!c) return <span className="text-mist">—</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Crest club={c} size={size} className="shrink-0" />
      {flag && <Flag code={c.league} />}
      <span className={cn("truncate", bold && "font-semibold", c.id === w.userClub && "text-gold-300")}>{c.name}</span>
    </span>
  );
}

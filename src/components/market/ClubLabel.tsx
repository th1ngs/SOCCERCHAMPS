"use client";

import type { Club } from "@/game/types";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { cn } from "@/lib/cn";

/** Escudo + nome do clube (ou "Mercado livre"). */
export function ClubLabel({ club, short = false, flag = false, className, empty = "Mercado livre" }: { club: Club | null | undefined; short?: boolean; flag?: boolean; className?: string; empty?: string }) {
  if (!club) return <span className={cn("text-mist", className)}>{empty}</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Crest club={club} size={16} className="shrink-0" />
      <span className="truncate">{short ? club.short || club.name : club.name}</span>
      {flag && <Flag code={club.league} />}
    </span>
  );
}

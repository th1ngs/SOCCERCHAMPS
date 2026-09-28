"use client";

import { ArrowUpFromLine, UserMinus } from "lucide-react";
import type { Player } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { OvrBadge, PosBadge, Stars } from "@/components/ui/primitives";
import { TraitBadges } from "@/components/player/TraitBadges";
import { potentialStars } from "@/components/player/playerInfo";

/** Cartão de um garoto da base: atual × potencial, características, promover e dispensar. */
export function YouthCard({
  player: p,
  promoteBlocked,
  onOpen,
  onPromote,
  onDismiss,
}: {
  player: Player;
  /** Motivo para não poder promover (elenco cheio) ou null. */
  promoteBlocked: string | null;
  onOpen: () => void;
  onPromote: () => void;
  onDismiss: () => void;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-(--radius-card) bg-ink-800 p-4 shadow-card ring-1 ring-inset ring-white/8">
      <header className="flex items-start gap-2">
        <PosBadge pos={p.pos} className="mt-1" />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpen} className="max-w-full truncate rounded text-left font-semibold hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400">
            {p.name}
          </button>
          <p className="text-xs text-mist">{p.age} anos</p>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6">
        <div className="flex flex-col items-center gap-1">
          <OvrBadge value={p.ovr} />
          <span className="text-[11px] uppercase tracking-wider text-mist">atual</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Stars value={potentialStars(p, true)} className="h-6 items-center text-base" />
          <span className="text-[11px] uppercase tracking-wider text-mist">potencial</span>
        </div>
      </div>
      <TraitBadges player={p} />
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" icon={<UserMinus />} onClick={onDismiss} className="text-danger-400! hover:bg-danger-500/10!">
          Dispensar
        </Button>
        <Button variant="primary" icon={<ArrowUpFromLine />} onClick={onPromote} disabled={!!promoteBlocked} title={promoteBlocked ?? undefined}>
          Promover
        </Button>
      </div>
    </article>
  );
}

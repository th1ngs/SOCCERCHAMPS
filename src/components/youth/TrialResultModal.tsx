"use client";

import { Check } from "lucide-react";
import type { Player } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { OvrBadge, PosBadge, Stars } from "@/components/ui/primitives";
import { TraitBadges } from "@/components/player/TraitBadges";
import { potentialStars } from "@/components/player/playerInfo";

/** Resultado da peneira: garotos aprovados pelos olheiros. */
export function TrialResultModal({ players, onClose }: { players: Player[] | null; onClose: () => void }) {
  return (
    <Modal
      open={!!players}
      onClose={onClose}
      title="Resultado da peneira"
      footer={
        <Button variant="primary" icon={<Check />} onClick={onClose}>
          Levar para a base
        </Button>
      }
    >
      <p className="mb-3 text-sm text-mist">
        Os olheiros aprovaram {players?.length ?? 0} {players?.length === 1 ? "garoto" : "garotos"}:
      </p>
      <ul className="space-y-2">
        {players?.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-800 px-3 py-2.5 ring-1 ring-inset ring-white/8">
            <PosBadge pos={p.pos} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{p.name}</span>
              <span className="text-xs text-mist">{p.age} anos</span>
            </span>
            <TraitBadges player={p} short />
            <OvrBadge value={p.ovr} />
            <Stars value={potentialStars(p, true)} />
          </li>
        ))}
      </ul>
    </Modal>
  );
}

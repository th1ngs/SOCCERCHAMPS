"use client";

import { ChevronRight } from "lucide-react";
import type { World } from "@/game/types";
import { Crest } from "@/components/ui/Crest";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/primitives";

/** Carreira salva neste aparelho, com o botão principal da tela. */
export function ContinueCard({ save, onContinue }: { save: World; onContinue: () => void }) {
  const club = save.clubs[save.userClub];
  if (!club) return null;
  return (
    <section
      aria-label="Carreira salva"
      className="flex flex-col gap-4 rounded-(--radius-card) bg-linear-to-br from-pitch-700/35 via-ink-800 to-ink-800 p-4 shadow-card ring-1 ring-inset ring-white/10 sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Crest club={club} size={52} className="shrink-0" />
        <div className="min-w-0">
          <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-gold-400">Carreira salva</span>
          <span className="block truncate font-display text-2xl font-extrabold uppercase italic leading-tight">{club.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mist">
            <span className="truncate">{save.manager.name}</span>
            <span aria-hidden>•</span>
            <span>Temporada {save.season}, {save.week === 0 ? "pré-temporada" : `semana ${save.week}`}</span>
            <Badge tone={club.div === "A" ? "gold" : "blue"}>Série {club.div}</Badge>
          </span>
        </div>
      </div>
      <Button variant="primary" size="lg" onClick={onContinue} iconRight={<ChevronRight />} className="w-full sm:w-auto">
        Continuar carreira
      </Button>
    </section>
  );
}

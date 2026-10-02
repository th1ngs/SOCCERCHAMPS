"use client";

import { ChevronRight, MapPin } from "lucide-react";
import { clubStars, divisionFullName, divisionLevel } from "@/game";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Badge, Stars } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";

/** Cartões de propostas de emprego: o cartão inteiro é o botão "Assumir o clube". */
export function JobOffers({ ids, onPick }: { ids: string[]; onPick: (id: string) => void }) {
  const { world: w } = useWorld();
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {ids.map((id) => {
        const c = w.clubs[id];
        if (!c) return null;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              className="group flex h-full w-full flex-col items-center gap-2 rounded-2xl bg-ink-700 p-4 text-center ring-1 ring-inset ring-white/10 transition hover:-translate-y-0.5 hover:ring-gold-400/60 focus-visible:outline-2 focus-visible:outline-gold-400"
            >
              <Crest club={c} size={48} />
              <span className="font-display text-lg font-bold uppercase leading-tight">{c.name}</span>
              <span className="flex items-center gap-1 text-xs text-mist">
                <MapPin className="size-3" aria-hidden /> {c.city}-{c.uf}
              </span>
              <span className="flex max-w-full items-center gap-1.5 text-sm">
                <Flag code={c.league} />
                <span className="truncate">{divisionFullName(c.div)}</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={divisionLevel(c.div) === 1 ? "gold" : "blue"}>{divisionLevel(c.div)}ª divisão</Badge>
                <Stars value={clubStars(w, c)} />
              </span>
              <span className="mt-auto inline-flex items-center gap-1 pt-1 font-display text-sm font-bold uppercase tracking-wide text-gold-400">
                Assumir o clube <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

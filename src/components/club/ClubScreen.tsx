"use client";

import { user } from "@/game";
import { Crest } from "@/components/ui/Crest";
import { useWorld } from "@/components/game/GameProvider";
import { SeasonFinancesCard } from "./SeasonFinancesCard";
import { StructureCard } from "./StructureCard";
import { TicketsCard, TrainingCard } from "./PoliciesCard";
import { LoanCard } from "./LoanCard";
import { CareerCard } from "./CareerCard";
import { CloudCard } from "./CloudCard";

/** Clube: finanças, estrutura, treino, ingressos, empréstimo, diretoria, carreira e nuvem. */
export function ClubScreen() {
  const { world: w } = useWorld();
  const u = user(w);
  return (
    <>
      <div className="mb-5 flex items-center gap-4">
        <Crest club={u} size={56} className="shrink-0" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-extrabold uppercase italic leading-none tracking-tight sm:text-4xl">{u.name}</h1>
          <p className="mt-1 text-sm text-mist">
            “{u.nickname}” • {u.city}-{u.uf} • {u.stadium} • reputação {Math.round(u.rep)}
          </p>
        </div>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SeasonFinancesCard />
        <StructureCard />
        <div className="flex flex-col gap-4">
          <TrainingCard />
          <TicketsCard />
        </div>
        <LoanCard />
        <CareerCard />
        <CloudCard />
      </div>
    </>
  );
}

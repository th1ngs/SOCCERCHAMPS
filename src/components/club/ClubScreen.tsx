"use client";

import { divisionFullName, LEAGUES, user } from "@/game";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { useWorld } from "@/components/game/GameProvider";
import { SeasonFinancesCard } from "./SeasonFinancesCard";
import { BudgetCard } from "./BudgetCard";
import { LeagueFinanceCard } from "./LeagueFinanceCard";
import { StructureCard } from "./StructureCard";
import { TicketsCard, TrainingCard } from "./PoliciesCard";
import { LoanCard } from "./LoanCard";
import { CareerCard } from "./CareerCard";
import { CloudCard } from "./CloudCard";
import { SponsorCard } from "./SponsorCard";
import { BoardCard } from "@/components/home/BoardCard";

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
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-mist">
            <span>“{u.nickname}”</span>
            <span aria-hidden>•</span>
            <span className="inline-flex items-center gap-1.5">
              <Flag code={u.league} decorative /> {u.city}-{u.uf}, {LEAGUES[u.league].name}
            </span>
            <span aria-hidden>•</span>
            <span>{divisionFullName(u.div)}</span>
          </p>
          <p className="mt-0.5 text-sm text-mist">
            {u.stadium} • reputação {Math.round(u.rep)}
          </p>
        </div>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {w.sponsorOffers?.length ? <SponsorCard /> : null}
        <BoardCard />
        <BudgetCard />
        <SeasonFinancesCard />
        {!w.sponsorOffers?.length && <SponsorCard />}
        <StructureCard />
        <div className="flex flex-col gap-4">
          <TrainingCard />
          <TicketsCard />
        </div>
        <LeagueFinanceCard />
        <LoanCard />
        <CareerCard />
        <CloudCard />
      </div>
    </>
  );
}

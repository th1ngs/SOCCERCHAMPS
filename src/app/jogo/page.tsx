"use client";

import { weekLabel } from "@/game";
import { PageHeader } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { NextMatchCard } from "@/components/home/NextMatchCard";
import { BoardCard } from "@/components/home/BoardCard";
import { MiniTableCard } from "@/components/home/MiniTableCard";
import { CompetitionsCard } from "@/components/home/CompetitionsCard";
import { SquadCard } from "@/components/home/SquadCard";
import { FinanceCard } from "@/components/home/FinanceCard";
import { MessagesCard } from "@/components/home/MessagesCard";

/** Início: painel da semana. */
export default function InicioPage() {
  const { world: w } = useWorld();
  return (
    <>
      <PageHeader title="Início" subtitle={`Temporada ${w.season} • ${weekLabel(w)} • ${w.manager.name}`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NextMatchCard />
        <BoardCard />
        <MiniTableCard />
        <CompetitionsCard />
        <SquadCard />
        <FinanceCard />
        <MessagesCard />
      </div>
    </>
  );
}

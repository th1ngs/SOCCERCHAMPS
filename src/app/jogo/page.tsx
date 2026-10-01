"use client";

import { ChevronDown } from "lucide-react";
import { NextMatchCard } from "@/components/home/NextMatchCard";
import { WeekCalendarCard } from "@/components/home/WeekCalendarCard";
import { BoardCard } from "@/components/home/BoardCard";
import { MiniTableCard } from "@/components/home/MiniTableCard";
import { CompetitionsCard } from "@/components/home/CompetitionsCard";
import { SquadCard } from "@/components/home/SquadCard";
import { FinanceCard } from "@/components/home/FinanceCard";
import { MessagesCard } from "@/components/home/MessagesCard";
import { ChecklistCard } from "@/components/home/ChecklistCard";
import { HomeStats } from "@/components/home/HomeStats";

/** Início: o próximo jogo em destaque, o que falta fazer e a situação num relance; o resto fica recolhido. */
export default function InicioPage() {
  return (
    <div className="space-y-4">
      <h1 className="sr-only">Início</h1>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <NextMatchCard />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          <ChecklistCard compact />
          <WeekCalendarCard compact />
        </div>
      </div>

      <HomeStats />

      <div className="grid gap-4 md:grid-cols-2">
        <MiniTableCard />
        <MessagesCard />
      </div>

      <details className="group rounded-(--radius-card) bg-ink-800/60 ring-1 ring-inset ring-white/8">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-display text-base font-bold uppercase tracking-wide text-mist hover:text-snow [&::-webkit-details-marker]:hidden">
          Painel completo: diretoria, elenco, finanças e competições
          <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="grid gap-4 p-3 pt-0 md:grid-cols-2 xl:grid-cols-4">
          <BoardCard />
          <SquadCard />
          <FinanceCard />
          <CompetitionsCard />
        </div>
      </details>
    </div>
  );
}

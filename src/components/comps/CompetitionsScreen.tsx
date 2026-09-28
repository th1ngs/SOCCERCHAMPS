"use client";

import { useState } from "react";
import { user } from "@/game";
import { PageHeader } from "@/components/ui/primitives";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { useWorld } from "@/components/game/GameProvider";
import { LeagueTable } from "./LeagueTable";
import { CupView } from "./CupView";
import { ScorersView } from "./ScorersView";
import { FixturesView } from "./FixturesView";
import { HistoryView } from "./HistoryView";

export type CompTab = "A" | "B" | "cup" | "scorers" | "fixtures" | "history";

const TABS: SegmentedOption<CompTab>[] = [
  { value: "A", label: "Série A" },
  { value: "B", label: "Série B" },
  { value: "cup", label: "Copa" },
  { value: "scorers", label: "Artilharia" },
  { value: "fixtures", label: "Calendário" },
  { value: "history", label: "Histórico" },
];

const SUBTITLE: Record<CompTab, string> = {
  A: "Pontos corridos em turno e returno. O campeão leva a taça; os 3 últimos caem.",
  B: "Os 3 primeiros sobem para a Série A.",
  cup: "Mata-mata em jogo único com os 32 clubes. Empate vai para os pênaltis.",
  scorers: "Os goleadores da temporada. Toque em um jogador para ver a ficha.",
  fixtures: "Seus jogos, semana a semana.",
  history: "Títulos do clube e campeões de cada temporada.",
};

/** Tela de competições com sub-abas. */
export function CompetitionsScreen() {
  const { world: w } = useWorld();
  const [tab, setTab] = useState<CompTab>(() => user(w).div);

  return (
    <>
      <PageHeader title="Competições" subtitle={SUBTITLE[tab]} />
      <Segmented options={TABS} value={tab} onChange={setTab} ariaLabel="Competição" className="mb-5" />
      {tab === "A" || tab === "B" ? (
        <LeagueTable key={tab} div={tab} />
      ) : tab === "cup" ? (
        <CupView />
      ) : tab === "scorers" ? (
        <ScorersView />
      ) : tab === "fixtures" ? (
        <FixturesView />
      ) : (
        <HistoryView />
      )}
    </>
  );
}

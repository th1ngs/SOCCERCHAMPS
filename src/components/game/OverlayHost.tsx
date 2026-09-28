"use client";

import { useGame } from "./GameProvider";
import { PlayerModal } from "@/components/player/PlayerModal";
import { WeekResultsModal } from "@/components/flow/WeekResultsModal";
import { SeasonEndModal } from "@/components/flow/SeasonEndModal";
import { FiredModal } from "@/components/flow/FiredModal";
import { PrematchModal } from "@/components/match/PrematchModal";
import { SummaryModal } from "@/components/match/SummaryModal";
import { LiveMatch } from "@/components/match/LiveMatch";
import { ButtonMatch } from "@/components/match/ButtonMatch";

/** Renderiza o diálogo global ativo e a tela de partida, se houver. */
export function OverlayHost() {
  const { world, overlay, setOverlay, matchMode } = useGame();
  if (!world) return null;
  const close = () => setOverlay(null);
  return (
    <>
      {matchMode?.kind === "live" && <LiveMatch matchId={matchMode.matchId} />}
      {matchMode?.kind === "button" && <ButtonMatch matchId={matchMode.matchId} />}
      {overlay?.kind === "player" && <PlayerModal pid={overlay.pid} onClose={close} />}
      {overlay?.kind === "weekResults" && <WeekResultsModal />}
      {overlay?.kind === "seasonEnd" && <SeasonEndModal />}
      {overlay?.kind === "fired" && <FiredModal />}
      {overlay?.kind === "prematch" && <PrematchModal matchId={overlay.matchId} />}
      {overlay?.kind === "summary" && <SummaryModal matchId={overlay.matchId} />}
    </>
  );
}

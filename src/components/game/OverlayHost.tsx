"use client";

import { useGame } from "./GameProvider";
import dynamic from "next/dynamic";

const PlayerModal = dynamic(() => import("@/components/player/PlayerModal").then((m) => m.PlayerModal));
const WeekResultsModal = dynamic(() => import("@/components/flow/WeekResultsModal").then((m) => m.WeekResultsModal));
const SeasonEndModal = dynamic(() => import("@/components/flow/SeasonEndModal").then((m) => m.SeasonEndModal));
const FiredModal = dynamic(() => import("@/components/flow/FiredModal").then((m) => m.FiredModal));
const PrematchModal = dynamic(() => import("@/components/match/PrematchModal").then((m) => m.PrematchModal));
const SummaryModal = dynamic(() => import("@/components/match/SummaryModal").then((m) => m.SummaryModal));
const LiveMatch = dynamic(() => import("@/components/match/LiveMatch").then((m) => m.LiveMatch));
const ButtonMatch = dynamic(() => import("@/components/match/ButtonMatch").then((m) => m.ButtonMatch));
const CalendarAdvanceModal = dynamic(() => import("@/components/home/CalendarAdvanceModal").then((m) => m.CalendarAdvanceModal));

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
      {overlay?.kind === "calendar" && <CalendarAdvanceModal />}
    </>
  );
}

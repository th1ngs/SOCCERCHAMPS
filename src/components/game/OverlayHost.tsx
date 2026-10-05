"use client";

import { useGame } from "./GameProvider";
import dynamic from "next/dynamic";
import { markGalaSeen, popCeremony } from "@/game";
import { nextFlowOverlay } from "./ceremonyFlow";

const PlayerModal = dynamic(() => import("@/components/player/PlayerModal").then((m) => m.PlayerModal));
const WeekResultsModal = dynamic(() => import("@/components/flow/WeekResultsModal").then((m) => m.WeekResultsModal));
const SeasonEndModal = dynamic(() => import("@/components/flow/SeasonEndModal").then((m) => m.SeasonEndModal));
const FiredModal = dynamic(() => import("@/components/flow/FiredModal").then((m) => m.FiredModal));
const PrematchModal = dynamic(() => import("@/components/match/PrematchModal").then((m) => m.PrematchModal));
const SummaryModal = dynamic(() => import("@/components/match/SummaryModal").then((m) => m.SummaryModal));
const LiveMatch = dynamic(() => import("@/components/match/LiveMatch").then((m) => m.LiveMatch));
const LancesMatch = dynamic(() => import("@/components/match/LancesMatch").then((m) => m.LancesMatch));
const SigningShowcase = dynamic(() => import("@/components/player/SigningShowcase").then((m) => m.SigningShowcase));
const CalendarAdvanceModal = dynamic(() => import("@/components/home/CalendarAdvanceModal").then((m) => m.CalendarAdvanceModal));
const CeremonyHost = dynamic(() => import("@/components/awards/CeremonyHost").then((m) => m.CeremonyHost));
const GalaNight = dynamic(() => import("@/components/awards/GalaNight").then((m) => m.GalaNight));

/** Renderiza o diálogo global ativo e a tela de partida, se houver. */
export function OverlayHost() {
  const { world, overlay, setOverlay, matchMode, mutate } = useGame();
  if (!world) return null;
  const close = () => setOverlay(null);
  // Fecha a cerimônia atual e segue o fluxo (próxima cerimônia, gala ou fim de temporada).
  const closeCeremony = () => {
    mutate((w) => popCeremony(w));
    setOverlay(nextFlowOverlay(world));
  };
  const closeGala = () => {
    mutate((w) => markGalaSeen(w));
    setOverlay(nextFlowOverlay(world));
  };
  return (
    <>
      {matchMode?.kind === "live" && <LiveMatch matchId={matchMode.matchId} />}
      {matchMode?.kind === "lances" && <LancesMatch matchId={matchMode.matchId} />}
      {overlay?.kind === "player" && <PlayerModal pid={overlay.pid} onClose={close} />}
      {overlay?.kind === "weekResults" && <WeekResultsModal />}
      {overlay?.kind === "seasonEnd" && <SeasonEndModal />}
      {overlay?.kind === "fired" && <FiredModal />}
      {overlay?.kind === "prematch" && <PrematchModal matchId={overlay.matchId} />}
      {overlay?.kind === "summary" && <SummaryModal matchId={overlay.matchId} />}
      {overlay?.kind === "calendar" && <CalendarAdvanceModal />}
      {overlay?.kind === "ceremony" && <CeremonyHost onClose={closeCeremony} />}
      {overlay?.kind === "gala" && overlay.season == null && world.pendingSeason?.gala && <GalaNight gala={world.pendingSeason.gala} onDone={closeGala} />}
      {overlay?.kind === "gala" && overlay.season != null && (() => {
        const g = world.galas?.find((x) => x.season === overlay.season);
        return g ? <GalaNight gala={g} onDone={close} /> : null;
      })()}
      {overlay?.kind === "signing" && (
        <SigningShowcase
          key={overlay.pid}
          pid={overlay.pid}
          kind={overlay.how}
          fee={overlay.fee}
          from={overlay.from}
          onClose={close}
          onProfile={() => setOverlay({ kind: "player", pid: overlay.pid })}
        />
      )}
    </>
  );
}

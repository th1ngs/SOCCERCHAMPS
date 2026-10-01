"use client";

import { useState } from "react";
import type { Match, World } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { LancesSeries } from "@/components/lances/LancesSeries";
import type { SeriesOutcome } from "@/lances/series";
import { lancesMatchResult, prepareLances } from "./lancesResult";
import { findMatch, settleMatch } from "./matchUtils";

/** Partida do Manager jogada nos lances de ataque em 3D (o placar vale para a temporada). */
export function LancesMatch({ matchId }: { matchId: string }) {
  const { world: w, setMatchMode } = useWorld();
  const [m] = useState(() => findMatch(w, matchId));
  if (!m || m.played) {
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-ink-950/95 p-6 text-center">
        <div className="space-y-4">
          <p className="text-mist">{m ? "Esta partida já foi disputada." : "Partida não encontrada."}</p>
          <Button variant="primary" onClick={() => setMatchMode(null)}>Voltar ao jogo</Button>
        </div>
      </div>
    );
  }
  return <LancesMatchScreen w={w} m={m} />;
}

function LancesMatchScreen({ w, m }: { w: World; m: Match }) {
  const { commit, setMatchMode, setOverlay, scratch } = useWorld();
  const [prep] = useState(() => prepareLances(w, m));
  const finish = (o: SeriesOutcome) => {
    settleMatch(w, m, lancesMatchResult(w, m, prep, o), scratch);
    commit();
    setMatchMode(null);
    setOverlay({ kind: "summary", matchId: m.id });
  };
  return <LancesSeries plan={prep.plan} onFinish={finish} />;
}

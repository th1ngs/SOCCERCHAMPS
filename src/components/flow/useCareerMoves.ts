"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { newSeason, switchClub } from "@/game";
import { useToast } from "@/components/ui/Toast";
import { useWorld } from "@/components/game/GameProvider";

/**
 * Trocas de clube e virada de temporada a partir dos diálogos de fim de temporada/demissão.
 * takeJob: com temporada pendente, primeiro vira a temporada e depois troca de clube (como no legado).
 */
export function useCareerMoves() {
  const { mutate, setOverlay } = useWorld();
  const router = useRouter();
  const toast = useToast();
  const busy = useRef(false);

  const finish = useCallback(
    (text: string) => {
      setOverlay(null);
      router.push("/jogo");
      toast(text, "good");
      busy.current = false;
    },
    [router, setOverlay, toast],
  );

  const takeJob = useCallback(
    (clubId: string) => {
      if (busy.current) return;
      busy.current = true;
      let wasPending = false, name = "";
      mutate((w) => {
        wasPending = !!w.pendingSeason;
        if (w.pendingSeason) newSeason(w);
        switchClub(w, clubId);
        name = w.clubs[clubId].name;
      });
      finish(wasPending ? `Nova temporada no ${name}!` : `Você agora treina o ${name}.`);
    },
    [mutate, finish],
  );

  const startNewSeason = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    let season = 0;
    mutate((w) => {
      newSeason(w);
      season = w.season;
    });
    finish(`Pré-temporada ${season}: reforce o elenco e veja a nova safra da base.`);
  }, [mutate, finish]);

  return { takeJob, startNewSeason };
}

"use client";

import { useCallback, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { compWith, competitionName, currentWeek, knockoutStatus, weekComps, weekLabel } from "@/game";
import type { Week, World } from "@/game/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { useFlow } from "@/components/game/useFlow";
import { RoundResults } from "@/components/comps/Results";

/** Motivo de o usuário não jogar nesta semana. */
function restText(w: World, wk: Week | null): string {
  if (!wk || wk.type === "league") return "Sem jogo para o seu time nesta semana.";
  const comps = weekComps(wk);
  const comp = comps.find((c) => knockoutStatus(w, c, w.userClub) !== "out");
  if (!comp) return comps.length ? "Seu time não disputa os mata-matas desta semana. Semana de treinos." : "Semana sem jogos para o seu time.";
  const name = competitionName(comp);
  const st = knockoutStatus(w, comp, w.userClub);
  if (st === "eliminated") return `Seu time está fora ${compWith("de", name)}. Semana de treinos.`;
  return `Seu time passou direto nesta fase ${compWith("de", name)}.`;
}

/** Resultados da semana em que o usuário não jogou. Só fecha pelo "Continuar", que encerra a semana. */
export function WeekResultsModal() {
  const { world: w } = useWorld();
  const { finishWeek } = useFlow();
  const done = useRef(false);
  const wk = currentWeek(w);

  const next = useCallback(() => {
    if (done.current) return;
    done.current = true;
    finishWeek();
  }, [finishWeek]);

  return (
    <Modal
      open
      dismissible={false}
      onClose={next}
      size="lg"
      title={weekLabel(w)}
      footer={
        <Button variant="primary" onClick={next} iconRight={<ChevronRight />} data-autofocus>
          Continuar
        </Button>
      }
    >
      <Alert tone="info" className="mb-5">
        {restText(w, wk)}
      </Alert>
      <RoundResults />
    </Modal>
  );
}

"use client";

import { useCallback, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { currentWeek, weekLabel } from "@/game";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { useFlow } from "@/components/game/useFlow";
import { RoundResults } from "@/components/comps/Results";

/** Resultados da semana em que o usuário não jogou. Só fecha pelo "Continuar", que encerra a semana. */
export function WeekResultsModal() {
  const { world: w } = useWorld();
  const { finishWeek } = useFlow();
  const done = useRef(false);
  const wk = currentWeek(w);
  const outOfCup = wk?.type === "cup" && !w.cup.alive.includes(w.userClub);

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
        {outOfCup ? "Seu time está fora da Copa. Semana de treinos." : "Sem jogo para o seu time nesta semana."}
      </Alert>
      <RoundResults />
    </Modal>
  );
}

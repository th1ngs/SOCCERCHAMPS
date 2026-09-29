"use client";

import { useCallback, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { competitionName, cupId, currentWeek, knockoutStatus, user, weekLabel } from "@/game";
import type { KnockoutId, Week, World } from "@/game/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { useFlow } from "@/components/game/useFlow";
import { RoundResults } from "@/components/comps/Results";

/** Motivo de o usuário não jogar nesta semana. */
function restText(w: World, wk: Week | null): string {
  if (!wk || wk.type === "league") return "Sem jogo para o seu time nesta semana.";
  const comp: KnockoutId = wk.type === "cont" ? "cont" : cupId(user(w).league);
  const name = competitionName(comp);
  const st = knockoutStatus(w, comp, w.userClub);
  if (st === "out") return `Seu time não disputa a ${name}. Semana de treinos.`;
  if (st === "eliminated") return `Seu time está fora da ${name}. Semana de treinos.`;
  return `Seu time passou direto nesta fase da ${name}.`;
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

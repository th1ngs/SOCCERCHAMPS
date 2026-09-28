"use client";

import { useState } from "react";
import { jobOffers } from "@/game";
import { Modal } from "@/components/ui/Modal";
import { Alert, SectionTitle } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { JobOffers } from "./JobOffers";
import { useCareerMoves } from "./useCareerMoves";

/** Demissão no meio da temporada: motivo e três propostas. Só fecha escolhendo um clube. */
export function FiredModal() {
  const { world: w } = useWorld();
  const { takeJob } = useCareerMoves();
  const [offers] = useState(() => jobOffers(w));

  return (
    <Modal open dismissible={false} size="lg" title="Você foi demitido">
      <div className="flex flex-col gap-5">
        <Alert tone="bad">
          <span>{w.fired?.reason ?? "A diretoria decidiu encerrar o seu trabalho."}</span>
        </Alert>
        <p className="text-sm text-mist">Mas o mercado não esquece um bom treinador. Escolha o seu próximo desafio:</p>
        <div>
          <SectionTitle className="mb-2">Propostas de emprego</SectionTitle>
          <JobOffers ids={offers} onPick={takeJob} />
        </div>
      </div>
    </Modal>
  );
}

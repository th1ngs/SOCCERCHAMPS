"use client";

import { WandSparkles } from "lucide-react";
import { FORMATION_KEYS, TACTICS } from "@/game";
import type { FormationKey, TacticKey } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { TACTIC_HELP } from "./lineupLogic";

const TACTIC_KEYS = Object.keys(TACTICS) as TacticKey[];

/** Formação, estilo de jogo e escalação automática. */
export function TacticsCard({
  formation,
  tactic,
  onFormation,
  onTactic,
  onAuto,
}: {
  formation: FormationKey;
  tactic: TacticKey;
  onFormation: (f: FormationKey) => void;
  onTactic: (t: TacticKey) => void;
  onAuto: () => void;
}) {
  return (
    <Card title="Formação">
      <Segmented ariaLabel="Formação" options={FORMATION_KEYS.map((f) => ({ value: f, label: f }))} value={formation} onChange={onFormation} />
      <p className="mt-2 text-xs text-mist">Trocar a formação escala automaticamente o melhor time para o novo desenho.</p>
      <SectionTitle className="mt-5 mb-2">Estilo de jogo</SectionTitle>
      <Segmented ariaLabel="Estilo de jogo" options={TACTIC_KEYS.map((k) => ({ value: k, label: TACTICS[k].name }))} value={tactic} onChange={onTactic} />
      <p className="mt-2 text-sm text-mist" aria-live="polite">
        {TACTIC_HELP[tactic]}
      </p>
      <Button variant="secondary" block icon={<WandSparkles />} onClick={onAuto} className="mt-5">
        Escalar o melhor time
      </Button>
    </Card>
  );
}

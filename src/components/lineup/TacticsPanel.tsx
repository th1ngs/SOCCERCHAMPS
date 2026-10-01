"use client";

import { FORMATION_KEYS, TACTICS } from "@/game";
import type { FormationKey, TacticKey } from "@/game/types";
import { Segmented } from "@/components/ui/Segmented";
import { TACTIC_HELP } from "./lineupLogic";

const TACTIC_KEYS = Object.keys(TACTICS) as TacticKey[];

/** Formação e estilo de jogo. */
export function TacticsPanel({
  formation,
  tactic,
  onFormation,
  onTactic,
}: {
  formation: FormationKey;
  tactic: TacticKey;
  onFormation: (f: FormationKey) => void;
  onTactic: (t: TacticKey) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Formação</span>
        <Segmented ariaLabel="Formação" size="sm" options={FORMATION_KEYS.map((f) => ({ value: f, label: f }))} value={formation} onChange={onFormation} />
        <p className="mt-1.5 text-xs text-mist">Trocar a formação escala o melhor time para o novo desenho.</p>
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Estilo de jogo</span>
        <Segmented ariaLabel="Estilo de jogo" size="sm" options={TACTIC_KEYS.map((k) => ({ value: k, label: TACTICS[k].name }))} value={tactic} onChange={onTactic} />
        <p className="mt-1.5 text-xs text-mist" aria-live="polite">
          {TACTIC_HELP[tactic]}
        </p>
      </div>
    </div>
  );
}

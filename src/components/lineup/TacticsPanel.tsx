"use client";

import { PencilRuler } from "lucide-react";
import { TACTICS } from "@/game";
import type { FormationKey, FormationSlot, TacticKey } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { FormationPicker } from "./FormationPicker";
import { TACTIC_HELP } from "./lineupLogic";

const TACTIC_KEYS = Object.keys(TACTICS) as TacticKey[];

/** Formação (pronta ou personalizada) e estilo de jogo. */
export function TacticsPanel({
  formation,
  tactic,
  onFormation,
  onTactic,
  custom,
  customOn,
  onCustom,
  onEdit,
}: {
  formation: FormationKey;
  tactic: TacticKey;
  onFormation: (f: FormationKey) => void;
  onTactic: (t: TacticKey) => void;
  custom: FormationSlot[] | null;
  customOn: boolean;
  onCustom: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">Formação</span>
          <Button variant={customOn ? "primary" : "secondary"} size="sm" icon={<PencilRuler />} onClick={onEdit}>
            {custom ? "Editar personalizada" : "Criar personalizada"}
          </Button>
        </div>
        <FormationPicker value={formation} onChange={onFormation} custom={custom} customOn={customOn} onCustom={onCustom} />
        <p className="mt-1 text-xs text-mist">Trocar a formação escala o melhor time para o novo desenho. Na personalizada, você escolhe onde fica cada posição.</p>
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

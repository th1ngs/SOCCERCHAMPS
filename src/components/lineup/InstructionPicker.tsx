"use client";

import { LINE_OPTIONS, MARK_OPTIONS, PASS_OPTIONS, WIDTH_OPTIONS } from "@/game";
import type { InstructionOption, Instructions } from "@/game/types";
import { Segmented } from "@/components/ui/Segmented";

const GROUPS: { key: keyof Instructions; label: string; options: Record<string, InstructionOption> }[] = [
  { key: "width", label: "Por onde atacar", options: WIDTH_OPTIONS },
  { key: "pass", label: "Passes", options: PASS_OPTIONS },
  { key: "line", label: "Linha defensiva", options: LINE_OPTIONS },
  { key: "mark", label: "Marcação", options: MARK_OPTIONS },
];

/** As quatro instruções táticas, cada uma com a explicação da opção escolhida. */
export function InstructionPicker({ value, onChange }: { value: Instructions; onChange: (patch: Partial<Instructions>) => void }) {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const opts = g.options;
        const current = value[g.key];
        return (
          <div key={g.key}>
            <span className="mb-1.5 block text-sm font-semibold">{g.label}</span>
            <Segmented
              ariaLabel={g.label}
              size="sm"
              value={current as string}
              onChange={(v) => onChange({ [g.key]: v } as Partial<Instructions>)}
              options={Object.keys(opts).map((k) => ({ value: k, label: opts[k].name }))}
              className="w-full max-sm:flex sm:flex"
            />
            <p className="mt-1.5 text-xs text-mist" aria-live="polite">
              {opts[current as string]?.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { CircleAlert, CircleCheck, Lightbulb } from "lucide-react";
import { DEFAULT_INSTRUCTIONS, instructionAdvice, setInstructions, user } from "@/game";
import type { Instructions } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { InstructionPicker } from "./InstructionPicker";

const ICON = { good: CircleCheck, warn: CircleAlert, info: Lightbulb } as const;
const TONE = { good: "text-pitch-400", warn: "text-warn-400", info: "text-info-400" } as const;

/** Instruções táticas do time, com dicas do que combina com o elenco escalado. */
export function InstructionsPanel() {
  const { world, version, mutate } = useWorld();
  const u = user(world);
  const instr = u.instr ?? DEFAULT_INSTRUCTIONS;
  const advice = useMemo(
    () => instructionAdvice(world, u),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, u, version],
  );
  const change = (patch: Partial<Instructions>) => mutate((w) => setInstructions(w, patch));

  return (
    <>
      <InstructionPicker value={instr} onChange={change} />
      <ul className="mt-4 space-y-1.5 border-t border-white/8 pt-3" aria-label="Dicas para o seu elenco">
        {advice.map((a) => {
          const I = ICON[a.tone];
          return (
            <li key={a.text} className="flex items-start gap-2 text-xs">
              <I className={cn("mt-0.5 size-4 shrink-0", TONE[a.tone])} aria-hidden />
              <span>{a.text}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

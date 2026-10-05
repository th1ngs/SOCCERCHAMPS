"use client";

import { useState } from "react";
import { STATE_NAMES, competitionName, isStateCup, knockoutStatus, user } from "@/game";
import type { KnockoutId } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { CupView } from "./CupView";
import { TabStrip } from "./TabStrip";

/** Estaduais do Brasil: um seletor de estado (o do usuário primeiro) e a chave do escolhido. */
export function StatesView() {
  const { world: w } = useWorld();
  const u = user(w);
  const states = (Object.keys(w.cups).filter(isStateCup) as KnockoutId[]).sort((a, b) => {
    const mine = (c: KnockoutId) => (knockoutStatus(w, c, u.id) !== "out" ? 0 : 1);
    return mine(a) - mine(b) || (w.cups[b]?.entrants.length ?? 0) - (w.cups[a]?.entrants.length ?? 0) || a.localeCompare(b);
  });
  const [comp, setComp] = useState<KnockoutId | null>(null);
  const cur = comp && states.includes(comp) ? comp : states[0];
  if (!cur) return null;
  return (
    <div className="flex flex-col gap-4">
      <TabStrip
        items={states.map((c) => ({ value: c, label: `${c.slice(4)} • ${STATE_NAMES[c.slice(4)] ?? ""}`, mark: knockoutStatus(w, c, u.id) !== "out" }))}
        value={cur}
        onChange={setComp}
        ariaLabel="Estadual"
        size="sm"
      />
      <h3 className="font-display text-lg font-extrabold text-snow">{competitionName(cur)}</h3>
      <CupView key={cur} comp={cur} />
    </div>
  );
}

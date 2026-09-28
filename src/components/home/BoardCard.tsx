"use client";

import { Card, Meter } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { confidenceTone } from "./derive";

/** Confiança da diretoria no treinador e a meta da temporada. */
export function BoardCard() {
  const { world: w } = useWorld();
  const conf = Math.round(w.board.conf);
  const t = confidenceTone(conf);
  return (
    <Card title="Diretoria">
      <div className="flex items-center gap-4">
        <span className={cn("font-display text-6xl font-extrabold leading-none tabular", t.cls)}>
          {conf}<span className="text-3xl">%</span>
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">Confiança no treinador</span>
          <span className="block text-sm text-mist">Meta: {w.board.label}</span>
        </span>
      </div>
      <Meter value={conf} label="Confiança da diretoria" className="mt-4 h-2 w-full" />
      <p className="mt-3 text-sm text-mist">{t.text}</p>
    </Card>
  );
}

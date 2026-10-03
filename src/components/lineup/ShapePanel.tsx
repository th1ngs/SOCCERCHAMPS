"use client";

import { Check, RotateCcw, WandSparkles } from "lucide-react";
import { POS_NAME, SHAPE_LIMITS, SHAPE_LINES, lineOf, shapeLabel, type ShapeLine } from "@/game";
import type { FormationKey, FormationSlot, Position } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";

const LINES: ShapeLine[] = ["att", "mid", "def"];

/** Painel da formação personalizada: contagem por linha, função da posição selecionada e ações. */
export function ShapePanel({
  shape,
  base,
  selected,
  onRole,
  onDone,
  onReset,
  onAuto,
}: {
  shape: FormationSlot[];
  base: FormationKey;
  selected: number | null;
  onRole: (pos: Position) => void;
  onDone: () => void;
  onReset: () => void;
  onAuto: () => void;
}) {
  const count = (line: ShapeLine) => shape.slice(1).filter((s) => lineOf(s.x) === line).length;
  const sel = selected != null && selected > 0 ? shape[selected] : null;
  const line = sel ? lineOf(sel.x) : null;
  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-lg font-extrabold text-gold-400">{shapeLabel(shape)} personalizada</p>
        <p className="text-xs text-mist">
          Arraste as posições no campo entre as linhas e toque numa delas para escolher a função. Cada linha libera só as funções adequadas.
        </p>
      </div>

      <ul className="space-y-1.5">
        {LINES.map((l) => {
          const [lo, hi] = SHAPE_LIMITS[l];
          const n = count(l);
          return (
            <li key={l} className="flex items-center justify-between gap-2 rounded-lg bg-ink-950/50 px-2.5 py-1.5 text-sm ring-1 ring-inset ring-white/6">
              <span>
                <b className="text-snow">{SHAPE_LINES[l].label}</b> <span className="text-xs text-mist">{SHAPE_LINES[l].roles.join(", ")}</span>
              </span>
              <span className={cn("tabular text-xs", n < lo || n > hi ? "text-danger-400" : "text-mist")}>
                <b className="text-sm text-snow">{n}</b> ({lo}–{hi})
              </span>
            </li>
          );
        })}
      </ul>

      <div className="rounded-xl bg-ink-950/50 p-3 ring-1 ring-inset ring-white/6">
        {sel && line ? (
          <>
            <p className="mb-2 text-sm">
              Função na linha de <b className="text-snow">{SHAPE_LINES[line].label.toLowerCase()}</b>
            </p>
            <Segmented
              ariaLabel="Função da posição"
              size="sm"
              value={sel.pos}
              onChange={onRole}
              options={SHAPE_LINES[line].roles.map((r) => ({ value: r, label: r }))}
            />
            <p className="mt-1.5 text-xs text-mist">{POS_NAME[sel.pos]}. Mude a linha arrastando a posição no campo.</p>
          </>
        ) : (
          <p className="text-sm text-mist">Toque numa posição do campo para escolher a função dela.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" icon={<Check />} onClick={onDone}>
          Concluir
        </Button>
        <Button variant="secondary" size="sm" icon={<WandSparkles />} onClick={onAuto}>
          Escalar o melhor
        </Button>
        <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={onReset}>
          Recomeçar do {base}
        </Button>
      </div>
    </div>
  );
}

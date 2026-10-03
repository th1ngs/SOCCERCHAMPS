"use client";

import { useRef, useState, type PointerEvent } from "react";
import { SHAPE_LINES, lineOf, moveSlot, placeSlot, playerFit, shapeIssue, type ShapeLine } from "@/game";
import type { Club, FormationSlot, World } from "@/game/types";
import { cn } from "@/lib/cn";
import { surname } from "@/components/player/playerInfo";
import { fitTone } from "./lineupLogic";

/** Faixas do campo (x de 0 a 100, do próprio gol ao adversário) desenhadas por trás das posições. */
const BANDS: { line: ShapeLine; from: number; to: number; tone: string }[] = [
  { line: "def", from: 10, to: 33.5, tone: "bg-info-500/14" },
  { line: "mid", from: 33.5, to: 61.5, tone: "bg-gold-400/10" },
  { line: "att", from: 61.5, to: 88, tone: "bg-danger-500/12" },
];

type Drag = { i: number; id: number; x0: number; y0: number; moved: boolean };

/**
 * Editor da formação personalizada sobre o campo: arraste uma posição para mudá-la de lugar (dentro das faixas
 * de defesa, meio e ataque) e toque para selecioná-la e escolher a função. O goleiro fica fixo.
 */
export function ShapeEditor({
  world,
  club,
  shape,
  selected,
  onSelect,
  onChange,
}: {
  world: World;
  club: Club;
  shape: FormationSlot[];
  selected: number | null;
  onSelect: (i: number | null) => void;
  onChange: (shape: FormationSlot[]) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [draft, setDraft] = useState<{ shape: FormationSlot[]; ok: boolean; i: number; why?: string } | null>(null);
  const dragged = useRef(false);
  const shown = draft?.shape ?? shape;

  const at = (e: PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: 100 - 2 - ((e.clientY - r.top) / r.height) * 100, y: ((e.clientX - r.left) / r.width) * 100 };
  };

  const down = (i: number, e: PointerEvent<HTMLButtonElement>) => {
    if (i === 0 || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { i, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
    d.moved = true;
    const p = at(e);
    const next = moveSlot(shape, d.i, p.x, p.y);
    if (next) setDraft({ shape: next, ok: true, i: d.i });
    else {
      // Fora dos limites: mostra onde ficaria, em vermelho, e não salva.
      const bad = placeSlot(shape, d.i, p.x, p.y);
      if (bad) setDraft({ shape: bad, ok: false, i: d.i, why: shapeIssue(bad) ?? undefined });
    }
  };
  const up = (i: number, e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) {
      dragged.current = true;
      if (draft?.ok) onChange(draft.shape);
      setDraft(null);
      onSelect(i);
    }
  };

  return (
    <div ref={box} className="absolute inset-0 z-10 touch-none">
      {BANDS.map((b) => (
        <div key={b.line} className={cn("absolute inset-x-0 border-y border-dashed border-white/25", b.tone)} style={{ top: `${100 - b.to - 2}%`, height: `${b.to - b.from}%` }}>
          <span className="absolute left-1.5 top-1 rounded bg-black/40 px-1.5 text-[10px] font-bold uppercase tracking-wider text-white/85">
            {SHAPE_LINES[b.line].label} • {SHAPE_LINES[b.line].roles.join("/")}
          </span>
        </div>
      ))}
      {draft && !draft.ok && draft.why && (
        <p role="status" className="absolute inset-x-3 bottom-3 z-40 rounded-lg bg-danger-500/90 px-2 py-1 text-center text-xs font-semibold text-white shadow-lg">
          {draft.why}
        </p>
      )}
      {shown.map((s, i) => {
        const id = club.lineup[i];
        const p = id ? world.players[id] : null;
        const tone = p ? fitTone(playerFit(p, s.pos)) : "ok";
        const dragging = draft?.i === i;
        return (
          <button
            key={i}
            type="button"
            onPointerDown={(e) => down(i, e)}
            onPointerMove={move}
            onPointerUp={(e) => up(i, e)}
            onPointerCancel={() => { drag.current = null; setDraft(null); }}
            onClick={() => {
              if (dragged.current) { dragged.current = false; return; }
              if (i > 0) onSelect(selected === i ? null : i);
            }}
            aria-pressed={selected === i}
            aria-label={`${s.pos}${p ? `: ${p.name}` : ""}. ${i === 0 ? "Goleiro fixo" : `Linha: ${SHAPE_LINES[lineOf(s.x)].label}. Arraste para mover, toque para mudar a função`}`}
            style={{ left: `${s.y}%`, top: `${100 - s.x - 2}%` }}
            className={cn(
              "absolute z-10 flex w-[58px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl p-1 text-center sm:w-[70px]",
              i === 0 ? "cursor-default opacity-80" : "cursor-grab active:cursor-grabbing",
              dragging && "z-30 scale-110",
            )}
          >
            <span
              className={cn(
                "grid size-10 place-items-center rounded-full border-2 font-display text-xs font-extrabold shadow-[0_3px_8px_rgb(0_0_0/.45)] sm:size-11",
                dragging && !draft?.ok ? "border-danger-400 bg-danger-500 text-white" : selected === i ? "border-gold-200 bg-gold-400 text-ink-950" : "border-white/80 bg-ink-900/85 text-snow",
              )}
            >
              {s.pos}
            </span>
            {p && (
              <span className={cn("w-full truncate rounded bg-black/55 px-1 text-[11px] font-semibold leading-4", tone === "bad" ? "text-danger-400" : tone === "warn" ? "text-warn-400" : "text-snow")}>
                {surname(p.name)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

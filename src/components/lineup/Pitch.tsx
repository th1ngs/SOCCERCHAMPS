import type { PointerEvent } from "react";
import { FORMATIONS } from "@/game";
import type { Club, World } from "@/game/types";
import { PitchLines } from "./PitchLines";
import { PitchSlot } from "./PitchSlot";

/** Campo vertical com os 11 titulares posicionados pela formação. */
export function Pitch({ world, club, onPick, onDragStart, dropTarget, dragging }: { world: World; club: Club; onPick: (slot: number) => void; onDragStart: (index: number, event: PointerEvent) => void; dropTarget: string | null; dragging: boolean }) {
  const slots = FORMATIONS[club.formation];
  return (
    <div className="relative mx-auto aspect-[68/105] w-full max-w-[560px] overflow-hidden rounded-2xl shadow-card ring-1 ring-white/20">
      <PitchLines />
      <span className="absolute left-1/2 top-1.5 -translate-x-1/2 rounded bg-black/35 px-2 text-xs font-bold uppercase tracking-widest text-white/80">Ataque</span>
      {slots.map((s, i) => {
        const id = club.lineup[i];
        const p = id ? world.players[id] ?? null : null;
        return <PitchSlot key={`${club.formation}-${i}`} slot={s} player={p} colors={club.colors} captain={!!p && club.captain === p.id} onPick={() => onPick(i)} onPointerDown={(event) => onDragStart(i, event)} dropActive={dropTarget === `slot:${i}`} dragging={dragging} index={i} />;
      })}
    </div>
  );
}

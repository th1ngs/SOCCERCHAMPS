import type { PointerEvent } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { playerFit, slotOvr } from "@/game";
import type { FormationSlot, Player } from "@/game/types";
import { cn } from "@/lib/cn";
import { surname } from "@/components/player/playerInfo";
import { fitTone } from "./lineupLogic";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";

/** Uma posição no campo: camisa nas cores do clube, número, nome, posição/overall, condição e avisos. */
export function PitchSlot({
  slot,
  player: p,
  colors,
  captain,
  onPick,
  onPointerDown,
  dropActive,
  dragging,
  index,
}: {
  slot: FormationSlot;
  player: Player | null;
  colors: [string, string];
  captain: boolean;
  onPick: () => void;
  onPointerDown: (event: PointerEvent) => void;
  dropActive: boolean;
  dragging: boolean;
  index: number;
}) {
  const style = { left: `${slot.y}%`, top: `${100 - slot.x - 2}%` };
  const base =
    "absolute z-10 flex w-[62px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl p-1 text-center transition-transform focus-visible:outline-2 focus-visible:outline-gold-400 hover:z-20 hover:scale-105 sm:w-[78px]";

  if (!p) {
    return (
      <button type="button" data-lineup-target={`slot:${index}`} onClick={onPick} style={style} className={cn(base, dropActive && "bg-gold-400/35 ring-2 ring-gold-400 scale-110")} aria-label={`Vaga aberta (${slot.pos}): escolher jogador`}>
        <span className="grid size-9 place-items-center rounded-full border-2 border-dashed border-white/70 bg-black/20 sm:size-11">
          <Plus className="size-4" aria-hidden />
        </span>
        <span className="rounded bg-black/45 px-1 text-[11px] font-bold uppercase sm:text-xs">{slot.pos} • vaga</span>
      </button>
    );
  }

  const f = playerFit(p, slot.pos);
  const tone = fitTone(f);
  const eff = slotOvr(p, slot.pos);
  const lost = Math.round(p.ovr) - eff;
  const label = `${slot.pos}: ${p.name}, ${p.pos}, overall ${eff}${lost > 0 ? ` (fora de posição: ${Math.round(p.ovr)} − ${lost})` : ""}, condição ${Math.round(p.fitness)}%${captain ? ", capitão" : ""}. Trocar jogador`;

  return (
    <button type="button" data-lineup-target={`slot:${index}`} onClick={onPick} onPointerDown={onPointerDown} style={style} className={cn(base, "touch-none cursor-grab active:cursor-grabbing", dropActive && "bg-gold-400/35 ring-2 ring-gold-400 scale-110", dragging && "hover:scale-100")} aria-label={label} title={label}>
      <span className="relative">
        <span className="block rounded-full border-2 shadow-[0_3px_8px_rgb(0_0_0/.45)]" style={{ borderColor: colors[1], background: colors[0] }}>
          <PlayerAvatar player={p} size={40} />
        </span>
        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-ink-900 font-display text-xs font-bold text-snow ring-1 ring-white/30">{p.num || "–"}</span>
        {captain && (
          <span className="absolute -right-1.5 -top-1 grid size-[18px] place-items-center rounded-full bg-gold-400 font-display text-[11px] font-extrabold text-ink-950 ring-2 ring-ink-900" aria-hidden>
            C
          </span>
        )}
        {tone !== "ok" && (
          <span
            className={cn("absolute -left-2 -top-1 grid size-4 place-items-center rounded-full ring-2 ring-ink-900", tone === "bad" ? "bg-danger-500 text-white" : "bg-warn-400 text-ink-950")}
            aria-hidden
          >
            <TriangleAlert className="size-2.5" />
          </span>
        )}
      </span>
      <span className="w-full truncate rounded bg-black/55 px-1 text-xs font-semibold leading-4 sm:text-[13px]">{surname(p.name)}</span>
      <span className={cn("whitespace-nowrap text-xs font-bold leading-3.5 tabular drop-shadow sm:text-[13px]", tone === "bad" ? "text-danger-400" : tone === "warn" ? "text-warn-400" : "text-snow")}>
        {slot.pos} • {eff}
        {lost > 0 && <span className="ml-0.5 rounded bg-danger-500/85 px-0.5 text-[10px] text-white sm:text-[11px]">−{lost}</span>}
      </span>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-black/40" aria-hidden>
        <span className={cn("block h-full rounded-full", p.fitness < 55 ? "bg-danger-500" : p.fitness < 75 ? "bg-warn-400" : "bg-pitch-400")} style={{ width: `${Math.max(0, Math.min(100, p.fitness))}%` }} />
      </span>
    </button>
  );
}

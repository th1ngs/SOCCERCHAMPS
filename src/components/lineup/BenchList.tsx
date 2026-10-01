import type { PointerEvent } from "react";
import { Replace } from "lucide-react";
import type { Player } from "@/game/types";
import { EmptyState, Meter, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";

/** Banco de reservas: cada vaga abre a troca (ou recebe um titular arrastado). */
export function BenchList({ bench, onPick, onDragStart, dropTarget }: { bench: Player[]; onPick: (index: number) => void; onDragStart: (index: number, event: PointerEvent) => void; dropTarget: string | null }) {
  return (
    <>
      {bench.length === 0 ? (
        <EmptyState>Sem reservas disponíveis.</EmptyState>
      ) : (
        <ul className="space-y-1">
          {bench.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                data-lineup-target={`bench:${i}`}
                onClick={() => onPick(i)}
                onPointerDown={(event) => onDragStart(i, event)}
                aria-label={`Reserva ${p.name} (${p.pos}, ${Math.round(p.ovr)}): trocar`}
                className={`group flex min-h-11 w-full touch-none cursor-grab items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left ring-1 ring-inset transition-colors active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-gold-400 ${dropTarget === `bench:${i}` ? "bg-gold-400/20 ring-2 ring-gold-400" : "bg-ink-900/60 ring-white/6 hover:bg-ink-700"}`}
              >
                <PlayerAvatar player={p} size={28} />
                <PosBadge pos={p.pos} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                <Meter value={p.fitness} label={`Condição ${Math.round(p.fitness)}%`} className="w-10" />
                <OvrBadge value={p.ovr} />
                <Replace className="size-4 text-mist group-hover:text-snow max-sm:hidden" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

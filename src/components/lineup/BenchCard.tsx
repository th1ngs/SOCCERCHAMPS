import { Replace } from "lucide-react";
import type { Player } from "@/game/types";
import { Card, EmptyState, Meter, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { BENCH_SIZE } from "./lineupLogic";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";

/** Banco de reservas: cada vaga abre a troca. */
export function BenchCard({ bench, onPick }: { bench: Player[]; onPick: (index: number) => void }) {
  return (
    <Card title={`Banco de reservas (${bench.length}/${BENCH_SIZE})`}>
      {bench.length === 0 ? (
        <EmptyState>Sem reservas disponíveis.</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {bench.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-label={`Reserva ${p.name} (${p.pos}, ${Math.round(p.ovr)}): trocar`}
                className="group flex min-h-11 w-full items-center gap-3 rounded-xl bg-ink-900/60 px-3 py-2 text-left ring-1 ring-inset ring-white/6 transition-colors hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-gold-400"
              >
                <PlayerAvatar player={p} size={32} />
                <PosBadge pos={p.pos} />
                <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                <Meter value={p.fitness} label={`Condição ${Math.round(p.fitness)}%`} className="w-10" />
                <OvrBadge value={p.ovr} />
                <Replace className="size-4 text-mist group-hover:text-snow max-sm:hidden" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

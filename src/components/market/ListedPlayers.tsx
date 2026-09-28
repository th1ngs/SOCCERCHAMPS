"use client";

import { ChevronRight } from "lucide-react";
import { formatMoney } from "@/game";
import type { Player } from "@/game/types";
import { Card, EmptyState, OvrBadge, PosBadge } from "@/components/ui/primitives";

/** Jogadores do usuário na lista de transferências. */
export function ListedPlayers({ players, onOpen }: { players: { p: Player; value: number }[]; onOpen: (pid: string) => void }) {
  return (
    <Card title={`Seus jogadores à venda (${players.length})`}>
      {players.length === 0 ? (
        <EmptyState>Nenhum. Abra a ficha de um jogador do elenco e toque em “Colocar à venda” para receber propostas nas janelas.</EmptyState>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {players.map(({ p, value }) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-ink-900/60 px-3 py-2 text-left ring-1 ring-inset ring-white/6 transition-colors hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-gold-400"
              >
                <PosBadge pos={p.pos} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="text-xs text-mist tabular">Valor {formatMoney(value)}</span>
                </span>
                <OvrBadge value={p.ovr} />
                <ChevronRight className="size-4 text-mist" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

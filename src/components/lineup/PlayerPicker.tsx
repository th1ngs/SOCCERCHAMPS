"use client";

import { TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { fitTone, type Candidate } from "./lineupLogic";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";

/** Lista de jogadores aptos para uma vaga, do mais ao menos indicado. */
export function PlayerPicker({
  open,
  title,
  list,
  currentId,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  list: Candidate[];
  currentId: string | null;
  onPick: (pid: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-3 text-sm text-mist">O número à direita é o overall efetivo nesta vaga. Quem sair troca de lugar com o escolhido.</p>
      {list.length === 0 ? (
        <EmptyState>Nenhum jogador disponível.</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {list.map(({ p, score, fit, role }) => {
            const cur = p.id === currentId;
            const tone = fitTone(fit);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPick(p.id)}
                  disabled={cur}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
                    cur ? "cursor-default bg-gold-400/10 ring-gold-400/40" : "bg-ink-800 ring-white/8 hover:bg-ink-700",
                  )}
                >
                  <PlayerAvatar player={p} size={36} />
                  <PosBadge pos={p.pos} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-semibold">{p.name}</span>
                      {cur ? <Badge tone="gold">Atual</Badge> : role && <Badge tone={role === "TIT" ? "green" : "neutral"}>{role}</Badge>}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-mist">
                      cond. {Math.round(p.fitness)}%
                      {tone !== "ok" && (
                        <span className={cn("inline-flex items-center gap-1", tone === "bad" ? "text-danger-400" : "text-warn-400")}>
                          <TriangleAlert className="size-3" aria-hidden /> fora de posição
                        </span>
                      )}
                    </span>
                  </span>
                  <OvrBadge value={score} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

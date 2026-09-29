"use client";

import { useState } from "react";
import { Plane } from "lucide-react";
import { divisionName, formatMoney } from "@/game";
import type { Club, Player } from "@/game/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { pct } from "./derive";

export interface LoanOfferView {
  club: Club;
  wageShare: number;
  role: "titular" | "rotacao";
}

/** Emprestar um garoto: escolhe entre os clubes interessados (até 3) e confirma. */
export function LoanOutDialog({
  player,
  offers,
  onConfirm,
  onClose,
}: {
  player: Player | null;
  offers: LoanOfferView[];
  onConfirm: (clubId: string) => void;
  onClose: () => void;
}) {
  if (!player) return null;
  return <LoanOutBody key={player.id} player={player} offers={offers} onConfirm={onConfirm} onClose={onClose} />;
}

function LoanOutBody({ player: p, offers, onConfirm, onClose }: { player: Player; offers: LoanOfferView[]; onConfirm: (clubId: string) => void; onClose: () => void }) {
  const [pick, setPick] = useState<string | null>(() => offers.find((o) => o.role === "titular")?.club.id ?? offers[0]?.club.id ?? null);
  const chosen = offers.find((o) => o.club.id === pick) ?? null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Emprestar ${p.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon={<Plane />} disabled={!chosen} title={chosen ? undefined : "Escolha um clube"} onClick={() => chosen && onConfirm(chosen.club.id)}>
            {chosen ? `Emprestar ao ${chosen.club.short}` : "Emprestar"}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-ink-900/55 px-3 py-2 ring-1 ring-inset ring-white/6">
        <PosBadge pos={p.pos} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {p.name} <span className="font-normal text-mist">• {p.age} anos</span>
        </span>
        <OvrBadge value={p.ovr} />
      </div>
      <p className="mb-3 text-sm text-mist">
        Emprestado até o fim da temporada, ele joga por outro clube e não ocupa vaga no elenco. Como titular, evolui mais rápido. Você pode chamá-lo de volta com a janela aberta.
      </p>
      {offers.length ? (
        <div role="radiogroup" aria-label="Clubes interessados" className="space-y-2">
          {offers.map((o) => {
            const on = o.club.id === pick;
            const wage = Math.round(p.wage * o.wageShare);
            return (
              <button
                key={o.club.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPick(o.club.id)}
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
                  on ? "bg-gold-400/10 ring-gold-400/70" : "bg-ink-800 ring-white/8 hover:bg-white/5",
                )}
              >
                <Crest club={o.club} size={34} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{o.club.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-mist">
                    <Flag code={o.club.league} decorative />
                    <span className="truncate">{divisionName(o.club.div)}</span>
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={o.role === "titular" ? "green" : "neutral"}>{o.role === "titular" ? "Titular" : "Rotação"}</Badge>
                  <span className="text-xs text-mist tabular" title={`Salário semanal pago pelo ${o.club.short}: ${formatMoney(wage)}`}>
                    Paga {pct(o.wageShare)} do salário
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState>Nenhum clube interessado em {p.name} agora. Tente de novo mais tarde.</EmptyState>
      )}
    </Modal>
  );
}

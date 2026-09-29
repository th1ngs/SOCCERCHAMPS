"use client";

import { useMemo } from "react";
import { BellRing, FileText, X } from "lucide-react";
import { formatMoney, toggleWatch } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Badge, EmptyState, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { contractText } from "@/components/player/playerInfo";
import { ClubLabel } from "./ClubLabel";
import { rangeText, watchRows } from "./transferDerive";

/** Lista de observação: contrato, lista de venda, multa × caixa, potencial e última novidade. */
export function WatchlistTab({ onOpen }: { onOpen: (pid: string) => void }) {
  const { world, version, mutate } = useWorld();
  const toast = useToast();
  const rows = useMemo(
    () => watchRows(world),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, version],
  );

  if (!rows.length) {
    return (
      <EmptyState>
        Nenhum jogador observado. Toque na estrela de um jogador em “Buscar” ou na ficha para acompanhar contrato, lista de venda e multa. Você recebe um aviso quando algo mudar.
      </EmptyState>
    );
  }

  const remove = (pid: string, name: string) => {
    mutate((w) => void toggleWatch(w, pid));
    toast(`${name} saiu da lista de observação.`);
  };

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => {
        const { p } = r;
        const lastYear = !!r.club && p.contract <= 1;
        return (
          <li key={p.id} className="flex min-w-0 flex-col rounded-(--radius-card) bg-ink-800 p-4 shadow-card ring-1 ring-inset ring-white/8">
            <div className="flex items-start gap-3">
              <OvrBadge value={p.ovr} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <PosBadge pos={p.pos} />
                  <span className="truncate font-semibold">{p.name}</span>
                </p>
                <p className="mt-1 flex min-w-0 text-xs text-mist">
                  <ClubLabel club={r.club} flag empty="Sem clube (livre)" />
                  <span className="ml-1 shrink-0">• {p.age} anos</span>
                </p>
              </div>
              <Button variant="ghost" size="icon" icon={<X />} aria-label={`Remover ${p.name} da lista`} title="Remover da lista" onClick={() => remove(p.id, p.name)} />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-mist">Contrato</dt>
                <dd className={lastYear ? "font-semibold text-warn-400" : "font-semibold"}>{r.club ? (lastYear ? "Último ano" : contractText(p.contract)) : "Livre"}</dd>
              </div>
              <div>
                <dt className="text-xs text-mist">Potencial</dt>
                <dd className="font-display font-bold tabular">{rangeText(r.range)}</dd>
              </div>
              <div>
                <dt className="text-xs text-mist">Multa rescisória</dt>
                <dd className="font-semibold tabular">{r.clause ? formatMoney(r.clause) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-mist">Situação</dt>
                <dd className="flex flex-wrap gap-1">
                  {p.listed && <Badge tone="orange">À venda</Badge>}
                  {r.affordable && <Badge tone="green">Multa no caixa</Badge>}
                  {r.scoutLevel >= 2 && <Badge tone="blue">Relatório</Badge>}
                  {!p.listed && !r.affordable && r.scoutLevel < 2 && <span className="text-mist">—</span>}
                </dd>
              </div>
            </dl>

            <p className="mt-3 flex min-w-0 items-start gap-2 rounded-lg bg-ink-900/60 px-2.5 py-2 text-xs text-mist">
              <BellRing className="mt-0.5 size-3.5 shrink-0 text-gold-400" aria-hidden />
              <span className="min-w-0">{r.last ? `${r.last.text} (T${r.last.season}, sem. ${r.last.week})` : "Sem novidades desde que você começou a observar."}</span>
            </p>

            <div className="mt-3 flex flex-1 items-end justify-end">
              <Button variant="secondary" icon={<FileText />} onClick={() => onOpen(p.id)}>
                Ver ficha
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

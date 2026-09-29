"use client";

import { useMemo } from "react";
import { Handshake, Send } from "lucide-react";
import { clubPlayers, formatMoney, user, valueOf, windowOpen } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Meter, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { ClubLabel } from "./ClubLabel";
import { ListedPlayers } from "./ListedPlayers";
import { OfferActions } from "./OfferActions";
import { PATIENCE_MAX, negotiationRows } from "./transferDerive";

/** Negociações em andamento (compra), propostas recebidas (venda) e jogadores à venda. */
export function NegotiationsTab({ onOpen }: { onOpen: (pid: string) => void }) {
  const { world, version } = useWorld();
  const data = useMemo(() => {
    const u = user(world);
    return {
      rows: negotiationRows(world),
      offers: world.inbox.filter((m) => m.offer && !m.offer.done && !m.offer.expired && world.players[m.offer.pid]?.clubId === world.userClub),
      listed: clubPlayers(world, u)
        .filter((p) => p.listed)
        .map((p) => ({ p, value: valueOf(p) })),
      open: windowOpen(world),
    };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, version]);

  return (
    <div className="space-y-4">
      <Card title={`Compras em negociação (${data.rows.length})`}>
        {data.rows.length === 0 ? (
          <EmptyState>Nenhuma negociação aberta. Abra a ficha de um jogador e toque em “Fazer proposta”.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {data.rows.map((r) => {
              const agreed = !!r.agreed;
              const cooling = r.cooldownUntil != null;
              return (
                <li key={r.p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-900/60 px-3 py-2.5 ring-1 ring-inset ring-white/6">
                  <PosBadge pos={r.p.pos} />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-semibold">{r.p.name}</p>
                    <p className="flex min-w-0 text-xs text-mist">
                      <ClubLabel club={r.club} />
                    </p>
                  </div>
                  <OvrBadge value={r.p.ovr} />
                  <div className="min-w-0 basis-40 text-xs">
                    {agreed ? (
                      <Badge tone="green">Acordo: {formatMoney(r.agreed?.fee ?? 0)}</Badge>
                    ) : cooling ? (
                      <Badge tone="red">Encerrada até a sem. {r.cooldownUntil}</Badge>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Meter value={(r.patience / PATIENCE_MAX) * 100} label={`Paciência ${r.patience} de ${PATIENCE_MAX}`} className="w-16" />
                        <span className="text-mist">
                          Paciência {r.patience}/{PATIENCE_MAX}
                        </span>
                      </span>
                    )}
                    <p className="mt-1 text-mist">
                      {r.lastFee ? `Última: ${formatMoney(r.lastFee)}` : "Sem proposta"} • T{r.season}, sem. {r.week}
                    </p>
                  </div>
                  <Button
                    variant={agreed ? "primary" : "secondary"}
                    icon={agreed ? <Handshake /> : <Send />}
                    onClick={() => onOpen(r.p.id)}
                    disabled={cooling}
                    title={cooling ? `O clube só volta a negociar na semana ${r.cooldownUntil}` : undefined}
                  >
                    {agreed ? "Fechar contrato" : "Negociar"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {!data.open && data.rows.length > 0 && <p className="mt-2 text-xs text-mist">Com a janela fechada, as negociações ficam paradas até a próxima abertura.</p>}
      </Card>

      <Card title={`Propostas recebidas (${data.offers.length})`}>
        {data.offers.length === 0 ? (
          <EmptyState>Nenhuma proposta pendente. Coloque jogadores à venda para atrair ofertas nas janelas.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {data.offers.map((m) => {
              const o = m.offer!;
              const p = world.players[o.pid];
              return (
                <li key={m.id} className="rounded-xl bg-ink-900/60 px-3 py-3 ring-1 ring-inset ring-white/6">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    {p && <PosBadge pos={p.pos} />}
                    <b className="min-w-0 truncate">{p?.name}</b>
                    <span className="text-mist">←</span>
                    <ClubLabel club={world.clubs[o.club]} flag />
                  </p>
                  <OfferActions msgId={m.id} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ListedPlayers players={data.listed} onOpen={onOpen} />
    </div>
  );
}

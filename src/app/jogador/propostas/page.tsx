"use client";

import { Check, X } from "lucide-react";
import { ROLE_NAME, acceptCareerOffer, career, careerPlayer, declineCareerOffer, divisionFullName, formatMoney, toggleTransferRequest, windowOpen } from "@/game";
import { windowText } from "@/components/home/derive";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Badge, Card, EmptyState, KV } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";

const KIND = { transfer: "Transferência", free: "Contrato (sem clube)", renew: "Renovação" } as const;

/** Propostas de clubes, renovação e pedido de transferência. */
export default function CareerOffersPage() {
  const { world: w, mutate, setOverlay } = useWorld();
  const toast = useToast();
  const c = career(w);
  const p = careerPlayer(w);
  if (!c || !p) return null;
  const open = windowOpen(w);

  const accept = (id: number) => {
    let r: ReturnType<typeof acceptCareerOffer> = { ok: false };
    const o = c.offers.find((x) => x.id === id);
    const from = p.clubId;
    mutate((x) => { r = acceptCareerOffer(x, id); });
    if (!r.ok) return toast(r.reason ?? "Não foi possível aceitar.", "bad");
    if (o && o.kind !== "renew") setOverlay({ kind: "signing", pid: p.id, how: o.kind === "free" ? "free" : "transfer", fee: o.fee, from });
    else toast("Contrato renovado!", "good");
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold uppercase italic">Propostas</h1>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-2">
          {c.offers.length === 0 && (
            <EmptyState>
              {p.clubId ? (open ? "Nenhuma proposta por enquanto. Jogue bem (ou peça para ser negociado) para chamar a atenção." : `Mercado fechado: ${windowText(w)}.`) : "As propostas chegam a cada semana."}
            </EmptyState>
          )}
          {c.offers.map((o) => {
            const club = w.clubs[o.club];
            if (!club) return null;
            return (
              <Card key={o.id} className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Crest club={club} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-xl font-bold uppercase">{club.name}</p>
                    <p className="text-xs text-mist">{divisionFullName(club.div)}</p>
                  </div>
                  <Badge tone={o.kind === "renew" ? "green" : "neutral"}>{KIND[o.kind]}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 sm:grid-cols-4">
                  <KV label="Papel">{ROLE_NAME[o.role]}</KV>
                  <KV label="Salário">{formatMoney(o.wage)}/sem</KV>
                  <KV label="Contrato">{o.years} anos</KV>
                  <KV label="Taxa">{o.fee ? formatMoney(o.fee) : "—"}</KV>
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" size="sm" icon={<X />} onClick={() => mutate((x) => declineCareerOffer(x, o.id))}>Recusar</Button>
                  <Button variant="primary" size="sm" icon={<Check />} onClick={() => accept(o.id)} disabled={o.kind === "transfer" && !open}>Aceitar</Button>
                </div>
              </Card>
            );
          })}
        </div>
        <Card title="Mercado">
          <KV label="Janela">{windowText(w)}</KV>
          <KV label="Pedido de transferência">{c.wantsOut ? "Sim" : "Não"}</KV>
          <p className="mt-2 text-xs text-mist">
            Pedir para sair atrai mais clubes na janela, mas o técnico perde um pouco da confiança em você. Propostas expiram em duas semanas.
          </p>
          {p.clubId && (
            <Button variant="secondary" block className="mt-3" onClick={() => { let on = false; mutate((x) => { on = toggleTransferRequest(x); }); toast(on ? "Pedido de transferência feito." : "Pedido retirado."); }}>
              {c.wantsOut ? "Retirar pedido" : "Pedir para ser negociado"}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}

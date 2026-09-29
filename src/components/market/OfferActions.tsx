"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, HandCoins, Send, X } from "lucide-react";
import { acceptOffer, counterOffer, ensureLineup, formatMoney, user, valueOf, windowOpen } from "@/game";
import type { CounterOfferResult, Message, World } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Alert } from "@/components/ui/primitives";
import { feeFromMillions, toMillions, windowClosedReason } from "@/components/player/playerInfo";
import { cn } from "@/lib/cn";

type OfferStatus = "pending" | "closed" | "accepted" | "expired" | "declined" | "walkout" | "gone";

function statusOf(w: World, m: Message): OfferStatus | null {
  const o = m.offer;
  if (!o) return null;
  if (o.accepted) return "accepted";
  if (o.walkout) return "walkout";
  if (o.expired) return "expired";
  if (o.done) return "declined";
  const p = w.players[o.pid];
  if (!p || p.clubId !== w.userClub) return "gone";
  return windowOpen(w) ? "pending" : "closed";
}

const STATUS_TEXT: Record<Exclude<OfferStatus, "pending" | "closed">, string> = {
  accepted: "Proposta aceita: negócio concluído.",
  walkout: "O clube desistiu depois da sua contraproposta.",
  expired: "Proposta expirada.",
  declined: "Proposta recusada.",
  gone: "O jogador não está mais no clube.",
};

/** Multiplicadores da contraproposta sobre a oferta recebida. */
const QUICK = [1.1, 1.2, 1.35, 1.5];

/**
 * Ações de uma proposta recebida (elenco ou base): aceitar (com confirmação), contraproposta com valor e atalhos, ou recusar.
 * Uso: `<OfferActions msgId={m.id} />` dentro da mensagem da caixa de entrada.
 */
export function OfferActions({ msgId }: { msgId: number }) {
  const { world, mutate } = useWorld();
  const toast = useToast();
  const [countering, setCountering] = useState(false);
  const [amount, setAmount] = useState("");
  const [reply, setReply] = useState<CounterOfferResult | null>(null);
  const [confirming, setConfirming] = useState(false);

  const m = world.inbox.find((x) => x.id === msgId);
  const o = m?.offer;
  if (!m || !o) return null;
  const st = statusOf(world, m);
  const p = world.players[o.pid];
  const buyer = world.clubs[o.club];
  const name = p?.name ?? "o jogador";

  if (st !== "pending" && st !== "closed") {
    return (
      <div className="mt-3 space-y-2">
        {reply && (
          <Alert tone={reply.status === "accepted" ? "good" : "bad"}>
            <span role="status">{reply.text}</span>
          </Alert>
        )}
        <p className={cn("flex items-center gap-2 text-sm", st === "accepted" ? "text-pitch-400" : "text-mist")}>
          {st === "accepted" && <Check className="size-4" aria-hidden />}
          {st ? STATUS_TEXT[st] : null}
        </p>
      </div>
    );
  }

  const closedReason = st === "closed" ? windowClosedReason(world) : null;
  const value = p ? valueOf(p) : o.fee;
  const fee = feeFromMillions(amount);

  const doAccept = () => {
    let ok = false;
    const price = o.fee;
    mutate((w) => {
      const msg = w.inbox.find((x) => x.id === msgId);
      if (msg && acceptOffer(w, msg)) {
        msg.read = true;
        ensureLineup(w, user(w));
        ok = true;
      }
    });
    setConfirming(false);
    toast(ok ? `${name} vendido ao ${buyer?.name ?? "clube"} por ${formatMoney(price)}.` : "Não foi possível concluir a venda.", ok ? "good" : "bad");
  };

  const doDecline = () => {
    mutate((w) => {
      const msg = w.inbox.find((x) => x.id === msgId);
      if (msg?.offer) msg.offer.done = true;
      if (msg) msg.read = true;
    });
    toast(`Proposta do ${buyer?.name ?? "clube"} recusada.`);
  };

  const openCounter = () => {
    setCountering(true);
    setReply(null);
    setAmount(toMillions(Math.max(o.fee * 1.2, value)));
  };

  const doCounter = () => {
    let r: CounterOfferResult | null = null;
    mutate((w) => {
      r = counterOffer(w, msgId, fee);
      if (r.status === "accepted") ensureLineup(w, user(w));
      const msg = w.inbox.find((x) => x.id === msgId);
      if (msg) msg.read = true;
    });
    const res = r as CounterOfferResult | null;
    setReply(res);
    if (!res) return;
    if (res.status === "accepted") toast(`${name} vendido por ${formatMoney(res.fee ?? fee)}.`, "good");
    else if (res.status === "improved") {
      setCountering(false);
      toast(res.text);
    } else toast(res.text, "bad");
  };

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-mist">
        {o.youth ? "Proposta por um garoto da base. " : ""}Oferta atual: <b className="text-snow">{formatMoney(o.fee)}</b> • valor de mercado {formatMoney(value)}
        {o.expires ? ` • vale até a semana ${o.expires}` : ""}.
      </p>

      {reply?.status === "improved" && (
        <Alert tone="info" className="animate-pop">
          <span role="status">{reply.text}</span>
        </Alert>
      )}

      {countering && (
        <form
          className="space-y-2 rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6"
          onSubmit={(e) => {
            e.preventDefault();
            if (fee > 0 && !closedReason) doCounter();
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Sua contraproposta (R$ milhões)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.05}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 w-full rounded-xl bg-ink-950/70 px-3 font-display text-xl font-bold tabular ring-1 ring-inset ring-white/12 focus:outline-2 focus:outline-gold-400"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Atalhos sobre a oferta recebida">
            {QUICK.map((f) => {
              const v = toMillions(o.fee * f);
              const on = amount === v;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAmount(v)}
                  aria-pressed={on}
                  className={cn(
                    "h-10 min-w-16 rounded-lg px-3 font-display text-sm font-bold tabular ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
                    on ? "bg-gold-400 text-ink-950 ring-gold-400" : "text-mist ring-white/12 hover:bg-white/6 hover:text-snow",
                  )}
                >
                  +{Math.round((f - 1) * 100)}%
                </button>
              );
            })}
          </div>
          <p className="text-xs text-mist">Pedir demais pode fazer o clube desistir. Até um certo limite, ele aceita ou melhora a oferta.</p>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {closedReason && <span className="text-xs text-mist">{closedReason}</span>}
        <Button variant={countering ? "secondary" : "primary"} icon={<HandCoins />} onClick={() => setConfirming(true)} disabled={!!closedReason} title={closedReason ?? undefined}>
          Aceitar {formatMoney(o.fee)}
        </Button>
        {countering ? (
          <Button variant="primary" icon={<Send />} onClick={doCounter} disabled={!!closedReason || fee <= 0} title={closedReason ?? (fee <= 0 ? "Digite um valor" : undefined)}>
            Enviar contraproposta • {formatMoney(fee)}
          </Button>
        ) : (
          <Button variant="secondary" icon={<ArrowLeftRight />} onClick={openCounter} disabled={!!closedReason} title={closedReason ?? undefined}>
            Fazer contraproposta
          </Button>
        )}
        <Button variant="ghost" icon={<X />} onClick={doDecline}>
          Recusar
        </Button>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Vender ${name}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="primary" icon={<HandCoins />} onClick={doAccept}>
              Vender • {formatMoney(o.fee)}
            </Button>
          </>
        }
      >
        <p className="text-sm text-mist">
          {name} deixa o clube e vai para o {buyer?.name ?? "comprador"}. {formatMoney(o.fee)} entram no caixa agora.
        </p>
      </Modal>
    </div>
  );
}

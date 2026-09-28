"use client";

import { useState } from "react";
import { CheckCheck, HandCoins } from "lucide-react";
import { acceptOffer, ensureLineup, formatMoney, user } from "@/game";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useWorld } from "@/components/game/GameProvider";
import { MessageItem } from "./MessageItem";
import { offerState } from "./offers";

/** Id da mensagem pedida pelo painel (`#m-12`). */
function hashMessage(): number | null {
  if (typeof window === "undefined") return null;
  const hit = /^#m-(\d+)$/.exec(window.location.hash);
  return hit ? Number(hit[1]) : null;
}

/** Caixa de entrada: mensagens da diretoria, DM, base, mercado e propostas por jogadores. */
export function InboxScreen() {
  const { world: w, mutate } = useWorld();
  const toast = useToast();
  const [openId, setOpenId] = useState<number | null>(hashMessage);
  const [selling, setSelling] = useState<number | null>(null);
  const unread = w.inbox.filter((m) => !m.read).length;

  const toggle = (id: number) => {
    mutate((x) => {
      const m = x.inbox.find((y) => y.id === id);
      if (m) m.read = true;
    });
    setOpenId((cur) => (cur === id ? null : id));
  };

  const readAll = () => mutate((x) => x.inbox.forEach((m) => (m.read = true)));

  const decline = (id: number) =>
    mutate((x) => {
      const m = x.inbox.find((y) => y.id === id);
      if (m?.offer) m.offer.done = true;
      if (m) m.read = true;
    });

  const sellMsg = selling !== null ? w.inbox.find((m) => m.id === selling) : undefined;
  const sellPlayer = sellMsg?.offer ? w.players[sellMsg.offer.pid] : undefined;
  const buyer = sellMsg?.offer ? w.clubs[sellMsg.offer.club] : undefined;

  const confirmSale = () => {
    if (!sellMsg?.offer || !sellPlayer) return setSelling(null);
    const { fee } = sellMsg.offer;
    const name = sellPlayer.name;
    let ok = false;
    mutate((x) => {
      const m = x.inbox.find((y) => y.id === sellMsg.id);
      if (m && acceptOffer(x, m)) {
        ensureLineup(x, user(x));
        ok = true;
      }
    });
    setSelling(null);
    toast(ok ? `${name} vendido por ${formatMoney(fee)}.` : "Não foi possível concluir a venda.", ok ? "good" : "bad");
  };

  return (
    <>
      <PageHeader
        title="Mensagens"
        subtitle={unread ? `${unread} não lida(s).` : "Tudo lido."}
        actions={
          unread > 0 && (
            <Button variant="ghost" icon={<CheckCheck />} onClick={readAll}>
              Marcar todas como lidas
            </Button>
          )
        }
      />
      {w.inbox.length ? (
        <ul className="flex flex-col gap-2">
          {w.inbox.map((m) => (
            <MessageItem
              key={m.id}
              m={m}
              open={openId === m.id || offerState(w, m) === "pending"}
              onToggle={() => toggle(m.id)}
              onAccept={() => setSelling(m.id)}
              onDecline={() => decline(m.id)}
            />
          ))}
        </ul>
      ) : (
        <EmptyState>Caixa vazia.</EmptyState>
      )}

      <Modal
        open={!!sellMsg && !!sellPlayer}
        onClose={() => setSelling(null)}
        title={sellPlayer ? `Vender ${sellPlayer.name}?` : "Vender jogador?"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelling(null)}>Cancelar</Button>
            <Button variant="danger" icon={<HandCoins />} onClick={confirmSale}>
              Vender por {formatMoney(sellMsg?.offer?.fee ?? 0)}
            </Button>
          </>
        }
      >
        <p className="text-sm text-mist">
          {buyer?.name ?? "O clube interessado"} paga <b className="text-snow">{formatMoney(sellMsg?.offer?.fee ?? 0)}</b>.{" "}
          {sellPlayer?.name} deixa o elenco imediatamente e a escalação é ajustada automaticamente. A venda não pode ser desfeita.
        </p>
      </Modal>
    </>
  );
}

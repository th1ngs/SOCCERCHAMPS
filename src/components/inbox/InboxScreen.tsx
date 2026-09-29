"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
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
  const [openId, setOpenId] = useState<number | null>(hashMessage);
  const unread = w.inbox.filter((m) => !m.read).length;

  const toggle = (id: number) => {
    mutate((x) => {
      const m = x.inbox.find((y) => y.id === id);
      if (m) m.read = true;
    });
    setOpenId((cur) => (cur === id ? null : id));
  };

  const readAll = () => mutate((x) => x.inbox.forEach((m) => (m.read = true)));

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
            />
          ))}
        </ul>
      ) : (
        <EmptyState>Caixa vazia.</EmptyState>
      )}

    </>
  );
}

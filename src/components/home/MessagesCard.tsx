"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, EmptyState } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { kindStyle } from "@/components/inbox/kinds";
import { cn } from "@/lib/cn";

/** Últimas 4 mensagens; tocar marca como lida e abre a caixa de entrada nela. */
export function MessagesCard() {
  const { world: w, mutate } = useWorld();
  const router = useRouter();
  const unread = w.inbox.filter((m) => !m.read).length;

  const open = (id: number) => {
    mutate((x) => {
      const m = x.inbox.find((y) => y.id === id);
      if (m) m.read = true;
    });
    router.push(`/jogo/mensagens#m-${id}`);
  };

  return (
    <Card
      title={unread ? `Mensagens • ${unread} nova(s)` : "Mensagens"}
      action={<Link href="/jogo/mensagens" className="text-sm font-semibold text-gold-400 underline-offset-2 hover:underline">Ver todas</Link>}
    >
      {w.inbox.length ? (
        <ul className="-mx-2 flex flex-col">
          {w.inbox.slice(0, 4).map((m) => {
            const k = kindStyle(m.kind);
            const Icon = k.icon;
            return (
              <li key={m.id}>
                <button type="button" onClick={() => open(m.id)} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/6">
                  <Icon className={cn("size-4 shrink-0", k.text)} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm", m.read ? "text-snow/80" : "font-semibold text-snow")}>{m.title}</span>
                    <span className="block text-xs text-mist">T{m.season} • sem. {m.week}</span>
                  </span>
                  {!m.read && <span className="size-2 shrink-0 rounded-full bg-danger-500" aria-label="Não lida" />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState>Nenhuma mensagem.</EmptyState>
      )}
    </Card>
  );
}

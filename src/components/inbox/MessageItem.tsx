"use client";

import { Check, ChevronDown, HandCoins, X } from "lucide-react";
import { formatMoney } from "@/game";
import type { Message } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { kindStyle } from "./kinds";
import { OFFER_TEXT, offerState } from "./offers";

export interface MessageItemProps {
  m: Message;
  open: boolean;
  onToggle: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

/** Uma mensagem: cabeçalho clicável e corpo expandido com as ações de proposta. */
export function MessageItem({ m, open, onToggle, onAccept, onDecline }: MessageItemProps) {
  const { world: w } = useWorld();
  const k = kindStyle(m.kind);
  const Icon = k.icon;
  const state = offerState(w, m);
  const bodyId = `m-${m.id}-body`;

  return (
    <li id={`m-${m.id}`} className="relative scroll-mt-32 overflow-hidden rounded-xl bg-ink-800 shadow-card ring-1 ring-inset ring-white/8">
      <span className={cn("absolute inset-y-0 left-0 w-1", k.bar, m.read && "opacity-40")} aria-hidden />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex min-h-14 w-full items-center gap-3 py-2.5 pl-4 pr-3 text-left hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-400 sm:pl-5"
      >
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg bg-ink-950/50", k.text)}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate", m.read ? "text-snow/80" : "font-semibold text-snow")}>{m.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-mist">
            <span>{k.label}</span>
            <span aria-hidden>•</span>
            <span>Temporada {m.season}, semana {m.week}</span>
            {state === "pending" && <Badge tone="orange">Aguardando resposta</Badge>}
          </span>
        </span>
        {!m.read && <span className="size-2.5 shrink-0 rounded-full bg-danger-500" aria-label="Não lida" />}
        <ChevronDown className={cn("size-4 shrink-0 text-mist transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div id={bodyId} className="border-t border-white/6 py-3 pl-4 pr-4 sm:pl-[68px]">
          <p className="whitespace-pre-line text-sm leading-relaxed text-snow/90">{m.body}</p>
          {m.offer && state === "pending" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" icon={<HandCoins />} onClick={onAccept}>
                Aceitar {formatMoney(m.offer.fee)}
              </Button>
              <Button variant="ghost" icon={<X />} onClick={onDecline}>
                Recusar
              </Button>
            </div>
          )}
          {state && state !== "pending" && (
            <p className={cn("mt-3 flex items-center gap-2 text-sm", state === "accepted" ? "text-pitch-400" : "text-mist")}>
              {state === "accepted" && <Check className="size-4" aria-hidden />}
              {OFFER_TEXT[state]}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

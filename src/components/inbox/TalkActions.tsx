"use client";

import { MessageCircle } from "lucide-react";
import { answerTalk } from "@/game";
import type { Talk } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useWorld } from "@/components/game/GameProvider";

/** Respostas de uma conversa com um jogador (ou o resultado, se já respondida). */
export function TalkActions({ msgId, talk }: { msgId: number; talk: Talk }) {
  const { mutate } = useWorld();
  const toast = useToast();

  if (talk.answer) {
    return (
      <Alert tone={talk.answer === "ignored" ? "warn" : "info"} className="mt-3">
        <MessageCircle className="size-4 shrink-0 text-info-400" aria-hidden />
        <span>{talk.result}</span>
      </Alert>
    );
  }

  const answer = (key: string) => {
    let res = { ok: false, text: "" };
    mutate((w) => {
      res = answerTalk(w, msgId, key);
    });
    toast(res.text, res.ok ? "good" : "bad");
  };

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      {talk.options.map((o) => (
        <Button key={o.key} variant="secondary" onClick={() => answer(o.key)} className="h-auto! min-h-14 flex-col items-start! gap-0.5 whitespace-normal! py-2 text-left">
          <span>{o.label}</span>
          <span className="font-sans text-xs font-normal normal-case tracking-normal text-mist">{o.hint}</span>
        </Button>
      ))}
    </div>
  );
}

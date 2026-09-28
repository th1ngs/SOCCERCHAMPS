"use client";

import Link from "next/link";
import { formatMoney, user } from "@/game";
import { Card, KV, Meter } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { weeklyWages, windowText } from "./derive";

/** Resumo financeiro: saldo, folha, estádio, janela, torcida e empréstimo. */
export function FinanceCard() {
  const { world: w } = useWorld();
  const u = user(w);
  return (
    <Card
      title="Finanças"
      action={<Link href="/jogo/clube" className="text-sm font-semibold text-gold-400 underline-offset-2 hover:underline">Ver clube</Link>}
    >
      <KV label="Saldo"><span className={u.money < 0 ? "text-danger-400" : ""}>{formatMoney(u.money)}</span></KV>
      <KV label="Folha salarial">{formatMoney(weeklyWages(w))}/sem</KV>
      <KV label="Estádio">{u.cap.toLocaleString("pt-BR")} lugares</KV>
      <KV label="Janela">{windowText(w)}</KV>
      <KV label="Torcida">
        <span className="inline-flex items-center gap-2">
          <Meter value={u.fans} label="Humor da torcida" /> {Math.round(u.fans)}%
        </span>
      </KV>
      {u.loan && (
        <KV label="Empréstimo">
          <span className="text-warn-400">{formatMoney(u.loan.weekly)}/sem • {u.loan.weeksLeft} sem.</span>
        </KV>
      )}
    </Card>
  );
}

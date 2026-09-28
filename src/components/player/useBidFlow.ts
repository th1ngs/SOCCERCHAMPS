"use client";

import { useState } from "react";
import { SQUAD_MAX, completeBuy, evaluateBid, formatMoney, user, valueOf, wageDemand } from "@/game";
import type { BidResult } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { useToast } from "@/components/ui/Toast";
import { feeFromMillions, toMillions } from "./playerInfo";

export interface BidOutcome {
  result: BidResult;
  /** Valor oferecido que gerou o resultado. */
  fee: number;
}

/** Acordo que pode ser fechado a partir do resultado da proposta. */
export interface BidDeal {
  fee: number;
  wage: number;
  counter: boolean;
}

/** Fluxo de proposta por um jogador de outro clube ou agente livre. */
export function useBidFlow(pid: string, onDone: () => void) {
  const { world, mutate } = useWorld();
  const toast = useToast();
  const [amount, setAmountRaw] = useState("");
  const [outcome, setOutcome] = useState<BidOutcome | null>(null);

  /** Prepara a proposta: valor de mercado como sugestão; agente livre já é avaliado sem custo. */
  const start = () => {
    const p = world.players[pid];
    if (!p) return;
    if (p.clubId) {
      setAmountRaw(toMillions(valueOf(p)));
      setOutcome(null);
    } else {
      setOutcome({ result: evaluateBid(world, pid, 0), fee: 0 });
    }
  };

  const setAmount = (v: string) => {
    setAmountRaw(v);
    setOutcome(null); // resultado antigo não vale para o novo valor
  };

  const send = () => {
    const p = world.players[pid];
    if (!p) return;
    const fee = p.clubId ? feeFromMillions(amount) : 0;
    setOutcome({ result: evaluateBid(world, pid, fee), fee });
  };

  const deal: BidDeal | null = (() => {
    if (!outcome) return null;
    const { result: r, fee } = outcome;
    if (r.status === "accepted") return { fee, wage: r.wage ?? 0, counter: false };
    if (r.status === "counter" && r.ask != null) {
      const p = world.players[pid];
      return { fee: r.ask, wage: p ? wageDemand(world, p, user(world)) : (r.wage ?? 0), counter: true };
    }
    return null;
  })();

  const close = (d: BidDeal) => {
    const u = user(world);
    const p = world.players[pid];
    if (!p) return;
    if (d.fee > u.money) return toast("Dinheiro insuficiente em caixa.", "bad");
    if (u.squad.length >= SQUAD_MAX) return toast(`Elenco cheio (${SQUAD_MAX}/${SQUAD_MAX}). Libere uma vaga antes.`, "bad");
    mutate((w) => completeBuy(w, pid, d.fee, d.wage));
    toast(`${p.name} é o novo reforço do ${u.name}${d.fee ? ` por ${formatMoney(d.fee)}` : ""}!`, "good");
    onDone();
  };

  return { amount, setAmount, outcome, deal, start, send, close };
}

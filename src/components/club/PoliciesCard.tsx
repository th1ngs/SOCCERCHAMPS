"use client";

import { useMemo } from "react";
import { expectedGate, formatMoney, nextFixture, setTicketPrice, TICKET_PRICES, TRAINING, user } from "@/game";
import type { TicketPrice, TrainingKey } from "@/game/types";
import { Card, KV, Meter, SectionTitle } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { useWorld } from "@/components/game/GameProvider";

const TRAINING_TEXT: Record<TrainingKey, string> = {
  low: "Recuperação rápida e menos lesões, mas evolução mais lenta.",
  mid: "Equilíbrio entre evolução e desgaste.",
  high: "Jogadores evoluem mais rápido, mas cansam e se machucam mais. Faça rodízio!",
};

const TICKET_TEXT: Record<TicketPrice, string> = {
  popular: "Ingresso mais barato: estádio mais cheio e a torcida agradece, mas cada bilhete rende menos.",
  normal: "Preço de referência: ocupação e renda equilibradas.",
  premium: "Ingresso caro: renda maior por torcedor, porém menos gente no estádio.",
};

const pct = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;

/** Intensidade do treino. */
export function TrainingCard() {
  const { world: w, mutate } = useWorld();
  const u = user(w);
  const t = TRAINING[u.trainingInt];
  const options = (Object.keys(TRAINING) as TrainingKey[]).map((k) => ({ value: k, label: TRAINING[k].name }));
  return (
    <Card title="Treinamento">
      <Segmented
        options={options}
        value={u.trainingInt}
        ariaLabel="Intensidade do treino"
        onChange={(v) => mutate((x) => { user(x).trainingInt = v; })}
      />
      <p className="mt-3 text-sm text-mist">{TRAINING_TEXT[u.trainingInt]}</p>
      <div className="mt-2">
        <KV label="Recuperação física por semana">+{t.recover}%</KV>
        <KV label="Ritmo de evolução">×{t.dev.toFixed(2).replace(".", ",")}</KV>
        <KV label="Risco de lesão">×{t.injury.toFixed(2).replace(".", ",")}</KV>
      </div>
    </Card>
  );
}

/** Política de ingressos e humor da torcida. */
export function TicketsCard() {
  const { world: w, version, mutate } = useWorld();
  const u = user(w);
  const info = TICKET_PRICES[u.ticketPrice];
  const options = (Object.keys(TICKET_PRICES) as TicketPrice[]).map((k) => ({ value: k, label: TICKET_PRICES[k].name }));
  const gate = useMemo(() => {
    void version;
    const nf = nextFixture(w);
    return nf && nf.m.h === w.userClub && !nf.m.neutral ? { week: nf.week, ...expectedGate(w, nf.m) } : null;
  }, [w, version]);

  return (
    <Card title="Ingresso e torcida">
      <Segmented options={options} value={u.ticketPrice} ariaLabel="Preço do ingresso" onChange={(v) => mutate((x) => setTicketPrice(x, v))} />
      <p className="mt-3 text-sm text-mist">{TICKET_TEXT[u.ticketPrice]}</p>
      <div className="mt-2">
        <KV label="Preço do ingresso">×{info.mult.toFixed(2).replace(".", ",")}</KV>
        <KV label="Ocupação do estádio">{info.occ ? pct(info.occ) : "padrão"}</KV>
        {gate && (
          <KV label={`Próximo jogo em casa (sem. ${gate.week})`}>
            {gate.attendance.toLocaleString("pt-BR")} • {formatMoney(gate.income)}
          </KV>
        )}
      </div>
      <SectionTitle className="mb-2 mt-4">Torcida</SectionTitle>
      <div className="flex items-center gap-3">
        <Meter value={u.fans} label="Humor da torcida" className="h-2 flex-1" />
        <b className="font-display text-xl tabular">{Math.round(u.fans)}%</b>
      </div>
      <p className="mt-2 text-sm text-mist">Vitórias (em dobro nos clássicos) animam a torcida e enchem o estádio; derrotas afastam o público.</p>
    </Card>
  );
}

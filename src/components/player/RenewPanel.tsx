"use client";

import { formatMoney } from "@/game";
import type { Player } from "@/game/types";
import { KV } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { contractText } from "./playerInfo";

export const RENEW_YEARS = ["1", "2", "3", "4", "5"] as const;
export type RenewYears = (typeof RENEW_YEARS)[number];

/** Corpo da renovação: pedido salarial e duração do novo contrato. */
export function RenewPanel({ player: p, ask, years, onYears }: { player: Player; ask: number; years: RenewYears; onYears: (y: RenewYears) => void }) {
  const diff = ask - p.wage;
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-ink-900/60 px-4 py-1 ring-1 ring-inset ring-white/6">
        <KV label="Contrato atual">{contractText(p.contract)}</KV>
        <KV label="Salário atual">{formatMoney(p.wage)}/sem</KV>
        <KV label="Pedido do jogador">
          <span className="text-gold-300">{formatMoney(ask)}/sem</span>
        </KV>
        <KV label="Impacto na folha">
          <span className={diff > 0 ? "text-warn-400" : "text-pitch-400"}>
            {diff >= 0 ? "+" : "−"}
            {formatMoney(Math.abs(diff))}/sem
          </span>
        </KV>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Duração do novo contrato (anos)</p>
        <Segmented ariaLabel="Duração do contrato em anos" options={RENEW_YEARS.map((y) => ({ value: y, label: y }))} value={years} onChange={onYears} />
      </div>
      <p className="text-xs text-mist">Renovar melhora o moral do jogador (+10).</p>
    </div>
  );
}

"use client";

import { formatMoney } from "@/game";
import type { Club, Player } from "@/game/types";
import { Flag } from "@/components/ui/Flag";
import { Alert, KV } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { BidOutcome } from "./useBidFlow";
import { feeFromMillions, toMillions } from "./playerInfo";

const QUICK = [0.9, 1, 1.15, 1.3, 1.5];

const outcomeTone = (o: BidOutcome) => (o.result.status === "accepted" ? "good" : o.result.status === "counter" ? "info" : "bad");

/** Corpo da proposta: valores de referência, campo em R$ milhões, atalhos e resposta do clube. */
export function BidPanel({
  player: p,
  club,
  value,
  cash,
  amount,
  onAmount,
  outcome,
  onSubmit,
}: {
  player: Player;
  club: Club | null;
  value: number;
  cash: number;
  amount: string;
  onAmount: (v: string) => void;
  outcome: BidOutcome | null;
  onSubmit: () => void;
}) {
  const fee = feeFromMillions(amount);
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-ink-900/60 px-4 py-1 ring-1 ring-inset ring-white/6">
        {club && (
          <KV label="Clube">
            <span className="inline-flex items-center gap-1.5">
              {club.name} <Flag code={club.league} />
            </span>
          </KV>
        )}
        <KV label="Valor de mercado">{formatMoney(value)}</KV>
        <KV label="Salário atual">{formatMoney(p.wage)}/sem</KV>
        <KV label="Seu caixa">
          <span className={cash < 0 ? "text-danger-400" : undefined}>{formatMoney(cash)}</span>
        </KV>
      </div>

      {club ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Valor da proposta (R$ milhões)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.05}
              value={amount}
              onChange={(e) => onAmount(e.target.value)}
              data-autofocus
              className="h-11 w-full rounded-xl bg-ink-950/70 px-3 font-display text-xl font-bold tabular ring-1 ring-inset ring-white/12 focus:outline-2 focus:outline-gold-400"
            />
          </label>
          <p className="text-xs text-mist">
            Proposta: <b className="text-snow">{formatMoney(fee)}</b>
            {fee > cash && <span className="text-danger-400"> — acima do seu caixa</span>}
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Atalhos de valor">
            {QUICK.map((f) => {
              const v = toMillions(value * f);
              const on = amount === v;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => onAmount(v)}
                  aria-pressed={on}
                  className={cn(
                    "h-10 min-w-16 rounded-lg px-3 font-display text-sm font-bold tabular ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
                    on ? "bg-gold-400 text-ink-950 ring-gold-400" : "text-mist ring-white/12 hover:bg-white/6 hover:text-snow",
                  )}
                >
                  {Math.round(f * 100)}%
                </button>
              );
            })}
          </div>
        </form>
      ) : (
        <p className="text-sm text-mist">Agente livre: não há custo de transferência, só o salário.</p>
      )}

      {outcome && (
        <Alert tone={outcomeTone(outcome)} className="animate-pop">
          <span role="status">{outcome.result.text}</span>
        </Alert>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { formatMoney, user } from "@/game";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { BalanceSparkline } from "./BalanceSparkline";
import { FIN_CATS, balanceSeries, seasonNet } from "./finance";

const signed = (v: number) => (v > 0 ? "+" : "") + formatMoney(v);
const tone = (v: number) => (v > 0 ? "text-pitch-400" : v < 0 ? "text-danger-400" : "text-mist");

/** Receitas e despesas da temporada por categoria e a evolução do caixa. */
export function SeasonFinancesCard() {
  const { world: w, version } = useWorld();
  const u = user(w);
  const fs = w.finSeason;
  const points = useMemo(() => {
    void version;
    return balanceSeries(w);
  }, [w, version]);
  const net = seasonNet(fs);

  return (
    <Card title={`Finanças da temporada ${w.season}`}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <span>
          <span className="block text-xs uppercase tracking-wider text-mist">Saldo atual</span>
          <span className={cn("font-display text-4xl font-extrabold leading-none tabular", u.money < 0 && "text-danger-400")}>{formatMoney(u.money)}</span>
        </span>
        <span className="text-right">
          <span className="block text-xs uppercase tracking-wider text-mist">Resultado</span>
          <span className={cn("font-display text-xl font-bold tabular", tone(net))}>{signed(net)}</span>
        </span>
      </div>
      <dl>
        {FIN_CATS.map(({ key, label }) => {
          const v = fs[key] ?? 0;
          return (
            <div key={key} className="flex items-center justify-between gap-3 border-b border-white/6 py-2 last:border-0">
              <dt className="text-sm text-mist">{label}</dt>
              <dd className={cn("font-semibold tabular", tone(v))}>{v ? signed(v) : "—"}</dd>
            </div>
          );
        })}
      </dl>
      <SectionTitle className="mb-2 mt-5">Evolução do caixa</SectionTitle>
      <BalanceSparkline points={points} />
    </Card>
  );
}

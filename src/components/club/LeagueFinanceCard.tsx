"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { clubWages, divisionName, financeProfile, formatMoney, user } from "@/game";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { ClubTag } from "@/components/comps/ClubTag";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";

const TH = "px-2 py-2 font-display text-xs font-bold uppercase tracking-wider text-mist";

/** Ranking financeiro da divisão do usuário: receita estimada, folha e caixa de cada clube. */
export function LeagueFinanceCard() {
  const { world: w, version } = useWorld();
  const u = user(w);
  const [all, setAll] = useState(false);
  const rows = useMemo(() => {
    void version;
    return Object.values(w.clubs)
      .filter((c) => c.div === u.div)
      .map((c) => ({ c, revenue: financeProfile(w, c).revenue, wages: clubWages(w, c) }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [w, u.div, version]);
  const mine = rows.findIndex((r) => r.c.id === u.id);
  const shown = all ? rows : rows.filter((_, i) => i < 6 || i === mine);

  return (
    <Card title={`Finanças da ${divisionName(u.div)}`} className="md:col-span-2">
      <p className="mb-3 text-sm text-mist">
        Seu clube tem a {mine + 1}ª maior receita da divisão. Os valores são por semana; o caixa é o saldo atual.
      </p>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr>
              <th scope="col" className={cn(TH, "pl-4 text-left sm:pl-2")}>Clube</th>
              <th scope="col" className={cn(TH, "text-right")}>Receita</th>
              <th scope="col" className={cn(TH, "text-right")}>Folha</th>
              <th scope="col" className={cn(TH, "pr-4 text-right sm:pr-2")}>Caixa</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ c, revenue, wages }) => {
              const me = c.id === u.id;
              const i = rows.findIndex((r) => r.c.id === c.id);
              return (
                <tr key={c.id} className={cn("border-t border-white/6", me && "bg-gold-400/10")}>
                  <td className="py-2 pl-4 pr-2 sm:pl-2">
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-right font-display font-bold text-mist tabular">{i + 1}</span>
                      <ClubTag id={c.id} bold={me} />
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular">{formatMoney(revenue)}</td>
                  <td className={cn("px-2 py-2 text-right tabular", wages > revenue ? "text-danger-400" : "")}>{formatMoney(wages)}</td>
                  <td className={cn("py-2 pl-2 pr-4 text-right tabular sm:pr-2", c.money < 0 && "text-danger-400")}>{formatMoney(c.money)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > shown.length || all ? (
        <div className="mt-3 flex justify-center">
          <Button variant="ghost" size="sm" iconRight={<ChevronDown className={cn(all && "rotate-180")} />} onClick={() => setAll((v) => !v)}>
            {all ? "Mostrar menos" : `Ver os ${rows.length} clubes`}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

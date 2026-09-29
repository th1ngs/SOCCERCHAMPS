"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Segmented } from "@/components/ui/Segmented";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { ClubLabel } from "./ClubLabel";
import { KIND_LABEL, historyData } from "./transferDerive";

const TH = "px-2 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-mist";

/** Histórico de transferências do clube do usuário por temporada, com o saldo no mercado. */
export function HistoryTab({ onOpen }: { onOpen: (pid: string) => void }) {
  const { world, version } = useWorld();
  const [season, setSeason] = useState(world.season);
  const data = useMemo(
    () => historyData(world, season),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, version, season],
  );
  // Gasto líquido: positivo = comprou mais do que vendeu.
  const net = data.net;

  return (
    <div className="space-y-4">
      {data.seasons.length > 1 && (
        <Segmented ariaLabel="Temporada" options={data.seasons.map((s) => ({ value: String(s), label: `Temporada ${s}` }))} value={String(season)} onChange={(v) => setSeason(Number(v))} />
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-ink-800 px-4 py-3 shadow-card ring-1 ring-inset ring-white/8">
          <p className="text-xs font-bold uppercase tracking-wider text-mist">Gastos em compras</p>
          <p className="font-display text-xl font-extrabold tabular text-danger-400">{formatMoney(data.spent)}</p>
        </div>
        <div className="rounded-xl bg-ink-800 px-4 py-3 shadow-card ring-1 ring-inset ring-white/8">
          <p className="text-xs font-bold uppercase tracking-wider text-mist">Receitas com vendas</p>
          <p className="font-display text-xl font-extrabold tabular text-pitch-400">{formatMoney(data.received)}</p>
        </div>
        <div className={cn("rounded-xl px-4 py-3 shadow-card ring-1 ring-inset", net > 0 ? "bg-danger-500/10 ring-danger-500/30" : "bg-pitch-500/10 ring-pitch-500/30")}>
          <p className="text-xs font-bold uppercase tracking-wider text-mist">Gasto líquido</p>
          <p className="font-display text-xl font-extrabold tabular">{net > 0 ? formatMoney(net) : net < 0 ? `Lucro de ${formatMoney(-net)}` : "Zerado"}</p>
          <p className="text-xs text-mist">{net > 0 ? "Comprou mais do que vendeu." : net < 0 ? "Vendeu mais do que comprou." : "Compras e vendas se equilibram."}</p>
        </div>
      </div>

      <Card title={`Movimentações na temporada ${season} (${data.rows.length})`}>
        {data.rows.length === 0 ? (
          <EmptyState>Nenhuma movimentação do seu clube nesta temporada.</EmptyState>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Transferências do seu clube na temporada {season}.</caption>
              <thead className="border-b border-white/8">
                <tr>
                  <th scope="col" className={`${TH} pl-4 text-left sm:pl-5`}>Sem.</th>
                  <th scope="col" className={`${TH} text-left`}>Jogador</th>
                  <th scope="col" className={`${TH} text-left`}>Tipo</th>
                  <th scope="col" className={`${TH} text-left`}>Movimento</th>
                  <th scope="col" className={`${TH} pr-4 text-right sm:pr-5`}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => {
                  const inbound = r.dir === "in";
                  const other = inbound ? r.from : r.to;
                  const exists = !!world.players[r.pid];
                  return (
                    <tr key={`${r.pid}-${r.week}-${i}`} className="border-b border-white/5 last:border-0">
                      <td className="py-2 pl-4 pr-2 tabular text-mist sm:pl-5">{r.week}</td>
                      <td className="px-2 py-2">
                        {exists ? (
                          <button type="button" onClick={() => onOpen(r.pid)} className="min-h-9 max-w-52 truncate rounded-md text-left font-semibold hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400">
                            {r.name}
                          </button>
                        ) : (
                          <span className="font-semibold">{r.name}</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={r.kind === "loan" ? "blue" : r.kind === "release" ? "red" : r.kind === "clause" ? "gold" : "neutral"}>{KIND_LABEL[r.kind]}</Badge>
                      </td>
                      <td className="px-2 py-2">
                        <span className="inline-flex max-w-64 items-center gap-1.5">
                          {inbound ? <ArrowDownLeft className="size-4 shrink-0 text-pitch-400" aria-label="Chegada" /> : <ArrowUpRight className="size-4 shrink-0 text-danger-400" aria-label="Saída" />}
                          <span className="shrink-0 text-mist">{inbound ? "do" : "para o"}</span>
                          <ClubLabel club={other ? world.clubs[other] : null} />
                        </span>
                      </td>
                      <td className={cn("py-2 pl-2 pr-4 text-right tabular whitespace-nowrap sm:pr-5", r.fee ? (inbound ? "text-danger-400" : "text-pitch-400") : "text-mist")}>
                        {r.fee ? `${inbound ? "−" : "+"}${formatMoney(r.fee)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

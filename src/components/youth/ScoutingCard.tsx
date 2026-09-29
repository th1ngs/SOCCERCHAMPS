"use client";

import { Hourglass, Telescope, TrendingUp } from "lucide-react";
import { formatMoney } from "@/game";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Badge, Card, PosBadge } from "@/components/ui/primitives";
import { initialRangeWidth, type ScoutState } from "./derive";

/** Departamento de olheiros: nível, vagas, relatórios em andamento e melhoria. */
export function ScoutingCard({
  s,
  academy,
  week,
  money,
  onUpgrade,
  onOpenPlayer,
}: {
  s: ScoutState;
  academy: number;
  week: number;
  money: number;
  onUpgrade: () => void;
  onOpenPlayer: (pid: string) => void;
}) {
  const upBlock = s.maxed ? "Departamento no nível máximo" : money < s.upgradeCost ? `Caixa insuficiente (${formatMoney(money)})` : null;
  const levels = Array.from({ length: s.max }, (_, i) => i + 1);
  return (
    <Card title="Departamento de olheiros" className="flex flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-display text-4xl font-extrabold leading-none tabular">
          {s.level}
          <span className="text-xl text-mist">/{s.max}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex gap-1" aria-hidden>
            {levels.map((l) => (
              <span key={l} className={cn("h-2 flex-1 rounded-full", l <= s.level ? "bg-info-400" : "bg-white/10")} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-mist">
            Vagas: <strong className="text-snow tabular">{s.used}/{s.slots}</strong> relatórios • {formatMoney(s.cost)} cada
          </p>
        </div>
      </div>

      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-mist">Relatórios em andamento</h4>
      {s.queue.length ? (
        <ul className="mb-4 space-y-1.5">
          {s.queue.map((q) => {
            const left = Math.max(0, q.readyWeek - week);
            return (
              <li key={q.pid} className="flex min-h-10 items-center gap-2 rounded-lg bg-ink-900/55 px-2.5 py-1.5 ring-1 ring-inset ring-white/6">
                {q.pos && <PosBadge pos={q.pos} />}
                <button
                  type="button"
                  onClick={() => onOpenPlayer(q.pid)}
                  className="min-w-0 flex-1 truncate rounded text-left text-sm font-semibold hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400"
                >
                  {q.name}
                </button>
                {!q.youth && q.club && <Badge>{q.club}</Badge>}
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-info-400 tabular">
                  <Hourglass className="size-3.5" aria-hidden />
                  sem. {q.readyWeek}
                  <span className="text-mist">{left <= 1 ? "(próxima)" : `(${left} sem.)`}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-4 rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-xs text-mist">
          Nenhum relatório em andamento. Peça um no cartão de um garoto ou na ficha de um jogador.
        </p>
      )}

      <div className="mb-4 rounded-xl bg-ink-900/55 p-3 ring-1 ring-inset ring-white/6">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mist">
          <TrendingUp className="size-3.5" aria-hidden /> Faixa de potencial dos garotos novos
        </p>
        <div className="grid grid-cols-5 gap-1 text-center">
          {levels.map((l) => (
            <div
              key={l}
              className={cn("rounded-md px-1 py-1.5 ring-1 ring-inset", l === s.level ? "bg-info-500/20 ring-info-400/60" : "ring-white/6")}
            >
              <div className="text-[10px] uppercase tracking-wide text-mist">Nív. {l}</div>
              <div className="font-display text-base font-extrabold tabular">±{Math.round(initialRangeWidth(academy, l) / 2)}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs leading-snug text-mist">
          Cada nível estreita a faixa inicial (com a base nível {academy}). Ela também fecha 40% por temporada e fica exata com o relatório completo. A partir do nível 4, a peneira traz +1 garoto.
        </p>
      </div>

      <div className="mt-auto">
        <Button variant="secondary" icon={<Telescope />} onClick={onUpgrade} disabled={!!upBlock} title={upBlock ?? undefined}>
          {s.maxed ? "Nível máximo" : `Melhorar olheiros • ${formatMoney(s.upgradeCost)}`}
        </Button>
        {upBlock && !s.maxed && <p className="mt-2 text-xs text-mist">{upBlock}.</p>}
      </div>
    </Card>
  );
}

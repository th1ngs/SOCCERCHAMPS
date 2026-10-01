"use client";

import { useState } from "react";
import { Hourglass, UserMinus, UserPlus } from "lucide-react";
import { SCOUT_FIRE_WEEKS, formatMoney } from "@/game";
import type { Scout } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Flag } from "@/components/ui/Flag";
import { Badge, Card, PosBadge, Stars } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { countryName, initialRangeWidth, type ScoutState } from "./derive";

/** Uma linha de olheiro (equipe ou mercado). */
function ScoutRow({ s, children, note }: { s: Scout; children?: React.ReactNode; note?: React.ReactNode }) {
  return (
    <li className="flex min-h-12 items-center gap-2.5 rounded-xl bg-ink-900/55 px-2.5 py-2 ring-1 ring-inset ring-white/6">
      <Flag code={s.nat} decorative className="h-4 shrink-0 rounded-[2px] ring-1 ring-black/25" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{s.name}</span>
          <Stars value={s.skill} className="shrink-0" />
        </span>
        <span className="block text-xs text-mist">
          <span className="whitespace-nowrap">Especialista: {countryName(s.nat)}</span> • <span className="whitespace-nowrap">{s.age} anos</span>
          <span className="block">
            {formatMoney(s.wage)}/sem{note ? <> • {note}</> : null}
          </span>
        </span>
      </span>
      {children}
    </li>
  );
}

/** Olheiros contratados (com relatórios em andamento) e mercado de olheiros para contratar. */
export function ScoutingCard({
  s,
  academy,
  week,
  money,
  onHire,
  onFire,
  onOpenPlayer,
}: {
  s: ScoutState;
  academy: number;
  week: number;
  money: number;
  onHire: (id: string) => void;
  onFire: (id: string) => void;
  onOpenPlayer: (pid: string) => void;
}) {
  const [tab, setTab] = useState<"staff" | "market">(s.staff.length ? "staff" : "market");
  const full = s.staff.length >= s.max;
  return (
    <Card
      title="Olheiros"
      className="flex flex-col"
      action={<span className="text-xs text-mist tabular">{s.staff.length}/{s.max} • {formatMoney(s.payroll)}/sem</span>}
    >
      <Segmented
        ariaLabel="Olheiros"
        size="sm"
        value={tab}
        onChange={setTab}
        className="mb-3 flex w-full"
        options={[
          { value: "staff", label: `Sua equipe (${s.staff.length})` },
          { value: "market", label: `Contratar (${s.market.length})` },
        ]}
      />

      {tab === "staff" ? (
        <>
          {s.staff.length ? (
            <ul className="mb-3 space-y-1.5">
              {s.staff.map((x) => (
                <ScoutRow key={x.id} s={x} note={x.busy ? <span className="text-info-400">relatório de {x.busy}</span> : <span className="text-pitch-400">livre</span>}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<UserMinus />}
                    onClick={() => onFire(x.id)}
                    disabled={money < x.wage * SCOUT_FIRE_WEEKS}
                    title={`Dispensar: multa de ${formatMoney(x.wage * SCOUT_FIRE_WEEKS)} (${SCOUT_FIRE_WEEKS} semanas de salário)`}
                    aria-label={`Dispensar ${x.name}`}
                    className="shrink-0 px-2"
                  >
                    <span className="max-sm:sr-only">Dispensar</span>
                  </Button>
                </ScoutRow>
              ))}
            </ul>
          ) : (
            <p className="mb-3 rounded-lg border border-dashed border-warn-400/40 px-3 py-3 text-center text-sm text-warn-400">
              Você não tem olheiros. Contrate pelo menos um para pedir relatórios.
            </p>
          )}

          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-mist">Relatórios em andamento • {formatMoney(s.cost)} cada</h4>
          {s.queue.length ? (
            <ul className="mb-3 space-y-1.5">
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
            <p className="mb-3 rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-xs text-mist">
              Nenhum relatório em andamento. Peça um no cartão de um garoto ou na ficha de um jogador.
            </p>
          )}
        </>
      ) : (
        <>
          <ul className="mb-3 space-y-1.5">
            {s.market.map((x) => {
              const block = full ? `Limite de ${s.max} olheiros` : money < x.fee ? `Caixa insuficiente (${formatMoney(money)})` : null;
              return (
                <ScoutRow key={x.id} s={x}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<UserPlus />}
                    onClick={() => onHire(x.id)}
                    disabled={!!block}
                    title={block ?? `Luvas de ${formatMoney(x.fee)}`}
                    aria-label={`Contratar ${x.name} por ${formatMoney(x.fee)}`}
                    className="shrink-0 px-2"
                  >
                    {formatMoney(x.fee)}
                  </Button>
                </ScoutRow>
              );
            })}
          </ul>
          {!s.market.length && <p className="mb-3 text-center text-xs text-mist">Novos nomes aparecem na próxima temporada.</p>}
        </>
      )}

      <div className="mt-auto rounded-xl bg-ink-900/55 p-3 text-xs leading-snug text-mist ring-1 ring-inset ring-white/6">
        <p>
          <b className="text-snow">Mais olheiros</b>: mais relatórios ao mesmo tempo (um por olheiro).
        </p>
        <p className="mt-1">
          <b className="text-snow">Olheiro-chefe</b> (o de maior nível
          {s.level ? `, hoje ${s.level}★` : ""}): faixa de potencial dos garotos novos ±{Math.round(initialRangeWidth(academy, s.level) / 2)}; nível 4+ libera uma peneira extra e +1 garoto.
        </p>
        <p className="mt-1">
          <b className="text-snow">Especialista</b>: relatório em 1 semana de jogadores do país dele; peneira no exterior, no país dele, mais barata (×1,2) e com +1 garoto.
        </p>
      </div>
    </Card>
  );
}

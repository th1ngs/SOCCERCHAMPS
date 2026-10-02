"use client";

import { useMemo, useState } from "react";
import { CheckCheck, PenLine } from "lucide-react";
import { RENEW_OFFERS, bulkRenew, clubWages, formatMoney, renewalPlan, renewalWeeks, user, type AutoRenew, type BulkRenewResult, type RenewAdvice } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { Badge, OvrBadge, PosBadge, type BadgeTone } from "@/components/ui/primitives";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { yearsText } from "@/components/player/playerInfo";
import { cn } from "@/lib/cn";

const ADVICE: Record<RenewAdvice, { label: string; tone: BadgeTone }> = {
  renovar: { label: "Renovar", tone: "green" },
  avaliar: { label: "Avaliar", tone: "orange" },
  liberar: { label: "Deixar sair", tone: "red" },
};

const AUTO: { value: AutoRenew; label: string }[] = [
  { value: "off", label: "Desligada" },
  { value: "key", label: "Recomendados" },
  { value: "all", label: "Todos" },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Renovações do elenco: contratos no último ano com recomendação, seleção em lote com termos automáticos
 * (o pedido do jogador com um acréscimo opcional) e a renovação automática no fim da temporada.
 */
export function RenewalPanel() {
  const { world, version, mutate, setOverlay } = useWorld();
  const toast = useToast();
  const [offer, setOffer] = useState<string>("1.05");
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [result, setResult] = useState<BulkRenewResult | null>(null);
  const k = Number(offer);

  const data = useMemo(() => {
    const u = user(world);
    const rows = renewalPlan(world, k);
    return { rows, wages: clubWages(world, u), cap: u.wageCap, money: u.money, weeks: renewalWeeks(world), auto: world.autoRenew ?? "off" };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, version, k]);

  const selected = picked ?? new Set(data.rows.filter((r) => r.advice === "renovar").map((r) => r.pid));
  const chosen = data.rows.filter((r) => selected.has(r.pid));
  const delta = chosen.reduce((s, r) => s + r.delta, 0);
  const bonus = chosen.reduce((s, r) => s + r.terms.bonus, 0);
  const overCap = !!data.cap && data.wages + delta > data.cap * 1.1;

  const toggle = (pid: string) => {
    const next = new Set(selected);
    if (next.has(pid)) next.delete(pid);
    else next.add(pid);
    setPicked(next);
  };

  const run = () => {
    let res: BulkRenewResult | null = null;
    mutate((w) => {
      res = bulkRenew(w, chosen.map((r) => r.pid), k);
    });
    const r = res as BulkRenewResult | null;
    if (!r) return;
    setResult(r);
    setPicked(null);
    toast(r.renewed.length ? `${r.renewed.length} contrato(s) renovado(s)${r.failed.length ? `, ${r.failed.length} sem acordo` : ""}.` : "Ninguém aceitou os termos.", r.renewed.length ? "good" : "bad");
  };

  const setAuto = (v: AutoRenew) => mutate((w) => { w.autoRenew = v; });

  return (
    <section id="renovacoes" className="mb-5 scroll-mt-24 rounded-(--radius-card) bg-ink-800 p-4 shadow-card ring-1 ring-inset ring-warn-400/25 sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-gold-400">Renovações</h3>
          <p className="mt-1 text-sm text-mist">
            {data.rows.length ? (
              <>
                <b className="text-warn-400">{data.rows.length}</b> contrato{data.rows.length > 1 ? "s terminam" : " termina"} no fim da temporada. Sem renovação, o jogador sai de graça.
              </>
            ) : (
              "Nenhum contrato no último ano. A renovação automática vale para os próximos."
            )}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-xs text-mist">Renovação automática (semana {data.weeks.last})</span>
          <Segmented ariaLabel="Renovação automática" size="sm" options={AUTO} value={data.auto} onChange={setAuto} />
        </div>
      </header>

      {data.rows.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-mist">
            <span>Oferecer</span>
            <Segmented ariaLabel="Salário oferecido" size="sm" options={RENEW_OFFERS.map((o) => ({ value: String(o.value), label: o.label }))} value={offer} onChange={setOffer} />
          </div>
          <ul className="divide-y divide-white/6 rounded-xl bg-ink-900/50 ring-1 ring-inset ring-white/6">
            {data.rows.map((r) => {
              const p = world.players[r.pid];
              const on = selected.has(r.pid);
              const a = ADVICE[r.advice];
              return (
                <li key={r.pid} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:flex-nowrap", !on && "opacity-70")}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(r.pid)}
                    aria-label={`Renovar com ${p.name}`}
                    className="size-5 shrink-0 accent-gold-400"
                  />
                  <button type="button" onClick={() => setOverlay({ kind: "player", pid: p.id })} className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-gold-300">
                    <PlayerAvatar player={p} size={32} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <PosBadge pos={p.pos} />
                        <span className="truncate font-semibold">{p.name}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-mist">
                        <span>{p.age} anos</span>
                        <Badge tone={a.tone} title={r.reason}>{a.label}</Badge>
                        <span className="hidden sm:inline">{r.reason}</span>
                      </span>
                    </span>
                  </button>
                  <OvrBadge value={p.ovr} size="sm" />
                  <span className="basis-full pl-8 text-xs tabular sm:basis-auto sm:shrink-0 sm:pl-0 sm:text-right">
                    <span className="text-snow sm:block">
                      {formatMoney(r.terms.wage)}/sem
                      <span className={cn("ml-1", r.delta > 0 ? "text-warn-400" : "text-pitch-400")}>({r.delta > 0 ? "+" : ""}{formatMoney(r.delta)})</span>
                    </span>
                    <span className="ml-2 text-mist sm:ml-0 sm:block">
                      {yearsText(r.terms.years)} • chance <b className={r.chance >= 0.8 ? "text-pitch-400" : r.chance >= 0.4 ? "text-warn-400" : "text-danger-400"}>{pct(r.chance)}</b>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-mist">
              Folha {delta >= 0 ? "+" : ""}{formatMoney(delta)}/sem{data.cap ? <> (teto {formatMoney(data.cap)}/sem)</> : null} • luvas {formatMoney(bonus)} • caixa {formatMoney(data.money)}
              {overCap && <span className="block text-warn-400">A folha passaria do teto: a diretoria pode vetar as últimas renovações da lista.</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" icon={<CheckCheck />} onClick={() => setPicked(new Set(selected.size === data.rows.length ? [] : data.rows.map((r) => r.pid)))}>
                {selected.size === data.rows.length ? "Limpar" : "Marcar todos"}
              </Button>
              <Button variant="primary" size="sm" icon={<PenLine />} disabled={!chosen.length} onClick={run}>
                Renovar {chosen.length} selecionado{chosen.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </>
      )}

      {result && (result.renewed.length > 0 || result.failed.length > 0) && (
        <div className="mt-3 space-y-1 rounded-xl bg-ink-900/50 px-3 py-2 text-xs ring-1 ring-inset ring-white/6" role="status">
          {result.renewed.length > 0 && (
            <p className="text-pitch-400">
              Renovados: {result.renewed.map((x) => `${world.players[x.pid]?.name ?? "?"} (${formatMoney(x.wage)}/sem, ${yearsText(x.years)})`).join("; ")}.
            </p>
          )}
          {result.failed.map((x) => (
            <p key={x.pid} className="text-warn-400">
              {world.players[x.pid]?.name ?? "?"}: {x.text}
            </p>
          ))}
          {result.failed.length > 0 && <p className="text-mist">Quem recusou pode ser negociado um a um na ficha, ou tente de novo oferecendo mais.</p>}
        </div>
      )}
    </section>
  );
}

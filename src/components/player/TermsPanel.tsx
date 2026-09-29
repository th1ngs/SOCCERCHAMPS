"use client";

import { Check, Wand2 } from "lucide-react";
import { formatMoney } from "@/game";
import type { ContractResponse, Role, Terms } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Alert, Meter } from "@/components/ui/primitives";
import { ROLES, ROLE_INFO } from "@/components/market/transferDerive";
import { cn } from "@/lib/cn";
import { yearsText } from "./playerInfo";

const YEARS = ["1", "2", "3", "4", "5"] as const;
type YearOpt = (typeof YEARS)[number];

const input =
  "h-11 w-full rounded-xl bg-ink-950/70 px-3 font-display text-lg font-bold tabular ring-1 ring-inset ring-white/12 focus:outline-2 focus:outline-gold-400";

const round100 = (v: number) => Math.max(0, Math.round(v / 100) * 100);

/** Texto e cor do medidor de chance. */
export function chanceLabel(c: number): { text: string; tone: string } {
  const pct = Math.round(c * 100);
  if (pct >= 75) return { text: `${pct}% • deve aceitar`, tone: "text-pitch-400" };
  if (pct >= 45) return { text: `${pct}% • pode aceitar`, tone: "text-warn-400" };
  return { text: `${pct}% • tende a recusar`, tone: "text-danger-400" };
}

/** Folha depois do acordo contra o teto da diretoria (renovações têm 10% de tolerância). */
function PayrollLine({ wages, cap, extra, renewal }: { wages: number; cap: number; extra: number; renewal: boolean }) {
  const after = wages + Math.max(0, extra);
  const limit = renewal ? cap * 1.1 : cap;
  const over = after > limit;
  return (
    <p className={cn("mt-2 rounded-lg px-2.5 py-1.5 text-xs", over ? "bg-danger-500/12 text-danger-400" : "bg-white/4 text-mist")}>
      Folha depois do acordo: <b className={over ? "" : "text-snow"}>{formatMoney(after)}/sem</b> • teto da diretoria {formatMoney(cap)}/sem
      {over ? " — a diretoria vai vetar." : ` — sobra ${formatMoney(limit - after)}/sem.`}
    </p>
  );
}

/** Termos pessoais (contratação ou renovação): salário, anos, luvas, papel e chance de aceitar em tempo real. */
export function TermsPanel({
  ask,
  terms,
  onChange,
  chance,
  reply,
  onUseCounter,
  agreed,
  currentWage,
  payroll,
}: {
  ask: Terms;
  terms: Terms;
  onChange: (t: Terms) => void;
  chance: number;
  reply: ContractResponse | null;
  onUseCounter: () => void;
  /** Os termos atuais já foram aceitos pelo jogador. */
  agreed: boolean;
  /** Salário atual (renovação): mostra o impacto na folha. */
  currentWage?: number;
  /** Folha e teto salarial do clube (para avisar antes do veto da diretoria). */
  payroll?: { wages: number; cap: number };
}) {
  const set = (patch: Partial<Terms>) => onChange({ ...terms, ...patch });
  const wMin = round100(ask.wage * 0.5);
  const wMax = round100(ask.wage * 2);
  const c = chanceLabel(chance);
  const diff = currentWage != null ? terms.wage - currentWage : null;
  const years = String(Math.min(5, Math.max(1, terms.years))) as YearOpt;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold">Chance de aceitar</span>
          <span className={cn("font-display font-bold tabular", c.tone)} aria-live="polite">
            {c.text}
          </span>
        </div>
        <Meter value={chance * 100} label="Chance de o jogador aceitar" className="mt-2 h-2.5 w-full" />
        {payroll && <PayrollLine wages={payroll.wages} cap={payroll.cap} extra={terms.wage - (currentWage ?? 0)} renewal={currentWage != null} />}
        <p className="mt-2 text-xs text-mist">
          Pedido do jogador: <b className="text-snow">{formatMoney(ask.wage)}/sem</b> • {yearsText(ask.years)} • luvas {formatMoney(ask.bonus)} • {ROLE_INFO[ask.role].label}
        </p>
      </div>

      <div>
        <label htmlFor="terms-wage" className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold">
          <span>Salário semanal (R$)</span>
          <span className="text-xs font-normal text-mist">{formatMoney(terms.wage)}/sem</span>
        </label>
        <div className="grid grid-cols-[1fr_8.5rem] items-center gap-3">
          <input
            type="range"
            min={wMin}
            max={wMax}
            step={100}
            value={Math.min(wMax, Math.max(wMin, terms.wage))}
            onChange={(e) => set({ wage: Number(e.target.value) })}
            aria-label="Salário semanal"
            className="h-10 w-full accent-gold-400"
          />
          <input
            id="terms-wage"
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={terms.wage}
            onChange={(e) => set({ wage: round100(Number(e.target.value) || 0) })}
            className={input}
          />
        </div>
        {diff != null && (
          <p className="mt-1 text-xs text-mist">
            Impacto na folha:{" "}
            <b className={diff > 0 ? "text-warn-400" : "text-pitch-400"}>
              {diff >= 0 ? "+" : "−"}
              {formatMoney(Math.abs(diff))}/sem
            </b>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-semibold">Duração (anos)</p>
          <Segmented ariaLabel="Duração do contrato em anos" options={YEARS.map((y) => ({ value: y, label: y }))} value={years} onChange={(y) => set({ years: Number(y) })} />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Luvas (R$)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            value={terms.bonus}
            onChange={(e) => set({ bonus: Math.max(0, Math.round((Number(e.target.value) || 0) / 1000) * 1000) })}
            className={input}
          />
          <span className="mt-1 block text-xs text-mist">Pagas na assinatura: {formatMoney(terms.bonus)}</span>
        </label>
      </div>

      {ask.releaseClause != null && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Multa rescisória (R$ milhões)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={Math.round((terms.releaseClause ?? ask.releaseClause) / 1e4) / 100}
            onChange={(e) => set({ releaseClause: Math.max(0, Math.round(((Number(e.target.value) || 0) * 1e6) / 10000) * 10000) })}
            className={input}
          />
          <span className="mt-1 block text-xs text-mist">
            Proteção contra propostas: {formatMoney(terms.releaseClause ?? ask.releaseClause)}. Multa mais alta reduz um pouco a chance de aceitar.
          </span>
        </label>
      )}

      <div>
        <p className="mb-1.5 text-sm font-semibold">Papel prometido</p>
        <Segmented<Role> ariaLabel="Papel prometido no elenco" options={ROLES.map((r) => ({ value: r, label: ROLE_INFO[r].label }))} value={terms.role} onChange={(role) => set({ role })} />
        <p className="mt-1.5 text-xs text-mist">{ROLE_INFO[terms.role].desc}</p>
      </div>

      {reply && (
        <Alert tone={reply.status === "accepted" ? "good" : reply.status === "counter" ? "info" : "bad"} className="animate-pop">
          <span role="status" className="min-w-0 flex-1">
            {reply.status === "accepted" && agreed && <Check className="mr-1 inline size-4 text-pitch-400" aria-hidden />}
            {reply.text}
            {reply.status === "counter" && reply.counter && (
              <span className="mt-1 block text-xs text-mist">
                Sugestão: {formatMoney(reply.counter.wage)}/sem • {yearsText(reply.counter.years)} • luvas {formatMoney(reply.counter.bonus)} • {ROLE_INFO[reply.counter.role].label}
              </span>
            )}
          </span>
          {reply.status === "counter" && reply.counter && (
            <Button variant="outline" icon={<Wand2 />} onClick={onUseCounter}>
              Usar contraproposta
            </Button>
          )}
        </Alert>
      )}
    </div>
  );
}

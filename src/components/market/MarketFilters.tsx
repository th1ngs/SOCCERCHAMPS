"use client";

import type { ReactNode } from "react";
import { RotateCcw, Search } from "lucide-react";
import { POS, POS_NAME } from "@/game";
import type { Position } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { AGE_OPTIONS, MAX_OPTIONS, OVR_OPTIONS, type MarketFilter } from "./marketFilter";

const field = "h-10 w-full rounded-xl bg-ink-950/70 px-3 text-sm text-snow ring-1 ring-inset ring-white/12 focus:outline-2 focus:outline-gold-400";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold text-mist">{label}</span>
      {children}
    </label>
  );
}

/** Filtros do mercado: posição, idade, overall, valor, só livres e busca por nome/clube. */
export function MarketFilters({ filter: f, onChange, onReset, canReset }: { filter: MarketFilter; onChange: (patch: Partial<MarketFilter>) => void; onReset: () => void; canReset: boolean }) {
  return (
    <div className="mb-4 rounded-(--radius-card) bg-ink-800 p-4 shadow-card ring-1 ring-inset ring-white/8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-4 lg:col-span-1">
          <Field label="Buscar">
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist" aria-hidden />
              <input type="search" value={f.q} onChange={(e) => onChange({ q: e.target.value })} placeholder="Nome ou clube" className={`${field} pl-9`} />
            </span>
          </Field>
        </div>
        <Field label="Posição">
          <select value={f.pos} onChange={(e) => onChange({ pos: e.target.value as "" | Position })} className={field}>
            <option value="">Todas as posições</option>
            {POS.map((p) => (
              <option key={p} value={p}>
                {POS_NAME[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Idade">
          <select value={f.age} onChange={(e) => onChange({ age: Number(e.target.value) })} className={field}>
            {AGE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a === 40 ? "Qualquer idade" : `Até ${a} anos`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Overall">
          <select value={f.ovr} onChange={(e) => onChange({ ovr: Number(e.target.value) })} className={field}>
            {OVR_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a ? `OVR ${a}+` : "Qualquer OVR"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Valor máximo">
          <select value={f.max} onChange={(e) => onChange({ max: Number(e.target.value) })} className={field}>
            {MAX_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a ? `Até R$ ${a} mi` : "Qualquer valor"}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={f.free} onChange={(e) => onChange({ free: e.target.checked })} className="size-4 accent-gold-400" />
          Só agentes livres
        </label>
        <Button variant="ghost" icon={<RotateCcw />} onClick={onReset} disabled={!canReset} title={canReset ? undefined : "Nenhum filtro ativo"}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}

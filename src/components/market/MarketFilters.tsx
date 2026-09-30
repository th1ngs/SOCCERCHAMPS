"use client";

import type { ReactNode } from "react";
import { RotateCcw, Search } from "lucide-react";
import { LEAGUES, LEAGUE_IDS, POS, POS_NAME, TRAITS, TRAIT_KEYS } from "@/game";
import type { LeagueId, Position, TraitKey } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Flag } from "@/components/ui/Flag";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { AGE_OPTIONS, MAX_OPTIONS, OVR_OPTIONS, type LeagueFilter, type MarketFilter } from "./marketFilter";

const field = "h-10 w-full rounded-xl bg-ink-950/70 px-3 text-sm text-snow ring-1 ring-inset ring-white/12 focus:outline-2 focus:outline-gold-400";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold text-mist">{label}</span>
      {children}
    </label>
  );
}

/** Sigla curta do país (rótulo do filtro no celular). */
const LEAGUE_CODE: Record<LeagueId, string> = { bra: "BRA", arg: "ARG", por: "POR", esp: "ESP", eng: "ING", ita: "ITA", ger: "ALE", fra: "FRA", ned: "HOL", bel: "BEL", tur: "TUR", sco: "ESC", gre: "GRE" };

const LEAGUE_OPTIONS: SegmentedOption<LeagueFilter>[] = [
  { value: "", label: "Todas" },
  ...LEAGUE_IDS.map((id) => ({
    value: id,
    label: (
      <span className="inline-flex items-center gap-1.5" title={LEAGUES[id].name}>
        <Flag code={id} decorative />
        <span className="sm:hidden">{LEAGUE_CODE[id]}</span>
        <span className="hidden sm:inline">{LEAGUES[id].name}</span>
        <span className="sr-only sm:hidden">{LEAGUES[id].name}</span>
      </span>
    ),
  })),
  { value: "free", label: "Agentes livres" },
];

/** Filtros do mercado: liga, posição, nacionalidade, idade, overall, valor e busca por nome/clube. */
export function MarketFilters({ filter: f, onChange, onReset, canReset }: { filter: MarketFilter; onChange: (patch: Partial<MarketFilter>) => void; onReset: () => void; canReset: boolean }) {
  return (
    <div className="mb-4 rounded-(--radius-card) bg-ink-800 p-4 shadow-card ring-1 ring-inset ring-white/8">
      <div className="mb-3 min-w-0">
        <span className="mb-1 block text-xs font-semibold text-mist">
          Liga
        </span>
        <Segmented ariaLabel="Liga do clube" options={LEAGUE_OPTIONS} value={f.league} onChange={(league) => onChange({ league })} className="max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-[1.4fr_repeat(3,1fr)] xl:grid-cols-[1.4fr_repeat(6,1fr)]">
        <div className="col-span-2 md:col-span-3 lg:col-span-1">
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
        <Field label="Nacionalidade">
          <select value={f.nat} onChange={(e) => onChange({ nat: e.target.value as "" | LeagueId })} className={field}>
            <option value="">Todas as nacionalidades</option>
            {LEAGUE_IDS.map((id) => (
              <option key={id} value={id}>
                {LEAGUES[id].country}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Habilidade">
          <select value={f.trait} onChange={(e) => onChange({ trait: e.target.value as "" | TraitKey })} className={field}>
            <option value="">Qualquer habilidade</option>
            {TRAIT_KEYS.map((k) => (
              <option key={k} value={k}>
                {TRAITS[k].name}
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
        <div className="flex items-end justify-end lg:col-span-4 xl:col-span-7">
          <Button variant="ghost" icon={<RotateCcw />} onClick={onReset} disabled={!canReset} title={canReset ? undefined : "Nenhum filtro ativo"}>
            Limpar filtros
          </Button>
        </div>
      </div>
    </div>
  );
}

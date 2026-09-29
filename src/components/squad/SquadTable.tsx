"use client";

import { formatMoney } from "@/game";
import type { Player } from "@/game/types";
import { Flag } from "@/components/ui/Flag";
import { Meter, OvrBadge, PosBadge, Stars } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { contractText, potentialStars } from "@/components/player/playerInfo";
import { SortableTh } from "./SortableTh";
import { StatusTags } from "./StatusTags";
import type { SortKey, SortState } from "./squadSort";
import type { StatusTag } from "./statusTags";
import { LoanBadge, PromiseBadge } from "./TransferMarkBadges";
import { useTransferMarks } from "./transferMarks";
import { TraitChips } from "@/components/player/TraitChips";

export interface SquadRow {
  p: Player;
  value: number;
  tags: StatusTag[];
}

/** Tabela do elenco (telas ≥ 640 px). A linha inteira abre a ficha; o nome é o alvo de teclado. */
export function SquadTable({ rows, sort, onSort, onOpen }: { rows: SquadRow[]; sort: SortState; onSort: (k: SortKey) => void; onOpen: (pid: string) => void }) {
  const marks = useTransferMarks(rows.map((r) => r.p));
  const th = (k: SortKey, label: string, align?: "left" | "right" | "center") => <SortableTh k={k} label={label} sort={sort} onSort={onSort} align={align} />;
  return (
    <div className="overflow-x-auto rounded-(--radius-card) bg-ink-800 shadow-card ring-1 ring-inset ring-white/8">
      <table className="w-full min-w-[1080px] text-sm">
        <caption className="sr-only">Jogadores do elenco. Use os cabeçalhos para ordenar.</caption>
        <thead className="border-b border-white/8 bg-ink-900/40">
          <tr>
            {th("num", "#", "right")}
            {th("nat", "Nac.", "center")}
            {th("name", "Nome")}
            {th("pos", "Pos")}
            {th("age", "Idade", "right")}
            {th("ovr", "OVR", "center")}
            {th("pot", "Pot.")}
            {th("fit", "Cond.")}
            {th("morale", "Moral")}
            {th("goals", "J / G / A", "right")}
            {th("value", "Valor", "right")}
            {th("contract", "Contrato", "right")}
            <th scope="col" className="px-2 text-left font-display text-xs font-bold uppercase tracking-wider text-mist">
              <abbr title="Papel prometido na contratação ou renovação" className="no-underline">
                Papel
              </abbr>
            </th>
            <th scope="col" className="px-2 text-left font-display text-xs font-bold uppercase tracking-wider text-mist">
              Situação
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, value, tags }) => (
            <tr
              key={p.id}
              onClick={() => onOpen(p.id)}
              className={cn("cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/4 focus-within:bg-white/6", (p.inj > 0 || p.susp > 0) && "text-snow/70")}
            >
              <td className="px-2 py-2 text-right tabular text-mist">{p.num || "—"}</td>
              <td className="px-2 py-2 text-center">
                <Flag code={p.nat} />
              </td>
              <td className="px-2 py-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(p.id);
                  }}
                  className="min-h-9 max-w-56 truncate rounded-md text-left font-semibold hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400"
                >
                  {p.name}
                </button>
              </td>
              <td className="px-2 py-2">
                <PosBadge pos={p.pos} />
              </td>
              <td className="px-2 py-2 text-right tabular">{p.age}</td>
              <td className="px-2 py-2 text-center">
                <OvrBadge value={p.ovr} />
              </td>
              <td className="px-2 py-2">
                {(() => {
                  const r = marks.get(p.id)?.range;
                  return r && !r.exact ? (
                    <span className="font-display font-bold tabular text-snow/85" title="Faixa estimada: fica exata após 10 semanas no clube">
                      {Math.round(r.min)}–{Math.round(r.max)}
                    </span>
                  ) : (
                    <Stars value={potentialStars(p, true)} />
                  );
                })()}
              </td>
              <td className="px-2 py-2">
                <Meter value={p.fitness} label={`Condição ${Math.round(p.fitness)}%`} />
              </td>
              <td className="px-2 py-2">
                <Meter value={p.morale} label={`Moral ${Math.round(p.morale)}`} />
              </td>
              <td className="px-2 py-2 text-right tabular whitespace-nowrap">
                {p.s.apps} / {p.s.goals} / {p.s.assists}
              </td>
              <td className="px-2 py-2 text-right tabular whitespace-nowrap">{formatMoney(value)}</td>
              <td className={cn("px-2 py-2 text-right tabular whitespace-nowrap", p.contract <= 1 && "text-warn-400")}>{contractText(p.contract)}</td>
              <td className="px-2 py-2 whitespace-nowrap">
                <PromiseBadge marks={marks.get(p.id)} />
              </td>
              <td className="px-2 py-2">
                <span className="inline-flex flex-wrap items-center gap-1">
                  <StatusTags tags={tags} />
                  <TraitChips traits={p.traits} />
                  <LoanBadge marks={marks.get(p.id)} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

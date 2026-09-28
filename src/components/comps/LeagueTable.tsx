"use client";

import { useMemo } from "react";
import { table } from "@/game";
import type { Division } from "@/game/types";
import { FormChips } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { ClubTag } from "./ClubTag";
import { ResultList } from "./Results";
import { aproveitamento, lastLeagueRound } from "./derive";

type Zone = "champ" | "down" | "up" | null;

const zoneOf = (div: Division, i: number, n: number): Zone =>
  div === "A" ? (i === 0 ? "champ" : i >= n - 3 ? "down" : null) : i < 3 ? "up" : null;

const zoneStripe: Record<Exclude<Zone, null>, string> = {
  champ: "before:bg-gold-400",
  down: "before:bg-danger-500",
  up: "before:bg-pitch-400",
};

const COLS = ["P", "J", "V", "E", "D", "GP", "GC", "SG", "%"] as const;
const COL_TITLE: Record<(typeof COLS)[number], string> = {
  P: "Pontos", J: "Jogos", V: "Vitórias", E: "Empates", D: "Derrotas", GP: "Gols pró", GC: "Gols contra", SG: "Saldo de gols", "%": "Aproveitamento",
};

function Legend({ div }: { div: Division }) {
  const items = div === "A"
    ? [["bg-gold-400", "Campeão"], ["bg-danger-500", "Rebaixamento (3 últimos)"]]
    : [["bg-pitch-400", "Acesso à Série A (3 primeiros)"]];
  return (
    <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mist">
      {items.map(([cls, label]) => (
        <span key={label} className="inline-flex items-center gap-2">
          <span className={cn("h-3 w-1 rounded-full", cls)} aria-hidden /> {label}
        </span>
      ))}
    </p>
  );
}

/** Classificação completa de uma divisão, com zonas, legenda e a última rodada. */
export function LeagueTable({ div }: { div: Division }) {
  const { world: w, version } = useWorld();
  const { rows, last } = useMemo(() => {
    void version;
    return { rows: table(w, div), last: lastLeagueRound(w, div) };
  }, [w, div, version]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="max-h-[75dvh] overflow-auto rounded-(--radius-card) bg-ink-800 shadow-card ring-1 ring-inset ring-white/8">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">Classificação da Série {div}</caption>
            <thead>
              <tr className="font-display text-xs font-bold uppercase tracking-wider text-mist">
                <th scope="col" className="sticky left-0 top-0 z-20 bg-ink-850 py-2.5 pl-3 pr-2 text-left">
                  <span className="inline-block w-6 text-right">#</span>
                  <span className="ml-3">Clube</span>
                </th>
                {COLS.map((c) => (
                  <th key={c} scope="col" title={COL_TITLE[c]} className="sticky top-0 z-10 bg-ink-850 px-2 py-2.5 text-center">
                    {c}
                  </th>
                ))}
                <th scope="col" className="sticky top-0 z-10 bg-ink-850 px-3 py-2.5 text-left">Últimos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const me = r.id === w.userClub;
                const zone = zoneOf(div, i, rows.length);
                const cell = cn("border-t border-white/6 px-2 py-2 text-center tabular", me && "bg-gold-400/10");
                return (
                  <tr key={r.id} aria-current={me ? "true" : undefined}>
                    <th
                      scope="row"
                      className={cn(
                        "sticky left-0 z-[5] border-t border-white/6 py-2 pl-3 pr-2 text-left font-normal",
                        "before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r-full",
                        zone && zoneStripe[zone],
                        "bg-ink-800",
                        me && "bg-linear-to-r from-gold-400/10 to-gold-400/10",
                      )}
                    >
                      <span className="flex max-w-[180px] items-center gap-3 sm:max-w-[240px]">
                        <span className="w-6 shrink-0 text-right font-display text-base font-bold text-mist tabular">{i + 1}</span>
                        <ClubTag id={r.id} bold={me} />
                      </span>
                    </th>
                    <td className={cn(cell, "font-display text-base font-extrabold text-snow")}>{r.p}</td>
                    <td className={cell}>{r.j}</td>
                    <td className={cell}>{r.v}</td>
                    <td className={cell}>{r.e}</td>
                    <td className={cell}>{r.d}</td>
                    <td className={cell}>{r.gf}</td>
                    <td className={cell}>{r.ga}</td>
                    <td className={cn(cell, r.gf - r.ga > 0 ? "text-pitch-400" : r.gf - r.ga < 0 ? "text-danger-400" : "")}>
                      {r.gf - r.ga > 0 ? "+" : ""}{r.gf - r.ga}
                    </td>
                    <td className={cn(cell, "text-mist")}>{aproveitamento(r.p, r.j)}</td>
                    <td className={cn(cell, "px-3 text-left")}><FormChips form={r.form.slice(-5)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Legend div={div} />
      </div>
      {last && <ResultList title={`Última rodada • ${last.wk.round}ª`} matches={last.wk.matches.filter((m) => m.comp === div)} />}
    </div>
  );
}

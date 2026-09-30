"use client";

import { Trophy } from "lucide-react";
import { careerTotals, playerCareer } from "@/game";
import type { Player, World } from "@/game/types";
import { ClubTag } from "@/components/comps/ClubTag";
import { cn } from "@/lib/cn";

const TH = "px-2 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-mist";

/** Carreira do jogador temporada a temporada, com os títulos de cada uma. */
export function PlayerCareer({ w, player }: { w: World; player: Player }) {
  const rows = playerCareer(w, player);
  const t = careerTotals(w, player);
  return (
    <section className="rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-gold-400">Carreira</h3>
        <span className="text-sm text-mist">
          {t.apps} jogos • {t.goals} gols • {t.assists} assistências{t.titles ? ` • ${t.titles} ${t.titles === 1 ? "título" : "títulos"}` : ""}
          {player.intl && ` • seleção: ${player.intl[0]} jogos, ${player.intl[1]} gols`}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-mist">Ainda sem jogos como profissional.</p>
      ) : (
        <div className="-mx-3 overflow-x-auto px-3">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr>
                <th scope="col" className={cn(TH, "text-left")}>Temp.</th>
                <th scope="col" className={cn(TH, "text-left")}>Clube</th>
                <th scope="col" className={cn(TH, "text-right")} title="Jogos">J</th>
                <th scope="col" className={cn(TH, "text-right")} title="Gols">G</th>
                <th scope="col" className={cn(TH, "text-right")} title="Assistências">A</th>
                <th scope="col" className={cn(TH, "text-right")}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.season}-${r.club}`} className="border-t border-white/6 align-top">
                  <td className="px-2 py-1.5 tabular">
                    {r.season}
                    {r.current && <span className="block text-xs text-mist">atual</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    <ClubTag id={r.club} />
                    {r.titles.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {r.titles.map((tt) => (
                          <span key={tt} className="inline-flex items-center gap-1 rounded-md bg-gold-400/12 px-1.5 py-0.5 text-xs font-semibold text-gold-300">
                            <Trophy className="size-3" aria-hidden /> {tt}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular">{r.apps}</td>
                  <td className="px-2 py-1.5 text-right tabular">{r.goals}</td>
                  <td className="px-2 py-1.5 text-right tabular">{r.assists}</td>
                  <td className="px-2 py-1.5 text-right tabular">{r.rating ? r.rating.toFixed(2).replace(".", ",") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

"use client";

import { CircleCheck, CircleX, Trophy } from "lucide-react";
import { user } from "@/game";
import { Card, EmptyState } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { ClubTag } from "./ClubTag";

/** Sala de troféus do clube do usuário e tabela de temporadas anteriores. */
export function HistoryView() {
  const { world: w } = useWorld();
  const u = user(w);
  const seasons = w.history.slice().reverse();

  return (
    <div className="flex flex-col gap-4">
      <Card title={`Sala de troféus • ${u.name}`}>
        {u.trophies.length ? (
          <ul className="flex flex-wrap gap-2">
            {u.trophies.map((t, i) => (
              <li key={`${t.comp}-${t.season}-${i}`} className="flex items-center gap-2 rounded-xl bg-gold-400/10 px-3 py-2 ring-1 ring-inset ring-gold-400/30">
                <Trophy className="size-4 text-gold-400" aria-hidden />
                <span className="font-display font-bold uppercase tracking-wide">{t.comp}</span>
                <span className="text-sm text-mist tabular">{t.season}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Nenhum título ainda. O primeiro está logo ali.</EmptyState>
        )}
      </Card>

      <Card title="Temporadas">
        {seasons.length ? (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="font-display text-xs font-bold uppercase tracking-wider text-mist">
                  <th scope="col" className="px-4 py-2 text-left sm:px-5">Temporada</th>
                  <th scope="col" className="px-2 py-2 text-left">Série A</th>
                  <th scope="col" className="px-2 py-2 text-left">Série B</th>
                  <th scope="col" className="px-2 py-2 text-left">Copa</th>
                  <th scope="col" className="px-2 py-2 text-left">Seu time</th>
                  <th scope="col" className="px-4 py-2 text-left sm:px-5">Artilheiro A</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((h) => (
                  <tr key={h.season} className="border-t border-white/6">
                    <td className="px-4 py-2.5 font-display text-base font-bold tabular sm:px-5">{h.season}</td>
                    <td className="max-w-[170px] px-2 py-2.5"><ClubTag id={h.champA} size={16} /></td>
                    <td className="max-w-[170px] px-2 py-2.5"><ClubTag id={h.champB} size={16} /></td>
                    <td className="max-w-[170px] px-2 py-2.5">{h.cup ? <ClubTag id={h.cup} size={16} /> : "—"}</td>
                    <td className="px-2 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        {h.user.success ? (
                          <CircleCheck className="size-4 shrink-0 text-pitch-400" aria-label="Objetivo cumprido" />
                        ) : (
                          <CircleX className="size-4 shrink-0 text-danger-400" aria-label="Objetivo não cumprido" />
                        )}
                        <span className="truncate">{w.clubs[h.user.club]?.short ?? "—"} • {h.user.pos}º Série {h.user.div}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 sm:px-5">{h.scorerA ? `${h.scorerA.name} (${h.scorerA.goals})` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>O histórico aparece ao final da primeira temporada.</EmptyState>
        )}
      </Card>
    </div>
  );
}

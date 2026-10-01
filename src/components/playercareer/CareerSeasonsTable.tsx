"use client";

import { career, careerPlayer, seasonRating } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Crest } from "@/components/ui/Crest";
import { Card } from "@/components/ui/primitives";

/** Temporada a temporada: clube, jogos, gols, nota, títulos e prêmios (inclui a atual). */
export function CareerSeasonsTable() {
  const { world: w } = useWorld();
  const c = career(w);
  const p = careerPlayer(w);
  if (!c || !p) return null;
  const rows = c.seasons.slice().reverse();
  const current = !w.pendingSeason && !c.retired && w.week > 0
    ? { season: w.season, club: p.clubId, apps: p.s.apps, goals: p.s.goals, assists: p.s.assists, rating: seasonRating(p), ovr: Math.round(p.ovr), teamPos: null, titles: [], awards: [], current: true }
    : null;
  const all = current ? [current, ...rows] : rows;
  return (
    <Card title="Temporada a temporada">
      {all.length ? (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-mist">
                <th className="px-2 pb-2">Ano</th><th className="px-2 pb-2">Clube</th><th className="px-2 pb-2 text-right">J</th><th className="px-2 pb-2 text-right">G</th>
                <th className="px-2 pb-2 text-right">A</th><th className="px-2 pb-2 text-right">Nota</th><th className="px-2 pb-2 text-right">OVR</th><th className="px-2 pb-2">Conquistas</th>
              </tr>
            </thead>
            <tbody>
              {all.map((r) => {
                const club = r.club ? w.clubs[r.club] : null;
                return (
                  <tr key={r.season + (("current" in r) ? "c" : "")} className="border-t border-white/6">
                    <td className="px-2 py-2 tabular">{r.season}{"current" in r ? "*" : ""}</td>
                    <td className="px-2 py-2"><span className="flex items-center gap-2">{club && <Crest club={club} size={18} />}<span className="truncate">{club?.name ?? "sem clube"}</span>{r.teamPos ? <span className="text-xs text-mist">{r.teamPos}º</span> : null}</span></td>
                    <td className="px-2 py-2 text-right tabular">{r.apps}</td>
                    <td className="px-2 py-2 text-right tabular">{r.goals}</td>
                    <td className="px-2 py-2 text-right tabular">{r.assists}</td>
                    <td className="px-2 py-2 text-right tabular">{r.rating?.toFixed(2).replace(".", ",") ?? "—"}</td>
                    <td className="px-2 py-2 text-right tabular">{r.ovr}</td>
                    <td className="px-2 py-2 text-xs text-gold-300">{[...r.titles, ...r.awards].join(" • ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {current && <p className="mt-2 px-2 text-xs text-mist">* temporada em andamento</p>}
        </div>
      ) : (
        <p className="text-sm text-mist">A carreira começa na primeira temporada.</p>
      )}
    </Card>
  );
}

"use client";

import { useMemo } from "react";
import { careerPlayer, divisionFullName, table, topScorers } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Crest } from "@/components/ui/Crest";
import { Card, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/** Classificação da divisão do clube do jogador e artilharia (destacando o jogador). */
export default function CareerTablePage() {
  const { world: w, version } = useWorld();
  const p = careerPlayer(w);
  const data = useMemo(() => {
    void version;
    const club = p?.clubId ? w.clubs[p.clubId] : null;
    const div = club?.div ?? w.clubs[w.userClub]?.div;
    return div ? { div, club, rows: table(w, div), scorers: topScorers(w, div, 10) } : null;
  }, [w, version, p]);
  if (!p || !data) return <EmptyState>Sem tabela no momento.</EmptyState>;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold uppercase italic">{divisionFullName(data.div)}</h1>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-mist">
                  <th className="px-2 pb-2 text-right">#</th><th className="px-2 pb-2 text-left">Clube</th><th className="px-2 pb-2 text-right">J</th>
                  <th className="px-2 pb-2 text-right">V</th><th className="px-2 pb-2 text-right">E</th><th className="px-2 pb-2 text-right">D</th><th className="px-2 pb-2 text-right">SG</th><th className="px-2 pb-2 text-right">P</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => {
                  const c = w.clubs[r.id];
                  const mine = r.id === data.club?.id;
                  return (
                    <tr key={r.id} className={cn("border-t border-white/6", mine && "bg-gold-400/10 font-semibold text-gold-300")}>
                      <td className="px-2 py-1.5 text-right tabular">{i + 1}</td>
                      <td className="px-2 py-1.5"><span className="flex items-center gap-2"><Crest club={c} size={18} /><span className="truncate">{c.name}</span></span></td>
                      <td className="px-2 py-1.5 text-right tabular">{r.j}</td>
                      <td className="px-2 py-1.5 text-right tabular">{r.v}</td>
                      <td className="px-2 py-1.5 text-right tabular">{r.e}</td>
                      <td className="px-2 py-1.5 text-right tabular">{r.d}</td>
                      <td className="px-2 py-1.5 text-right tabular">{r.gf - r.ga}</td>
                      <td className="px-2 py-1.5 text-right font-bold tabular">{r.p}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Artilharia">
          {data.scorers.length ? (
            <ol className="space-y-1">
              {data.scorers.map((s, i) => (
                <li key={s.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm", s.id === p.id ? "bg-gold-400/12 font-semibold text-gold-300" : "")}>
                  <span className="w-5 text-right text-mist tabular">{i + 1}</span>
                  {s.clubId && <Crest club={w.clubs[s.clubId]} size={18} />}
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="font-display font-bold tabular">{s.s.goals}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-mist">Ninguém marcou ainda.</p>
          )}
          {!data.scorers.some((s) => s.id === p.id) && p.s.goals > 0 && <p className="mt-2 text-xs text-mist">Você: {p.s.goals} gol(s).</p>}
        </Card>
      </div>
    </div>
  );
}

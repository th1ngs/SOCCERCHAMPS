"use client";

import { useState } from "react";
import { Medal, Trophy } from "lucide-react";
import { YOUTH_CATS, YOUTH_NAMES, divisionName, user, youthScorers, youthTable } from "@/game";
import type { YouthCat } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Segmented } from "@/components/ui/Segmented";
import { Alert, Card, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/** Campeonatos Sub-17 e Sub-20 da divisão do usuário: tabela, artilharia, final e as promessas convocadas. */
export function YouthCompsCard() {
  const { world: w, setOverlay } = useWorld();
  const [cat, setCat] = useState<YouthCat>("sub20");
  const u = user(w);
  const yl = w.youthLeagues;
  const lg = yl?.cats[cat];
  const callups = w.youthCallups?.find((c) => c.season === w.season);
  const mine = callups ? YOUTH_CATS.flatMap((c) => Object.values(callups[c]).flat().filter((id) => w.players[id]?.clubId === u.id).map((id) => ({ id, c }))) : [];
  return (
    <Card title="Campeonatos de base" action={<Segmented ariaLabel="Categoria" size="sm" value={cat} onChange={setCat} options={YOUTH_CATS.map((c) => ({ value: c, label: YOUTH_NAMES[c] }))} />} className="lg:col-span-2">
      {!yl || !lg ? (
        <EmptyState>Os campeonatos de base começam com a temporada.</EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-mist">
            {YOUTH_NAMES[cat]} da {divisionName(yl.div)} • turno único ({lg.round}/{lg.rounds.length} rodadas) e final entre os dois primeiros.
            {cat === "sub20" ? " Os titulares do time principal não jogam o Sub-20." : " Só garotos de até 17 anos."} Quem joga a base evolui mais.
          </p>
          {lg.champion && lg.final && (
            <Alert tone={lg.champion === u.id ? "good" : "info"} className="mb-3">
              <Trophy className="size-4 text-gold-400" aria-hidden />
              <span>
                Final: {w.clubs[lg.final.h]?.name} {lg.final.hs} x {lg.final.as} {w.clubs[lg.final.a]?.name}
                {lg.final.pens ? ` (pênaltis ${lg.final.pens[0]} x ${lg.final.pens[1]})` : ""}. Campeão: <b>{w.clubs[lg.champion]?.name}</b>
              </span>
            </Alert>
          )}
          <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-mist">
                    <th className="px-1 py-1">#</th><th className="px-1">Clube</th><th className="px-1 text-right">P</th><th className="px-1 text-right">J</th><th className="px-1 text-right">V</th><th className="px-1 text-right">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {youthTable(lg).map((r, i) => {
                    const c = w.clubs[r.id];
                    return (
                      <tr key={r.id} className={cn("border-t border-white/5", r.id === u.id && "bg-gold-400/10 font-semibold", i < 2 && "text-snow")}>
                        <td className={cn("px-1 py-1 tabular", i < 2 ? "text-gold-300" : "text-mist")}>{i + 1}</td>
                        <td className="px-1"><span className="flex min-w-0 items-center gap-1.5">{c && <Crest club={c} size={16} />}<span className="truncate">{c?.name}</span></span></td>
                        <td className="px-1 text-right font-bold tabular">{r.p}</td>
                        <td className="px-1 text-right tabular text-mist">{r.j}</td>
                        <td className="px-1 text-right tabular text-mist">{r.v}</td>
                        <td className="px-1 text-right tabular text-mist">{r.gf - r.ga}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-4">
              <section>
                <h4 className="mb-1.5 flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-gold-300"><Medal className="size-3.5" aria-hidden /> Artilharia</h4>
                {youthScorers(lg, 6).length ? (
                  <ol className="space-y-1 text-sm">
                    {youthScorers(lg, 6).map((s, i) => (
                      <li key={s.pid} className={cn("flex items-center gap-2 rounded-lg px-2 py-1", s.club === u.id ? "bg-gold-400/10" : "bg-white/[0.03]")}>
                        <span className="w-4 tabular text-mist">{i + 1}</span>
                        <button type="button" className="min-w-0 flex-1 truncate text-left hover:text-gold-300" onClick={() => w.players[s.pid] && setOverlay({ kind: "player", pid: s.pid })}>{s.name}</button>
                        <span className="text-xs text-mist">{w.clubs[s.club]?.short}</span>
                        <b className="tabular">{s.goals}</b>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-mist">Sem gols ainda.</p>
                )}
              </section>
              <section>
                <h4 className="mb-1.5 font-display text-xs font-bold uppercase tracking-wider text-gold-300">Convocados da sua base</h4>
                {mine.length ? (
                  <ul className="space-y-1 text-sm">
                    {mine.map(({ id, c }) => (
                      <li key={id + c} className="flex items-center gap-2"><Flag code={w.players[id].nat} /> <button type="button" className="truncate hover:text-gold-300" onClick={() => setOverlay({ kind: "player", pid: id })}>{w.players[id].name}</button> <span className="text-xs text-mist">{YOUTH_NAMES[c]}</span></li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-mist">{callups ? "Nenhum garoto do clube foi chamado nesta temporada." : "As seleções de base convocam no meio da temporada."}</p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

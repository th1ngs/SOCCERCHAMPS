"use client";

import { useState } from "react";
import { Crown, Goal, Medal, Swords, Trophy, Zap } from "lucide-react";
import { RECORD_NAMES, divisionName, LEAGUES, user } from "@/game";
import type { DivisionId, DivRecords, LeagueId, RecordMark, World } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Segmented } from "@/components/ui/Segmented";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { ClubTag } from "./ClubTag";

/** Artilheiros da história sem mexer no save (a tela só lê). */
function scorers(w: World, r: DivRecords) {
  const map = new Map<string, { key: string; name: string; club: string; goals: number; now: number }>();
  for (const [k, v] of Object.entries(r.allTime)) map.set(k, { key: k, ...v, now: 0 });
  if (r.curSeason === w.season) {
    for (const [pid, g] of Object.entries(r.cur)) {
      const p = w.players[pid], prev = map.get(pid);
      map.set(pid, { key: pid, name: p?.name ?? prev?.name ?? "?", club: p?.clubId ?? prev?.club ?? "", goals: (prev?.goals ?? 0) + g, now: g });
    }
  }
  return [...map.values()].sort((a, b) => b.goals - a.goals).slice(0, 10);
}

function Mark({ icon: Icon, label, m, value, sub, isNew }: { icon: typeof Goal; label: string; m: RecordMark; value: string; sub: React.ReactNode; isNew: boolean }) {
  return (
    <div className={cn("relative rounded-2xl p-3 ring-1 ring-inset", isNew ? "bg-gold-400/10 ring-gold-400/40" : "bg-ink-900/60 ring-white/8")}>
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-mist"><Icon className="size-3.5" aria-hidden /> {label}</span>
      <b className="mt-1 block font-display text-3xl font-extrabold tabular text-gold-400">{value}</b>
      <span className="block truncate text-sm">{sub}</span>
      <span className="block text-xs text-mist">{m.season}</span>
      {isNew && <Badge tone="gold" className="absolute right-2 top-2">Novo</Badge>}
    </div>
  );
}

/** Recordes dos campeonatos da liga: marcas, artilheiros da história, maiores campeões e os recordes que caíram. */
export function RecordsView({ league }: { league: LeagueId }) {
  const { world: w, setOverlay } = useWorld();
  const u = user(w);
  const divs = LEAGUES[league].divisions.filter((d) => !!w.champRecords?.[d]);
  const [div, setDiv] = useState<DivisionId>(divs.includes(u.div) ? u.div : divs[0]);
  const r = w.champRecords?.[div];
  if (!r) return <EmptyState>Os recordes são acompanhados nos campeonatos da sua liga.</EmptyState>;
  const top = scorers(w, r);
  const titles = Object.entries(r.titles).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const breaks = (w.recordBreaks ?? []).filter((b) => b.div === div).slice(-6).reverse();
  const fresh = (m: RecordMark) => m.season === w.season;
  return (
    <div className="space-y-4">
      {divs.length > 1 && <Segmented ariaLabel="Divisão" size="sm" value={div} onChange={setDiv} options={divs.map((d) => ({ value: d, label: divisionName(d) }))} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mark icon={Goal} label={RECORD_NAMES.seasonGoals} m={r.seasonGoals} value={String(r.seasonGoals.value)} sub={r.seasonGoals.name} isNew={fresh(r.seasonGoals)} />
        <Mark icon={Swords} label={RECORD_NAMES.biggestWin} m={r.biggestWin} value={(r.biggestWin.score ?? "").split(" no ")[0]} sub={<>{r.biggestWin.name}{r.biggestWin.score?.includes(" no ") ? <span className="text-mist"> no {r.biggestWin.score.split(" no ")[1]}</span> : null}</>} isNew={fresh(r.biggestWin)} />
        <Mark icon={Zap} label={RECORD_NAMES.points} m={r.points} value={String(r.points.value)} sub={r.points.name} isNew={fresh(r.points)} />
        <Mark icon={Medal} label={RECORD_NAMES.teamGoals} m={r.teamGoals} value={String(r.teamGoals.value)} sub={r.teamGoals.name} isNew={fresh(r.teamGoals)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Artilheiros da história">
          <ol className="space-y-1 text-sm">
            {top.map((s, i) => {
              const live = !s.key.startsWith("leg:") && !!w.players[s.key];
              return (
                <li key={s.key} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", i === 0 ? "bg-gold-400/10" : "bg-white/[0.03]", s.club === u.id && live && "ring-1 ring-inset ring-gold-400/40")}>
                  <span className={cn("w-5 tabular", i === 0 ? "text-gold-300" : "text-mist")}>{i + 1}</span>
                  {i === 0 && <Crown className="size-4 shrink-0 text-gold-400" aria-label="Maior artilheiro" />}
                  {live ? (
                    <button type="button" className="min-w-0 flex-1 truncate text-left hover:text-gold-300" onClick={() => setOverlay({ kind: "player", pid: s.key })}>{s.name}</button>
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{s.name} <span className="text-xs text-mist">(lenda)</span></span>
                  )}
                  {s.now > 0 && <span className="text-xs text-pitch-400">+{s.now} na temporada</span>}
                  <b className="w-10 text-right tabular">{s.goals}</b>
                </li>
              );
            })}
          </ol>
        </Card>
        <Card title="Maiores campeões">
          <ol className="space-y-1 text-sm">
            {titles.map(([club, n], i) => (
              <li key={club} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", club === u.id ? "bg-gold-400/10" : "bg-white/[0.03]")}>
                <span className={cn("w-5 tabular", i === 0 ? "text-gold-300" : "text-mist")}>{i + 1}</span>
                <span className="min-w-0 flex-1"><ClubTag id={club} size={16} /></span>
                <span className="flex items-center gap-1 font-bold tabular"><Trophy className="size-3.5 text-gold-400" aria-hidden />{n}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <Card title="Recordes quebrados">
        {breaks.length ? (
          <ul className="space-y-1.5 text-sm">
            {breaks.map((b) => (
              <li key={b.id} className="rounded-lg bg-gold-400/8 px-2 py-1.5 ring-1 ring-inset ring-gold-400/20">
                <b className="block text-gold-300">{b.title}</b>
                <span className="block text-mist">{b.text}. <span className="text-xs">T{b.season}, semana {b.week}</span></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mist">Nenhum recorde caiu ainda na sua carreira. Quando cair, você é avisado na hora.</p>
        )}
      </Card>
    </div>
  );
}

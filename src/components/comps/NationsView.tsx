"use client";

import { useMemo, useState } from "react";
import { Trophy, Users } from "lucide-react";
import { LEAGUE_IDS, NATIONS_EVERY, NATIONS_NAME, callUp, nationName, nextNationsSeason, user } from "@/game";
import type { LeagueId, NationMatch, NationsEdition } from "@/game/types";
import { Card, EmptyState, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/Flag";
import { Segmented } from "@/components/ui/Segmented";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";

function Nation({ id, bold }: { id: LeagueId; bold?: boolean }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", bold && "font-semibold")}>
      <Flag code={id} decorative />
      <span className="truncate">{nationName(id)}</span>
    </span>
  );
}

function MatchLine({ m }: { m: NationMatch }) {
  const hw = m.hs > m.as || (m.hs === m.as && !!m.pens && m.pens[0] > m.pens[1]);
  const aw = m.as > m.hs || (m.hs === m.as && !!m.pens && m.pens[1] > m.pens[0]);
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 text-sm">
      <span className="flex justify-end"><Nation id={m.h} bold={hw} /></span>
      <span className="text-center font-display text-lg font-bold tabular">
        {m.hs} x {m.as}
        {m.pens && <span className="block text-xs font-normal text-mist">pên. {m.pens[0]}–{m.pens[1]}</span>}
      </span>
      <Nation id={m.a} bold={aw} />
    </li>
  );
}

/** Convocação de uma seleção (da edição ou a provável, antes do torneio). */
function SquadList({ ids }: { ids: string[] }) {
  const { world: w, setOverlay } = useWorld();
  const u = user(w);
  const players = ids.map((id) => w.players[id]).filter(Boolean);
  if (!players.length) return <EmptyState>Convocação indisponível.</EmptyState>;
  return (
    <ul className="grid gap-x-6 sm:grid-cols-2">
      {players.map((p) => (
        <li key={p.id} className="flex min-h-10 items-center gap-2 border-b border-white/6 py-1.5 text-sm">
          <PosBadge pos={p.pos} />
          <button type="button" onClick={() => setOverlay({ kind: "player", pid: p.id })} className={cn("min-w-0 flex-1 truncate text-left hover:text-gold-300", p.clubId === u.id && "font-semibold text-gold-300")}>
            {p.name}
          </button>
          <span className="max-w-[40%] truncate text-xs text-mist">{p.clubId ? w.clubs[p.clubId]?.short : "—"}</span>
          <OvrBadge value={p.ovr} size="sm" />
        </li>
      ))}
    </ul>
  );
}

function EditionView({ e }: { e: NationsEdition }) {
  const { world: w } = useWorld();
  const u = user(w);
  const [nat, setNat] = useState<LeagueId>(() => e.table.some((row) => row.id === u.league) ? u.league : e.table[0].id);
  const final = e.matches.find((m) => m.round === 0);
  const rounds = Array.from({ length: Math.max(0, ...e.matches.map((m) => m.round)) }, (_, i) => e.matches.filter((m) => m.round === i + 1));
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card tone="highlight" className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-gold-400 text-ink-950">
            <Trophy className="size-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-mist">{NATIONS_NAME} {e.season}</p>
            <p className="flex items-center gap-2 font-display text-3xl font-extrabold uppercase italic">
              <Flag code={e.champion} decorative /> {nationName(e.champion)} campeão
            </p>
          </div>
          {final && <ul className="w-full sm:w-auto sm:min-w-72"><MatchLine m={final} /></ul>}
        </div>
      </Card>
      <Card title="Classificação">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-display text-xs font-bold uppercase tracking-wider text-mist">
              <th className="py-1.5 text-left">#</th>
              <th className="py-1.5 text-left">Seleção</th>
              <th className="py-1.5 text-right">P</th>
              <th className="py-1.5 text-right">J</th>
              <th className="py-1.5 text-right">SG</th>
            </tr>
          </thead>
          <tbody>
            {e.table.map((r, i) => (
              <tr key={r.id} className={cn("border-t border-white/6", i < 2 && "bg-pitch-500/8")}>
                <td className="py-2 font-display font-bold text-mist">{i + 1}</td>
                <td className="py-2"><Nation id={r.id} bold={r.id === e.champion} /></td>
                <td className="py-2 text-right font-bold tabular">{r.p}</td>
                <td className="py-2 text-right tabular">{r.j}</td>
                <td className="py-2 text-right tabular">{r.gf - r.ga > 0 ? "+" : ""}{r.gf - r.ga}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-mist">Os dois primeiros fazem a final em jogo único.</p>
      </Card>
      <Card title="Artilharia">
        <ol className="divide-y divide-white/6">
          {e.scorers.map((s, i) => (
            <li key={s.pid} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-4 font-display font-bold text-mist">{i + 1}</span>
              <Flag code={s.nat} />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <b className="tabular">{s.goals}</b>
            </li>
          ))}
        </ol>
      </Card>
      <Card title="Jogos" className="lg:col-span-2">
        <div className="grid gap-x-6 md:grid-cols-2">
          {rounds.map((games, i) => (
            <section key={i}>
              <h4 className="mt-2 text-xs font-bold uppercase tracking-wider text-mist">Rodada {i + 1}</h4>
              <ul className="divide-y divide-white/6">{games.map((m) => <MatchLine key={`${m.h}-${m.a}`} m={m} />)}</ul>
            </section>
          ))}
        </div>
      </Card>
      <Card title="Convocados" className="lg:col-span-2">
        <Segmented ariaLabel="Seleção" value={nat} onChange={setNat} className="mb-3 w-full max-sm:grid max-sm:grid-cols-3" options={e.table.map((row) => ({ value: row.id, label: <><Flag code={row.id} decorative /> {nationName(row.id)}</> }))} />
        <SquadList ids={e.squads[nat] ?? []} />
      </Card>
    </div>
  );
}

/** Copa das Nações: a última edição (campeão, tabela, jogos, artilharia e convocados) ou a convocação provável. */
export function NationsView() {
  const { world: w, version } = useWorld();
  const u = user(w);
  const editions = w.nations ?? [];
  const [pick, setPick] = useState<number | null>(null);
  const e = editions.find((x) => x.season === pick) ?? editions[editions.length - 1] ?? null;
  const next = nextNationsSeason(e && e.season >= w.season ? w.season + 1 : w.season);
  const probable = useMemo(
    () => callUp(w, u.league),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w, u.league, version],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-mist">
        As seleções das {LEAGUE_IDS.length} nacionalidades se enfrentam entre uma temporada e outra, a cada {NATIONS_EVERY} anos. A convocação é automática com os 23 melhores de cada país. Próxima edição: fim da temporada {next}.
      </p>
      {editions.length > 1 && (
        <Segmented ariaLabel="Edição" value={String(e?.season)} onChange={(v) => setPick(Number(v))} options={editions.map((x) => ({ value: String(x.season), label: String(x.season) }))} />
      )}
      {e ? (
        <EditionView key={e.season} e={e} />
      ) : (
        <Card title={`Convocação provável: ${nationName(u.league)}`} action={<Users className="size-5 text-mist" aria-hidden />}>
          <p className="mb-3 text-sm text-mist">Se o torneio fosse hoje, estes seriam os convocados. Seus jogadores aparecem em dourado.</p>
          <SquadList ids={probable} />
        </Card>
      )}
    </div>
  );
}

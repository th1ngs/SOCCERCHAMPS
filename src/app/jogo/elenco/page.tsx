"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { POS, SQUAD_MAX, avg, clubPlayers, formatMoney, potentialRange, sum, user, valueOf } from "@/game";
import type { Player, Position } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { EmptyState, PageHeader, PosBadge } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { RenewalPanel } from "@/components/squad/RenewalPanel";
import { SquadCards } from "@/components/squad/SquadCards";
import { POS_PLURAL, SquadOverview } from "@/components/squad/SquadOverview";
import { SquadTable, type SquadRow } from "@/components/squad/SquadTable";
import { SORT_LABEL, nextSort, sortPlayers, type SortKey, type SortState } from "@/components/squad/squadSort";
import { statusTags } from "@/components/squad/statusTags";

type PosFilter = "all" | Position;
type Group = "all" | "xi" | "bench" | "alerts";
type View = "groups" | "table";
const FILTERS: { value: PosFilter; label: string }[] = [{ value: "all", label: "Todos" }, ...POS.map((p) => ({ value: p, label: p }))];
const GROUPS: { value: Group; label: string }[] = [
  { value: "all", label: "Elenco" },
  { value: "xi", label: "Titulares" },
  { value: "bench", label: "Banco" },
  { value: "alerts", label: "Alertas" },
];

/** Precisa de atenção: fora do jogo, pendurado, contrato acabando ou insatisfeito. */
const alert = (p: Player) => p.inj > 0 || p.susp > 0 || p.yc === 2 || (p.contract <= 1 && !p.loan) || p.morale < 40;

export default function ElencoPage() {
  const { world, version, setOverlay } = useWorld();
  const [pos, setPos] = useState<PosFilter>("all");
  const [group, setGroup] = useState<Group>("all");
  const [view, setView] = useState<View>("groups");
  const [sort, setSort] = useState<SortState>({ key: "pos", dir: "asc" });

  const data = useMemo(() => {
    const u = user(world);
    const all = clubPlayers(world, u);
    const inGroup = (p: Player) =>
      group === "all" ? true : group === "xi" ? u.lineup.includes(p.id) : group === "bench" ? !u.lineup.includes(p.id) : alert(p);
    const filtered = all.filter((p) => (pos === "all" || p.pos === pos) && inGroup(p));
    // Na visão por posição, titulares primeiro e depois pelo overall.
    const order: SortState = view === "groups" ? { key: "ovr", dir: "desc" } : sort;
    const sorted = sortPlayers(filtered, order, (p) => {
      const r = potentialRange(world, p);
      return (r.min + r.max) / 2;
    });
    if (view === "groups") sorted.sort((a, b) => Number(u.lineup.includes(b.id)) - Number(u.lineup.includes(a.id)));
    const rows: SquadRow[] = sorted.map((p) => ({ p, value: valueOf(p), tags: statusTags(u, p) }));
    return { u, all, count: all.length, wages: sum(all, (p) => p.wage), rows, alerts: all.filter(alert).length };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, version, pos, sort, group, view]);

  const open = (pid: string) => setOverlay({ kind: "player", pid });
  const onSort = (k: SortKey) => setSort((s) => nextSort(s, k));
  const groups = POS.map((ps) => ({ pos: ps, rows: data.rows.filter((r) => r.p.pos === ps) })).filter((g) => g.rows.length);

  return (
    <>
      <PageHeader
        title="Elenco"
        subtitle={
          <>
            <b className="text-snow tabular">
              {data.count}/{SQUAD_MAX}
            </b>{" "}
            jogadores • Folha salarial <b className="text-snow tabular">{formatMoney(data.wages)}/sem</b>. Toque em um jogador para ver detalhes, renovar, vender ou dispensar.
          </>
        }
      />

      <SquadOverview club={data.u} players={data.all} w={world} />
      <RenewalPanel />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            ariaLabel="Grupo"
            options={GROUPS.map((g) => (g.value === "alerts" && data.alerts ? { ...g, label: `Alertas (${data.alerts})` } : g))}
            value={group}
            onChange={setGroup}
          />
          <Segmented ariaLabel="Filtrar por posição" options={FILTERS} value={pos} onChange={setPos} />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <Segmented
              ariaLabel="Visualização"
              options={[
                { value: "groups", label: <span className="inline-flex items-center gap-1.5"><LayoutGrid className="size-4" aria-hidden />Por posição</span> },
                { value: "table", label: <span className="inline-flex items-center gap-1.5"><Table2 className="size-4" aria-hidden />Tabela</span> },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-mist sm:hidden">
            Ordenar
            <select
              value={view === "groups" ? "groups" : `${sort.key}:${sort.dir}`}
              onChange={(e) => {
                if (e.target.value === "groups") return setView("groups");
                const [key, dir] = e.target.value.split(":") as [SortKey, SortState["dir"]];
                setSort({ key, dir });
                setView("table");
              }}
              className="h-10 rounded-lg bg-ink-800 px-2 text-snow ring-1 ring-inset ring-white/12"
            >
              <option value="groups">Por posição</option>
              {(Object.keys(SORT_LABEL) as SortKey[]).flatMap((k) => [
                <option key={`${k}:desc`} value={`${k}:desc`}>
                  {SORT_LABEL[k]} ↓
                </option>,
                <option key={`${k}:asc`} value={`${k}:asc`}>
                  {SORT_LABEL[k]} ↑
                </option>,
              ])}
            </select>
          </label>
        </div>
      </div>

      {data.rows.length === 0 ? (
        <EmptyState>Nenhum jogador neste filtro.</EmptyState>
      ) : view === "groups" ? (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.pos} aria-label={POS_PLURAL[g.pos]}>
              <h3 className="mb-2 flex items-center gap-2 text-sm">
                <PosBadge pos={g.pos} />
                <span className="font-display font-bold uppercase tracking-wider text-snow">{POS_PLURAL[g.pos]}</span>
                <span className="text-mist">
                  {g.rows.length} • média {Math.round(avg(g.rows, (r) => r.p.ovr))}
                </span>
              </h3>
              <SquadCards rows={g.rows} onOpen={open} className="grid gap-2 space-y-0 sm:grid-cols-2 xl:grid-cols-3" />
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="hidden sm:block">
            <SquadTable rows={data.rows} sort={sort} onSort={onSort} onOpen={open} />
          </div>
          <div className="sm:hidden">
            <SquadCards rows={data.rows} onOpen={open} />
          </div>
        </>
      )}
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { POS, SQUAD_MAX, clubPlayers, formatMoney, potentialRange, sum, user, valueOf } from "@/game";
import type { Position } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { SquadCards } from "@/components/squad/SquadCards";
import { SquadTable, type SquadRow } from "@/components/squad/SquadTable";
import { SORT_LABEL, nextSort, sortPlayers, type SortKey, type SortState } from "@/components/squad/squadSort";
import { statusTags } from "@/components/squad/statusTags";

type PosFilter = "all" | Position;
const FILTERS: { value: PosFilter; label: string }[] = [{ value: "all", label: "Todos" }, ...POS.map((p) => ({ value: p, label: p }))];

export default function ElencoPage() {
  const { world, version, setOverlay } = useWorld();
  const [pos, setPos] = useState<PosFilter>("all");
  const [sort, setSort] = useState<SortState>({ key: "pos", dir: "asc" });

  const data = useMemo(() => {
    const u = user(world);
    const all = clubPlayers(world, u);
    const filtered = pos === "all" ? all : all.filter((p) => p.pos === pos);
    const rows: SquadRow[] = sortPlayers(filtered, sort, (p) => {
      const r = potentialRange(world, p);
      return (r.min + r.max) / 2;
    }).map((p) => ({ p, value: valueOf(p), tags: statusTags(u, p) }));
    return { count: all.length, wages: sum(all, (p) => p.wage), rows };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, version, pos, sort]);

  const open = (pid: string) => setOverlay({ kind: "player", pid });
  const onSort = (k: SortKey) => setSort((s) => nextSort(s, k));

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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented ariaLabel="Filtrar por posição" options={FILTERS} value={pos} onChange={setPos} />
        <label className="flex items-center gap-2 text-sm text-mist sm:hidden">
          Ordenar
          <select
            value={`${sort.key}:${sort.dir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(":") as [SortKey, SortState["dir"]];
              setSort({ key, dir });
            }}
            className="h-10 rounded-lg bg-ink-800 px-2 text-snow ring-1 ring-inset ring-white/12"
          >
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

      {data.rows.length === 0 ? (
        <EmptyState>Nenhum jogador nesta posição no elenco.</EmptyState>
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

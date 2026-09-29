"use client";

import { useMemo, useState } from "react";
import { clubPlayers, nextWindow, user, valueOf } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { ListedPlayers } from "@/components/market/ListedPlayers";
import { MarketCards } from "@/components/market/MarketCards";
import { MarketFilters } from "@/components/market/MarketFilters";
import { MarketTable } from "@/components/market/MarketTable";
import { WindowAlert } from "@/components/market/WindowAlert";
import { DEFAULT_FILTER, MARKET_LIMIT, isDefaultFilter, searchMarket, type MarketFilter } from "@/components/market/marketFilter";
import { useDebounced } from "@/components/market/useDebounced";
import { windowEnd } from "@/components/player/playerInfo";

export default function MercadoPage() {
  const { world, version, setOverlay } = useWorld();
  const [filter, setFilter] = useState<MarketFilter>(DEFAULT_FILTER);
  const q = useDebounced(filter.q, 250);

  const status = useMemo(() => {
    const u = user(world);
    const listed = clubPlayers(world, u)
      .filter((p) => p.listed)
      .map((p) => ({ p, value: valueOf(p) }));
    return { u, openUntil: windowEnd(world), nextOpen: nextWindow(world), listed };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, version]);

  const results = useMemo(
    () => searchMarket(world, { ...filter, q }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, version, filter.pos, filter.age, filter.ovr, filter.max, filter.league, filter.nat, q],
  );

  const open = (pid: string) => setOverlay({ kind: "player", pid });
  const patch = (p: Partial<MarketFilter>) => setFilter((f) => ({ ...f, ...p }));

  return (
    <>
      <PageHeader title="Mercado" subtitle="Encontre reforços nas seis ligas e entre os agentes livres. Toque em um jogador para ver a ficha e fazer uma proposta." />
      <WindowAlert openUntil={status.openUntil} nextOpen={status.nextOpen} money={status.u.money} />
      <MarketFilters filter={filter} onChange={patch} onReset={() => setFilter(DEFAULT_FILTER)} canReset={!isDefaultFilter(filter)} />

      <p className="mb-3 text-sm text-mist" aria-live="polite">
        {results.total} {results.total === 1 ? "jogador encontrado" : "jogadores encontrados"}
        {results.total > MARKET_LIMIT && ` (mostrando os ${MARKET_LIMIT} melhores)`}.
      </p>

      {results.rows.length === 0 ? (
        <EmptyState>Nenhum jogador com esses filtros. Tente outra liga ou nacionalidade, ou amplie a idade, o overall ou o valor máximo.</EmptyState>
      ) : (
        <>
          <div className="hidden sm:block">
            <MarketTable rows={results.rows} onOpen={open} />
          </div>
          <div className="sm:hidden">
            <MarketCards rows={results.rows} onOpen={open} />
          </div>
        </>
      )}

      <div className="mt-6">
        <ListedPlayers players={status.listed} onOpen={open} />
      </div>
    </>
  );
}

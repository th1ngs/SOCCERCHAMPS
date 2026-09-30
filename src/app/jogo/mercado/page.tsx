"use client";

import { useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ArrowLeftRight, Eye, Handshake, Newspaper, PlaneTakeoff, ScrollText, Search } from "lucide-react";
import { useWorld } from "@/components/game/GameProvider";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { DeadlineBanner } from "@/components/market/DeadlineBanner";
import { MarketCards } from "@/components/market/MarketCards";
import { MarketFilters } from "@/components/market/MarketFilters";
import { MarketTable } from "@/components/market/MarketTable";
import { TransferHeader } from "@/components/market/TransferHeader";
import { DEFAULT_FILTER, MARKET_LIMIT, isDefaultFilter, searchMarket, type MarketFilter } from "@/components/market/marketFilter";
import { loanRows, marketHeader, negotiationRows, windowInfo } from "@/components/market/transferDerive";
import { useDebounced } from "@/components/market/useDebounced";

const HistoryTab = dynamic(() => import("@/components/market/HistoryTab").then((m) => m.HistoryTab));
const LoansTab = dynamic(() => import("@/components/market/LoansTab").then((m) => m.LoansTab));
const NegotiationsTab = dynamic(() => import("@/components/market/NegotiationsTab").then((m) => m.NegotiationsTab));
const NewsTab = dynamic(() => import("@/components/market/NewsTab").then((m) => m.NewsTab));
const WatchlistTab = dynamic(() => import("@/components/market/WatchlistTab").then((m) => m.WatchlistTab));

type Tab = "buscar" | "observados" | "negociacoes" | "emprestimos" | "historico" | "noticias";
const TABS: Tab[] = ["buscar", "observados", "negociacoes", "emprestimos", "historico", "noticias"];

/** Aba pedida pela URL (`/jogo/mercado#observados`). */
function hashTab(): Tab {
  if (typeof window === "undefined") return "buscar";
  const h = window.location.hash.slice(1) as Tab;
  return TABS.includes(h) ? h : "buscar";
}

function TabLabel({ icon, text, count }: { icon: ReactNode; text: string; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 max-sm:flex-col max-sm:gap-0.5 max-sm:text-xs [&_svg]:size-4 max-sm:[&_svg]:size-5">
      {icon}
      {text}
      {count ? <span className="rounded-md bg-ink-950/40 px-1.5 text-xs tabular max-sm:absolute max-sm:right-1 max-sm:top-1">{count}</span> : null}
    </span>
  );
}

export default function MercadoPage() {
  const { world, version, setOverlay } = useWorld();
  const [tab, setTabRaw] = useState<Tab>(hashTab);
  const [filter, setFilter] = useState<MarketFilter>(DEFAULT_FILTER);
  const q = useDebounced(filter.q, 250);

  const status = useMemo(
    () => {
      const loans = loanRows(world);
      return {
        win: windowInfo(world),
        head: marketHeader(world),
        watch: world.watchlist.length,
        negs: negotiationRows(world).length + world.inbox.filter((m) => m.offer && !m.offer.done && !m.offer.expired && world.players[m.offer.pid]?.clubId === world.userClub).length,
        loans: loans.out.length + loans.in.length,
      };
    },
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, version],
  );

  const results = useMemo(
    () => searchMarket(world, { ...filter, q }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, version, filter.pos, filter.age, filter.ovr, filter.max, filter.league, filter.nat, filter.trait, q],
  );

  const open = (pid: string) => setOverlay({ kind: "player", pid });
  const patch = (p: Partial<MarketFilter>) => setFilter((f) => ({ ...f, ...p }));
  const setTab = (t: Tab) => {
    setTabRaw(t);
    try {
      window.history.replaceState(null, "", t === "buscar" ? window.location.pathname : `#${t}`);
    } catch {
      /* sem history */
    }
  };

  const options = [
    { value: "buscar" as const, label: <TabLabel icon={<Search />} text="Buscar" /> },
    { value: "observados" as const, label: <TabLabel icon={<Eye />} text="Observados" count={status.watch} /> },
    { value: "negociacoes" as const, label: <TabLabel icon={<Handshake />} text="Negociações" count={status.negs} /> },
    { value: "emprestimos" as const, label: <TabLabel icon={<PlaneTakeoff />} text="Empréstimos" count={status.loans} /> },
    { value: "historico" as const, label: <TabLabel icon={<ScrollText />} text="Histórico" /> },
    { value: "noticias" as const, label: <TabLabel icon={<Newspaper />} text="Notícias" /> },
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <ArrowLeftRight className="size-7 shrink-0 text-gold-400 sm:size-8" aria-hidden />
            Central de transferências
          </span>
        }
        subtitle="Busque e observe jogadores nas seis ligas, negocie taxa e contrato, empreste e acompanhe o histórico e as notícias do mercado."
      />
      <TransferHeader win={status.win} h={status.head} />
      {status.win.deadline && tab !== "noticias" && (
        <div className="mb-4">
          <DeadlineBanner />
        </div>
      )}

      <nav aria-label="Seções da Central de transferências" className="mb-4">
        <Segmented
          ariaLabel="Seção"
          options={options}
          value={tab}
          onChange={setTab}
          className="max-w-full max-sm:grid max-sm:w-full max-sm:grid-cols-3"
          itemClassName="relative max-sm:h-16"
        />
      </nav>

      {tab === "buscar" && (
        <>
          <MarketFilters filter={filter} onChange={patch} onReset={() => setFilter(DEFAULT_FILTER)} canReset={!isDefaultFilter(filter)} />
          <p className="mb-3 text-sm text-mist" aria-live="polite">
            {results.total} {results.total === 1 ? "jogador encontrado" : "jogadores encontrados"}
            {results.total > MARKET_LIMIT && ` (mostrando os ${MARKET_LIMIT} melhores)`}. Potencial em faixa: observe ou peça um relatório para afinar.
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
        </>
      )}
      {tab === "observados" && <WatchlistTab onOpen={open} />}
      {tab === "negociacoes" && <NegotiationsTab onOpen={open} />}
      {tab === "emprestimos" && <LoansTab onOpen={open} />}
      {tab === "historico" && <HistoryTab onOpen={open} />}
      {tab === "noticias" && <NewsTab onOpen={open} />}
    </>
  );
}

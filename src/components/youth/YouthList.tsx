"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Info } from "lucide-react";
import { POS, POS_NAME } from "@/game";
import type { Club, World } from "@/game/types";
import { Alert, EmptyState } from "@/components/ui/primitives";
import { ChoiceGroup } from "./ChoiceGroup";
import { filterYouth, posCounts, sortYouth, type PosFilter, type ScoutState, type YouthSort, type YouthView } from "./derive";
import { YouthCard } from "./YouthCard";

const SORTS: { value: YouthSort; label: string }[] = [
  { value: "pot", label: "Potencial" },
  { value: "age", label: "Idade" },
  { value: "pos", label: "Posição" },
  { value: "growth", label: "Evolução" },
];

export interface YouthActions {
  open: (pid: string) => void;
  promote: (v: YouthView) => void;
  loan: (v: YouthView) => void;
  scout: (v: YouthView) => void;
  dismiss: (v: YouthView) => void;
}

/** Lista dos garotos: ordenação, filtro por posição, avisos gerais e cartões. */
export function YouthList({
  world,
  views,
  scout,
  promoteBlock,
  windowBlock,
  scoutBlockFor,
  loanBlockFor,
  actions,
}: {
  world: World;
  views: YouthView[];
  scout: ScoutState;
  promoteBlock: string | null;
  /** Janela fechada (vale para todos os empréstimos). */
  windowBlock: string | null;
  scoutBlockFor: (v: YouthView) => string | null;
  loanBlockFor: (v: YouthView) => string | null;
  actions: YouthActions;
}) {
  const [sort, setSort] = useState<YouthSort>("pot");
  const [pos, setPos] = useState<PosFilter>("all");
  const counts = useMemo(() => posCounts(views), [views]);
  const list = useMemo(() => sortYouth(filterYouth(views, pos), sort), [views, pos, sort]);
  const scoutsBusy = scout.used >= scout.slots;

  const notices: string[] = [];
  if (promoteBlock) notices.push(`Promover: ${promoteBlock}. Libere uma vaga no elenco.`);
  if (windowBlock) notices.push(`Emprestar: ${windowBlock}.`);
  if (scoutsBusy) notices.push(`Relatórios: olheiros ocupados (${scout.used}/${scout.slots}). Contrate mais olheiros para ter mais vagas.`);

  return (
    <section aria-labelledby="youth-title" className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="youth-title" className="font-display text-xl font-bold uppercase tracking-wide">
          Garotos da base <span className="text-mist tabular">({views.length})</span>
        </h2>
      </div>

      {views.length > 0 && (
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mist">
              <ArrowDownUp className="size-3.5" aria-hidden /> Ordenar
            </span>
            <ChoiceGroup<YouthSort> ariaLabel="Ordenar garotos" value={sort} onChange={setSort} options={SORTS} itemClassName="px-2.5 text-xs sm:text-sm" />
          </div>
          <ChoiceGroup<PosFilter>
            ariaLabel="Filtrar por posição"
            value={pos}
            onChange={setPos}
            itemClassName="px-2.5 text-xs sm:text-sm"
            options={[
              { value: "all", label: <>Todas <span className="tabular opacity-70">{counts.all}</span></>, hint: `Todas as posições (${counts.all})` },
              ...POS.map((p) => ({
                value: p,
                label: (
                  <>
                    {p} <span className="tabular opacity-70">{counts[p]}</span>
                  </>
                ),
                hint: `${POS_NAME[p]} (${counts[p]})`,
                disabled: counts[p] === 0,
              })),
            ]}
          />
        </div>
      )}

      {notices.length > 0 && views.length > 0 && (
        <Alert tone="info" className="mb-3 items-start">
          <Info className="mt-0.5 size-4 shrink-0 text-info-400" aria-hidden />
          <ul className="min-w-0 flex-1 space-y-0.5 text-xs text-mist">
            {notices.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Alert>
      )}

      {views.length === 0 ? (
        <EmptyState>Nenhum garoto na base agora. Faça uma peneira ou aguarde a próxima safra na pré-temporada.</EmptyState>
      ) : list.length === 0 ? (
        <EmptyState>Nenhum garoto nessa posição. Escolha outra posição ou faça uma peneira focada nela.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((v) => {
            const loanBlock = loanBlockFor(v);
            const scoutBlock = scoutBlockFor(v);
            const notes: string[] = [];
            // Motivos gerais (elenco cheio, janela, olheiros) já aparecem uma vez acima da lista.
            if (loanBlock && loanBlock !== windowBlock) notes.push(`Emprestar: ${loanBlock}.`);
            if (scoutBlock && !v.reportDone && v.scoutReady === null && !scoutsBusy) notes.push(`Relatório: ${scoutBlock}.`);
            const offerClub: Club | null = v.offer ? world.clubs[v.offer.club] ?? null : null;
            return (
              <YouthCard
                key={v.p.id}
                view={v}
                offerClub={offerClub}
                scoutCost={scout.cost}
                promoteBlock={promoteBlock}
                loanBlock={loanBlock}
                scoutBlock={scoutBlock}
                notes={notes}
                onOpen={() => actions.open(v.p.id)}
                onPromote={() => actions.promote(v)}
                onLoan={() => actions.loan(v)}
                onScout={() => actions.scout(v)}
                onDismiss={() => actions.dismiss(v)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

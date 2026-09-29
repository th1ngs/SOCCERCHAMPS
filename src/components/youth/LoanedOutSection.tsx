"use client";

import { Undo2 } from "lucide-react";
import { divisionName } from "@/game";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Badge, EmptyState, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { pct, type LoanedView } from "./derive";

/** Jogadores do clube emprestados: onde estão, quanto jogam e quando voltam. */
export function LoanedOutSection({
  list,
  recallBlock,
  onRecall,
  onOpen,
}: {
  list: LoanedView[];
  /** Motivo para não poder chamar de volta (janela fechada) ou null. */
  recallBlock: string | null;
  onRecall: (pid: string) => void;
  onOpen: (pid: string) => void;
}) {
  return (
    <section aria-labelledby="loaned-title" className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="loaned-title" className="font-display text-xl font-bold uppercase tracking-wide">
          Emprestados <span className="text-mist tabular">({list.length})</span>
        </h2>
        {recallBlock && list.length > 0 && <p className="text-xs text-mist">Chamar de volta: {recallBlock}.</p>}
      </div>
      {list.length ? (
        <ul className="grid gap-2">
          {list.map((v) => (
            <li key={v.p.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl bg-ink-800 p-3 ring-1 ring-inset ring-white/8">
              <div className="flex min-w-0 flex-1 basis-56 items-center gap-2.5">
                <PosBadge pos={v.p.pos} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpen(v.p.id)}
                    className="block max-w-full truncate rounded text-left font-semibold hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400"
                  >
                    {v.p.name}
                  </button>
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-mist">
                    {v.club && <Crest club={v.club} size={14} className="shrink-0" />}
                    <span className="truncate">
                      {v.club ? v.club.name : "—"} • {v.p.age} anos
                    </span>
                    {v.league && v.club && (
                      <span className="hidden items-center gap-1 sm:inline-flex">
                        <Flag code={v.league} decorative /> {divisionName(v.club.div)}
                      </span>
                    )}
                  </p>
                </div>
                <OvrBadge value={v.p.ovr} />
              </div>
              <div className="flex items-center gap-3 text-xs text-mist">
                <Badge tone={v.role === "Titular" ? "green" : "neutral"}>{v.role}</Badge>
                <span className="tabular" title="Jogos e gols nesta temporada">
                  <strong className="text-snow">{v.apps}</strong> J • <strong className="text-snow">{v.goals}</strong> G
                </span>
                <span className="tabular" title={`O clube paga ${pct(v.wageShare)} do salário`}>
                  Volta em {v.until ?? "—"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<Undo2 />}
                className="h-10"
                disabled={!!recallBlock}
                title={recallBlock ?? `Encerrar o empréstimo de ${v.p.name}`}
                onClick={() => onRecall(v.p.id)}
              >
                Chamar de volta
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>Nenhum jogador emprestado. Garotos a partir de 17 anos podem ser emprestados com a janela aberta para ganhar minutos.</EmptyState>
      )}
    </section>
  );
}

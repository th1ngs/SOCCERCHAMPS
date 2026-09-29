"use client";

import Link from "next/link";
import { ArrowUpFromLine, FileSearch, Gem, Handshake, Hourglass, Plane, TriangleAlert, UserMinus, Zap } from "lucide-react";
import { formatMoney } from "@/game";
import type { Club } from "@/game/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Flag } from "@/components/ui/Flag";
import { Badge, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { countryName, type YouthView } from "./derive";
import { GrowthTrend, PotentialBar } from "./PotentialBar";
import { YouthTraits } from "./YouthTraits";

export interface YouthCardProps {
  view: YouthView;
  /** Clube que fez proposta pelo garoto (para o selo), se houver. */
  offerClub: Club | null;
  scoutCost: number;
  /** Motivos de bloqueio (null = liberado). */
  promoteBlock: string | null;
  loanBlock: string | null;
  scoutBlock: string | null;
  /** Motivos específicos deste garoto (os gerais aparecem uma vez acima da lista). */
  notes: string[];
  onOpen: () => void;
  onPromote: () => void;
  onLoan: () => void;
  onScout: () => void;
  onDismiss: () => void;
}

/** Cartão de um garoto da base: atual × faixa de potencial, evolução, características e ações. */
export function YouthCard({ view: v, offerClub, scoutCost, promoteBlock, loanBlock, scoutBlock, notes, onOpen, onPromote, onLoan, onScout, onDismiss }: YouthCardProps) {
  const p = v.p;
  const scoutLabel = v.reportDone ? "Relatório completo" : v.scoutReady !== null ? `Pronto na semana ${v.scoutReady}` : `Relatório do olheiro • ${formatMoney(scoutCost)}`;
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-(--radius-card) bg-ink-800 p-4 shadow-card ring-1 ring-inset",
        v.gem ? "ring-gold-400/35" : "ring-white/8",
      )}
    >
      <header className="flex items-start gap-2.5">
        <PosBadge pos={p.pos} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full truncate rounded text-left font-semibold leading-tight hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400"
            title={`Abrir ficha de ${p.name}`}
          >
            {p.name}
          </button>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-mist">
            <Flag code={p.nat} decorative />
            <span className="truncate">
              {countryName(p.nat)} • {p.age} anos
            </span>
          </p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <OvrBadge value={p.ovr} />
          <span className="text-xs uppercase tracking-wider text-mist">atual</span>
        </div>
      </header>

      {(v.gem || v.inFocus || v.decide || offerClub) && (
        <div className="flex flex-wrap gap-1">
          {v.gem && (
            <Badge tone="gold" title="Faixa de potencial conhecida com mínimo de 78">
              <Gem className="size-3" aria-hidden /> Joia
            </Badge>
          )}
          {v.inFocus && (
            <Badge tone="green" title="Setor em foco na base: evolui 15% mais rápido">
              <Zap className="size-3" aria-hidden /> Em foco
            </Badge>
          )}
          {v.decide && (
            <Badge tone="orange" title="Completa 19 anos na virada da temporada: sobe ao profissional se houver vaga, senão é dispensado">
              <TriangleAlert className="size-3" aria-hidden /> 19 anos: decidir
            </Badge>
          )}
          {offerClub && v.offer && (
            <Link href="/jogo/mensagens" className="rounded-md focus-visible:outline-2 focus-visible:outline-gold-400" title="Ver proposta na caixa de entrada">
              <Badge tone="blue">
                <Handshake className="size-3" aria-hidden /> {offerClub.short} oferece {formatMoney(v.offer.fee)}
              </Badge>
            </Link>
          )}
        </div>
      )}

      <div className="rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6">
        <PotentialBar range={v.range} ovr={p.ovr} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <GrowthTrend growth={v.growth} since={v.startSeason} startOvr={v.startOvr} ovr={p.ovr} />
          {v.scoutReady !== null && (
            <span className="inline-flex items-center gap-1 text-xs text-info-400">
              <Hourglass className="size-3.5" aria-hidden /> Relatório na sem. {v.scoutReady}
            </span>
          )}
        </div>
      </div>

      <YouthTraits traits={v.traits} star={p.star} />

      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          icon={v.scoutReady !== null ? <Hourglass /> : <FileSearch />}
          onClick={onScout}
          disabled={!!scoutBlock}
          title={scoutBlock ?? "Relatório completo do olheiro: potencial exato e características"}
          className="col-span-2 h-10 min-w-0"
        >
          <span className="truncate">{scoutLabel}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<Plane />}
          onClick={onLoan}
          disabled={!!loanBlock}
          title={loanBlock ?? `Emprestar ${p.name} para ganhar minutos`}
          className="h-10"
        >
          Emprestar
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<ArrowUpFromLine />}
          onClick={onPromote}
          disabled={!!promoteBlock}
          title={promoteBlock ?? `Subir ${p.name} para o elenco profissional`}
          className="h-10"
        >
          Promover
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<UserMinus />}
          onClick={onDismiss}
          className="col-span-2 h-10 text-danger-400! hover:bg-danger-500/10!"
          title={`Dispensar ${p.name} da base`}
        >
          Dispensar
        </Button>
      </div>
      {notes.length > 0 && (
        <ul className="-mt-1 space-y-0.5 text-xs text-mist">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

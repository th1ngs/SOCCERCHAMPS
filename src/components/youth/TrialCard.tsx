"use client";

import { Binoculars, MapPin } from "lucide-react";
import { LEAGUE_IDS, POS, POS_NAME, formatMoney } from "@/game";
import type { LeagueId, Position } from "@/game/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Flag } from "@/components/ui/Flag";
import { Card } from "@/components/ui/primitives";
import { ChoiceGroup } from "./ChoiceGroup";
import { countryName, type PosFilter } from "./derive";

/** Preposição + artigo antes do nome do país ("da Argentina", "de Portugal"). */
const OF: Record<LeagueId, string> = { bra: "do", arg: "da", por: "de", esp: "da", eng: "da", ita: "da", ger: "da", fra: "da", ned: "da", bel: "da", tur: "da", sco: "da", gre: "da" };

export interface TrialCardProps {
  homeLeague: LeagueId;
  region: LeagueId;
  onRegion: (r: LeagueId) => void;
  pos: PosFilter;
  onPos: (p: PosFilter) => void;
  cost: number;
  /** Motivo para não poder fazer a peneira (null = liberada). */
  block: string | null;
  /** Peneiras restantes e máximo na temporada. */
  left: number;
  max: number;
  /** Quantos garotos a peneira escolhida pode trazer. */
  kids: { min: number; max: number };
  /** Países com olheiro especialista. */
  specialists: LeagueId[];
  onRun: () => void;
}

/** Peneiras da temporada, escolhendo região (nacional ou estrangeira) e posição. */
export function TrialCard({ homeLeague, region, onRegion, pos, onPos, cost, block, left, max, kids, specialists, onRun }: TrialCardProps) {
  const foreign = region !== homeLeague;
  const spec = foreign && specialists.includes(region);
  const regions = [homeLeague, ...LEAGUE_IDS.filter((l) => l !== homeLeague)];
  return (
    <Card
      title="Peneiras"
      tone={block ? "default" : "highlight"}
      className="flex flex-col"
      action={
        <span className="flex items-center gap-1" aria-label={`${left} de ${max} peneiras restantes`}>
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className={cn("h-2 w-5 rounded-full", i < left ? "bg-gold-400" : "bg-white/10")} />
          ))}
          <span className="ml-1 text-xs text-mist tabular">{left}/{max}</span>
        </span>
      }
    >
      <p className="mb-4 text-sm text-mist">
        Os olheiros organizam a peneira e trazem de {kids.min} a {kids.max} garotos. Você tem {max} peneiras por temporada.
      </p>

      <fieldset className="mb-4 min-w-0">
        <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mist">
          <MapPin className="size-3.5" aria-hidden /> Região
        </legend>
        <div role="radiogroup" aria-label="Região da peneira" className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
          {regions.map((r) => {
            const on = r === region;
            const home = r === homeLeague;
            const hasSpec = !home && specialists.includes(r);
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onRegion(r)}
                className={cn(
                  "flex h-11 min-w-0 items-center gap-2 rounded-lg px-2.5 text-left text-sm ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
                  on ? "bg-gold-400/15 text-snow ring-gold-400/70" : "bg-ink-900/50 text-mist ring-white/8 hover:bg-white/6 hover:text-snow",
                )}
              >
                <Flag code={r} decorative className="h-4 rounded-[2px] ring-1 ring-black/25" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate font-semibold">{home ? "Nacional" : countryName(r)}</span>
                  <span className={cn("block text-xs uppercase tracking-wide", hasSpec ? "text-info-400" : "opacity-80")}>
                    {hasSpec ? "especialista ×1,2" : home ? countryName(r) : "custo ×1,8"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mb-4 min-w-0">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-mist">
          Posição
        </p>
        <ChoiceGroup<PosFilter>
          ariaLabel="Posição dos garotos da peneira"
          value={pos}
          onChange={onPos}
          options={[{ value: "all", label: "Todas" }, ...POS.map((p: Position) => ({ value: p, label: p, hint: POS_NAME[p] }))]}
        />
      </div>

      <p className="mb-3 text-xs text-mist">
        {foreign ? `Só garotos ${OF[region]} ${countryName(region)} (no exterior custa ${spec ? "×1,2 com o seu especialista" : "×1,8"}). ` : "Garotos do seu país. "}
        {spec ? "Seu olheiro especialista acha +1 garoto e aumenta a chance de um talento acima da média. " : ""}
        {pos === "all" ? "Posições variadas conforme o foco da base." : `Todos serão ${POS_NAME[pos].toLowerCase()}s.`}
      </p>

      <div className="mt-auto">
        <Button variant="primary" icon={<Binoculars />} onClick={onRun} disabled={!!block} title={block ?? undefined} block className="sm:w-auto">
          Fazer peneira ({left} restante{left === 1 ? "" : "s"}) • {formatMoney(cost)}
        </Button>
        {block && <p className="mt-2 text-xs text-mist">{block}.</p>}
      </div>
    </Card>
  );
}

import { Trophy } from "lucide-react";
import { compLeague, competitionName, divisionName, isNationalCup, leagueOf, LEAGUES } from "@/game";
import type { Competition, DivisionId, LeagueId } from "@/game/types";
import { Flag } from "@/components/ui/Flag";
import { cn } from "@/lib/cn";

/** Nome curto de uma competição (sem o país): "Série A", "Copa Nacional", "Copa dos Campeões". */
export const compShortName = (comp: Competition): string => (isNationalCup(comp) ? "Copa Nacional" : competitionName(comp));

/** Bandeira da liga da competição ou taça (Copa dos Campeões). */
export function CompIcon({ comp, className }: { comp: Competition; className?: string }) {
  const lg = compLeague(comp);
  return lg ? <Flag code={lg} className={className} /> : <Trophy className={cn("size-[1em] shrink-0 text-gold-400", className)} aria-hidden />;
}

/** Bandeira + nome da competição. `short` omite o país da Copa Nacional (a bandeira já diz). */
export function CompName({ comp, short, className }: { comp: Competition; short?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <CompIcon comp={comp} />
      <span className="truncate">{short ? compShortName(comp) : competitionName(comp)}</span>
    </span>
  );
}

/** Bandeira + nome da divisão (e, opcionalmente, o país). */
export function DivisionName({ div, country, className }: { div: DivisionId; country?: boolean; className?: string }) {
  const lg = LEAGUES[leagueOf(div)];
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Flag code={lg.id} decorative={country} />
      <span className="truncate">
        {divisionName(div)}
        {country && <span className="text-mist"> • {lg.name}</span>}
      </span>
    </span>
  );
}

/** Bandeira + país. */
export function LeagueName({ league, className }: { league: LeagueId; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <Flag code={league} decorative />
      <span className="truncate">{LEAGUES[league].name}</span>
    </span>
  );
}

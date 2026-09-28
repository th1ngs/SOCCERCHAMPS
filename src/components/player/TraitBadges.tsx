import { Star } from "lucide-react";
import { TRAITS } from "@/game";
import type { Player } from "@/game/types";
import { Badge } from "@/components/ui/primitives";

/** Características do jogador (nome curto ou completo, descrição no title) e selo de Craque. */
export function TraitBadges({ player, short = false, showStar = true }: { player: Pick<Player, "traits" | "star">; short?: boolean; showStar?: boolean }) {
  const traits = player.traits ?? [];
  if (!traits.length && !(showStar && player.star)) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {showStar && player.star && (
        <Badge tone="gold" title="Craque: +3 de overall efetivo nas partidas e valor de mercado maior">
          <Star className="size-3 fill-current" aria-hidden /> Craque
        </Badge>
      )}
      {traits.map((k) => {
        const t = TRAITS[k];
        if (!t) return null;
        return (
          <Badge key={k} tone="blue" title={`${t.name}: ${t.desc}`} className={short ? undefined : "normal-case tracking-normal"}>
            {short ? t.short : t.name}
          </Badge>
        );
      })}
    </span>
  );
}

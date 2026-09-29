import { Star } from "lucide-react";
import { TRAITS } from "@/game";
import type { TraitKey } from "@/game/types";
import { Badge } from "@/components/ui/primitives";

/** Características conhecidas (null = ainda não observadas) e selo de Craque, sempre visível. */
export function YouthTraits({ traits, star, short = false }: { traits: TraitKey[] | null; star: boolean; short?: boolean }) {
  return (
    <span className="inline-flex min-h-5 flex-wrap items-center gap-1">
      {star && (
        <Badge tone="gold" title="Craque: +3 de overall efetivo nas partidas e valor de mercado maior">
          <Star className="size-3 fill-current" aria-hidden /> Craque
        </Badge>
      )}
      {traits === null ? (
        <span className="text-xs text-mist/80">Características: peça um relatório</span>
      ) : traits.length ? (
        traits.map((k) => {
          const t = TRAITS[k];
          if (!t) return null;
          return (
            <Badge key={k} tone="blue" title={`${t.name}: ${t.desc}`} className={short ? undefined : "normal-case tracking-normal"}>
              {short ? t.short : t.name}
            </Badge>
          );
        })
      ) : (
        <span className="text-xs text-mist/80">Sem características marcantes</span>
      )}
    </span>
  );
}

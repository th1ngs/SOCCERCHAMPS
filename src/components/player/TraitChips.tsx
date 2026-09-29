import { TRAITS } from "@/game";
import type { TraitKey } from "@/game/types";

/** Habilidades em siglas compactas para listas (nome e efeito no title). */
export function TraitChips({ traits, max = 3 }: { traits: TraitKey[] | null | undefined; max?: number }) {
  if (!traits?.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {traits.slice(0, max).map((k) => {
        const t = TRAITS[k];
        if (!t) return null;
        return (
          <span
            key={k}
            title={`${t.name}: ${t.desc}`}
            className="inline-flex h-6 items-center rounded-md bg-info-500/15 px-1.5 text-xs font-semibold text-info-400"
          >
            {t.name}
          </span>
        );
      })}
    </span>
  );
}

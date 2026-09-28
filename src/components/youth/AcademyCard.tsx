import Link from "next/link";
import { Landmark } from "lucide-react";
import { UPGRADES, formatMoney } from "@/game";
import type { Club } from "@/game/types";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";

/** Nível da estrutura da base e atalho para melhorias no Clube. */
export function AcademyCard({ club }: { club: Club }) {
  const up = UPGRADES.academy;
  const level = up.level(club);
  const maxed = level >= up.max;
  return (
    <Card title="Estrutura da base">
      <div className="mb-3 flex items-center gap-3">
        <span className="font-display text-4xl font-extrabold tabular">
          {level}
          <span className="text-xl text-mist">/{up.max}</span>
        </span>
        <div className="flex flex-1 gap-1" aria-hidden>
          {Array.from({ length: up.max }, (_, i) => (
            <span key={i} className={`h-2 flex-1 rounded-full ${i < level ? "bg-pitch-400" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
      <p className="mb-4 text-sm text-mist">
        {maxed ? "Estrutura no nível máximo." : `Próximo nível: ${formatMoney(up.cost(club))}. Melhore a base na aba Clube para revelar mais joias.`}
      </p>
      <Link href="/jogo/clube" className={buttonClasses("outline")}>
        <Landmark aria-hidden /> Ver estrutura do clube
      </Link>
    </Card>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { user, userForm } from "@/game";
import { buttonClasses } from "@/components/ui/Button";
import { Card, FormChips } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { ClubTag } from "@/components/comps/ClubTag";
import { DivisionName } from "@/components/comps/labels";
import { zoneOf } from "@/components/comps/derive";
import { cn } from "@/lib/cn";

const stripe = { champ: "border-l-gold-400", up: "border-l-pitch-400", down: "border-l-danger-500" } as const;
import { miniTable } from "./derive";

/** Classificação resumida (5 linhas em volta do usuário) e a forma recente. */
export function MiniTableCard() {
  const { world: w, version } = useWorld();
  const { mini, form, size } = useMemo(() => {
    void version;
    const mini = miniTable(w);
    return { mini, form: userForm(w), size: mini.size };
  }, [w, version]);
  const u = user(w);

  return (
    <Card
      title={<DivisionName div={u.div} />}
      action={
        <Link href="/jogo/competicoes" className={buttonClasses("ghost", "sm", false, "-mr-2")}>
          Ver classificação <ChevronRight />
        </Link>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs font-bold uppercase tracking-wider text-mist">
            <th scope="col" className="w-7 pb-1 text-right font-bold">#</th>
            <th scope="col" className="pb-1 pl-3 text-left font-bold">Clube</th>
            <th scope="col" className="w-8 pb-1 text-right font-bold" title="Jogos">J</th>
            <th scope="col" className="w-10 pb-1 pr-2 text-right font-bold" title="Pontos">P</th>
          </tr>
        </thead>
        <tbody>
          {mini.rows.map(({ pos, row }) => {
            const me = row.id === u.id;
            const zone = size ? zoneOf(u.div, pos - 1, size) : null;
            return (
              <tr key={row.id} className={cn("border-t border-white/6", me && "bg-gold-400/10")}>
                <td className={cn("border-l-2 py-2 text-right font-display font-bold text-mist tabular", zone ? stripe[zone] : "border-l-transparent")}>{pos}</td>
                <td className="max-w-0 py-2 pl-3"><ClubTag id={row.id} size={16} bold={me} className="w-full" /></td>
                <td className="py-2 text-right text-mist tabular">{row.j}</td>
                <td className="py-2 pr-2 text-right font-display text-base font-extrabold tabular">{row.p}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-mist">Sua forma</span>
        {form.length ? <FormChips form={form} /> : <span className="text-mist">sem jogos ainda</span>}
      </div>
    </Card>
  );
}

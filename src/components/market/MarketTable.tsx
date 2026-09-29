"use client";

import { Star } from "lucide-react";
import { formatMoney } from "@/game";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Badge, OvrBadge, PosBadge, Stars } from "@/components/ui/primitives";
import { potentialStars } from "@/components/player/playerInfo";
import type { MarketRow } from "./marketFilter";

const TH = "px-2 py-2.5 font-display text-[12px] font-bold uppercase tracking-wider text-mist";

export function StarMark() {
  return (
    <span title="Craque" className="inline-flex text-gold-400">
      <Star className="size-3.5 fill-current" aria-hidden />
      <span className="sr-only">Craque</span>
    </span>
  );
}

/** Clube do jogador com a bandeira da liga (ou "Livre"). */
export function ClubCell({ row }: { row: MarketRow }) {
  if (!row.club) return <Badge tone="green">Livre</Badge>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Crest club={row.club} size={16} />
      <span className="truncate">{row.club.name}</span>
      <Flag code={row.club.league} />
    </span>
  );
}

/** Resultados do mercado (telas ≥ 640 px). A linha inteira abre a ficha. */
export function MarketTable({ rows, onOpen }: { rows: MarketRow[]; onOpen: (pid: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-(--radius-card) bg-ink-800 shadow-card ring-1 ring-inset ring-white/8">
      <table className="w-full min-w-[860px] text-sm">
        <caption className="sr-only">Jogadores disponíveis no mercado, do maior para o menor overall.</caption>
        <thead className="border-b border-white/8 bg-ink-900/40">
          <tr>
            <th scope="col" className={`${TH} w-8 text-center`}>
              <abbr title="Nacionalidade" className="no-underline">Nac.</abbr>
            </th>
            <th scope="col" className={`${TH} text-left`}>Nome</th>
            <th scope="col" className={`${TH} text-left`}>Clube</th>
            <th scope="col" className={`${TH} text-left`}>Pos</th>
            <th scope="col" className={`${TH} text-right`}>Idade</th>
            <th scope="col" className={`${TH} text-center`}>OVR</th>
            <th scope="col" className={`${TH} text-left`}>Pot.</th>
            <th scope="col" className={`${TH} text-right`}>Valor</th>
            <th scope="col" className={`${TH} text-right`}>Salário</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.p.id} onClick={() => onOpen(r.p.id)} className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/4 focus-within:bg-white/6">
              <td className="px-2 py-2 text-center">
                <Flag code={r.p.nat} />
              </td>
              <td className="px-2 py-2">
                <span className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(r.p.id);
                    }}
                    className="min-h-9 max-w-56 truncate rounded-md text-left font-semibold hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400"
                  >
                    {r.p.name}
                  </button>
                  {r.p.star && <StarMark />}
                </span>
              </td>
              <td className="max-w-52 px-2 py-2">
                <ClubCell row={r} />
              </td>
              <td className="px-2 py-2">
                <PosBadge pos={r.p.pos} />
              </td>
              <td className="px-2 py-2 text-right tabular">{r.p.age}</td>
              <td className="px-2 py-2 text-center">
                <OvrBadge value={r.p.ovr} />
              </td>
              <td className="px-2 py-2">
                <Stars value={potentialStars(r.p, false)} />
              </td>
              <td className="px-2 py-2 text-right tabular whitespace-nowrap">{formatMoney(r.value)}</td>
              <td className="px-2 py-2 text-right tabular whitespace-nowrap">{formatMoney(r.p.wage)}/sem</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

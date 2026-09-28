import { formatMoney, valueOf, weeksText } from "@/game";
import type { Player } from "@/game/types";
import { Badge, KV, Meter } from "@/components/ui/primitives";
import { avgRating, contractText, gamesText } from "./playerInfo";

/** Duas colunas de dados do jogador (físico/contrato e números da temporada). */
export function PlayerStats({ player: p }: { player: Player }) {
  return (
    <div className="grid gap-x-8 sm:grid-cols-2">
      <div>
        <KV label="Condição física">
          <span className="inline-flex items-center gap-2">
            <Meter value={p.fitness} label="Condição física" className="w-20" />
            <span className="w-9 text-right text-sm">{Math.round(p.fitness)}%</span>
          </span>
        </KV>
        <KV label="Moral">
          <span className="inline-flex items-center gap-2">
            <Meter value={p.morale} label="Moral" className="w-20" />
            <span className="w-9 text-right text-sm">{Math.round(p.morale)}</span>
          </span>
        </KV>
        <KV label="Valor de mercado">{formatMoney(valueOf(p))}</KV>
        <KV label="Salário">{formatMoney(p.wage)}/sem</KV>
        <KV label="Contrato">
          <span className={p.clubId && p.contract <= 1 ? "text-warn-400" : undefined}>{contractText(p.contract)}</span>
        </KV>
        {p.inj > 0 && (
          <KV label="Lesão (DM)">
            <span className="text-danger-400">
              {p.injType ?? "Lesão"} • {weeksText(p.inj)}
            </span>
          </KV>
        )}
        {p.susp > 0 && (
          <KV label="Suspensão">
            <span className="text-danger-400">{gamesText(p.susp)}</span>
          </KV>
        )}
      </div>
      <div>
        <KV label="Jogos na temporada">{p.s.apps}</KV>
        <KV label="Gols / assistências">
          {p.s.goals} / {p.s.assists}
        </KV>
        <KV label="Nota média">{avgRating(p)}</KV>
        <KV label="Carreira">
          {gamesText(p.c.apps)}, {p.c.goals} gols
        </KV>
        <KV label="Cartões amarelos">
          <span className="inline-flex items-center gap-2">
            {p.yc}
            {p.yc === 2 ? <Badge tone="orange">Pendurado</Badge> : <span className="text-xs font-normal text-mist">(3 = suspensão)</span>}
          </span>
        </KV>
      </div>
    </div>
  );
}

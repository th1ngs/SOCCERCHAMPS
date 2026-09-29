import { LEAGUES, POS_NAME, divisionFullName } from "@/game";
import type { Club, Player } from "@/game/types";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Badge, OvrBadge, PosBadge, Stars } from "@/components/ui/primitives";
import { TraitBadges } from "./TraitBadges";
import { potentialStars } from "./playerInfo";

/** Cabeçalho da ficha: overall, identificação, clube, funções, características e potencial. */
export function PlayerHeader({ player: p, club, own, captain, penTaker }: { player: Player; club: Club | null; own: boolean; captain: boolean; penTaker: boolean }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex flex-col items-center gap-1">
        <OvrBadge value={p.ovr} size="lg" />
        <span className="font-display text-[11px] font-bold uppercase tracking-widest text-mist">OVR</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <PosBadge pos={p.pos} />
          <span className="font-semibold">{POS_NAME[p.pos]}</span>
          <span className="text-mist">• {p.age} anos</span>
          {p.num > 0 && <span className="text-mist">• camisa {p.num}</span>}
        </div>
        <div className="flex items-center gap-2 text-sm text-mist">
          <Flag code={p.nat} decorative />
          <span>{LEAGUES[p.nat].country}</span>
        </div>
        <div className="flex min-w-0 items-start gap-2 text-sm text-mist">
          {club ? (
            <>
              <Crest club={club} size={16} className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                {club.name}
                {p.youth && " (base)"}
                <span className="text-mist/80"> • {divisionFullName(club.div)}</span>
              </span>
            </>
          ) : (
            <span>Sem clube (agente livre)</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {captain && <Badge tone="gold">Capitão</Badge>}
          {penTaker && <Badge tone="blue">Batedor de pênaltis</Badge>}
          {own && p.listed && <Badge tone="orange">À venda</Badge>}
          <TraitBadges player={p} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-display text-[11px] font-bold uppercase tracking-widest text-mist">Potencial</span>
        <Stars value={potentialStars(p, own)} className="text-base" />
        {!own && <span className="text-[11px] text-mist">estimativa dos olheiros</span>}
      </div>
    </div>
  );
}

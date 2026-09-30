import { ChevronDown, Footprints, Goal, Medal, Shield, Star, Trophy, UserRoundCheck, UsersRound, type LucideIcon } from "lucide-react";
import type { AwardPlayer, Club, SeasonAwards } from "@/game/types";
import { cn } from "@/lib/cn";
import { Crest } from "@/components/ui/Crest";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";

function clubName(clubs: Record<string, Club>, id: string) { return clubs[id]?.name ?? "Sem clube"; }

function PlayerPrize({ label, icon: Icon, player, detail, clubs, userClub }: { label: string; icon: LucideIcon; player: AwardPlayer | null; detail: (p: AwardPlayer) => string; clubs: Record<string, Club>; userClub?: string }) {
  if (!player) return null;
  return (
    <li className={cn("flex min-w-0 items-center gap-3 rounded-xl bg-ink-900/75 p-3 ring-1 ring-inset ring-white/10", player.club === userClub && "ring-gold-400/70")}>
      <PlayerAvatar player={player} size={44} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gold-400"><Icon className="size-3.5" aria-hidden /> {label}</span>
        <b className="block truncate text-sm">{player.name}</b>
        <span className="block truncate text-xs text-mist">{clubName(clubs, player.club)} • {detail(player)}</span>
      </span>
    </li>
  );
}

/** Prêmios anuais persistidos no histórico: seis vencedores e a seleção de 11. */
export function AwardsPanel({ awards, clubs, userClub }: { awards: SeasonAwards; clubs: Record<string, Club>; userClub?: string }) {
  const bestClub = awards.club ? clubs[awards.club] : null;
  const managerClub = awards.manager ? clubs[awards.manager.club] : null;
  return (
    <div className="space-y-3">
      <ul className="grid gap-2 sm:grid-cols-2">
        <PlayerPrize label="Melhor jogador do ano" icon={Star} player={awards.player} detail={(p) => `nota ${p.avg.toFixed(2)}`} clubs={clubs} userClub={userClub} />
        <PlayerPrize label="Melhor jovem sub-21" icon={Medal} player={awards.young} detail={(p) => `${p.age} anos • nota ${p.avg.toFixed(2)}`} clubs={clubs} userClub={userClub} />
        <PlayerPrize label="Melhor goleiro do ano" icon={Goal} player={awards.goalkeeper} detail={(p) => `nota ${p.avg.toFixed(2)}`} clubs={clubs} userClub={userClub} />
        <PlayerPrize label="Chuteira de Ouro" icon={Footprints} player={awards.goldenBoot} detail={(p) => `${p.goals} gols`} clubs={clubs} userClub={userClub} />
        {bestClub && (
          <li className={cn("flex min-w-0 items-center gap-3 rounded-xl bg-ink-900/75 p-3 ring-1 ring-inset ring-white/10", bestClub.id === userClub && "ring-gold-400/70")}>
            <Crest club={bestClub} size={44} />
            <span className="min-w-0"><span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gold-400"><Shield className="size-3.5" aria-hidden /> Melhor time do ano</span><b className="block truncate text-sm">{bestClub.name}</b><span className="text-xs text-mist">Melhor campanha entre as ligas</span></span>
          </li>
        )}
        {awards.manager && (
          <li className={cn("flex min-w-0 items-center gap-3 rounded-xl bg-ink-900/75 p-3 ring-1 ring-inset ring-white/10", awards.manager.club === userClub && "ring-gold-400/70")}>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-400/15 text-gold-400"><UserRoundCheck className="size-6" aria-hidden /></span>
            <span className="min-w-0"><span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gold-400"><Trophy className="size-3.5" aria-hidden /> Melhor manager do ano</span><b className="block truncate text-sm">{awards.manager.name}</b><span className="block truncate text-xs text-mist">{managerClub?.name ?? "Sem clube"}</span></span>
          </li>
        )}
      </ul>
      {awards.team.length > 0 && (
        <details className="group rounded-xl bg-ink-900/55 p-3 ring-1 ring-inset ring-white/10">
          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-gold-400 [&::-webkit-details-marker]:hidden">
            <UsersRound className="size-4" aria-hidden /> Seleção do ano ({awards.team.length}) <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <ol className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {awards.team.map((p) => (
              <li key={p.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-white/5 p-1.5 text-sm">
                <PlayerAvatar player={p} size={32} />
                <span className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><span className="block truncate text-xs text-mist">{p.pos} • {clubName(clubs, p.club)}</span></span>
                <span className="font-semibold tabular text-gold-300">{p.avg.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

"use client";

import { Clapperboard } from "lucide-react";
import { divisionName, monthLabel, user } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { AwardIcon } from "@/components/awards/AwardIcon";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Card, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/** Prêmios: Jogadores e Técnicos do Mês da temporada e as Noites de Gala passadas (com replay). */
export function AwardsView() {
  const { world: w, setOverlay } = useWorld();
  const u = user(w);
  const months = (w.monthAwards ?? []).filter((a) => a.season === w.season).slice().reverse();
  const galas = (w.galas ?? []).slice().reverse();
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card title="Jogador do mês" action={<AwardIcon icon="star" className="size-7" />}>
        {months.length ? (
          <ul className="space-y-2">
            {months.map((a) => {
              const club = w.clubs[a.player.club];
              const mine = a.player.club === u.id;
              return (
                <li key={a.id} className={cn("flex items-center gap-3 rounded-xl p-2 ring-1 ring-inset", mine ? "bg-gold-400/10 ring-gold-400/40" : "bg-ink-950/40 ring-white/6")}>
                  <PlayerAvatar player={a.player} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs uppercase tracking-wider text-gold-300">{monthLabel(a)} • {divisionName(a.div)}</span>
                    <button type="button" className="block truncate text-left font-semibold hover:text-gold-300" onClick={() => w.players[a.player.id] && setOverlay({ kind: "player", pid: a.player.id })}>{a.player.name}</button>
                    <span className="flex items-center gap-1 text-xs text-mist">{club && <Crest club={club} size={12} />} {club?.name} • {a.player.goals}G {a.player.assists}A • nota {a.player.avg.toFixed(2)}</span>
                    {a.manager && <span className="block text-xs text-mist">Técnico do mês: {a.manager.club === u.id ? `${a.manager.name} (você)` : a.manager.name} • {a.manager.pts} pts</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState>O primeiro prêmio sai na virada do mês do calendário, para a divisão em que o seu clube joga.</EmptyState>
        )}
      </Card>
      <Card title="Noites de Gala" action={<AwardIcon icon="ball" className="size-7" />}>
        {galas.length ? (
          <ul className="space-y-2">
            {galas.map((g) => {
              const ballon = g.categories.find((c) => c.key === "ballon")?.nominees[0];
              const champ = g.categories.find((c) => c.key === "champion")?.nominees[0];
              const wins = g.categories.filter((c) => c.nominees[0]?.club === u.id).length;
              return (
                <li key={g.season} className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-950/40 p-3 ring-1 ring-inset ring-white/6">
                  <span className="font-display text-2xl font-extrabold italic tabular">{g.season}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    {ballon && <span className="block truncate">Bola de Ouro: <b>{ballon.name}</b></span>}
                    {champ && <span className="block truncate text-mist">{divisionName(g.div)}: {champ.name}</span>}
                    {wins > 0 && <span className="block text-xs text-gold-300">{wins} prêmio{wins > 1 ? "s" : ""} do seu clube</span>}
                  </span>
                  <Button size="sm" variant="secondary" icon={<Clapperboard />} onClick={() => setOverlay({ kind: "gala", season: g.season })}>Rever</Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState>A Noite de Gala acontece no fim de cada temporada.</EmptyState>
        )}
      </Card>
    </div>
  );
}

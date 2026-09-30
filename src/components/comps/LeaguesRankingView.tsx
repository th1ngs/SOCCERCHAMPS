"use client";

import { useMemo } from "react";
import { Globe, Trophy } from "lucide-react";
import { LEAGUES, leagueRanking, user } from "@/game";
import type { LeagueRankRow } from "@/game";
import { Card } from "@/components/ui/primitives";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { LeagueStars } from "@/components/ui/LeagueStars";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";

function Row({ r, mine, min, max }: { r: LeagueRankRow; mine: boolean; min: number; max: number }) {
  const pct = max > min ? 12 + ((r.strength - min) / (max - min)) * 88 : 100;
  return (
    <li className={cn("grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl px-3 py-3 ring-1 ring-inset", mine ? "bg-gold-400/10 ring-gold-400/40" : "bg-ink-900/50 ring-white/6")}>
      <span className="row-span-2 self-start pt-0.5 text-center font-display text-2xl font-extrabold text-mist tabular">{r.rank}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5">
        <Flag code={r.id} decorative className="h-5 rounded-[3px] ring-1 ring-black/25" />
        <b className="font-display text-lg font-bold uppercase leading-none">{LEAGUES[r.id].name}</b>
        <span className="text-sm text-mist">{r.tier}</span>
        {mine && <span className="rounded-md bg-gold-400/20 px-1.5 text-xs font-bold text-gold-300">seu país</span>}
      </span>
      <span className="text-right font-display text-2xl font-extrabold tabular">{r.strength.toFixed(1).replace(".", ",")}</span>
      <span className="col-span-2 col-start-2 flex items-center gap-3">
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/8" aria-hidden>
          <span className={cn("block h-full rounded-full", r.rank <= 3 ? "bg-gold-400" : r.rank <= 7 ? "bg-info-400" : "bg-mist/60")} style={{ width: `${pct}%` }} />
        </span>
        <LeagueStars value={r.stars} />
      </span>
      <span className="col-span-3 flex flex-wrap items-center gap-x-4 gap-y-1 pl-11 text-xs text-mist">
        {r.top && (
          <span className="inline-flex items-center gap-1.5">
            <Crest club={r.top} size={16} /> melhor time: <b className="font-semibold text-snow">{r.top.name}</b>
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Globe className="size-3.5" aria-hidden /> {Math.round(r.foreign * 100)}% estrangeiros
        </span>
        <span className="inline-flex items-center gap-1">
          <Trophy className="size-3.5" aria-hidden /> {r.contClubs} na Copa dos Campeões • {r.contTitles} {r.contTitles === 1 ? "título" : "títulos"}
        </span>
      </span>
    </li>
  );
}

/** Ranking das ligas pelo nível atual dos elencos, com o que a diferença de nível muda no jogo. */
export function LeaguesRankingView() {
  const { world: w, version } = useWorld();
  const u = user(w);
  const rows = useMemo(
    () => leagueRanking(w),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w, version],
  );
  const min = Math.min(...rows.map((r) => r.strength)), max = Math.max(...rows.map((r) => r.strength));
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card title="Ranking das ligas">
        <p className="mb-3 text-sm text-mist">Pela média dos 11 melhores jogadores de cada clube da primeira divisão. Muda conforme os craques trocam de país.</p>
        <ol className="space-y-2">
          {rows.map((r) => (
            <Row key={r.id} r={r} mine={r.id === u.league} min={min} max={max} />
          ))}
        </ol>
      </Card>
      <Card title="O que muda no jogo">
        <ul className="space-y-3 text-sm leading-snug">
          <li>
            <b className="block">Elencos mais fortes</b>
            <span className="text-mist">Clubes de ligas fortes têm jogadores melhores que clubes de mesma reputação em ligas fracas. Na Copa dos Campeões isso pesa.</span>
          </li>
          <li>
            <b className="block">Craques vão para ligas maiores</b>
            <span className="text-mist">Jovens bons evitam ligas bem mais fracas; veteranos aceitam. Ligas ricas e fortes compram dos países que formam talentos, como Brasil e Argentina.</span>
          </li>
          <li>
            <b className="block">Prestígio entre países</b>
            <span className="text-mist">Um clube de liga forte vale mais que um de mesma reputação numa liga fraca: isso decide quem aceita trocar de clube e quem recebe propostas de emprego.</span>
          </li>
          <li>
            <b className="block">Vagas na Copa dos Campeões</b>
            <span className="text-mist">Além do campeão de cada liga, as vagas restantes vão para os clubes de maior prestígio.</span>
          </li>
          <li>
            <b className="block">Formação e importação</b>
            <span className="text-mist">Brasil e Argentina usam quase só jogadores locais; Inglaterra, Portugal e Bélgica importam muito.</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

"use client";

import { memo } from "react";
import type { Club, MatchStats } from "@/game/types";
import { Crest } from "@/components/ui/Crest";
import { cn } from "@/lib/cn";
import { StatBar } from "../StatBars";
import { statRows, type Kit } from "../matchUtils";
import type { FeedItem } from "./controller";
import { FeedIcon } from "./FeedIcon";

function ScoreTeam({ club, right }: { club: Club; right?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2 sm:gap-3", right ? "flex-row-reverse text-right" : "")}>
      <Crest club={club} size={34} className="shrink-0" />
      <b className="min-w-0 truncate font-display text-base font-bold uppercase leading-tight sm:text-xl">
        <span className="sm:hidden">{club.short}</span>
        <span className="hidden sm:inline">{club.name}</span>
      </b>
    </div>
  );
}

export function Scoreboard({
  home,
  away,
  score,
  pens,
  minuteText,
  comp,
  live,
}: {
  home: Club;
  away: Club;
  score: [number, number];
  pens: [number, number] | null;
  minuteText: string;
  comp: string;
  live: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
      <ScoreTeam club={home} />
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 rounded-xl bg-ink-950 px-3 py-1 font-display text-3xl font-extrabold leading-none tabular ring-1 ring-inset ring-white/10 sm:text-4xl" aria-live="polite">
          <span>{score[0]}</span>
          <span className="text-mist">-</span>
          <span>{score[1]}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide">
          {live && <span className="size-1.5 animate-pulse rounded-full bg-danger-500" aria-hidden />}
          <span className={live ? "text-snow" : "text-gold-400"}>{minuteText}</span>
          {pens && <span className="text-gold-400">• pên. {pens[0]}-{pens[1]}</span>}
        </div>
        <small className="max-w-[42vw] truncate text-center text-[10px] text-mist sm:max-w-none sm:text-[11px]">{comp}</small>
      </div>
      <ScoreTeam club={away} right />
    </div>
  );
}

export function PossessionBar({ poss, kits }: { poss: [number, number]; kits: [Kit, Kit] }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold tabular" aria-label={`Posse de bola: ${poss[0]}% x ${poss[1]}%`}>
      <span className="w-9">{poss[0]}%</span>
      <span className="flex h-2 flex-1 overflow-hidden rounded-full" style={{ background: kits[1].fill }}>
        <span className="block h-full transition-[width] duration-500" style={{ width: `${poss[0]}%`, background: kits[0].fill }} />
      </span>
      <span className="w-9 text-right">{poss[1]}%</span>
    </div>
  );
}

export const Feed = memo(function Feed({ items, kits }: { items: FeedItem[]; kits: [Kit, Kit] }) {
  if (!items.length) return <p className="px-2 py-6 text-center text-sm text-mist">A narração começa com o apito inicial.</p>;
  return (
    <ol className="space-y-1" aria-live="polite" aria-relevant="additions">
      {items.map((ev) => {
        const goal = ev.type === "goal";
        return (
          <li
            key={ev.key}
            className={cn(
              "flex items-start gap-2 rounded-lg border-l-[3px] px-2 py-1.5 text-sm leading-snug",
              goal ? "bg-gold-400/12 font-semibold text-snow ring-1 ring-inset ring-gold-400/30" : ev.type === "build" ? "text-mist" : "text-snow/90",
            )}
            style={{ borderLeftColor: ev.side == null ? "transparent" : kits[ev.side].fill }}
          >
            <span className="w-8 shrink-0 pt-px text-right font-display text-xs font-bold text-mist tabular">{ev.min ? `${ev.min}'` : ""}</span>
            <span className="pt-0.5">
              <FeedIcon type={ev.type} />
            </span>
            <span className="min-w-0">{ev.text}</span>
          </li>
        );
      })}
    </ol>
  );
});

export function LiveStats({ stats, kits }: { stats: MatchStats; kits: [Kit, Kit] }) {
  const cols: [string, string] = [kits[0].fill, kits[1].fill];
  return (
    <div className="divide-y divide-white/6 px-1">
      {statRows(stats).map(([label, a, b]) => (
        <StatBar key={label} label={label} left={a} right={b} colors={cols} />
      ))}
    </div>
  );
}

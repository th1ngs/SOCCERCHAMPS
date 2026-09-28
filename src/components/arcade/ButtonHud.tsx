"use client";

import { Pause, Play } from "lucide-react";
import type { ArcadeHud } from "@/arcade/runner";
import { IconButton } from "@/components/ui/Button";
import { Crest, type CrestClub } from "@/components/ui/Crest";
import { cn } from "@/lib/cn";

export interface HudTeam extends CrestClub {
  name: string;
}

function HudTeamBox({ team, on, right }: { team: HudTeam; on: boolean; right?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-xl border-2 px-2 py-1 transition-colors sm:px-3",
        right ? "flex-row-reverse justify-self-start text-right" : "justify-self-end",
        on ? "border-gold-400 bg-gold-400/12" : "border-transparent",
      )}
    >
      <Crest club={team} size={28} className="shrink-0" />
      <b className="min-w-0 truncate font-display text-sm font-bold uppercase sm:text-lg">
        <span className="sm:hidden">{team.short}</span>
        <span className="hidden sm:inline">{team.name}</span>
      </b>
    </div>
  );
}

/** Placar do futebol de botão: times, placar, relógio, vez e barra de tempo da jogada. */
export function ButtonHud({
  teams,
  hud,
  onTogglePause,
  turnLabel,
}: {
  teams: [HudTeam, HudTeam];
  hud: ArcadeHud;
  onTogglePause: () => void;
  turnLabel?: string | null;
}) {
  const low = hud.turnFrac < 0.3;
  return (
    <header className="relative border-b border-white/8 bg-linear-to-b from-black/45 to-black/15 px-2 pb-2.5 pt-2 sm:px-4">
      <div className="mx-auto flex max-w-5xl items-center gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-3">
          <HudTeamBox team={teams[0]} on={hud.aiming && hud.turn === 0} />
          <div className="text-center">
            <div className="rounded-lg bg-ink-950 px-3 py-1 font-display text-3xl font-extrabold leading-none tracking-wider tabular ring-1 ring-inset ring-white/10 sm:text-4xl">
              {hud.score[0]}
              <span className="mx-1.5 text-mist">:</span>
              {hud.score[1]}
            </div>
            <div className={cn("mt-1 font-display text-xs font-bold uppercase tracking-wider tabular sm:text-sm", hud.clockWarn ? "animate-pulse text-danger-400" : hud.overtime ? "text-gold-400" : "text-mist")}>
              {hud.clockText}
            </div>
          </div>
          <HudTeamBox team={teams[1]} on={hud.aiming && hud.turn === 1} right />
        </div>
        <IconButton label={hud.paused ? "Continuar" : "Pausar"} icon={hud.paused ? <Play /> : <Pause />} onClick={onTogglePause} disabled={hud.state === "over"} />
      </div>
      {turnLabel != null && (
        <p className={cn("mt-1 h-4 text-center text-xs font-semibold", hud.aiming && hud.human ? "text-gold-300" : "text-mist")} aria-live="polite">
          {turnLabel}
        </p>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/6" aria-hidden>
        <div
          className={cn("h-full transition-[width,background-color] duration-200 ease-linear", hud.turn === 1 && "ml-auto", low ? "bg-danger-500" : "bg-pitch-400")}
          style={{ width: `${hud.turnFrac * 100}%` }}
        />
      </div>
    </header>
  );
}

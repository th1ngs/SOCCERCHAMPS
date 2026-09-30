"use client";

import { useMemo, type KeyboardEvent } from "react";
import { Landmark, MapPin } from "lucide-react";
import { CLUBS, DIVISION_SIZE, divisionName, LEAGUE_IDS, LEAGUES, leagueStars, leagueTier } from "@/game";
import type { ClubStatic, DivisionId, LeagueId } from "@/game/types";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { LeagueStars } from "@/components/ui/LeagueStars";
import { Badge, Stars } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { divisionHint, rankDivision, wealthLevel, type RankedClub } from "./clubTiers";

/** Setas movem a seleção num grupo de opções (padrão radiogroup/tablist). */
function arrowNav<T>(e: KeyboardEvent, list: T[], current: T, set: (v: T) => void) {
  const i = list.indexOf(current);
  const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
  if (!d || i < 0) return;
  e.preventDefault();
  const next = list[(i + d + list.length) % list.length];
  set(next);
  const group = e.currentTarget.closest("[data-group]");
  requestAnimationFrame(() => group?.querySelector<HTMLElement>(`[data-value="${String(next)}"]`)?.focus());
}

function WealthBars({ league }: { league: LeagueId }) {
  const { bars, label } = wealthLevel(league);
  return (
    <span className="flex items-center gap-1.5 text-xs text-mist" title={`Poder financeiro: ${label}`}>
      <span className="flex items-end gap-0.5" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cn("w-1 rounded-sm", i < bars ? "bg-gold-400" : "bg-white/12")} style={{ height: 5 + i * 2 }} />
        ))}
      </span>
      <span>{label}</span>
    </span>
  );
}

/** Ligas em cartões (radiogroup). */
export function LeaguePicker({ value, onChange }: { value: LeagueId; onChange: (l: LeagueId) => void }) {
  return (
    <div role="radiogroup" aria-label="Liga" data-group className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {LEAGUE_IDS.map((id) => {
        const lg = LEAGUES[id];
        const on = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-value={id}
            onClick={() => onChange(id)}
            onKeyDown={(e) => arrowNav(e, LEAGUE_IDS, value, onChange)}
            className={cn(
              "flex min-h-[112px] flex-col items-start gap-2 rounded-2xl p-3.5 text-left ring-1 ring-inset transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400",
              on ? "bg-gold-400/12 ring-2 ring-gold-400" : "bg-ink-800 ring-white/8 hover:bg-ink-700 hover:ring-white/20",
            )}
          >
            <Flag code={id} decorative className="h-7 rounded-[3px] shadow ring-1 ring-black/25" />
            <span className="font-display text-lg font-bold uppercase leading-none">{lg.name}</span>
            <span className="text-xs text-mist">
              {lg.divisions.length} divisões • {lg.divisions.length * DIVISION_SIZE} clubes
            </span>
            <span className="flex items-center gap-1.5 text-xs text-mist" title={`Nível do futebol: ${leagueTier(id)}`}>
              <LeagueStars value={leagueStars(id)} size={12} />
              <span className="whitespace-nowrap">{leagueTier(id)}</span>
            </span>
            <WealthBars league={id} />
          </button>
        );
      })}
    </div>
  );
}

/** Abas das divisões de uma liga. */
export function DivisionTabs({ league, value, onChange, panelId }: { league: LeagueId; value: DivisionId; onChange: (d: DivisionId) => void; panelId: string }) {
  const divs = LEAGUES[league].divisions;
  return (
    <div role="tablist" aria-label={`Divisões — ${LEAGUES[league].name}`} data-group className="flex flex-wrap gap-1 rounded-xl bg-ink-950/60 p-1 ring-1 ring-inset ring-white/8">
      {divs.map((d, i) => {
        const on = d === value;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            id={`tab-${d}`}
            aria-selected={on}
            aria-controls={panelId}
            tabIndex={on ? 0 : -1}
            data-value={d}
            onClick={() => onChange(d)}
            onKeyDown={(e) => arrowNav(e, divs, value, onChange)}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg px-3.5 font-display text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
              on ? "bg-gold-400 text-ink-950 shadow-sm" : "text-mist hover:bg-white/6 hover:text-snow",
            )}
          >
            <span className={cn("grid size-5 place-items-center rounded text-xs", on ? "bg-ink-950/15" : "bg-white/8")}>{i + 1}</span>
            {divisionName(d)}
          </button>
        );
      })}
    </div>
  );
}

function ClubCard({ item, onPick }: { item: RankedClub; onPick: (id: string) => void }) {
  const { club, stars, tier } = item;
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(club.id)}
        aria-label={`Treinar o ${club.name} (${tier.label})`}
        className="group flex h-full w-full items-start gap-3 rounded-2xl bg-ink-800 p-3.5 text-left shadow-card ring-1 ring-inset ring-white/8 transition hover:-translate-y-0.5 hover:bg-ink-700 hover:ring-gold-400/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 active:translate-y-0"
      >
        <Crest club={club} size={44} className="shrink-0 transition-transform group-hover:scale-105" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg font-bold uppercase leading-tight" title={club.name}>{club.name}</span>
          <span className="block truncate text-sm italic text-mist">“{club.nickname}”</span>
          <span className="mt-1.5 flex flex-col gap-0.5 text-xs text-mist">
            <span className="flex items-center gap-1.5 truncate"><MapPin className="size-3 shrink-0" aria-hidden /> {club.city}-{club.uf}</span>
            <span className="flex items-center gap-1.5 truncate">
              <Landmark className="size-3 shrink-0" aria-hidden /> {club.stadium} • {club.cap.toLocaleString("pt-BR")}
            </span>
          </span>
          <span className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <Badge tone={tier.tone}>{tier.label}</Badge>
            <Stars value={stars} />
          </span>
        </span>
      </button>
    </li>
  );
}

/** Grade de clubes de uma divisão, do mais forte ao mais fraco (estrelas relativas à divisão). */
export function ClubGrid({ div, onPick, id }: { div: DivisionId; onPick: (id: string) => void; id: string }) {
  const list = useMemo(() => rankDivision(CLUBS as ClubStatic[], div), [div]);
  return (
    <section id={id} role="tabpanel" aria-labelledby={`tab-${div}`}>
      <p className="mb-3 text-sm text-mist">{divisionHint(div)}</p>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((item) => (
          <ClubCard key={item.club.id} item={item} onPick={onPick} />
        ))}
      </ul>
    </section>
  );
}

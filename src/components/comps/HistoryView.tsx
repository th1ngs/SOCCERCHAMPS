"use client";

import { ChevronDown, CircleCheck, CircleX, Goal, Star, Trophy } from "lucide-react";
import { cupId, divisionFullName, divisionName, LEAGUE_IDS, LEAGUES, user } from "@/game";
import type { HistoryEntry, LeagueId } from "@/game/types";
import { Card, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { useWorld } from "@/components/game/GameProvider";
import { ClubTag } from "./ClubTag";
import { CompName, LeagueName } from "./labels";

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-3 border-b border-white/6 py-1.5 text-sm last:border-0 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
      <span className="min-w-0 text-mist">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** Campeões de uma liga numa temporada: divisões e Copa Nacional. */
function LeagueChampions({ h, league }: { h: HistoryEntry; league: LeagueId }) {
  return (
    <>
      {LEAGUES[league].divisions.map((d) => (
        <Row key={d} label={divisionName(d)}>
          <ClubTag id={h.champions[d]} size={16} />
        </Row>
      ))}
      <Row label="Copa Nacional">
        <ClubTag id={h.cups[cupId(league)]} size={16} />
      </Row>
    </>
  );
}

function SeasonCard({ h }: { h: HistoryEntry }) {
  const { world: w } = useWorld();
  const club = w.clubs[h.user.club];
  const lg = h.user.league;
  const firstDiv = LEAGUES[lg].divisions[0];
  const scorer = h.scorers[firstDiv];
  return (
    <Card>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-3xl font-extrabold italic leading-none tabular">{h.season}</span>
          {club && (
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <Crest club={club} size={22} className="shrink-0" />
              <span className="min-w-0">
                <b className="block truncate">{club.name}</b>
                <span className="flex items-center gap-1.5 text-xs text-mist">
                  <Flag code={lg} /> {h.user.pos}º na {divisionFullName(h.user.div)}
                </span>
              </span>
            </span>
          )}
        </div>
        <span className="inline-flex max-w-full items-center gap-1.5 text-sm">
          {h.user.success ? (
            <CircleCheck className="size-4 shrink-0 text-pitch-400" aria-hidden />
          ) : (
            <CircleX className="size-4 shrink-0 text-danger-400" aria-hidden />
          )}
          <span className="min-w-0">
            {h.user.success ? "Objetivo cumprido" : "Objetivo não cumprido"}
            <span className="block text-xs text-mist">Meta: {h.user.objective}</span>
          </span>
        </span>
      </header>

      <SectionTitle className="mb-1 flex items-center gap-1.5">
        <LeagueName league={lg} /> • campeões
      </SectionTitle>
      <LeagueChampions h={h} league={lg} />
      <Row label={<CompName comp="cont" />}>
        <ClubTag id={h.cups.cont} size={16} flag />
      </Row>
      <Row label={<span className="inline-flex items-center gap-1.5"><Goal className="size-3.5" aria-hidden /> Artilheiro ({divisionName(firstDiv)})</span>}>
        {scorer ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <b className="truncate">{scorer.name}</b>
            <span className="shrink-0 text-mist">• {scorer.goals} gols</span>
          </span>
        ) : (
          "—"
        )}
      </Row>
      <Row label={<span className="inline-flex items-center gap-1.5"><Star className="size-3.5" aria-hidden /> Craque da temporada</span>}>
        {h.best ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <b className="truncate">{h.best.name}</b>
            <span className="shrink-0 text-mist">• nota {h.best.avg.toFixed(2)}</span>
          </span>
        ) : (
          "—"
        )}
      </Row>

      <details className="group mt-3">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-lg text-sm font-semibold text-gold-400 hover:underline [&::-webkit-details-marker]:hidden">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden /> Campeões das outras ligas
        </summary>
        <div className="mt-2 grid gap-x-6 gap-y-3 md:grid-cols-2">
          {LEAGUE_IDS.filter((l) => l !== lg).map((l) => (
            <div key={l} className="min-w-0">
              <SectionTitle className="mb-1"><LeagueName league={l} /></SectionTitle>
              <LeagueChampions h={h} league={l} />
            </div>
          ))}
        </div>
      </details>
    </Card>
  );
}

/** Sala de troféus do clube do usuário e as temporadas anteriores. */
export function HistoryView() {
  const { world: w } = useWorld();
  const u = user(w);
  const seasons = w.history.slice().reverse();

  return (
    <div className="flex flex-col gap-4">
      <Card title={`Sala de troféus • ${u.name}`}>
        {u.trophies.length ? (
          <ul className="flex flex-wrap gap-2">
            {u.trophies.map((t, i) => (
              <li key={`${t.comp}-${t.season}-${i}`} className="flex items-center gap-2 rounded-xl bg-gold-400/10 px-3 py-2 ring-1 ring-inset ring-gold-400/30">
                <Trophy className="size-4 text-gold-400" aria-hidden />
                <span className="font-display font-bold uppercase tracking-wide">{t.comp}</span>
                <span className="text-sm text-mist tabular">{t.season}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Nenhum título ainda. O primeiro está logo ali.</EmptyState>
        )}
      </Card>

      {seasons.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {seasons.map((h) => (
            <SeasonCard key={h.season} h={h} />
          ))}
        </div>
      ) : (
        <Card title="Temporadas">
          <EmptyState>O histórico aparece ao final da primeira temporada.</EmptyState>
        </Card>
      )}
    </div>
  );
}

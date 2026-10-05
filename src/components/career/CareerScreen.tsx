"use client";

import { useMemo } from "react";
import { Award, Lock, Medal, Star, Trophy } from "lucide-react";
import {
  ACHIEVEMENTS, ACHIEVEMENT_KEYS, clubIdols, competitionName, dealText, divisionFullName, emptyRecords, matchRecordText, user,
} from "@/game";
import type { AchievementKey } from "@/game/types";
import { Card, EmptyState, KV, PageHeader } from "@/components/ui/primitives";
import { ClubTag } from "@/components/comps/ClubTag";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { VacanciesCard } from "./VacanciesCard";

/** Conquistas: desbloqueadas em destaque, as demais com o que falta fazer. */
function AchievementsCard() {
  const { world: w } = useWorld();
  const got = new Map((w.achievements ?? []).map((a) => [a.key, a]));
  const keys = ACHIEVEMENT_KEYS.slice().sort((a, b) => Number(got.has(b)) - Number(got.has(a)));
  return (
    <Card title="Conquistas" action={<span className="text-sm font-semibold text-gold-300 tabular">{got.size}/{ACHIEVEMENT_KEYS.length}</span>} className="lg:col-span-2">
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {keys.map((k: AchievementKey) => {
          const a = ACHIEVEMENTS[k];
          const g = got.get(k);
          return (
            <li key={k} className={cn("flex items-start gap-3 rounded-xl p-3 ring-1 ring-inset", g ? "bg-gold-400/10 ring-gold-400/35" : "bg-ink-900/50 ring-white/6")}>
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", g ? "bg-gold-400 text-ink-950" : "bg-white/6 text-mist")}>
                {g ? <Award className="size-5" aria-hidden /> : <Lock className="size-4" aria-hidden />}
              </span>
              <span className="min-w-0 leading-snug">
                <b className={cn("block font-semibold", g ? "text-snow" : "text-snow/70")}>{a.name}</b>
                <span className="block text-sm text-mist">{a.desc}</span>
                {g && <span className="mt-0.5 block text-xs text-gold-300">Temporada {g.season}, semana {g.week}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function RecordsCard() {
  const { world: w } = useWorld();
  const r = w.records ?? emptyRecords();
  const m = r.matches;
  const pct = m.played ? Math.round(((m.won * 3 + m.drawn) / (m.played * 3)) * 100) : 0;
  return (
    <Card title="Recordes do treinador">
      <KV label="Jogos">{m.played ? `${m.played} (${m.won}V ${m.drawn}E ${m.lost}D)` : "—"}</KV>
      <KV label="Aproveitamento">{m.played ? `${pct}%` : "—"}</KV>
      <KV label="Gols pró / contra">{m.played ? `${m.gf} / ${m.ga}` : "—"}</KV>
      <KV label="Maior sequência de vitórias">{r.wins.best || "—"}</KV>
      <KV label="Maior invencibilidade">{r.unbeaten.best ? `${r.unbeaten.best} ${r.unbeaten.best === 1 ? "jogo" : "jogos"}` : "—"}</KV>
      <div className="mt-3 space-y-2 text-sm">
        <RecordLine label="Maior vitória" text={r.biggestWin ? matchRecordText(w, r.biggestWin) : null} />
        <RecordLine label="Pior derrota" text={r.worstLoss ? matchRecordText(w, r.worstLoss) : null} />
        <RecordLine label="Maior venda" text={r.biggestSale ? dealText(w, r.biggestSale, true) : null} />
        <RecordLine label="Maior contratação" text={r.biggestBuy ? dealText(w, r.biggestBuy, false) : null} />
        <RecordLine label="Artilheiro numa temporada" text={r.topScorer ? `${r.topScorer.name}: ${r.topScorer.goals} gols (${r.topScorer.season})` : null} />
      </div>
    </Card>
  );
}

function RecordLine({ label, text }: { label: string; text: string | null }) {
  return (
    <p className="rounded-lg bg-ink-900/50 px-3 py-2">
      <span className="block text-xs font-bold uppercase tracking-wider text-mist">{label}</span>
      <span className={text ? "text-snow" : "text-mist"}>{text ?? "Ainda não aconteceu"}</span>
    </p>
  );
}

function IdolsCard() {
  const { world: w, version, setOverlay } = useWorld();
  const u = user(w);
  const idols = useMemo(
    () => clubIdols(w, u.id, 10),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w, u.id, version],
  );
  return (
    <Card title={`Ídolos do ${u.short}`}>
      {idols.length === 0 ? (
        <EmptyState>Os ídolos aparecem conforme os jogadores acumulam jogos pelo clube.</EmptyState>
      ) : (
        <ol className="divide-y divide-white/6">
          {idols.map((i, k) => (
            <li key={`${i.name}-${k}`} className="flex items-center gap-3 py-2">
              <span className="w-5 text-right font-display font-bold text-mist tabular">{k + 1}</span>
              <span className="min-w-0 flex-1">
                {i.pid ? (
                  <button type="button" onClick={() => setOverlay({ kind: "player", pid: i.pid as string })} className="block truncate text-left font-semibold hover:text-gold-300">
                    {i.name}
                  </button>
                ) : (
                  <b className="flex items-center gap-1.5 truncate font-semibold">
                    <Star className="size-3.5 shrink-0 fill-gold-400 text-gold-400" aria-label="Lenda aposentada" /> {i.name}
                  </b>
                )}
                <span className="block text-xs text-mist">
                  {i.pos} • {i.from === i.to ? i.from : `${i.from}–${i.to}`}
                  {!i.active && " • lenda"}
                </span>
              </span>
              <span className="text-right text-sm tabular">
                <b>{i.apps}</b> jogos
                <span className="block text-xs text-mist">{i.goals} gols</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function SeasonsCard() {
  const { world: w } = useWorld();
  const rows = w.history.slice().reverse();
  const titles = w.records?.titles ?? [];
  return (
    <Card title="Temporadas" className="lg:col-span-2">
      {titles.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-2" aria-label="Títulos">
          {titles.map((t, i) => (
            <li key={`${t.comp}-${t.season}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg bg-gold-400/12 px-2.5 py-1 text-sm font-semibold text-gold-300">
              <Trophy className="size-4" aria-hidden /> {t.comp} {t.season}
            </li>
          ))}
        </ul>
      )}
      {rows.length === 0 ? (
        <EmptyState>O resumo de cada temporada aparece aqui quando ela terminar.</EmptyState>
      ) : (
        <ul className="divide-y divide-white/6">
          {rows.map((h) => {
            const won = Object.values(h.champions).includes(h.user.club) || Object.values(h.cups).includes(h.user.club);
            return (
              <li key={h.season} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <b className="w-12 font-display text-lg tabular">{h.season}</b>
                <span className="min-w-0 flex-1">
                  <ClubTag id={h.user.club} bold />
                  <span className="block text-xs text-mist">{divisionFullName(h.user.div)} • meta: {h.user.objective}</span>
                </span>
                <span className="flex items-center gap-2 text-sm">
                  {won && <Medal className="size-4 text-gold-400" aria-label="Campeão" />}
                  <b className="tabular">{h.user.pos}º</b>
                  <span className={h.user.success ? "text-pitch-400" : "text-danger-400"}>{h.user.success ? "meta cumprida" : "meta não cumprida"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {rows.length > 0 && (
        <p className="mt-3 text-xs text-mist">
          Campeões da última temporada: {Object.entries(rows[0].champions).slice(0, 3).map(([d, c]) => `${competitionName(d)}: ${w.clubs[c]?.name ?? "?"}`).join(" • ")}.
        </p>
      )}
    </Card>
  );
}

/** Carreira do treinador: conquistas, recordes, ídolos do clube e temporadas. */
export function CareerScreen() {
  const { world: w } = useWorld();
  return (
    <>
      <PageHeader title="Carreira" subtitle={`${w.manager.name} • ${w.history.length} ${w.history.length === 1 ? "temporada concluída" : "temporadas concluídas"}. Vagas, conquistas, recordes e os ídolos do clube.`} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <VacanciesCard />
        <AchievementsCard />
        <RecordsCard />
        <IdolsCard />
        <SeasonsCard />
      </div>
    </>
  );
}

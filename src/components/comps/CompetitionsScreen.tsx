"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CalendarDays, ChartNoAxesColumn, Flag as FlagIcon, Goal, History, Trophy } from "lucide-react";
import { cupId, divisionName, DIVISIONS, LEAGUE_IDS, LEAGUES, PROMOTION_SPOTS, DIVISION_SIZE, leagueRanking, leagueStars, leagueTier, user } from "@/game";
import type { DivisionId, LeagueId } from "@/game/types";
import { PageHeader } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/Flag";
import { useWorld } from "@/components/game/GameProvider";
import { LeagueTable } from "./LeagueTable";
import { TabStrip, type TabItem } from "./TabStrip";

const CupView = dynamic(() => import("./CupView").then((m) => m.CupView));
const ContView = dynamic(() => import("./CupView").then((m) => m.ContView));
const ScorersView = dynamic(() => import("./ScorersView").then((m) => m.ScorersView));
const FixturesView = dynamic(() => import("./FixturesView").then((m) => m.FixturesView));
const HistoryView = dynamic(() => import("./HistoryView").then((m) => m.HistoryView));
const NationsView = dynamic(() => import("./NationsView").then((m) => m.NationsView));
const LeaguesRankingView = dynamic(() => import("./LeaguesRankingView").then((m) => m.LeaguesRankingView));

type GlobalTab = "cont" | "ranking" | "nations" | "scorers" | "fixtures" | "history";
/** Escopo da tela: uma liga (com sub-abas) ou uma aba global. */
export type CompScope = LeagueId | GlobalTab;
/** Sub-aba de uma liga: uma divisão ou a Copa Nacional. */
type LeagueSub = DivisionId | "cup";

const GLOBAL_SUBTITLE: Record<GlobalTab, string> = {
  cont: "Os 13 campeões nacionais e mais três classificados por reputação em mata-mata de jogo único. Empate vai para os pênaltis; final em campo neutro.",
  ranking: "Qual liga tem os melhores elencos hoje: o nível do futebol muda o jogo, dos elencos às transferências.",
  nations: "Seleções de todos os países em todos contra todos, com final entre os dois primeiros.",
  scorers: "Os goleadores da temporada por divisão. Toque em um jogador para ver a ficha.",
  fixtures: "Seus jogos em todas as competições, semana a semana.",
  history: "Títulos do clube e campeões de cada temporada.",
};

function divisionSubtitle(div: DivisionId): string {
  const info = DIVISIONS[div];
  const parts = [`${LEAGUES[info.league].name} • ${DIVISION_SIZE} clubes em turno e returno.`];
  if (info.level === 1) parts.push("O campeão vai à Copa dos Campeões; vice e terceiro disputam as vagas restantes.");
  if (info.up) parts.push(`Os ${PROMOTION_SPOTS} primeiros sobem para a ${divisionName(info.up)}.`);
  if (info.down) parts.push(`Os ${PROMOTION_SPOTS} últimos caem para a ${divisionName(info.down)}.`);
  else if (info.up) parts.push("Ninguém cai.");
  return parts.join(" ");
}

/** Competições: ligas (divisões e Copa Nacional), Copa dos Campeões, artilharia, calendário e histórico. */
export function CompetitionsScreen() {
  const { world: w } = useWorld();
  const u = user(w);
  const availableLeagues = new Set(Object.values(w.clubs).map((club) => club.league));
  const activeLeagues = LEAGUE_IDS.filter((league) => availableLeagues.has(league));
  const [scope, setScope] = useState<CompScope>(u.league);
  // Sub-aba escolhida em cada liga; na liga do usuário começa na divisão dele.
  const [subs, setSubs] = useState<Partial<Record<LeagueId, LeagueSub>>>(() => ({ [u.league]: u.div }));

  const scopeItems: TabItem<CompScope>[] = [
    ...activeLeagues.map((l) => ({
      value: l as CompScope,
      mark: l === u.league,
      label: (
        <>
          <Flag code={l} decorative /> {LEAGUES[l].name}
        </>
      ),
    })),
    { value: "cont", group: true, label: <><Trophy aria-hidden /> Copa dos Campeões</> },
    { value: "ranking", label: <><ChartNoAxesColumn aria-hidden /> Ranking das ligas</> },
    { value: "nations", label: <><FlagIcon aria-hidden /> Copa das Nações</> },
    { value: "scorers", label: <><Goal aria-hidden /> Artilharia</> },
    { value: "fixtures", label: <><CalendarDays aria-hidden /> Calendário</> },
    { value: "history", label: <><History aria-hidden /> Histórico</> },
  ];

  const isLeague = (activeLeagues as string[]).includes(scope);
  const league = isLeague ? (scope as LeagueId) : null;
  const sub: LeagueSub | null = league ? (subs[league] ?? LEAGUES[league].divisions[0]) : null;

  const subItems: TabItem<LeagueSub>[] = league
    ? [
        ...LEAGUES[league].divisions.map((d) => ({ value: d as LeagueSub, label: divisionName(d), mark: d === u.div })),
        { value: "cup", group: true, label: <><Trophy aria-hidden /> Copa Nacional</>, mark: league === u.league && !!w.cups[cupId(league)]?.entrants.includes(u.id) },
      ]
    : [];

  const title = league ? (
    <span className="inline-flex items-center gap-3">
      <Flag code={league} className="h-[0.7em] rounded-[3px] ring-1 ring-black/25" />
      {sub === "cup" ? "Copa Nacional" : divisionName(sub as DivisionId)}
    </span>
  ) : (
    "Competições"
  );
  // Nível do futebol da liga e posição no ranking (só aparece nas ligas).
  const level = league ? (() => {
    const rank = leagueRanking(w).find((r) => r.id === league)?.rank;
    return `Nível ${leagueTier(league).toLowerCase()} (${leagueStars(league).toFixed(1).replace(".", ",")} de 5)${rank ? `, ${rank}ª do ranking das ligas` : ""}.`;
  })() : "";
  const subtitle = league
    ? sub === "cup"
      ? `${LEAGUES[league].name} • mata-mata em jogo único com os 32 clubes das duas primeiras divisões. Empate vai para os pênaltis.`
      : `${divisionSubtitle(sub as DivisionId)} ${level}`
    : scope === 'cont' && activeLeagues.length < LEAGUE_IDS.length
      ? `Os 16 melhores das ligas atuais em mata-mata de jogo único. As novas ligas entram na próxima temporada.`
      : GLOBAL_SUBTITLE[scope as GlobalTab];

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <TabStrip items={scopeItems} value={scope} onChange={setScope} ariaLabel="Liga ou competição" className="mb-3" />
      {league && sub && (
        <TabStrip
          key={league}
          items={subItems}
          value={sub}
          onChange={(v) => setSubs((m) => ({ ...m, [league]: v }))}
          ariaLabel={`Competições — ${LEAGUES[league].name}`}
          size="sm"
          className="mb-5"
        />
      )}
      {!league && <div className="mb-5" />}
      <div role="tabpanel" aria-label={typeof title === "string" ? title : undefined}>
        {league && sub ? (
          sub === "cup" ? <CupView key={league} comp={cupId(league)} /> : <LeagueTable key={sub} div={sub} />
        ) : scope === "cont" ? (
          <ContView />
        ) : scope === "ranking" ? (
          <LeaguesRankingView />
        ) : scope === "nations" ? (
          <NationsView />
        ) : scope === "scorers" ? (
          <ScorersView />
        ) : scope === "fixtures" ? (
          <FixturesView />
        ) : (
          <HistoryView />
        )}
      </div>
    </>
  );
}

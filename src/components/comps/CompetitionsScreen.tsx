"use client";

import { useState } from "react";
import { CalendarDays, Flag as FlagIcon, Goal, History, Trophy } from "lucide-react";
import { cupId, divisionName, DIVISIONS, LEAGUE_IDS, LEAGUES, PROMOTION_SPOTS, user } from "@/game";
import type { DivisionId, LeagueId } from "@/game/types";
import { PageHeader } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/Flag";
import { useWorld } from "@/components/game/GameProvider";
import { LeagueTable } from "./LeagueTable";
import { ContView, CupView } from "./CupView";
import { ScorersView } from "./ScorersView";
import { FixturesView } from "./FixturesView";
import { HistoryView } from "./HistoryView";
import { NationsView } from "./NationsView";
import { TabStrip, type TabItem } from "./TabStrip";

type GlobalTab = "cont" | "nations" | "scorers" | "fixtures" | "history";
/** Escopo da tela: uma liga (com sub-abas) ou uma aba global. */
export type CompScope = LeagueId | GlobalTab;
/** Sub-aba de uma liga: uma divisão ou a Copa Nacional. */
type LeagueSub = DivisionId | "cup";

const GLOBAL_SUBTITLE: Record<GlobalTab, string> = {
  cont: "Os 16 melhores das seis ligas em mata-mata de jogo único. Empate vai para os pênaltis; final em campo neutro.",
  nations: "Brasil, Argentina, Portugal, Espanha, Inglaterra e Itália em todos contra todos, com final entre os dois primeiros.",
  scorers: "Os goleadores da temporada por divisão. Toque em um jogador para ver a ficha.",
  fixtures: "Seus jogos em todas as competições, semana a semana.",
  history: "Títulos do clube e campeões de cada temporada.",
};

function divisionSubtitle(div: DivisionId): string {
  const info = DIVISIONS[div];
  const parts = [`${LEAGUES[info.league].name} • 16 clubes em turno e returno.`];
  if (info.level === 1) parts.push("Os 3 primeiros vão à Copa dos Campeões.");
  if (info.up) parts.push(`Os ${PROMOTION_SPOTS} primeiros sobem para a ${divisionName(info.up)}.`);
  if (info.down) parts.push(`Os ${PROMOTION_SPOTS} últimos caem para a ${divisionName(info.down)}.`);
  else if (info.up) parts.push("Ninguém cai.");
  return parts.join(" ");
}

/** Competições: ligas (divisões e Copa Nacional), Copa dos Campeões, artilharia, calendário e histórico. */
export function CompetitionsScreen() {
  const { world: w } = useWorld();
  const u = user(w);
  const [scope, setScope] = useState<CompScope>(u.league);
  // Sub-aba escolhida em cada liga; na liga do usuário começa na divisão dele.
  const [subs, setSubs] = useState<Partial<Record<LeagueId, LeagueSub>>>(() => ({ [u.league]: u.div }));

  const scopeItems: TabItem<CompScope>[] = [
    ...LEAGUE_IDS.map((l) => ({
      value: l as CompScope,
      mark: l === u.league,
      label: (
        <>
          <Flag code={l} decorative /> {LEAGUES[l].name}
        </>
      ),
    })),
    { value: "cont", group: true, label: <><Trophy aria-hidden /> Copa dos Campeões</> },
    { value: "nations", label: <><FlagIcon aria-hidden /> Copa das Nações</> },
    { value: "scorers", label: <><Goal aria-hidden /> Artilharia</> },
    { value: "fixtures", label: <><CalendarDays aria-hidden /> Calendário</> },
    { value: "history", label: <><History aria-hidden /> Histórico</> },
  ];

  const isLeague = (LEAGUE_IDS as string[]).includes(scope);
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
  const subtitle = league
    ? sub === "cup"
      ? `${LEAGUES[league].name} • mata-mata em jogo único com os 32 clubes das duas primeiras divisões. Empate vai para os pênaltis.`
      : divisionSubtitle(sub as DivisionId)
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

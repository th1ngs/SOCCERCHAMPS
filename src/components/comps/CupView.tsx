"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import {
  compLeague,
  competitionName,
  contStatus,
  cupOf,
  divisionName,
  knockoutStatus,
  LEAGUES,
  projectedCont,
  user,
} from "@/game";
import type { Club, CupId, KnockoutId, Match } from "@/game/types";
import { Alert, Badge, Card, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { ResultList } from "./Results";
import { knockoutRounds, winnerSide, type CupRound } from "./derive";

function roundsOf(rounds: CupRound[], week: number) {
  return rounds.map((r) => ({ ...r, pending: !r.matches.length, future: r.week > week }));
}

function pendingText(r: CupRound, future: boolean): string {
  return future ? `Confrontos sorteados antes da semana ${r.week}.` : "Sem confrontos nesta fase.";
}

function ChampionAlert({ club, comp }: { club: Club; comp: KnockoutId }) {
  return (
    <Alert tone="info" className="bg-gold-400/10 ring-gold-400/35">
      <Trophy className="size-5 text-gold-400" aria-hidden />
      <Crest club={club} size={26} />
      <span>
        Campeão da {competitionName(comp)}: <b>{club.name}</b>
        {comp === "cont" && (
          <span className="ml-1.5 inline-flex items-center gap-1 text-mist">
            <Flag code={club.league} /> {LEAGUES[club.league].name}
          </span>
        )}
      </span>
    </Alert>
  );
}

/** Copa Nacional de uma liga: situação do usuário (se for a sua liga) e as cinco fases. */
export function CupView({ comp }: { comp: CupId }) {
  const { world: w, version } = useWorld();
  const { rounds, cup, status, mine } = useMemo(() => {
    void version;
    const u = user(w);
    return {
      rounds: roundsOf(knockoutRounds(w, comp), w.week),
      cup: cupOf(w, comp),
      status: knockoutStatus(w, comp, u.id),
      mine: compLeague(comp) === u.league,
    };
  }, [w, comp, version]);
  const champ = cup?.champion ? w.clubs[cup.champion] : null;

  return (
    <div className="flex flex-col gap-4">
      {champ && <ChampionAlert club={champ} comp={comp} />}
      {mine && !champ && status === "alive" && <Alert tone="good">Seu time segue vivo na Copa Nacional. Jogo único; empate vai para os pênaltis.</Alert>}
      {mine && status === "eliminated" && <Alert tone="warn">Seu time foi eliminado da Copa Nacional.</Alert>}
      {mine && status === "out" && <Alert tone="info">Seu time não disputa a Copa Nacional: ela reúne só os clubes das duas primeiras divisões.</Alert>}
      {cup && !champ && (
        <p className="text-sm text-mist">
          {cup.entrants.length} clubes inscritos • <b className="text-snow">{cup.alive.length}</b> seguem vivos.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {rounds.map((r) => (
          <Card key={r.round} title={r.name} action={<span className="text-xs text-mist">Semana {r.week}</span>}>
            {r.pending ? <EmptyState>{pendingText(r, r.future)}</EmptyState> : <ResultList matches={r.matches} />}
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Confronto compacto da chave: dois clubes com bandeira, placar e pênaltis. */
function BracketMatch({ m }: { m: Match }) {
  const { world: w } = useWorld();
  const win = winnerSide(m);
  const side = (id: string, i: 0 | 1) => {
    const c = w.clubs[id];
    const score = i === 0 ? m.hs : m.as;
    const mine = id === w.userClub;
    return (
      <div className={cn("flex min-w-0 items-center gap-2 px-2.5 py-1.5", mine && "bg-gold-400/10", m.played && win !== i && "text-snow/60")}>
        <Crest club={c} size={16} className="shrink-0" />
        <Flag code={c.league} />
        <span className={cn("min-w-0 flex-1 truncate text-sm", win === i && "font-bold text-snow")}>{c.name}</span>
        {m.pens && <span className="text-xs text-mist tabular">({m.pens[i]})</span>}
        <span className="w-5 text-right font-display font-extrabold tabular">{m.played ? score : ""}</span>
      </div>
    );
  };
  return (
    <li className="overflow-hidden rounded-lg bg-ink-950/50 ring-1 ring-inset ring-white/8">
      {side(m.h, 0)}
      <div className="h-px bg-white/6" />
      {side(m.a, 1)}
    </li>
  );
}

/** Copa dos Campeões: situação do usuário, chave por fase e os 16 classificados. */
export function ContView() {
  const { world: w, version } = useWorld();
  const data = useMemo(() => {
    void version;
    const u = user(w);
    const cup = cupOf(w, "cont");
    const entrants = (cup?.entrants ?? [])
      .map((id) => w.clubs[id])
      .filter(Boolean)
      .sort((a, b) => a.league.localeCompare(b.league) || b.rep - a.rep);
    return {
      u,
      cup,
      entrants,
      rounds: roundsOf(knockoutRounds(w, "cont"), w.week),
      status: contStatus(w, u.id),
      projected: projectedCont(w).includes(u.id),
      firstDiv: LEAGUES[u.league].divisions[0],
    };
  }, [w, version]);
  const { u, cup, entrants, rounds, status, projected, firstDiv } = data;
  const champ = cup?.champion ? w.clubs[cup.champion] : null;
  const started = w.week > 0;

  return (
    <div className="flex flex-col gap-4">
      {champ && <ChampionAlert club={champ} comp="cont" />}
      {status === "alive" && !champ && <Alert tone="good">Seu time está vivo na Copa dos Campeões. Jogo único; a final é em campo neutro.</Alert>}
      {status === "eliminated" && <Alert tone="warn">Seu time foi eliminado da Copa dos Campeões.</Alert>}
      {status === "out" && (
        <Alert tone="info">
          <span>
            Seu time não disputa a Copa dos Campeões nesta temporada.{" "}
            {u.div === firstDiv
              ? started && projected
                ? <b>Pela tabela atual, o {u.name} se classifica para a próxima edição.</b>
                : `Termine entre os 3 primeiros da ${divisionName(firstDiv)} para disputar a próxima.`
              : `Chegue à ${divisionName(firstDiv)} e termine entre os 3 primeiros para disputá-la.`}
          </span>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {rounds.map((r) => (
          <section key={r.round} className="min-w-0 rounded-(--radius-card) bg-ink-800 p-4 shadow-card ring-1 ring-inset ring-white/8">
            <header className="mb-3 flex items-center justify-between gap-2">
              <SectionTitle>{r.name}</SectionTitle>
              <span className="text-xs text-mist">Semana {r.week}</span>
            </header>
            {r.pending ? (
              <EmptyState>{pendingText(r, r.future)}</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2">
                {r.matches.map((m) => (
                  <BracketMatch key={m.id} m={m} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <Card title={`Classificados • ${entrants.length} clubes`}>
        {entrants.length ? (
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            {entrants.map((c) => {
              const st = cup?.champion === c.id ? "champion" : cup?.alive.includes(c.id) ? "alive" : "eliminated";
              const mine = c.id === w.userClub;
              return (
                <li
                  key={c.id}
                  className={cn(
                    "flex min-h-10 min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                    mine ? "bg-gold-400/10 ring-1 ring-inset ring-gold-400/30" : "bg-white/[0.03]",
                    st === "eliminated" && "text-snow/55",
                  )}
                >
                  <Crest club={c} size={18} className="shrink-0" />
                  <Flag code={c.league} />
                  <span className={cn("min-w-0 flex-1 truncate", mine && "font-semibold")}>{c.name}</span>
                  {st === "champion" ? (
                    <Badge tone="gold"><Trophy className="size-3" aria-hidden /> Campeão</Badge>
                  ) : st === "eliminated" ? (
                    <Badge>Eliminado</Badge>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState>Os classificados são definidos no início da temporada.</EmptyState>
        )}
        <p className="mt-3 text-xs text-mist">
          Vagas: os 3 primeiros de cada primeira divisão na temporada anterior; os 2 de menor reputação ficam de fora para fechar 16.
        </p>
      </Card>
    </div>
  );
}

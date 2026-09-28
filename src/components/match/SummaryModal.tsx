"use client";

import { useMemo } from "react";
import { Bandage, ChevronRight, Goal, Star, Users } from "lucide-react";
import { weeksText } from "@/game";
import type { Match, MatchResult, SimGoal, World } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { useFlow } from "@/components/game/useFlow";
import { RoundResults } from "@/components/comps/Results";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Alert, Badge, PosBadge, SectionTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { StatBar } from "./StatBars";
import { clearStored, compName, findMatch, resultKey, statRows, type StoredResult } from "./matchUtils";

interface SummaryData {
  goals: SimGoal[];
  winner: number;
  result: MatchResult | null;
}

/** Resultado guardado no scratch; sem ele (ex.: após recarregar), reconstrói placar e gols da súmula. */
function summaryData(m: Match, stored: StoredResult | undefined): SummaryData {
  if (stored) return { goals: stored.result.goals, winner: stored.result.winner, result: stored.result };
  const hs = m.hs ?? 0, as = m.as ?? 0;
  const winner = hs !== as ? (hs > as ? 0 : 1) : m.pens ? (m.pens[0] > m.pens[1] ? 0 : 1) : -1;
  const goals = (m.goals || []).map(([pid, side, min, assist, pen]) => ({ pid, side, min, assist: assist || null, pen: pen === 1 }));
  return { goals, winner, result: null };
}

function Scorers({ w, goals, right }: { w: World; goals: SimGoal[]; right?: boolean }) {
  if (!goals.length) return null;
  return (
    <ul className={cn("mt-2 space-y-0.5 text-xs text-mist sm:text-sm", right && "text-right")}>
      {goals.map((g, i) => (
        <li key={`${g.pid}-${g.min}-${i}`} className={cn("flex items-center gap-1", right && "justify-end")}>
          <Goal className="size-3.5 shrink-0 text-gold-400" aria-hidden />
          <span className="truncate">
            {w.players[g.pid]?.name ?? "?"} {g.min}&apos;{g.pen ? " (pên.)" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Resumo da partida do usuário. Só fecha por "Continuar" (encerra a semana). */
export function SummaryModal({ matchId }: { matchId: string }) {
  const { world: w, version, scratch } = useWorld();
  const { finishWeek } = useFlow();
  const m = useMemo(() => {
    void version;
    return findMatch(w, matchId);
  }, [w, matchId, version]);
  const weekIndex = useMemo(() => w.weeks.findIndex((wk) => !!wk?.matches.some((x) => x.id === matchId)), [w, matchId]);

  const onContinue = () => {
    clearStored(scratch, matchId);
    finishWeek();
  };

  if (!m) {
    return (
      <Modal open dismissible={false} title="Resumo indisponível" footer={<Button variant="primary" iconRight={<ChevronRight />} onClick={onContinue}>Continuar</Button>}>
        <p className="text-sm text-mist">Não encontramos esta partida na rodada.</p>
      </Modal>
    );
  }

  const data = summaryData(m, scratch[resultKey(matchId)] as StoredResult | undefined);
  const uid = w.userClub;
  const s = m.h === uid ? 0 : 1;
  const won = data.winner === s, lost = data.winner === 1 - s;
  const tone = won ? "win" : lost ? "lose" : "draw";
  const home = w.clubs[m.h], away = w.clubs[m.a];
  const res = data.result;
  const stats = res?.stats ?? null;

  const ratings = res
    ? res.played[s]
        .map((pid) => ({ p: w.players[pid], r: res.ratings[pid] ?? 6 }))
        .filter((x) => !!x.p)
        .sort((a, b) => b.r - a.r)
    : [];
  const motm = ratings[0]?.p;
  const injuries = res ? res.injuries.filter((i) => w.players[i.pid]?.clubId === uid) : [];

  return (
    <Modal
      open
      dismissible={false}
      size="lg"
      footer={
        <Button variant="primary" size="lg" iconRight={<ChevronRight />} onClick={onContinue} className="max-sm:w-full" data-autofocus>
          Continuar
        </Button>
      }
    >
      <div className="space-y-5">
        <div
          className={cn(
            "rounded-2xl px-3 py-4 ring-1 ring-inset",
            tone === "win" && "bg-linear-to-b from-pitch-500/25 to-ink-800 ring-pitch-500/40",
            tone === "lose" && "bg-linear-to-b from-danger-500/20 to-ink-800 ring-danger-500/35",
            tone === "draw" && "bg-linear-to-b from-ink-600/60 to-ink-800 ring-white/10",
          )}
        >
          <div className="mb-3 text-center">
            <span
              className={cn(
                "inline-block rounded-lg px-3 py-0.5 font-display text-xl font-extrabold italic tracking-wider",
                tone === "win" ? "bg-pitch-500 text-ink-950" : tone === "lose" ? "bg-danger-500 text-white" : "bg-ink-500 text-snow",
              )}
            >
              {won ? "VITÓRIA" : lost ? "DERROTA" : "EMPATE"}
            </span>
            <p className="mt-1 text-xs text-mist">{compName(w, m)}</p>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            <div className="flex min-w-0 flex-col items-center text-center">
              <Crest club={home} size={46} />
              <b className="mt-1 line-clamp-2 font-display text-base font-bold uppercase leading-tight sm:text-lg">{home.name}</b>
              <Scorers w={w} goals={data.goals.filter((x) => x.side === 0)} />
            </div>
            <div className="flex flex-col items-center pt-2">
              <span className="font-display text-5xl font-extrabold leading-none tabular">
                {m.hs ?? 0} - {m.as ?? 0}
              </span>
              {m.pens && <small className="mt-1 text-sm text-gold-400">pênaltis {m.pens[0]}-{m.pens[1]}</small>}
            </div>
            <div className="flex min-w-0 flex-col items-center text-center">
              <Crest club={away} size={46} />
              <b className="mt-1 line-clamp-2 font-display text-base font-bold uppercase leading-tight sm:text-lg">{away.name}</b>
              <Scorers w={w} goals={data.goals.filter((x) => x.side === 1)} right />
            </div>
          </div>
          {!!m.attendance && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-mist">
              <Users className="size-3.5" aria-hidden /> Público: {m.attendance.toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        {stats && (
          <section className="grid gap-x-6 rounded-2xl bg-ink-900/50 px-3 py-2 ring-1 ring-inset ring-white/6 sm:grid-cols-2">
            {statRows(stats).map(([label, a, b]) => (
              <StatBar key={label} label={label} left={a} right={b} />
            ))}
          </section>
        )}

        {injuries.length > 0 && (
          <div className="space-y-2">
            {injuries.map((i) => {
              const p = w.players[i.pid];
              const weeks = p.inj || i.weeks;
              const kind = i.type ?? p.injType;
              return (
                <Alert key={i.pid} tone="bad">
                  <Bandage className="size-4 shrink-0 text-danger-400" aria-hidden />
                  <span>
                    <b>{p.name}</b>
                    {kind ? ` (${kind.toLowerCase()})` : ""} fora por {weeksText(weeks)}.
                  </span>
                </Alert>
              );
            })}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {ratings.length > 0 && (
            <section className="min-w-0">
              <SectionTitle className="mb-2">Notas do seu time</SectionTitle>
              <ul className="divide-y divide-white/6">
                {ratings.map(({ p, r }) => (
                  <li key={p.id} className="flex min-h-9 items-center gap-2 py-1 text-sm">
                    <PosBadge pos={p.pos} />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    {p === motm && (
                      <Badge tone="gold" className="gap-1">
                        <Star className="size-3 fill-current" aria-hidden /> Craque do jogo
                      </Badge>
                    )}
                    <b className={cn("w-9 text-right font-display text-base tabular", r >= 7.5 ? "text-pitch-400" : r < 6 ? "text-danger-400" : "text-snow")}>
                      {r.toFixed(1)}
                    </b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className={cn("min-w-0", !ratings.length && "sm:col-span-2")}>
            <SectionTitle className="mb-2">Resultados da rodada</SectionTitle>
            <RoundResults weekIndex={weekIndex >= 0 ? weekIndex : undefined} highlight={uid} />
          </section>
        </div>
      </div>
    </Modal>
  );
}

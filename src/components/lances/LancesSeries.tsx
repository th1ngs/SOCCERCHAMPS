"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FastForward, Play, Swords } from "lucide-react";
import type { LanceResult } from "@/lances/engine";
import { SCENARIO_NAME } from "@/lances/engine";
import { levelName } from "@/lances/difficulty";
import { userGoalProb, type SeriesOutcome, type SeriesPlan } from "@/lances/series";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { cn } from "@/lib/cn";
import { LanceStage } from "./LanceStage";

type Stage = { kind: "intro"; i: number } | { kind: "play"; i: number } | { kind: "tiebreak"; round: number; oppScored: boolean } | { kind: "tiebreakPlay"; round: number; oppScored: boolean } | { kind: "end" };

/**
 * Partida em lances: cartão antes de cada ataque (minuto, cenário, gols do adversário até ali),
 * o lance em 3D e o placar final. `onFinish` recebe todos os resultados.
 */
export function LancesSeries({ plan, onFinish, finishLabel = "Ver resumo" }: { plan: SeriesPlan; onFinish: (o: SeriesOutcome) => void; finishLabel?: string }) {
  const [stage, setStage] = useState<Stage>(plan.chances.length ? { kind: "intro", i: 0 } : { kind: "end" });
  const [results, setResults] = useState<SeriesOutcome["results"]>([]);
  const [tb, setTb] = useState<[number, number] | null>(null);
  const [tbLog, setTbLog] = useState<string[]>([]);
  const user = plan.userSide === 0 ? plan.home : plan.away;
  const opp = plan.userSide === 0 ? plan.away : plan.home;

  // Minuto "atual" do placar: o do lance em foco (ou fim de jogo).
  const nowMin = stage.kind === "intro" || stage.kind === "play" ? plan.chances[stage.i].min : 90;
  const userGoals = results.filter((r) => r.result.goal).length;
  const oppGoals = plan.oppGoals.filter((g) => g.min <= nowMin || stage.kind === "end" || stage.kind === "tiebreak" || stage.kind === "tiebreakPlay").length;
  const score: [number, number] = plan.userSide === 0 ? [userGoals, oppGoals] : [oppGoals, userGoals];

  // Setup do lance em foco (fixo enquanto ele dura).
  const setup = useMemo(() => {
    if (stage.kind === "play") return plan.setup(plan.chances[stage.i].kind, plan.difficulty.params(), stage.i);
    if (stage.kind === "tiebreakPlay") return plan.setup("entrada", plan.difficulty.params(), 100 + stage.round);
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.kind, stage.kind === "play" ? stage.i : stage.kind === "tiebreakPlay" ? stage.round : -1]);

  const afterRegular = (res: SeriesOutcome["results"]) => {
    const ug = res.filter((r) => r.result.goal).length, og = plan.oppGoals.length;
    if (plan.tiebreak && ug === og) {
      setTb([0, 0]);
      const oppScored = Math.random() < plan.tiebreak.oppProb;
      setTbLog([`${opp.short}: ${oppScored ? "gol" : "perdeu"}`]);
      setStage({ kind: "tiebreak", round: 1, oppScored });
    } else setStage({ kind: "end" });
  };

  const record = (result: LanceResult, simulated = false) => {
    if (stage.kind !== "play") return;
    plan.difficulty.record(result.goal);
    const next = [...results, { min: plan.chances[stage.i].min, result, simulated }];
    setResults(next);
    if (stage.i + 1 < plan.chances.length) setStage({ kind: "intro", i: stage.i + 1 });
    else afterRegular(next);
  };

  const skipAll = () => {
    const start = stage.kind === "intro" || stage.kind === "play" ? stage.i : plan.chances.length;
    const next = [...results];
    for (let i = start; i < plan.chances.length; i++) {
      const goal = Math.random() < userGoalProb(plan.difficulty.level);
      next.push({ min: plan.chances[i].min, simulated: true, result: { outcome: goal ? "goal" : "save", goal, scorer: null, assist: null, text: goal ? "Gol (lance simulado)." : "Lance simulado sem gol." } });
    }
    setResults(next);
    afterRegular(next);
  };

  const tiebreakDone = (result: LanceResult) => {
    if (stage.kind !== "tiebreakPlay" || !tb) return;
    const score2: [number, number] = [tb[0] + (result.goal ? 1 : 0), tb[1] + (stage.oppScored ? 1 : 0)];
    setTb(score2);
    setTbLog((l) => [...l, `${user.short}: ${result.goal ? "gol" : "perdeu"}`]);
    if (score2[0] !== score2[1] || stage.round >= 6) {
      // Depois de 6 rodadas iguais, decide na moeda (raro).
      if (score2[0] === score2[1]) score2[Math.random() < 0.5 ? 0 : 1]++;
      setTb([...score2]);
      setStage({ kind: "end" });
    } else {
      const oppScored = Math.random() < (plan.tiebreak?.oppProb ?? 0.4);
      setTbLog((l) => [...l, `${opp.short}: ${oppScored ? "gol" : "perdeu"}`]);
      setStage({ kind: "tiebreak", round: stage.round + 1, oppScored });
    }
  };

  const finish = () => onFinish({ results, userGoals, oppGoals: plan.oppGoals.length, tiebreak: tb });
  const won = tb ? tb[0] > tb[1] : userGoals > plan.oppGoals.length;
  const draw = !tb && userGoals === plan.oppGoals.length;

  const header = (
    <div className="pointer-events-auto mx-auto flex max-w-xl items-center justify-center gap-2 rounded-2xl bg-ink-950/80 px-3 py-1.5 ring-1 ring-white/10">
      <Crest club={plan.home} size={24} />
      <span className="max-w-24 truncate font-display text-sm font-bold uppercase sm:max-w-none">{plan.home.short}</span>
      <span className="rounded-md bg-black/50 px-2 font-display text-2xl font-extrabold tabular">{score[0]} : {score[1]}</span>
      <span className="max-w-24 truncate font-display text-sm font-bold uppercase sm:max-w-none">{plan.away.short}</span>
      <Crest club={plan.away} size={24} />
      <span className="ml-1 font-display text-xs font-bold text-gold-300 tabular">{stage.kind === "tiebreak" || stage.kind === "tiebreakPlay" ? "Decisão" : stage.kind === "end" ? "Fim" : `${nowMin}'`}</span>
    </div>
  );

  if ((stage.kind === "play" || stage.kind === "tiebreakPlay") && setup) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-ink-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" role="dialog" aria-modal="true" aria-label="Lance de ataque">
        <LanceStage key={stage.kind === "play" ? `c${stage.i}` : `t${stage.round}`} setup={setup} onDone={(r) => (stage.kind === "play" ? record(r) : tiebreakDone(r))} top={header} />
      </div>
    );
  }

  // Cartões entre os lances.
  const prevMin = stage.kind === "intro" && stage.i > 0 ? plan.chances[stage.i - 1].min : 0;
  const oppSince = stage.kind === "intro" ? plan.oppGoals.filter((g) => g.min > prevMin && g.min <= nowMin) : [];
  const last = results[results.length - 1];
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[radial-gradient(ellipse_at_top,#14305a,#07121f_70%)] p-4 pt-[calc(1rem+env(safe-area-inset-top))]" role="dialog" aria-modal="true" aria-label="Partida em lances">
      <div className="w-full max-w-md animate-pop text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-mist">{plan.label}</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div className="flex w-28 flex-col items-center gap-1"><Crest club={plan.home} size={56} /><span className="w-full truncate font-display text-sm font-bold uppercase">{plan.home.name}</span></div>
          <span className="font-display text-5xl font-extrabold tabular">{score[0]}<span className="mx-1 text-mist">:</span>{score[1]}</span>
          <div className="flex w-28 flex-col items-center gap-1"><Crest club={plan.away} size={56} /><span className="w-full truncate font-display text-sm font-bold uppercase">{plan.away.name}</span></div>
        </div>
        {tb && <p className="mt-1 font-display text-sm font-bold text-gold-300">Lances decisivos: {plan.userSide === 0 ? `${tb[0]} x ${tb[1]}` : `${tb[1]} x ${tb[0]}`}</p>}

        {last && stage.kind !== "end" && (
          <p className={cn("mt-4 rounded-xl px-3 py-2 text-sm font-semibold", last.result.goal ? "bg-gold-400/15 text-gold-300" : "bg-white/6 text-mist")}>{`${last.min}' • ${last.result.text}`}</p>
        )}
        {oppSince.map((g) => (
          <p key={g.min + g.who} className="mt-2 rounded-xl bg-danger-500/15 px-3 py-2 text-sm font-semibold text-danger-400">{`${g.min}' • Gol do ${opp.name}: ${g.who}`}</p>
        ))}

        {stage.kind === "intro" && (
          <div className="mt-5 rounded-2xl bg-ink-850/90 p-5 ring-1 ring-white/10">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-400">{`Lance ${stage.i + 1} de ${plan.chances.length} • ${plan.chances[stage.i].min}'`}</p>
            <p className="mt-1 font-display text-3xl font-extrabold uppercase italic">{SCENARIO_NAME[plan.chances[stage.i].kind]}</p>
            <p className="mt-1 text-sm text-mist">Bot: {levelName(plan.difficulty.level)}{plan.difficulty.setting === "auto" ? " (automático)" : ""}</p>
            <Button variant="primary" size="lg" block className="mt-4" icon={<Play />} onClick={() => setStage({ kind: "play", i: stage.i })} data-autofocus>Jogar o lance</Button>
            <Button variant="ghost" size="sm" className="mt-2" icon={<FastForward />} onClick={skipAll}>Simular os lances restantes</Button>
          </div>
        )}

        {stage.kind === "tiebreak" && (
          <div className="mt-5 rounded-2xl bg-ink-850/90 p-5 ring-1 ring-white/10">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold-400">Lance decisivo • rodada {stage.round}</p>
            <p className="mt-2 text-sm">{opp.name} {stage.oppScored ? <b className="text-danger-400">marcou</b> : <b className="text-pitch-400">desperdiçou</b>} o lance dele.</p>
            <p className="mt-1 text-xs text-mist">{tbLog.join(" • ")}</p>
            <Button variant="primary" size="lg" block className="mt-4" icon={<Swords />} onClick={() => setStage({ kind: "tiebreakPlay", round: stage.round, oppScored: stage.oppScored })}>Bater o seu lance</Button>
          </div>
        )}

        {stage.kind === "end" && (
          <div className="mt-5 rounded-2xl bg-ink-850/90 p-5 ring-1 ring-white/10">
            <p className={cn("font-display text-4xl font-extrabold uppercase italic", won ? "text-gold-400" : draw ? "text-snow" : "text-danger-400")}>{won ? "Vitória!" : draw ? "Empate" : "Derrota"}</p>
            <ul className="mt-3 space-y-1 text-left text-sm">
              {results.map((r, k) => (
                <li key={k} className="flex gap-2"><span className="w-8 text-right text-mist tabular">{`${r.min}'`}</span><span className={r.result.goal ? "font-semibold text-gold-300" : "text-mist"}>{r.result.text}</span></li>
              ))}
            </ul>
            <Button variant="primary" size="lg" block className="mt-4" iconRight={<ChevronRight />} onClick={finish} data-autofocus>{finishLabel}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

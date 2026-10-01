"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeftRight, ChevronRight, FastForward, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { Match, World } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { LiveController, type SpeedIndex } from "./live/controller";
import { Feed, LiveStats, PossessionBar, Scoreboard } from "./live/LivePanels";
import { GoalCelebration } from "./live/GoalCelebration";
import { PenaltyScene } from "./live/PenaltyScene";
import { SubsModal } from "./live/SubsModal";
import { compName, findMatch, settleMatch } from "./matchUtils";
import { useSound } from "./useSound";

const SPEED_OPTIONS: { value: `${SpeedIndex}`; label: string }[] = [
  { value: "0", label: "1x" },
  { value: "1", label: "2x" },
  { value: "2", label: "4x" },
];

/** Partida ao vivo em tela cheia (campo animado, narração, estatísticas e substituições). */
export function LiveMatch({ matchId }: { matchId: string }) {
  const { world: w, setMatchMode } = useWorld();
  const [m] = useState(() => findMatch(w, matchId));
  if (!m || m.played) {
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-ink-950/95 p-6 text-center">
        <div className="space-y-4">
          <p className="text-mist">{m ? "Esta partida já foi disputada." : "Partida não encontrada."}</p>
          <Button variant="primary" onClick={() => setMatchMode(null)}>
            Voltar ao jogo
          </Button>
        </div>
      </div>
    );
  }
  return <LiveMatchScreen w={w} m={m} />;
}

function LiveMatchScreen({ w, m }: { w: World; m: Match }) {
  const { commit, setMatchMode, setOverlay, scratch } = useWorld();
  const [ctrl] = useState(() => new LiveController(w, m));
  const snap = useSyncExternalStore(ctrl.subscribe, ctrl.getSnapshot, ctrl.getSnapshot);
  const [tab, setTab] = useState<"feed" | "stats">("feed");
  const [sound, toggleSound] = useSound();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const home = w.clubs[m.h], away = w.clubs[m.a];

  useEffect(() => {
    const canvas = canvasRef.current, box = boxRef.current;
    if (!canvas || !box) return;
    return ctrl.attach(canvas, box);
  }, [ctrl]);
  useEffect(() => () => ctrl.dispose(), [ctrl]);

  // Trava a rolagem da página por trás da tela cheia.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const toSummary = () => {
    settleMatch(w, m, ctrl.result(), scratch);
    commit();
    setMatchMode(null);
    setOverlay({ kind: "summary", matchId: m.id });
  };

  const overReason = snap.over ? "Partida encerrada" : undefined;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-ink-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      role="dialog"
      aria-modal="true"
      aria-label={`${home.name} x ${away.name} ao vivo`}
    >
      <header className="border-b border-white/8 bg-linear-to-b from-ink-800 to-ink-900 px-3 py-2 sm:px-5 sm:py-3">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <Scoreboard home={home} away={away} score={snap.score} pens={snap.pens} minuteText={snap.minuteText} comp={compName(w, m)} live={!snap.paused && !snap.over} />
          </div>
          <IconButton label={sound ? "Desligar som" : "Ligar som"} variant="ghost" size="icon" icon={sound ? <Volume2 /> : <VolumeX />} onClick={toggleSound} />
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3 p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[minmax(0,1fr)] lg:p-5">
        {/* Campo */}
        <div className="flex min-h-0 flex-col gap-3 lg:h-full">
          <div ref={boxRef} className="relative grid aspect-[105/68] max-h-[46dvh] w-full shrink-0 place-items-center lg:aspect-auto lg:max-h-none lg:min-h-0 lg:flex-1">
            <canvas ref={canvasRef} className="block rounded-xl shadow-2xl ring-1 ring-white/10" />
            {snap.moment && !snap.penaltyScene && !snap.overlay && !snap.flash && (
              <div key={snap.moment.key} className="pointer-events-none absolute inset-x-3 bottom-3 animate-pop sm:inset-x-auto sm:bottom-4 sm:left-4" role="status">
                <div className={cn("max-w-sm rounded-xl border bg-ink-950/90 px-4 py-2 shadow-2xl backdrop-blur-sm", snap.moment.tone === "red" ? "border-danger-400/60" : snap.moment.tone === "blue" ? "border-sky-400/60" : "border-gold-400/60")}>
                  <b className={cn("font-display text-base font-extrabold uppercase", snap.moment.tone === "red" ? "text-danger-400" : snap.moment.tone === "blue" ? "text-sky-300" : "text-gold-400")}>{snap.moment.title}</b>
                  <p className="mt-0.5 text-xs text-snow/85">{snap.moment.text}</p>
                </div>
              </div>
            )}
            {snap.flash && !snap.penaltyScene && <GoalCelebration key={snap.flash.key} flash={snap.flash} home={home} away={away} onSkip={() => ctrl.skipFlashes()} />}
            {snap.paused && !snap.overlay && !snap.subsOpen && !snap.penaltyScene && (
              <span className="pointer-events-none absolute left-3 top-3 rounded-lg bg-ink-950/80 px-2.5 py-1 font-display text-sm font-bold uppercase tracking-wide">
                Pausado
              </span>
            )}
            {snap.penaltyScene && <PenaltyScene key={snap.penaltyScene.key} scene={snap.penaltyScene} kits={ctrl.kits} team={(snap.penaltyScene.side === 0 ? home : away).name} onSkip={() => ctrl.skipScenes()} />}
            {snap.overlay && !snap.penaltyScene && (
              <div className="absolute inset-0 grid place-items-center rounded-xl bg-ink-950/65 p-4 backdrop-blur-[2px]">
                <div className="flex animate-pop flex-col items-center gap-2 text-center">
                  <b className="font-display text-3xl font-extrabold uppercase italic">{snap.overlay === "half" ? "Intervalo" : "Fim de jogo"}</b>
                  <span className="font-display text-4xl font-extrabold tabular">
                    {snap.score[0]} x {snap.score[1]}
                  </span>
                  {snap.pens && <span className="text-sm text-gold-400">Pênaltis: {snap.pens[0]} x {snap.pens[1]}</span>}
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {snap.overlay === "half" ? (
                      <>
                        <Button variant="secondary" icon={<ArrowLeftRight />} onClick={() => ctrl.openSubs()}>
                          Mexer no time
                        </Button>
                        <Button variant="primary" icon={<Play />} onClick={() => ctrl.resume()}>
                          2º tempo
                        </Button>
                      </>
                    ) : (
                      <Button variant="primary" size="lg" iconRight={<ChevronRight />} onClick={toSummary}>
                        Ver resumo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              ariaLabel="Velocidade"
              value={String(snap.speed) as `${SpeedIndex}`}
              onChange={(v) => ctrl.setSpeed(Number(v) as SpeedIndex)}
              options={SPEED_OPTIONS}
            />
            <Button
              variant="secondary"
              icon={snap.paused ? <Play /> : <Pause />}
              onClick={() => ctrl.togglePause()}
              disabled={snap.over || !!snap.penaltyScene}
              title={overReason}
              className="min-w-32"
            >
              {snap.paused ? "Continuar" : "Pausar"}
            </Button>
            <Button variant="secondary" icon={<ArrowLeftRight />} onClick={() => ctrl.openSubs()} disabled={snap.over} title={overReason}>
              <span className="sm:hidden">Substituições</span>
              <span className="hidden sm:inline">Substituições e tática</span>
            </Button>
            <Button variant="ghost" icon={<FastForward />} onClick={() => ctrl.skip()} disabled={snap.over} title={overReason} className="ml-auto">
              Até o fim
            </Button>
          </div>
        </div>

        {/* Narração e estatísticas */}
        <aside className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl bg-ink-800 p-3 ring-1 ring-inset ring-white/8 lg:h-full">
          <PossessionBar poss={snap.poss} kits={ctrl.kits} />
          <Segmented
            ariaLabel="Painel"
            size="sm"
            value={tab}
            onChange={setTab}
            className="self-start"
            options={[
              { value: "feed", label: "Narração" },
              { value: "stats", label: "Estatísticas" },
            ]}
          />
          <div className={cn("min-h-0 flex-1 overflow-y-auto pr-1")}>
            {tab === "feed" ? <Feed items={snap.feed} kits={ctrl.kits} /> : <LiveStats stats={snap.stats} kits={ctrl.kits} />}
          </div>
        </aside>
      </div>

      {snap.subsOpen && <SubsModal ctrl={ctrl} note={snap.subsNote} />}
    </div>
  );
}

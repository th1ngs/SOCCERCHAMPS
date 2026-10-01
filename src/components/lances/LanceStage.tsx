"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Hand, MousePointerClick, MoveUpRight, Video } from "lucide-react";
import type { ChanceSetup, LanceResult } from "@/lances/engine";
import type { CameraView } from "@/lances/render3d";
import { LanceRunner } from "@/lances/runner";
import { cn } from "@/lib/cn";

const RESULT_TITLE: Record<LanceResult["outcome"], string> = {
  goal: "GOOOL!", save: "Defesaça!", miss: "Para fora!", post: "Na trave!", block: "Bloqueado!", tackle: "Desarmado!", intercept: "Passe cortado!", time: "Tempo esgotado",
};

const HINT_KEY = "scm.lances.hint";
const CAM_KEY = "scm.lances.cam";
const CAM_NAME: Record<CameraView, string> = { top: "Câmera alta", back: "Câmera atrás" };

/** Palco de um lance: canvas 3D, rastro do gesto, tempo, quem conduz e o resultado. */
export function LanceStage({ setup, onDone, top, className }: { setup: ChanceSetup; onDone: (r: LanceResult) => void; top?: ReactNode; className?: string }) {
  const [runner] = useState(() => new LanceRunner());
  const hud = useSyncExternalStore(runner.subscribe, runner.getSnapshot, runner.getServerSnapshot);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [hint, setHint] = useState(() => {
    try { return localStorage.getItem(HINT_KEY) !== "1"; } catch { return true; }
  });

  const [view, setView] = useState<CameraView>(() => {
    try { return localStorage.getItem(CAM_KEY) === "back" ? "back" : "top"; } catch { return "top"; }
  });
  useEffect(() => { runner.setView(view); }, [runner, view]);
  const toggleView = () => {
    const v: CameraView = view === "top" ? "back" : "top";
    setView(v);
    try { localStorage.setItem(CAM_KEY, v); } catch { /* sem armazenamento */ }
  };

  useEffect(() => {
    runner.setOnDone((res) => {
      // A dica de controles some depois do primeiro lance.
      if (hint) {
        setHint(false);
        try { localStorage.setItem(HINT_KEY, "1"); } catch { /* sem armazenamento */ }
      }
      onDone(res);
    });
  });
  useEffect(() => { runner.start(setup); }, [runner, setup]);
  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current, overlay = overlayRef.current;
    if (!stage || !canvas || !overlay) return;
    return runner.attach(canvas, overlay, stage);
  }, [runner]);

  const r = hud.result;
  return (
    <div ref={stageRef} className={cn("relative min-h-0 flex-1 overflow-hidden bg-[#0a1424] select-none", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 block size-full touch-none" aria-label="Lance em 3D: deslize para chutar, toque num companheiro para passar, toque no gramado para conduzir" />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0" aria-hidden />

      <div className="pointer-events-none absolute inset-x-0 top-0 p-2 sm:p-3">
        {top}
        <div className="mx-auto mt-2 flex max-w-xl items-center gap-2">
          <span className="shrink-0 rounded-full bg-ink-950/75 px-2.5 py-1 font-display text-xs font-bold uppercase tracking-wide text-gold-300 ring-1 ring-gold-400/40">⚽ {hud.carrier}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/45 ring-1 ring-white/10" aria-hidden>
            <div className={cn("h-full rounded-full transition-[width] duration-200 ease-linear", hud.timeFrac < 0.3 ? "bg-danger-500" : "bg-pitch-400")} style={{ width: `${hud.phase === "intro" ? 100 : hud.timeFrac * 100}%` }} />
          </div>
          <span className={cn("w-8 shrink-0 text-right font-display text-sm font-bold tabular", hud.timeFrac < 0.3 ? "text-danger-400" : "text-snow")}>{hud.timeLeft}s</span>
          <button
            type="button"
            onClick={toggleView}
            className="pointer-events-auto grid size-8 shrink-0 place-items-center rounded-full bg-ink-950/75 text-snow ring-1 ring-white/15 hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400"
            aria-label={`${CAM_NAME[view]}: trocar para ${CAM_NAME[view === "top" ? "back" : "top"].toLowerCase()}`}
            title={CAM_NAME[view]}
          >
            <Video className="size-4" />
          </button>
        </div>
      </div>

      {hint && (hud.phase === "intro" || hud.phase === "play") && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
          <ul className="flex max-w-xl flex-wrap justify-center gap-x-4 gap-y-1 rounded-2xl bg-ink-950/80 px-4 py-2.5 text-xs text-snow ring-1 ring-white/10 sm:text-sm">
            <li className="flex items-center gap-1.5"><MoveUpRight className="size-4 text-gold-400" /> Deslize para chutar: direção = canto, comprimento = altura, curva = efeito</li>
            <li className="flex items-center gap-1.5"><MousePointerClick className="size-4 text-gold-400" /> Toque num companheiro para passar</li>
            <li className="flex items-center gap-1.5"><Hand className="size-4 text-gold-400" /> Toque no gramado para conduzir</li>
          </ul>
        </div>
      )}

      {r && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center px-4" aria-live="assertive" data-lance-result>
          <div className={cn("animate-celebrate-in rounded-2xl px-6 py-3 text-center shadow-2xl ring-1", r.goal ? "bg-gold-400/95 text-ink-950 ring-gold-200" : "bg-ink-950/85 text-snow ring-white/15")}>
            <b className="block font-display text-4xl font-extrabold uppercase italic leading-none sm:text-6xl">{RESULT_TITLE[r.outcome]}</b>
            <span className={cn("mt-1 block text-sm font-semibold", r.goal ? "text-ink-900" : "text-mist")}>{r.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

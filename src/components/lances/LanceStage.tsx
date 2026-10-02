"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CircleHelp, Hand, MousePointerClick, MoveUpRight, RotateCw, Video, X, Zap } from "lucide-react";
import type { ChanceSetup, LanceResult } from "@/lances/engine";
import type { CameraView } from "@/lances/render3d";
import { LanceRunner } from "@/lances/runner";
import { Joystick } from "./Joystick";
import { cn } from "@/lib/cn";

const RESULT_TITLE: Record<LanceResult["outcome"], string> = {
  goal: "GOOOL!", save: "Defesaça!", miss: "Para fora!", post: "Na trave!", block: "Bloqueado!", tackle: "Desarmado!", intercept: "Passe cortado!", offside: "Impedimento!", time: "Tempo esgotado",
};

const HINT_KEY = "scm.lances.hint";
const CAM_KEY = "scm.lances.cam";
const CAM_NAME: Record<CameraView, string> = { top: "Câmera alta", back: "Câmera atrás" };

/** Qualidades mostradas de quem conduz (as que mais mudam o lance). */
const ATTR_CHIPS: [keyof NonNullable<ReturnType<LanceRunner["getSnapshot"]>["attrs"]>, string][] = [["vel", "VEL"], ["fin", "FIN"], ["pas", "PAS"], ["dri", "DRI"], ["cab", "CAB"]];
const attrTone = (v: number) => (v >= 80 ? "text-pitch-300" : v >= 65 ? "text-gold-300" : "text-mist");
type Orientation = ScreenOrientation & { lock?: (o: "landscape") => Promise<void>; unlock?: () => void };

/** Todos os controles (ajuda do botão "?"). */
const CONTROLS: [string, string][] = [
  ["Deslizar para cima", "Chute: a direção escolhe o canto, o comprimento a altura e a velocidade a força. Curve o gesto para dar efeito."],
  ["Deslizar devagar e comprido", "Cavadinha: a bola sobe por cima do goleiro adiantado."],
  ["Tocar num companheiro", "Passe rasteiro (na frente dele, se estiver correndo)."],
  ["Segurar num companheiro", "Passe por cima da marcação (o anel enche e fica azul)."],
  ["Deslizar durante um passe", "Chute de primeira quando a bola chegar; se ela vier alta, cabeçada."],
  ["Tocar no gramado", "Conduz a bola até o ponto."],
  ["Joystick (canto de baixo, à esquerda)", "Conduz quem tem a bola na direção em que você arrasta; pouco inclinado anda devagar, no fim do curso arranca. Dá para chutar e passar com o outro dedo ao mesmo tempo."],
  ["Segurar e arrastar no gramado", "Conduz em velocidade, seguindo o dedo."],
  ["Dois toques em quem tem a bola", "Drible: finta e arrancada; pode deixar o marcador no chão (também no botão Drible)."],
  ["Impedimento", "Quem estiver à frente do penúltimo defensor na hora do passe está impedido (anel vermelho). Nos níveis fácil e médio a linha aparece no gramado."],
  ["Fôlego", "Arrancar com a bola (joystick no fim do curso, segurar e arrastar, drible) gasta o fôlego; quem tem pouco fôlego cansa mais rápido. Sem fôlego, não arranca: solte um pouco para recuperar."],
  ["Qualidades", "Valem no lance: velocidade (corrida e aceleração), finalização (força e precisão do chute), passe, drible (proteção da bola e sucesso do drible), cabeceio (cabeçadas), bola parada (efeito) e fôlego. Na defesa, marcação e velocidade; no goleiro, reflexo e colocação."],
  ["Goleiro", "Ele lê o chute, dá passadas de lado e só mergulha no fim. Só é defesa se a mão dele chegar onde a bola passa; chute fraco em cima dele, ele encaixa."],
  ["Tela deitada (celular)", "O botão de girar coloca em tela cheia e deitada, quando o aparelho deixa; senão, é só girar o celular."],
  ["Teclado", "WASD ou setas conduzem, Shift arranca, Espaço dribla."],
];

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
  const [help, setHelp] = useState(false);
  // Tela deitada (celular): tela cheia + rotação para paisagem, quando o aparelho deixa.
  const [touch] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const [land, setLand] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const onFs = () => setLand(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const toggleLand = async () => {
    const o = screen.orientation as Orientation | undefined;
    if (land) {
      try { o?.unlock?.(); } catch { /* sem trava */ }
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setLand(false);
      return;
    }
    let locked = false;
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
      await o?.lock?.("landscape");
      locked = true;
    } catch { /* o aparelho não deixa girar sozinho */ }
    setLand(!!document.fullscreenElement || locked);
    if (!locked) {
      setNotice("Gire o celular para jogar com a tela deitada (deixe a rotação automática ligada).");
      setTimeout(() => setNotice(null), 4500);
    }
  };
  const toggleHelp = (open: boolean) => { setHelp(open); runner.setPaused(open); };
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
          {touch && (
            <button
              type="button"
              onClick={() => void toggleLand()}
              className={cn("pointer-events-auto grid size-8 shrink-0 place-items-center rounded-full bg-ink-950/75 ring-1 ring-white/15 hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400", land ? "text-gold-300" : "text-snow")}
              aria-label={land ? "Sair da tela deitada" : "Jogar com a tela deitada"}
              aria-pressed={land}
              title="Tela deitada"
            >
              <RotateCw className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleHelp(true)}
            className="pointer-events-auto grid size-8 shrink-0 place-items-center rounded-full bg-ink-950/75 text-snow ring-1 ring-white/15 hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-400"
            aria-label="Como jogar (pausa o lance)"
            title="Como jogar"
          >
            <CircleHelp className="size-4" />
          </button>
        </div>
        {hud.attrs && (hud.phase === "play" || hud.phase === "intro") && (
          <div className="mx-auto mt-1.5 flex w-fit max-w-xl items-center gap-2 rounded-full bg-ink-950/70 px-3 py-0.5 font-display text-[11px] font-bold tabular ring-1 ring-white/10" aria-label="Qualidades de quem conduz">
            {ATTR_CHIPS.map(([k, l]) => (
              <span key={k} className={attrTone(hud.attrs![k])}>{l} {hud.attrs![k]}</span>
            ))}
          </div>
        )}
      </div>

      {hint && !help && (hud.phase === "intro" || hud.phase === "play") && (
        <div className="pointer-events-none absolute inset-x-0 top-[8.25rem] flex justify-center px-3 sm:top-32 [@media(max-height:500px)]:top-auto [@media(max-height:500px)]:bottom-2 [@media(max-height:500px)]:px-40">
          <ul className="flex max-w-xl flex-col gap-1 rounded-2xl bg-ink-950/80 px-4 py-2.5 text-xs text-snow ring-1 ring-white/10 sm:text-sm">
            <li className="flex items-center gap-1.5"><MoveUpRight className="size-4 shrink-0 text-gold-400" /> Deslize = chute • devagar e comprido = cavadinha</li>
            <li className="flex items-center gap-1.5"><MousePointerClick className="size-4 shrink-0 text-gold-400" /> Toque no companheiro = passe • segure = por cima</li>
            <li className="flex items-center gap-1.5"><Hand className="size-4 shrink-0 text-gold-400" /> Joystick = conduzir (no fim, arrancada) • botão = drible</li>
          </ul>
        </div>
      )}

      {(hud.phase === "intro" || hud.phase === "play" || hud.phase === "pass") && !help && (
        <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col items-center gap-1.5 [@media(max-height:500px)]:bottom-2">
          <div className="w-28 [@media(max-height:500px)]:w-24" aria-label={`Fôlego ${Math.round(hud.stamina * 100)}%`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hud.stamina * 100)}>
            <span className="mb-0.5 block text-center font-display text-[10px] font-bold uppercase tracking-wider text-snow/80">Fôlego</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/15">
              <div className={cn("h-full rounded-full transition-[width] duration-200", hud.stamina <= 0.12 ? "bg-danger-500" : hud.stamina < 0.4 ? "bg-gold-400" : "bg-sky-400")} style={{ width: `${hud.stamina * 100}%` }} />
            </div>
          </div>
          <Joystick className="relative [@media(max-height:500px)]:size-28" active={hud.phase === "play"} onChange={(v) => runner.setStick(v)} />
        </div>
      )}

      {hud.phase === "play" && !help && (
        <button
          type="button"
          onClick={() => runner.dribble()}
          disabled={!hud.dribble}
          className="absolute bottom-4 right-4 grid size-16 place-items-center rounded-full bg-gold-400/90 font-display text-xs font-extrabold uppercase text-ink-950 shadow-lg ring-2 ring-gold-200/60 transition-opacity disabled:opacity-40"
          aria-label="Driblar"
        >
          <span className="flex flex-col items-center leading-none"><Zap className="mb-0.5 size-5" />Drible</span>
        </button>
      )}

      {notice && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center px-4" role="status">
          <p className="max-w-sm rounded-xl bg-ink-950/90 px-4 py-2 text-center text-sm text-snow ring-1 ring-white/15">{notice}</p>
        </div>
      )}

      {help && (
        <div className="absolute inset-0 z-10 grid place-items-center overflow-y-auto bg-ink-950/85 p-4" role="dialog" aria-modal="true" aria-label="Controles do lance">
          <div className="w-full max-w-lg rounded-2xl bg-ink-850 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl font-extrabold uppercase italic">Como jogar</p>
              <button type="button" onClick={() => toggleHelp(false)} className="grid size-9 place-items-center rounded-full bg-white/8 hover:bg-white/15" aria-label="Fechar e continuar"><X className="size-5" /></button>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              {CONTROLS.map(([k, v]) => (
                <div key={k}><dt className="font-bold text-gold-300">{k}</dt><dd className="text-mist">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-mist">O lance fica pausado enquanto esta ajuda está aberta.</p>
          </div>
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

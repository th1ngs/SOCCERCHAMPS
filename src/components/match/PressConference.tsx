"use client";

import { Camera, Mic } from "lucide-react";
import { PRESS_POST, PRESS_TONES, pressAfter, pressAfterQuestion, pressBefore, pressConf, pressFxText } from "@/game";
import type { Match, PressEffects, PressPostTone, PressTone } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const tone = (fx?: PressEffects) => {
  const v = fx ? fx.morale + fx.fans + fx.board : 0;
  return v > 1 ? "text-pitch-400" : v < -1 ? "text-danger-400" : "text-mist";
};

/** Sala de imprensa: microfones e flashes no topo do bloco. */
function PressHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="relative -mx-3 -mt-3 mb-3 overflow-hidden rounded-t-2xl bg-linear-to-r from-ink-950 via-ink-800 to-ink-950 px-3 py-2.5">
      <span className="press-flash absolute left-[12%] top-1 size-8 rounded-full bg-white/70 blur-md" aria-hidden />
      <span className="press-flash absolute right-[18%] top-2 size-6 rounded-full bg-white/60 blur-md [animation-delay:0.7s]" aria-hidden />
      <div className="relative flex items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-400/15 ring-1 ring-gold-400/40">
          <Mic className="size-4.5 text-gold-300" aria-hidden />
        </span>
        <span className="min-w-0">
          <b className="block font-display text-sm font-bold uppercase tracking-wider text-gold-300">{title}</b>
          <span className="block truncate text-xs text-mist">{sub}</span>
        </span>
        <Camera className="ml-auto size-4 shrink-0 text-mist" aria-hidden />
      </div>
    </div>
  );
}

function Question({ text }: { text: string }) {
  return (
    <p className="mb-3 rounded-xl rounded-tl-sm bg-white/[0.05] px-3 py-2 text-sm italic text-snow ring-1 ring-inset ring-white/8">
      <span className="mr-1 not-italic text-mist">Repórter:</span>“{text}”
    </p>
  );
}

function Headline({ text, fx, note }: { text: string; fx?: PressEffects; note?: string }) {
  return (
    <div className="rounded-xl bg-[#f5efe0] px-3 py-2 text-ink-950 shadow-inner">
      <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-ink-700">Manchete</span>
      <b className="block font-display text-base font-extrabold uppercase leading-tight">{text}</b>
      {fx && <span className="mt-1 block text-xs font-semibold text-ink-700">Efeito: {pressFxText(fx)}</span>}
      {note && <span className="mt-0.5 block text-xs text-ink-700">{note}</span>}
    </div>
  );
}

function Options<K extends string>({ opts, onPick }: { opts: Record<K, { name: string; desc: string }>; onPick: (k: K) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(Object.keys(opts) as K[]).map((k) => (
        <Button key={k} variant="secondary" onClick={() => onPick(k)} className="h-auto! min-h-14 flex-col items-start! gap-0.5 whitespace-normal! py-2 text-left">
          <span>{opts[k].name}</span>
          <span className="font-sans text-xs font-normal normal-case tracking-normal text-mist">{opts[k].desc}</span>
        </Button>
      ))}
    </div>
  );
}

/** Coletiva antes do jogo grande (pré-jogo). Não aparece em jogos comuns. */
export function PressBefore({ m }: { m: Match }) {
  const { world: w, commit } = useWorld();
  const pc = pressConf(w, m);
  if (!pc) return null;
  return (
    <section className="rounded-2xl bg-ink-900/60 p-3 ring-1 ring-inset ring-gold-400/20">
      <PressHeader title="Coletiva de imprensa" sub={pc.reason} />
      <Question text={pc.question} />
      {pc.tone ? (
        <Headline text={pc.headline ?? ""} fx={pc.fx} note={pc.tone === "provocador" ? "O rival também entra pilhado. Depois do jogo, o resultado cobra a conta." : pc.tone === "confiante" ? "Se perder, a confiança vira cobrança." : undefined} />
      ) : (
        <Options<PressTone> opts={PRESS_TONES} onPick={(k) => { pressBefore(w, m, k); commit(); }} />
      )}
    </section>
  );
}

/** Coletiva depois do jogo grande (resumo da partida). */
export function PressAfter({ m }: { m: Match }) {
  const { world: w, commit } = useWorld();
  const pc = pressConf(w, m);
  const q = pressAfterQuestion(w, m);
  if (!pc || !q) return null;
  return (
    <section className={cn("rounded-2xl bg-ink-900/60 p-3 ring-1 ring-inset ring-gold-400/20")}>
      <PressHeader title="Coletiva pós-jogo" sub={pc.reason} />
      <Question text={pc.postQuestion || q} />
      {pc.post ? (
        <Headline text={pc.postHeadline ?? ""} fx={pc.postFx} />
      ) : (
        <Options<PressPostTone> opts={PRESS_POST} onPick={(k) => { pressAfter(w, m, k); commit(); }} />
      )}
      {pc.tone && !pc.post && <p className={cn("mt-2 text-xs", tone(pc.fx))}>Antes do jogo você foi {PRESS_TONES[pc.tone].name.toLowerCase()}: o resultado ainda repercute no fim da semana.</p>}
    </section>
  );
}

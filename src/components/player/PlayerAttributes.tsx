"use client";

import { Eye, Sparkles } from "lucide-react";
import { ATTRS, TRAITS } from "@/game";
import type { KnownAttr, TraitKey } from "@/game";
import { cn } from "@/lib/cn";

/** Cor do atributo pela faixa (mesma lógica do overall). */
const tone = (v: number) =>
  v >= 80 ? "bg-gold-400" : v >= 72 ? "bg-info-400" : v >= 64 ? "bg-pitch-400" : v >= 50 ? "bg-[#cfd8a0]" : "bg-mist/60";
const text = (v: number) => (v >= 80 ? "text-gold-300" : v >= 72 ? "text-info-400" : v >= 64 ? "text-pitch-400" : "text-snow");

function AttrRow({ a }: { a: KnownAttr }) {
  const info = ATTRS[a.key];
  const shown = a.exact ? String(a.value) : `${a.min}–${a.max}`;
  return (
    <li className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 py-1.5" title={info.desc}>
      <span className="truncate text-sm text-mist">{info.name}</span>
      <span className="relative h-2.5 overflow-hidden rounded-full bg-white/8" aria-hidden>
        {a.exact ? (
          <span className={cn("absolute inset-y-0 left-0 rounded-full", tone(a.value))} style={{ width: `${a.value}%` }} />
        ) : (
          <span className={cn("absolute inset-y-0 rounded-full opacity-70", tone(a.max))} style={{ left: `${a.min}%`, width: `${Math.max(2, a.max - a.min)}%` }} />
        )}
      </span>
      <span className={cn("min-w-12 text-right font-display text-lg font-bold leading-none tabular", a.exact ? text(a.value) : "text-mist")}>
        <span className="sr-only">{info.name}: </span>
        {shown}
      </span>
    </li>
  );
}

/** Atributos (conforme o conhecimento dos olheiros) e habilidades especiais com o efeito de cada uma. */
export function PlayerAttributes({ attrs, traits }: { attrs: KnownAttr[] | null; traits: TraitKey[] | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6">
        <h3 className="mb-1 font-display text-sm font-bold uppercase tracking-[0.12em] text-gold-400">Atributos</h3>
        {attrs ? (
          <>
            <ul>
              {attrs.map((a) => (
                <AttrRow key={a.key} a={a} />
              ))}
            </ul>
            {!attrs[0]?.exact && <p className="mt-1 text-xs text-mist">Faixas estimadas. Um relatório do olheiro revela os números exatos.</p>}
          </>
        ) : (
          <p className="flex items-start gap-2 py-2 text-sm text-mist">
            <Eye className="mt-0.5 size-4 shrink-0" aria-hidden /> Atributos desconhecidos. Abra a ficha ou peça um relatório para os olheiros avaliarem.
          </p>
        )}
      </section>
      <section className="rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6">
        <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-[0.12em] text-gold-400">Habilidades</h3>
        {traits === null ? (
          <p className="text-sm text-mist">Só um relatório completo do olheiro revela as habilidades deste jogador.</p>
        ) : traits.length === 0 ? (
          <p className="text-sm text-mist">Nenhuma habilidade especial ainda. Jogadores que evoluem podem desenvolver uma na virada da temporada.</p>
        ) : (
          <ul className="space-y-2.5">
            {traits.map((k) => {
              const t = TRAITS[k];
              return (
                <li key={k} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-info-500/15 text-info-400">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 leading-snug">
                    <b className="block font-semibold text-snow">{t.name}</b>
                    <span className="text-sm text-mist">{t.desc}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, Megaphone, PartyPopper, Users } from "lucide-react";
import type { Club, FanEvent } from "@/game/types";
import { Audio } from "@/arcade/audio";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { Crest } from "@/components/ui/Crest";
import { cn } from "@/lib/cn";

const rnd = (seed: number, i: number) => { const x = Math.sin(seed * 9301 + i * 49297) * 43758.5453; return x - Math.floor(x); };

/** Arquibancada em SVG: degraus com a torcida (pontos nas cores do clube) e sinalizadores. */
function Stands({ club, angry, seed }: { club: Club; angry: boolean; seed: number }) {
  const [c1, c2] = club.colors;
  const rows = 7;
  return (
    <svg viewBox="0 0 400 220" className="absolute inset-x-0 bottom-0 h-[62%] w-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <radialGradient id="flare" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={angry ? "#fecaca" : "#fef3c7"} />
          <stop offset="0.4" stopColor={angry ? "#ef4444" : c1} stopOpacity="0.9" />
          <stop offset="1" stopColor={angry ? "#7f1d1d" : c2} stopOpacity="0" />
        </radialGradient>
      </defs>
      {Array.from({ length: rows }, (_, r) => {
        const y = 40 + r * 26;
        return (
          <g key={r}>
            <rect x="0" y={y} width="400" height="26" fill={r % 2 ? "#111827" : "#0b1220"} />
            {Array.from({ length: 34 }, (_, i) => {
              const x = 6 + i * 11.6 + (r % 2) * 5;
              const pick = rnd(seed + r, i);
              const color = pick < 0.45 ? c1 : pick < 0.8 ? c2 : "#e5e7eb";
              const jump = !angry && rnd(seed, i + r * 40) > 0.6;
              return (
                <g key={i} className={jump ? "animate-bounce" : undefined} style={jump ? { animationDelay: `${(i % 7) * 0.12}s`, animationDuration: "0.9s" } : undefined}>
                  <circle cx={x} cy={y + 9} r="3.6" fill="#f1c27d" opacity="0.9" />
                  <rect x={x - 4.5} y={y + 13} width="9" height="11" rx="3" fill={color} />
                  {rnd(seed + 7, i + r) > 0.82 && <line x1={x + 4} y1={y + 14} x2={x + 7} y2={y + 4} stroke="#f1c27d" strokeWidth="2" strokeLinecap="round" />}
                </g>
              );
            })}
          </g>
        );
      })}
      {[60, 170, 300, 360].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={40 + (i % 3) * 30} r="26" fill="url(#flare)" className="animate-glow-pulse" style={{ animationDelay: `${i * 0.4}s` }} />
          <circle cx={x} cy={20 + (i % 3) * 30} r="34" fill={angry ? "#7f1d1d" : c2} opacity="0.18" className="animate-drift" />
        </g>
      ))}
    </svg>
  );
}

const STYLE: Record<FanEvent["kind"], { label: string; angry: boolean }> = {
  faixas: { label: "Faixas de cobrança", angry: true },
  protesto: { label: "Protesto da torcida", angry: true },
  cobranca: { label: "Cobrança na sede", angry: true },
  festa: { label: "Festa na arquibancada", angry: false },
  mosaico: { label: "Mosaico no clássico", angry: false },
  carreata: { label: "Carreata do título", angry: false },
};

/** Evento da torcida organizada: arquibancada animada, faixas com as mensagens e os efeitos no clube. */
export function FansView({ club, group, ev, onClose }: { club: Club; group: string; ev: FanEvent; onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const st = STYLE[ev.kind];
  useEffect(() => {
    Audio.init();
    if (st.angry) Audio.ooh(); else Audio.goal();
    ref.current?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [onClose, st.angry]);
  const seed = ev.week + ev.season;
  const [c1, c2] = club.colors;
  const fx = [
    ev.board ? { t: `Diretoria ${ev.board > 0 ? "+" : ""}${ev.board}`, good: ev.board > 0 } : null,
    ev.morale ? { t: `Moral do elenco ${ev.morale > 0 ? "+" : ""}${ev.morale}`, good: ev.morale > 0 } : null,
    ev.members ? { t: `${ev.members > 0 ? "+" : ""}${ev.members.toLocaleString("pt-BR")} sócios`, good: ev.members > 0 } : null,
  ].filter((x): x is { t: string; good: boolean } => !!x);

  return (
    <div role="dialog" aria-modal="true" aria-label={`${group}: ${ev.title}`} className="fixed inset-0 z-[60] overflow-y-auto" style={{ background: st.angry ? "linear-gradient(#1a0606, #0a0a12)" : `linear-gradient(color-mix(in srgb, ${c1} 45%, #050b14), #050b14)` }}>
      <Stands club={club} angry={st.angry} seed={seed} />
      {!st.angry && <Confetti seed={seed} colors={[c1, c2, "#facc15", "#ffffff"]} count={50} duration={3.2} />}
      <div className="relative mx-auto flex min-h-full max-w-xl flex-col items-center px-4 pb-8 pt-[calc(2.5rem+env(safe-area-inset-top))] text-center">
        <span className={cn("animate-stamp inline-flex items-center gap-2 rounded-xl border-4 px-4 py-1 font-display text-2xl font-extrabold uppercase italic sm:text-3xl", st.angry ? "border-danger-500 bg-black/60 text-danger-400" : "border-gold-400 bg-black/50 text-gold-400")}>
          {st.angry ? <Megaphone className="size-6" aria-hidden /> : <PartyPopper className="size-6" aria-hidden />} {st.label}
        </span>
        <p className="animate-slide-up mt-3 flex items-center gap-2 text-sm text-snow/90" style={{ animationDelay: "250ms" }}>
          <Crest club={club} size={22} /> <b>{group}</b> • {ev.title}
        </p>
        <ul className="mt-5 flex w-full flex-col items-center gap-3">
          {ev.banners.map((b, i) => (
            <li
              key={b}
              className="animate-slide-up w-full max-w-md rounded-sm px-4 py-2.5 font-display text-xl font-extrabold uppercase tracking-wide shadow-[0_8px_20px_rgb(0_0_0/0.5)] sm:text-2xl"
              style={{
                animationDelay: `${500 + i * 280}ms`,
                transform: `rotate(${(rnd(seed, i) - 0.5) * 5}deg)`,
                background: st.angry ? (i % 2 ? "#f5f5f4" : "#111827") : i % 2 ? c2 : c1,
                color: st.angry ? (i % 2 ? "#991b1b" : "#f5f5f4") : i % 2 ? c1 : c2,
                border: `3px solid ${st.angry ? "#7f1d1d" : "#00000040"}`,
              }}
            >
              {b}
            </li>
          ))}
        </ul>
        {/* Painel sólido: os efeitos e o botão não se perdem no meio da arquibancada. */}
        <div className="animate-slide-up mt-5 flex w-full max-w-md flex-col items-center gap-4 rounded-2xl bg-ink-950/90 px-4 py-4 shadow-2xl ring-1 ring-inset ring-white/10 backdrop-blur" style={{ animationDelay: `${600 + ev.banners.length * 280}ms` }}>
          {fx.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-2">
              {fx.map((f) => (
                <li key={f.t} className={cn("rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset backdrop-blur", f.good ? "bg-pitch-500/15 text-pitch-400 ring-pitch-400/40" : "bg-danger-500/15 text-danger-400 ring-danger-400/40")}>
                  {f.t}
                </li>
              ))}
            </ul>
          )}
          <Button ref={ref} variant="primary" size="lg" icon={st.angry ? <Users /> : <ChevronRight />} onClick={onClose}>
            {st.angry ? "Entendido, vamos reagir" : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

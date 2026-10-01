"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, IdCard, Play } from "lucide-react";
import { POS_NAME, formatMoney, user } from "@/game";
import type { Club } from "@/game/types";
import { Audio } from "@/arcade/audio";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { Crest } from "@/components/ui/Crest";
import { OvrBadge, PosBadge, Stars } from "@/components/ui/primitives";
import { PlayerAvatar } from "./PlayerAvatar";
import { potentialStars, surname, yearsText } from "./playerInfo";

export type SigningKind = "transfer" | "free" | "loan" | "option";

const STAMP: Record<SigningKind, string> = {
  transfer: "Novo reforço!",
  free: "Novo reforço!",
  loan: "Chegou emprestado!",
  option: "É nosso em definitivo!",
};

/** Camisa com nome e número do reforço, nas cores do clube. */
function Jersey({ club, name, num }: { club: Club; name: string; num: number }) {
  const [c1, c2] = club.colors;
  const striped = club.pattern === "v";
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-[0_14px_24px_rgb(0_0_0/0.55)]" aria-hidden>
      <defs>
        <linearGradient id="jersey-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
        <clipPath id="jersey-clip">
          <path d="M38 8 L22 14 L4 34 L18 50 L28 42 L28 112 L92 112 L92 42 L102 50 L116 34 L98 14 L82 8 Q60 22 38 8 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#jersey-clip)">
        <rect width="120" height="120" fill={c1} />
        {striped && [36, 60, 84].map((x) => <rect key={x} x={x - 6} y="0" width="12" height="120" fill={c2} opacity="0.9" />)}
        {club.pattern === "h" && [30, 60, 90].map((y) => <rect key={y} x="0" y={y - 7} width="120" height="14" fill={c2} opacity="0.9" />)}
        {club.pattern === "sash" && <path d="M10 10 L40 0 L120 100 L100 120 Z" fill={c2} opacity="0.9" />}
        <rect width="120" height="120" fill="url(#jersey-shine)" />
      </g>
      <path d="M38 8 Q60 22 82 8" fill="none" stroke={c2} strokeWidth="4" />
      <path d="M38 8 L22 14 L4 34 L18 50 L28 42 L28 112 L92 112 L92 42 L102 50 L116 34 L98 14 L82 8 Q60 22 38 8 Z" fill="none" stroke="rgb(0 0 0 / 0.35)" strokeWidth="2" />
      <text x="60" y="44" textAnchor="middle" fontSize="11" fontWeight="800" fill={striped ? "#fff" : c2} stroke="rgb(0 0 0 / 0.45)" strokeWidth="0.6" fontFamily="var(--font-display)">
        {surname(name).slice(0, 12).toLocaleUpperCase("pt-BR")}
      </text>
      <text x="60" y="92" textAnchor="middle" fontSize="44" fontWeight="900" fill={striped ? "#fff" : c2} stroke="rgb(0 0 0 / 0.45)" strokeWidth="1.2" fontFamily="var(--font-display)">
        {num}
      </text>
    </svg>
  );
}

/** Apresentação do reforço em tela cheia: carimbo, camisa com nome e número, valores e confete. */
export function SigningShowcase({ pid, kind, fee, from, onClose, onProfile }: { pid: string; kind: SigningKind; fee: number; from: string | null; onClose: () => void; onProfile: () => void }) {
  const { world } = useWorld();
  const p = world.players[pid];
  const u = user(world);
  const fromClub = from ? world.clubs[from] : null;
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    Audio.init();
    Audio.goal();
    continueRef.current?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!p) return null;
  const [c1, c2] = u.colors;
  const loanText = p.loan ? `Até ${p.loan.until}` : "1 temporada";
  const feeText = kind === "loan" ? (p.loan?.buyOption ? `Opção ${formatMoney(p.loan.buyOption)}` : "Sem taxa") : kind === "free" || !fee ? "Sem custo" : formatMoney(fee);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${STAMP[kind]} ${p.name}`}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]"
      style={{ background: `radial-gradient(circle at 50% 35%, color-mix(in srgb, ${c1} 55%, #07121f) 0%, #07121f 70%)` }}
    >
      <span
        aria-hidden
        className="animate-celebrate-rays pointer-events-none fixed left-1/2 top-[35%] -ml-[80vmax] -mt-[80vmax] size-[160vmax] opacity-15"
        style={{ background: `repeating-conic-gradient(from 0deg, ${c2} 0deg 5deg, transparent 5deg 15deg)` }}
      />
      <Confetti seed={p.num + p.ovr} colors={[c1, c2, "#ffd23f", "#ffffff"]} count={44} duration={3.2} />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <span className="animate-stamp rounded-xl border-4 border-gold-400 bg-ink-950/70 px-4 py-1 font-display text-3xl font-extrabold uppercase italic text-gold-400 shadow-[0_0_40px_rgb(255_210_63/0.35)] sm:text-4xl">
          {STAMP[kind]}
        </span>

        <div className="relative mt-5 h-44 w-full sm:h-52">
          <div className="animate-celebrate-in absolute inset-y-0 left-1/2 w-44 -translate-x-[78%] sm:w-52" style={{ animationDelay: "350ms" }}>
            <Jersey club={u} name={p.name} num={p.num} />
          </div>
          <div className="animate-celebrate-in absolute bottom-0 left-1/2 translate-x-[8%]" style={{ animationDelay: "550ms" }}>
            <PlayerAvatar player={p} size={132} className="ring-4 ring-gold-400/80 shadow-2xl sm:size-[150px]" />
          </div>
        </div>

        <div className="animate-slide-up mt-3" style={{ animationDelay: "750ms" }}>
          <h2 className="font-display text-3xl font-extrabold uppercase leading-tight sm:text-4xl">{p.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-sm text-mist">
            <PosBadge pos={p.pos} />
            <span>{POS_NAME[p.pos]}</span>•<span>{p.age} anos</span>•<OvrBadge value={p.ovr} size="sm" />
            <Stars value={potentialStars(p, true)} />
          </div>
        </div>

        <div className="animate-slide-up mt-4 flex items-center justify-center gap-3" style={{ animationDelay: "900ms" }}>
          {fromClub ? (
            <span className="flex min-w-0 items-center gap-2 text-sm text-mist">
              <Crest club={fromClub} size={30} />
              <span className="max-w-28 truncate">{fromClub.name}</span>
            </span>
          ) : (
            <span className="text-sm text-mist">Sem clube</span>
          )}
          <ArrowRight className="size-5 shrink-0 text-gold-400" />
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <Crest club={u} size={30} />
            <span className="max-w-28 truncate">{u.name}</span>
          </span>
        </div>

        <dl className="animate-slide-up mt-4 grid w-full grid-cols-3 gap-2" style={{ animationDelay: "1050ms" }}>
          {[
            ["Valor", feeText],
            ["Salário", `${formatMoney(kind === "loan" && p.loan ? Math.round(p.wage * p.loan.wageShare) : p.wage)}/sem`],
            [kind === "loan" ? "Empréstimo" : "Contrato", kind === "loan" ? loanText : yearsText(p.contract)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-ink-950/60 px-2 py-2 ring-1 ring-white/10">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-mist">{k}</dt>
              <dd className="mt-0.5 truncate font-display text-base font-bold tabular sm:text-lg">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="animate-slide-up mt-5 flex w-full gap-2" style={{ animationDelay: "1200ms" }}>
          <Button variant="secondary" icon={<IdCard />} onClick={onProfile} className="flex-1">
            Ver ficha
          </Button>
          <Button ref={continueRef} variant="primary" icon={<Play />} onClick={onClose} className="flex-1">
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}

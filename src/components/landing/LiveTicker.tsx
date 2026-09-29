"use client";

import { useEffect, useState } from "react";
import { Crest, type CrestClub } from "@/components/ui/Crest";
import { cn } from "@/lib/cn";

type Kind = "info" | "goal" | "save" | "miss" | "card" | "sub";
interface Beat { min: number; text: string; kind: Kind; side?: 0 | 1 }

const HOME: CrestClub & { name: string } = { name: "EC Anhangabaú", short: "ANH", colors: ["#0B2A5B", "#FFFFFF"], pattern: "v" };
const AWAY: CrestClub & { name: string } = { name: "AA Tamanduateí", short: "TAM", colors: ["#C1121F", "#FFFFFF"], pattern: "h" };

// Roteiro fixo de um clássico, repetido em loop.
const SCRIPT: Beat[] = [
  { min: 1, text: "Rola a bola no Clássico da Várzea!", kind: "info" },
  { min: 11, text: "Chute de fora da área e o goleiro espalma!", kind: "save" },
  { min: 19, text: "GOOOL! Cabeçada certeira depois do escanteio.", kind: "goal", side: 0 },
  { min: 28, text: "Amarelo por falta dura no meio-campo.", kind: "card" },
  { min: 38, text: "Na trave! O Tamanduateí quase empata.", kind: "miss" },
  { min: 45, text: "Fim do primeiro tempo.", kind: "info" },
  { min: 57, text: "Entra o garoto revelado na base.", kind: "sub" },
  { min: 66, text: "GOL! Contra-ataque rápido e empate na Várzea!", kind: "goal", side: 1 },
  { min: 83, text: "GOOOL! Golaço de falta do capitão!", kind: "goal", side: 0 },
  { min: 90, text: "Fim de jogo! O estádio vai abaixo.", kind: "info" },
];

const HOME_POS = [[16, 95], [55, 40], [52, 95], [55, 150], [95, 55], [92, 120], [128, 30], [132, 95], [128, 160], [168, 70], [170, 122]];
const AWAY_POS = HOME_POS.map(([x, y]) => [300 - x, 190 - y]);

const TICK_MS = 380;

export function LiveTicker() {
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMinute((m) => (m >= 98 ? 0 : m + 1)), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const shown = Math.min(minute, 90);
  const played = SCRIPT.filter((b) => b.min <= shown);
  const score = [0, 1].map((s) => played.filter((b) => b.kind === "goal" && b.side === s).length);
  const feed = played.slice(-3).reverse();
  const lastGoal = played.findLast((b) => b.kind === "goal");
  const celebrating = lastGoal && shown - lastGoal.min < 3;
  const possession = 50 + Math.round(Math.sin(minute / 7) * 9);

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-pitch-500/20 blur-3xl" />
      <div className="overflow-hidden rounded-3xl bg-ink-850/90 shadow-2xl ring-1 ring-white/10 backdrop-blur">
        {/* Placar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Crest club={HOME} size={28} />
            <span className="truncate font-display text-sm font-bold uppercase sm:text-base">{HOME.name}</span>
          </div>
          <div className="flex shrink-0 flex-col items-center">
            <span className="rounded-lg bg-ink-950 px-3 py-0.5 font-display text-2xl font-extrabold tabular">
              {score[0]} <span className="text-mist">-</span> {score[1]}
            </span>
            <span className="mt-1 flex items-center gap-1.5 font-display text-xs font-bold text-gold-400 tabular">
              {minute >= 90 ? (
                "ENCERRADO"
              ) : (
                <>
                  <span className="size-1.5 animate-pulse rounded-full bg-danger-500" /> AO VIVO {shown}&apos;
                </>
              )}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2">
            <span className="truncate text-right font-display text-sm font-bold uppercase sm:text-base">{AWAY.name}</span>
            <Crest club={AWAY} size={28} />
          </div>
        </div>

        {/* Campo */}
        <div className="relative bg-pitch-700 p-3">
          <svg viewBox="0 0 300 190" className="block w-full" aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
              <rect key={i} x={i * 30} y={0} width={30} height={190} fill={i % 2 ? "#2a8f43" : "#2f9a49"} />
            ))}
            <g fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1.4">
              <rect x="4" y="4" width="292" height="182" />
              <line x1="150" y1="4" x2="150" y2="186" />
              <circle cx="150" cy="95" r="24" />
              <rect x="4" y="50" width="42" height="90" />
              <rect x="254" y="50" width="42" height="90" />
            </g>
            {HOME_POS.map(([x, y], i) => (
              <g key={`h${i}`} className="animate-drift" style={{ animationDelay: `${-i * 0.7}s`, animationDuration: `${6 + (i % 4)}s` }}>
                <circle cx={x} cy={y} r="5.5" fill={i === 0 ? "#f7c948" : HOME.colors[0]} stroke="#fff" strokeWidth="1.4" />
              </g>
            ))}
            {AWAY_POS.map(([x, y], i) => (
              <g key={`a${i}`} className="animate-drift" style={{ animationDelay: `${-i * 0.9}s`, animationDuration: `${7 + (i % 3)}s` }}>
                <circle cx={x} cy={y} r="5.5" fill={i === 0 ? "#7b2cbf" : AWAY.colors[0]} stroke="#fff" strokeWidth="1.4" />
              </g>
            ))}
            <g className="animate-ball">
              <circle r="3.6" fill="#fff" stroke="#111" strokeWidth=".8" />
            </g>
          </svg>
          {celebrating && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="animate-flash font-display text-5xl font-extrabold italic text-gold-400 drop-shadow-[0_4px_0_rgba(0,0,0,.6)] sm:text-6xl">GOOOL!</span>
            </div>
          )}
        </div>

        {/* Posse e narração */}
        <div className="px-4 pb-4 pt-3 sm:px-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-mist tabular">
            <span>{possession}%</span>
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-danger-500/70">
              <span className="absolute inset-y-0 left-0 rounded-full bg-info-400 transition-[width] duration-700" style={{ width: `${possession}%` }} />
            </span>
            <span>{100 - possession}%</span>
          </div>
          <ul className="flex h-[88px] flex-col gap-1.5 overflow-hidden" aria-live="off">
            {feed.map((b) => (
              <li
                key={b.min}
                className={cn(
                  "flex items-start gap-2 rounded-lg px-2 py-1 text-[13px] leading-snug animate-pop",
                  b.kind === "goal" ? "bg-gold-400/15 font-semibold text-snow" : "text-mist",
                )}
              >
                <span className="w-7 shrink-0 font-display font-bold text-gold-400 tabular">{b.min}&apos;</span>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

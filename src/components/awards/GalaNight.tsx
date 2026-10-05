"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, FastForward, Mail, Sparkles } from "lucide-react";
import { divisionName, galaWins, LEAGUES, DIVISIONS } from "@/game";
import type { Gala, GalaCategory, GalaNominee } from "@/game/types";
import { Audio } from "@/arcade/audio";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { cn } from "@/lib/cn";
import { AwardIcon } from "./AwardIcon";

type Phase = { kind: "intro" } | { kind: "cat"; i: number; step: "nominees" | "envelope" | "winner" } | { kind: "summary" };

/** Foto do indicado: avatar do jogador, escudo do clube ou do técnico. */
function Portrait({ n, size }: { n: GalaNominee; size: number }) {
  const { world: w } = useWorld();
  const club = w.clubs[n.club];
  if (n.kind === "player" && n.pos) return <PlayerAvatar player={{ id: n.id, name: n.name, pos: n.pos }} size={size} className="ring-2 ring-white/20" />;
  return club ? <Crest club={club} size={size} /> : <span style={{ width: size, height: size }} className="rounded-full bg-white/10" />;
}

function NomineeCard({ n, mine, delay, dim }: { n: GalaNominee; mine: boolean; delay: number; dim?: boolean }) {
  const { world: w } = useWorld();
  const club = w.clubs[n.club];
  return (
    <li
      className={cn(
        "animate-slide-up flex min-w-0 items-center gap-3 rounded-2xl bg-ink-900/70 p-3 ring-1 ring-inset backdrop-blur transition-opacity duration-500",
        mine ? "ring-gold-400/60" : "ring-white/10",
        dim && "opacity-40",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Portrait n={n} size={52} />
      <span className="min-w-0 text-left">
        <b className="block truncate text-snow">{n.name}</b>
        {club && (
          <span className="flex items-center gap-1.5 text-xs text-mist">
            <Crest club={club} size={14} /> <span className="truncate">{n.kind === "coach" ? `Técnico do ${club.name}` : club.name}</span>
          </span>
        )}
        <span className="block text-xs text-gold-300">{n.stat}</span>
      </span>
    </li>
  );
}

function WinnerView({ cat, mine, seed }: { cat: GalaCategory; mine: boolean; seed: number }) {
  const { world: w } = useWorld();
  const n = cat.nominees[0];
  const club = w.clubs[n.club];
  const colors = club ? [club.colors[0], club.colors[1], "#facc15", "#ffffff"] : ["#facc15", "#ffffff"];
  return (
    <div className="relative flex flex-col items-center text-center">
      <Confetti seed={seed} colors={colors} count={mine ? 60 : 36} duration={3.4} />
      <span aria-hidden className="animate-celebrate-rays pointer-events-none absolute top-6 size-[30rem] opacity-25" style={{ background: "repeating-conic-gradient(from 0deg, #facc15 0deg 6deg, transparent 6deg 18deg)", maskImage: "radial-gradient(circle, #000 20%, transparent 65%)" }} />
      <div className="animate-trophy-lift relative size-32 sm:size-40">
        <span aria-hidden className="animate-glow-pulse absolute inset-2 rounded-full bg-gold-400/30 blur-2xl" />
        <AwardIcon icon={cat.icon} className="relative size-full drop-shadow-[0_10px_30px_rgb(250_204_21/0.45)]" />
      </div>
      <div className="animate-reveal-flip mt-2 flex flex-col items-center" style={{ animationDelay: "350ms" }}>
        <Portrait n={n} size={96} />
        <h3 className="mt-3 font-display text-3xl font-extrabold uppercase leading-tight text-snow sm:text-4xl">{n.name}</h3>
        {club && (
          <p className="mt-1 flex items-center gap-2 text-sm text-mist">
            <Crest club={club} size={20} /> {n.kind === "coach" ? `Técnico do ${club.name}` : club.name} <Flag code={club.league} />
          </p>
        )}
        <p className="mt-1 font-semibold text-gold-300">{n.stat}</p>
      </div>
      {mine && (
        <span className="animate-stamp mt-4 rounded-xl border-4 border-gold-400 bg-ink-950/70 px-4 py-1 font-display text-2xl font-extrabold uppercase italic text-gold-400 shadow-[0_0_40px_rgb(255_210_63/0.35)]" style={{ animationDelay: "900ms" }}>
          {n.kind === "club" ? "Somos campeões!" : n.kind === "coach" ? "O prêmio é seu!" : "É do seu elenco!"}
        </span>
      )}
    </div>
  );
}

/**
 * Noite de Gala do fim da temporada: abre a cortina, apresenta cada prêmio (indicados → envelope → vencedor)
 * e termina com o quadro de vencedores. Prêmios do campeonato do usuário primeiro; a Bola de Ouro fecha a noite.
 */
export function GalaNight({ gala, onDone }: { gala: Gala; onDone: () => void }) {
  const { world: w } = useWorld();
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const cats = gala.categories;
  const nextRef = useRef<HTMLButtonElement>(null);
  const league = DIVISIONS[gala.div]?.league;
  const wins = galaWins(w, gala);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    Audio.init();
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Indicados → envelope → vencedor, sozinho; do vencedor em diante, o usuário avança.
  useEffect(() => {
    if (phase.kind !== "cat") return;
    if (phase.step === "nominees") {
      const t = setTimeout(() => setPhase({ ...phase, step: "envelope" }), 1300 + cats[phase.i].nominees.length * 350);
      return () => clearTimeout(t);
    }
    if (phase.step === "envelope") {
      const t = setTimeout(() => { Audio.goal(); setPhase({ ...phase, step: "winner" }); }, 1500);
      return () => clearTimeout(t);
    }
    nextRef.current?.focus({ preventScroll: true });
  }, [phase, cats]);

  const go = (i: number) => {
    Audio.click();
    setPhase(i < cats.length ? { kind: "cat", i, step: "nominees" } : { kind: "summary" });
  };
  const cat = phase.kind === "cat" ? cats[phase.i] : null;
  const mineOf = (c: GalaCategory) => c.nominees[0]?.club === w.userClub;

  return (
    <div role="dialog" aria-modal="true" aria-label={`Noite de Gala ${gala.season}`} className="fixed inset-0 z-[60] overflow-y-auto bg-[#090716] text-snow">
      {/* Palco: fundo, holofotes e piso */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 15%, #3b1d5c 0%, #160d2b 45%, #07050f 100%)" }} />
        <div className="animate-spot-sweep absolute -top-10 left-[12%] h-[120vh] w-40 origin-top bg-gradient-to-b from-gold-200/30 to-transparent blur-md [clip-path:polygon(40%_0,60%_0,100%_100%,0_100%)]" />
        <div className="animate-spot-sweep absolute -top-10 right-[12%] h-[120vh] w-40 origin-top bg-gradient-to-b from-sky-200/25 to-transparent blur-md [clip-path:polygon(40%_0,60%_0,100%_100%,0_100%)]" style={{ animationDelay: "-2.5s" }} />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#2a1440] to-transparent" />
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="animate-sparkle absolute size-1.5 rounded-full bg-gold-200" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 90}%`, animationDelay: `${(i % 7) * 0.3}s` }} />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-full max-w-3xl flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-3">
          <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gold-300">Noite de Gala {gala.season}</span>
          {phase.kind === "cat" && (
            <span className="flex items-center gap-3">
              <span className="text-xs tabular text-mist">{phase.i + 1}/{cats.length}</span>
              <Button variant="ghost" size="sm" icon={<FastForward />} onClick={() => setPhase({ kind: "summary" })}>Pular</Button>
            </span>
          )}
        </header>

        {phase.kind === "intro" && (
          <div className="relative flex flex-1 flex-col items-center justify-center py-10 text-center">
            <div aria-hidden className="pointer-events-none fixed inset-0 z-10 flex">
              <div className="animate-curtain-left h-full w-1/2" style={{ background: "repeating-linear-gradient(90deg, #7f1d1d 0 22px, #991b1b 22px 44px)", boxShadow: "inset -30px 0 40px rgb(0 0 0 / 0.5)" }} />
              <div className="animate-curtain-right h-full w-1/2" style={{ background: "repeating-linear-gradient(90deg, #991b1b 0 22px, #7f1d1d 22px 44px)", boxShadow: "inset 30px 0 40px rgb(0 0 0 / 0.5)" }} />
            </div>
            <AwardIcon icon="ball" className="animate-trophy-lift size-36 drop-shadow-[0_10px_40px_rgb(250_204_21/0.5)] sm:size-44" />
            <h2 className="animate-shimmer-text mt-4 font-display text-5xl font-extrabold uppercase italic leading-none sm:text-6xl">Noite de Gala</h2>
            <p className="animate-slide-up mt-3 max-w-md text-mist" style={{ animationDelay: "1.6s" }}>
              Os melhores da {divisionName(gala.div)}{league ? <> <Flag code={league} /> </> : " "}e do mundo em {gala.season}. {cats.length} prêmios, terminando com a Bola de Ouro.
            </p>
            <Button variant="primary" size="lg" icon={<Sparkles />} className="animate-slide-up mt-6" style={{ animationDelay: "1.9s" }} onClick={() => go(0)}>
              Abrir a cerimônia
            </Button>
            <button type="button" onClick={() => setPhase({ kind: "summary" })} className="animate-slide-up mt-3 text-sm text-mist underline-offset-4 hover:underline" style={{ animationDelay: "2s" }}>
              Ver só os vencedores
            </button>
          </div>
        )}

        {cat && phase.kind === "cat" && (
          <div key={phase.i} className="flex flex-1 flex-col items-center py-6 text-center">
            <span className="animate-slide-up rounded-full bg-white/8 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-mist">
              {cat.scope === "league" ? (league ? LEAGUES[league].name : "Campeonato") : "Prêmios mundiais"}
            </span>
            <h2 className="animate-slide-up mt-2 font-display text-3xl font-extrabold uppercase italic text-gold-300 sm:text-4xl">{cat.title}</h2>
            {phase.step !== "winner" ? (
              <>
                <p className="animate-slide-up mt-1 text-sm text-mist">{cat.nominees.length > 1 ? "Os indicados são…" : "O vencedor é…"}</p>
                <ul className="mt-5 grid w-full gap-2 sm:grid-cols-3">
                  {cat.nominees.map((n, k) => <NomineeCard key={n.id + k} n={n} mine={n.club === w.userClub} delay={200 + k * 350} />)}
                </ul>
                {phase.step === "envelope" && (
                  <div className="mt-8 flex flex-col items-center">
                    <div className="animate-envelope-shake relative grid h-24 w-36 place-items-center rounded-lg bg-gradient-to-br from-gold-200 to-gold-500 shadow-[0_10px_40px_rgb(250_204_21/0.35)]">
                      <span aria-hidden className="absolute inset-x-0 top-0 h-12 origin-top bg-gold-300 [clip-path:polygon(0_0,100%_0,50%_100%)]" />
                      <Mail className="relative size-8 text-ink-950/70" aria-hidden />
                    </div>
                    <p className="mt-3 font-display text-xl font-bold uppercase tracking-wide text-snow">E o vencedor é…</p>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-4 w-full">
                <WinnerView cat={cat} mine={mineOf(cat)} seed={phase.i + gala.season} />
                {cat.nominees.length > 1 && (
                  <ul className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-2">
                    {cat.nominees.slice(1).map((n, k) => <NomineeCard key={n.id + k} n={n} mine={n.club === w.userClub} delay={1100 + k * 150} dim />)}
                  </ul>
                )}
                <Button ref={nextRef} variant="primary" size="lg" icon={<ChevronRight />} className="animate-slide-up mt-6" style={{ animationDelay: "1.2s" }} onClick={() => go(phase.i + 1)}>
                  {phase.i + 1 < cats.length ? "Próximo prêmio" : "Ver todos os vencedores"}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase.kind === "summary" && (
          <div className="flex flex-1 flex-col py-6">
            <h2 className="animate-shimmer-text text-center font-display text-4xl font-extrabold uppercase italic">Vencedores {gala.season}</h2>
            <p className="mt-1 text-center text-sm text-mist">{wins ? `O seu clube levou ${wins} prêmio${wins > 1 ? "s" : ""} nesta noite!` : "Desta vez, nenhum prêmio ficou com o seu clube."}</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {cats.map((c, k) => {
                const n = c.nominees[0];
                const club = w.clubs[n.club];
                return (
                  <li key={c.key} className={cn("animate-slide-up flex items-center gap-3 rounded-2xl bg-ink-900/75 p-3 ring-1 ring-inset", mineOf(c) ? "ring-gold-400/60" : "ring-white/10")} style={{ animationDelay: `${k * 60}ms` }}>
                    <AwardIcon icon={c.icon} className="size-11 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs uppercase tracking-wider text-gold-300">{c.title}</span>
                      <b className="block truncate">{n.name}</b>
                      {club && <span className="flex items-center gap-1.5 text-xs text-mist"><Crest club={club} size={14} /> <span className="truncate">{club.name}</span></span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Button variant="primary" size="lg" icon={<ChevronRight />} className="mx-auto mt-6" onClick={onDone}>
              Continuar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { career, careerPlayer, careerTotalsFor } from "@/game";
import { useGame, useWorld } from "@/components/game/GameProvider";
import { buttonClasses } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { CareerSeasonsTable } from "./CareerSeasonsTable";

/** Tela final: a carreira acabou. */
export function RetiredScreen() {
  const { world: w } = useWorld();
  const { activeSlot } = useGame();
  const c = career(w);
  const p = careerPlayer(w);
  if (!c || !p) return null;
  const t = careerTotalsFor(w);
  return (
    <div className="relative mx-auto min-h-dvh max-w-3xl overflow-hidden px-4 py-10">
      <Confetti colors={["#ffd23f", "#ffffff", "#3fd07c"]} count={40} duration={4} />
      <div className="relative text-center">
        <PlayerAvatar player={p} size={110} className="mx-auto ring-4 ring-gold-400/70" />
        <h1 className="mt-4 font-display text-4xl font-extrabold uppercase italic">Fim de carreira</h1>
        <p className="mt-1 text-mist">{p.name} pendurou as chuteiras aos {p.age} anos.</p>
        <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[["Jogos", t.apps], ["Gols", t.goals], ["Assist.", t.assists], ["Títulos", t.titles], ["Prêmios", t.awards]].map(([k, v]) => (
            <div key={k as string} className="rounded-xl bg-ink-800 p-3 ring-1 ring-inset ring-white/8">
              <dt className="text-xs uppercase tracking-wider text-mist">{k}</dt>
              <dd className="font-display text-3xl font-extrabold tabular">{v}</dd>
            </div>
          ))}
        </dl>
        {p.intl && <p className="mt-3 text-sm text-mist"><Trophy className="mr-1 inline size-4 text-gold-400" />Seleção: {p.intl[0]} jogos e {p.intl[1]} gols.</p>}
      </div>
      <div className="relative mt-8">
        <CareerSeasonsTable />
      </div>
      <div className="relative mt-8 flex flex-wrap justify-center gap-2">
        <Link href={`/nova-carreira?modo=jogador${activeSlot ? `&slot=${activeSlot}` : ""}`} className={buttonClasses("primary", "lg")}>Nova carreira</Link>
        <Link href="/" className={buttonClasses("secondary", "lg")}>Menu</Link>
      </div>
    </div>
  );
}

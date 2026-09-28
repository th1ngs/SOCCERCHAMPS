"use client";

import { Landmark, MapPin } from "lucide-react";
import { CLUBS } from "@/game";
import type { ClubStatic } from "@/game/types";
import { Crest } from "@/components/ui/Crest";
import { Badge, SectionTitle, Stars } from "@/components/ui/primitives";
import { prestigeStars, tierOf } from "./clubTiers";

function ClubCard({ club, index, onPick }: { club: ClubStatic; index: number; onPick: (id: string) => void }) {
  const tier = tierOf(index);
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(club.id)}
        aria-label={`Treinar o ${club.name} (${tier.label})`}
        className="group flex h-full w-full items-start gap-3 rounded-2xl bg-ink-800 p-3.5 text-left shadow-card ring-1 ring-inset ring-white/8 transition hover:-translate-y-0.5 hover:bg-ink-700 hover:ring-gold-400/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 active:translate-y-0"
      >
        <Crest club={club} size={44} className="shrink-0 transition-transform group-hover:scale-105" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 truncate font-display text-lg font-bold uppercase leading-tight">{club.name}</span>
            <Stars value={prestigeStars(club.rep)} className="mt-1 shrink-0" />
          </span>
          <span className="block truncate text-sm italic text-mist">“{club.nickname}”</span>
          <span className="mt-1.5 flex flex-col gap-0.5 text-xs text-mist">
            <span className="flex items-center gap-1.5 truncate"><MapPin className="size-3 shrink-0" aria-hidden /> {club.city}-{club.uf}</span>
            <span className="flex items-center gap-1.5 truncate">
              <Landmark className="size-3 shrink-0" aria-hidden /> {club.stadium} • {club.cap.toLocaleString("pt-BR")}
            </span>
          </span>
          <Badge tone={tier.tone} className="mt-2">{tier.label}</Badge>
        </span>
      </button>
    </li>
  );
}

function Division({ title, hint, from, to, onPick }: { title: string; hint: string; from: number; to: number; onPick: (id: string) => void }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <SectionTitle>{title}</SectionTitle>
        <span className="text-xs text-mist">{hint}</span>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CLUBS.slice(from, to).map((c, i) => (
          <ClubCard key={c.id} club={c} index={from + i} onPick={onPick} />
        ))}
      </ul>
    </section>
  );
}

/** Escolha do clube, agrupada por divisão (16 primeiros de CLUBS = Série A). */
export function ClubPicker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-8">
      <Division title="Série A" hint="Grandes cobram títulos; os menores lutam para não cair." from={0} to={16} onPick={onPick} />
      <Division title="Série B" hint="Pouco dinheiro, metas modestas e o sonho do acesso." from={16} to={CLUBS.length} onPick={onPick} />
    </div>
  );
}

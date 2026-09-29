"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Crown } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

interface Hall {
  managers: { managerName: string; clubName: string; titles: number; season: number }[];
  recent: { managerName: string; clubName: string; competition: string; season: number }[];
}

/** Prévia do ranking global (busca no cliente para a página inicial continuar estática). */
export function HallPreview() {
  const [hall, setHall] = useState<Hall | null | "error">(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/hall")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Hall) => alive && setHall(d))
      .catch(() => alive && setHall("error"));
    return () => {
      alive = false;
    };
  }, []);

  const top = hall && hall !== "error" ? hall.managers.slice(0, 5) : [];
  const recent = hall && hall !== "error" ? hall.recent.slice(0, 4) : [];

  return (
    <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
      <div className="rounded-(--radius-card) bg-ink-800 p-5 shadow-card ring-1 ring-inset ring-white/8">
        <p className="mb-3 flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-gold-400">
          <Crown className="size-4" /> Treinadores mais vitoriosos
        </p>
        {hall === null ? (
          <div className="flex flex-col gap-2" aria-hidden>
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />)}
          </div>
        ) : top.length ? (
          <ol className="divide-y divide-white/6">
            {top.map((m, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <span className={`w-7 text-center font-display text-xl font-extrabold tabular ${i === 0 ? "text-gold-400" : "text-mist"}`}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.managerName}</span>
                  <span className="block truncate text-xs text-mist">{m.clubName}</span>
                </span>
                <span className="font-display text-lg font-extrabold text-gold-300 tabular">{m.titles} {m.titles === 1 ? "título" : "títulos"}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-6 text-center text-sm text-mist">
            {hall === "error" ? "O ranking volta assim que o servidor responder." : "Ninguém levantou uma taça ainda. O primeiro nome pode ser o seu."}
          </p>
        )}
      </div>
      <div className="flex flex-col justify-between gap-4 rounded-(--radius-card) bg-linear-to-br from-gold-400/15 via-ink-800 to-ink-800 p-5 ring-1 ring-inset ring-gold-400/20">
        <div>
          <p className="font-display text-[13px] font-bold uppercase tracking-[0.14em] text-gold-400">Conquistas recentes</p>
          {recent.length ? (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {recent.map((r, i) => (
                <li key={i} className="leading-snug">
                  <b className="text-snow">{r.competition} {r.season}</b>
                  <span className="text-mist"> • {r.managerName}, {r.clubName}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-mist">Salve sua carreira na nuvem e cada título entra no ranking de todos os jogadores.</p>
          )}
        </div>
        <Link href="/hall-da-fama" className={buttonClasses("outline", "md", false, "self-start")}>
          Ver Hall da Fama <ChevronRight />
        </Link>
      </div>
    </div>
  );
}

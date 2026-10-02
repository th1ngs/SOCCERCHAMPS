"use client";

import Link from "next/link";
import { POS, avg, clubWages, formatMoney, strengthStars, teamRating } from "@/game";
import type { Club, Player, Position } from "@/game/types";
import { PosBadge, Stars } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

export const POS_PLURAL: Record<Position, string> = { GOL: "Goleiros", ZAG: "Zagueiros", LAT: "Laterais", VOL: "Volantes", MEI: "Meias", ATA: "Atacantes" };

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-xl bg-ink-800 px-3 py-2.5 shadow-card ring-1 ring-inset ring-white/8", className)}>
      <p className="font-display text-[11px] font-bold uppercase tracking-wider text-mist">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/** Resumo do elenco: força dos titulares (é ela que conta, não o banco), idade, folha, contratos e profundidade por posição. */
export function SquadOverview({ club, players, w }: { club: Club; players: Player[]; w: Parameters<typeof teamRating>[0] }) {
  const xi = teamRating(w, club);
  const all = avg(players.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 18), (p) => p.ovr);
  const wages = clubWages(w, club);
  const cap = club.wageCap;
  const expiring = players.filter((p) => p.contract <= 1 && !p.loan).length;
  const out = players.filter((p) => p.inj > 0 || p.susp > 0).length;
  return (
    <div className="mb-4 space-y-2">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Tile label="Força dos titulares">
          <div className="flex items-center gap-2">
            <Stars value={strengthStars(xi)} className="text-base" />
            <b className="font-display text-lg tabular text-snow">{xi.toFixed(1)}</b>
          </div>
          <p className="text-xs text-mist">Elenco (18 melhores): {all.toFixed(1)}</p>
        </Tile>
        <Tile label="Idade média">
          <b className="font-display text-lg tabular text-snow">{avg(players, (p) => p.age).toFixed(1)}</b>
          <p className="text-xs text-mist">
            {players.filter((p) => p.age <= 21).length} até 21 • {players.filter((p) => p.age >= 32).length} com 32+
          </p>
        </Tile>
        <Tile label="Folha salarial">
          <b className="font-display text-lg tabular text-snow">{formatMoney(wages)}<span className="text-xs font-normal text-mist">/sem</span></b>
          {cap ? (
            <span role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((wages / cap) * 100)} aria-label={`Folha em ${Math.round((wages / cap) * 100)}% do teto`} className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <span className={cn("block h-full rounded-full", wages > cap ? "bg-danger-500" : wages > cap * 0.9 ? "bg-warn-400" : "bg-pitch-400")} style={{ width: `${Math.min(100, (wages / cap) * 100)}%` }} />
            </span>
          ) : null}
          {cap ? <p className="text-xs text-mist">Teto {formatMoney(cap)}/sem</p> : null}
        </Tile>
        <Tile label="Contratos e ausências" className={expiring ? "ring-warn-400/30" : undefined}>
          {expiring ? (
            <Link href="#renovacoes" className="font-display text-lg font-bold tabular text-warn-400 hover:underline">
              {expiring} vencendo
            </Link>
          ) : (
            <b className="font-display text-lg text-pitch-400">Em dia</b>
          )}
          <p className="text-xs text-mist">{out ? `${out} lesionado(s) ou suspenso(s)` : "Todos disponíveis"}</p>
        </Tile>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Profundidade por posição">
        {POS.map((pos) => {
          const list = players.filter((p) => p.pos === pos);
          const best = list.slice().sort((a, b) => b.ovr - a.ovr).slice(0, pos === "GOL" ? 1 : 2);
          return (
            <li key={pos} className="flex items-center gap-2 rounded-lg bg-ink-800/70 px-2 py-1.5 ring-1 ring-inset ring-white/6" title={`${POS_PLURAL[pos]}: ${list.length} no elenco`}>
              <PosBadge pos={pos} />
              <span className="min-w-0 text-xs leading-tight">
                <b className={cn("tabular", list.length < (pos === "GOL" ? 2 : 3) ? "text-warn-400" : "text-snow")}>{list.length}</b>
                <span className="block text-mist tabular">{best.length ? Math.round(avg(best, (p) => p.ovr)) : "—"} ovr</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

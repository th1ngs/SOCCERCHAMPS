"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { CircleCheck, FileClock, HeartPulse, Octagon, RectangleVertical, TriangleAlert, BatteryLow, Goal } from "lucide-react";
import type { Player } from "@/game/types";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { clubScorers, squadAlerts } from "./derive";

function AlertLine({ icon, tone, children }: { icon: ReactNode; tone: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5 text-sm">
      <span className={cn("mt-0.5 shrink-0 [&_svg]:size-4", tone)}>{icon}</span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Names({ list, extra }: { list: Player[]; extra?: (p: Player) => string }) {
  const { setOverlay } = useWorld();
  return (
    <>
      {list.map((p, i) => (
        <span key={p.id}>
          {i > 0 && ", "}
          <button type="button" onClick={() => setOverlay({ kind: "player", pid: p.id })} className="font-semibold underline decoration-white/20 underline-offset-2 hover:decoration-gold-400">
            {p.name}
          </button>
          {extra && <span className="text-mist"> ({extra(p)})</span>}
        </span>
      ))}
    </>
  );
}

const link = "font-semibold text-gold-400 underline-offset-2 hover:underline";

/** Alertas do elenco e artilheiros do time. */
export function SquadCard() {
  const { world: w, version, setOverlay } = useWorld();
  const { a, scorers } = useMemo(() => {
    void version;
    return { a: squadAlerts(w), scorers: clubScorers(w) };
  }, [w, version]);

  return (
    <Card title="Elenco" action={<Link href="/jogo/elenco" className={cn(link, "text-sm")}>Ver elenco</Link>}>
      <ul className="divide-y divide-white/6">
        {a.short && (
          <AlertLine icon={<TriangleAlert />} tone="text-warn-400">
            Elenco curto: só <b>{a.size}</b> jogadores. Contrate no <Link href="/jogo/mercado" className={link}>mercado</Link> ou promova garotos da <Link href="/jogo/base" className={link}>base</Link>.
          </AlertLine>
        )}
        {a.injured.length > 0 && (
          <AlertLine icon={<HeartPulse />} tone="text-danger-400">
            <b>{a.injured.length}</b> no DM: <Names list={a.injured} extra={(p) => `${p.injType ?? "lesão"}, ${p.inj} sem.`} />
          </AlertLine>
        )}
        {a.suspended.length > 0 && (
          <AlertLine icon={<Octagon />} tone="text-danger-400">
            Suspenso(s): <Names list={a.suspended} />
          </AlertLine>
        )}
        {a.hanging.length > 0 && (
          <AlertLine icon={<RectangleVertical />} tone="text-warn-400">
            Pendurado(s), um amarelo da suspensão: <Names list={a.hanging} />
          </AlertLine>
        )}
        {a.tired.length > 0 && (
          <AlertLine icon={<BatteryLow />} tone="text-warn-400">
            Titulares cansados: <Names list={a.tired} extra={(p) => `${Math.round(p.fitness)}%`} />
          </AlertLine>
        )}
        {a.expiring.length > 0 && (
          <AlertLine icon={<FileClock />} tone="text-info-400">
            <b>{a.expiring.length}</b> contrato(s) terminam nesta temporada. <Link href="/jogo/elenco" className={link}>Renovar</Link>
          </AlertLine>
        )}
        {a.clean && (
          <AlertLine icon={<CircleCheck />} tone="text-pitch-400">Elenco sem problemas.</AlertLine>
        )}
      </ul>

      <SectionTitle className="mb-1 mt-4">Artilheiros do time</SectionTitle>
      {scorers.length ? (
        <ul>
          {scorers.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOverlay({ kind: "player", pid: p.id })}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-white/6"
              >
                <Goal className="size-4 shrink-0 text-mist" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <b className="font-display text-lg tabular">{p.s.goals}</b>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-mist">Ninguém marcou ainda.</p>
      )}
    </Card>
  );
}

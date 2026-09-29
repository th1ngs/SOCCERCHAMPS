import Link from "next/link";
import { CalendarClock, Gem, GraduationCap, Landmark, Target, Telescope, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { focusName, type AcademySummary as Summary } from "./derive";

function Pips({ value, max, tone = "bg-pitch-400" }: { value: number; max: number; tone?: string }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`Nível ${value} de ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cn("h-1.5 w-4 rounded-full", i < value ? tone : "bg-white/10")} />
      ))}
    </span>
  );
}

function Tile({ icon: Icon, label, children, sub, className }: { icon: LucideIcon; label: string; children: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-xl bg-ink-900/55 p-3 ring-1 ring-inset ring-white/6", className)}>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mist">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <div className="mt-1 font-display text-2xl font-extrabold leading-none tabular">{children}</div>
      {sub && <div className="mt-1.5 text-xs text-mist">{sub}</div>}
    </div>
  );
}

/** Painel do topo: estrutura, olheiros, foco, garotos, joias e calendário da safra. */
export function AcademySummary({ s, season }: { s: Summary; season: number }) {
  return (
    <section aria-label="Resumo da base" className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <Tile
        icon={GraduationCap}
        label="Estrutura da base"
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <Pips value={s.academy} max={s.academyMax} />
            <Link href="/jogo/clube" className="inline-flex items-center gap-1 rounded text-gold-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-gold-400">
              <Landmark className="size-3" aria-hidden /> Melhorar
            </Link>
          </span>
        }
      >
        {s.academy}
        <span className="text-base text-mist">/{s.academyMax}</span>
      </Tile>
      <Tile icon={Telescope} label="Olheiros" sub={<Pips value={s.scouting} max={s.scoutingMax} tone="bg-info-400" />}>
        {s.scouting}
        <span className="text-base text-mist">/{s.scoutingMax}</span>
      </Tile>
      <Tile icon={Target} label="Foco" sub="Posições da safra">
        <span className="block truncate text-xl">{focusName(s.focus)}</span>
      </Tile>
      <Tile
        icon={Users}
        label="Garotos"
        sub={
          s.decideCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-warn-400">
              <TriangleAlert className="size-3" aria-hidden /> {s.decideCount} a decidir
            </span>
          ) : (
            `${s.arrivedThisSeason} chegaram em ${season}`
          )
        }
      >
        {s.youthCount}
      </Tile>
      <Tile icon={Gem} label="Joias" sub="Faixa mínima ≥ 78" className={s.gems ? "ring-gold-400/30" : undefined}>
        <span className={s.gems ? "text-gold-300" : undefined}>{s.gems}</span>
      </Tile>
      <Tile icon={CalendarClock} label="Próxima safra" sub={`Pré-temporada de ${s.nextSeason}`}>
        {s.weeksToIntake}
        <span className="ml-1 text-sm text-mist">{s.weeksToIntake === 1 ? "semana" : "semanas"}</span>
      </Tile>
    </section>
  );
}

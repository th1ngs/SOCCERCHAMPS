import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { POT_SCALE_MAX, POT_SCALE_MIN, potPct, rangeLabel, type PotRange } from "./derive";

/**
 * Faixa de potencial conhecida numa escala 40–99, com o overall atual marcado.
 * Quanto melhor o scouting, mais estreita a faixa; "exato" quando o relatório está completo.
 */
export function PotentialBar({ range, ovr, className }: { range: PotRange; ovr?: number; className?: string }) {
  const exact = range.exact || range.min === range.max;
  const left = potPct(range.min);
  const right = potPct(range.max);
  const width = Math.max(exact ? 1.6 : 2, right - left);
  const high = range.min >= 78;
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-mist">Potencial</span>
        <span className="flex items-baseline gap-1.5">
          <span className={cn("font-display text-lg font-extrabold leading-none tabular", high ? "text-gold-300" : "text-snow")}>{rangeLabel(range)}</span>
          <span className={cn("text-xs font-bold uppercase tracking-wide", exact ? "text-pitch-400" : "text-mist")}>{exact ? "exato" : "faixa"}</span>
        </span>
      </div>
      <div
        role="img"
        aria-label={exact ? `Potencial exato ${range.max}` : `Potencial entre ${range.min} e ${range.max}`}
        className="relative h-2.5 rounded-full bg-white/8 ring-1 ring-inset ring-white/6"
      >
        {/* marcas de 60 e 80 */}
        {[60, 80].map((v) => (
          <span key={v} aria-hidden className="absolute inset-y-0 w-px bg-white/15" style={{ left: `${potPct(v)}%` }} />
        ))}
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 rounded-full",
            exact ? "bg-pitch-400" : high ? "bg-linear-to-r from-gold-500/70 to-gold-300" : "bg-linear-to-r from-info-500/60 to-info-400",
          )}
          style={{ left: `${Math.min(left, 100 - width)}%`, width: `${width}%` }}
        />
        {typeof ovr === "number" && (
          <span
            aria-hidden
            title={`Atual: ${Math.round(ovr)}`}
            className="absolute -top-0.5 h-3.5 w-1 -translate-x-1/2 rounded-full bg-snow shadow ring-1 ring-ink-950/60"
            style={{ left: `${potPct(ovr)}%` }}
          />
        )}
      </div>
      <div aria-hidden className="mt-0.5 flex justify-between text-xs text-mist/70 tabular">
        <span>{POT_SCALE_MIN}</span>
        <span>{POT_SCALE_MAX}</span>
      </div>
    </div>
  );
}

/** Mini tendência: linha do overall na chegada até o atual. */
export function GrowthTrend({ growth, since, startOvr, ovr }: { growth: number; since: number; startOvr: number; ovr: number }) {
  const up = growth > 0;
  const down = growth < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const tone = up ? "text-pitch-400" : down ? "text-danger-400" : "text-mist";
  // Sparkline de 2 pontos normalizada na janela de ±8 pontos.
  const dy = Math.max(-8, Math.min(8, growth));
  const y1 = 10 + dy * 0.9;
  const y2 = 10 - dy * 0.9;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", tone)} title={`Chegou com ${startOvr}, hoje ${Math.round(ovr)}`}>
      <svg viewBox="0 0 36 20" className="h-3.5 w-7" aria-hidden>
        <polyline points={`2,${y1} 34,${y2}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="34" cy={y2} r="2.6" fill="currentColor" />
      </svg>
      <Icon className="size-3.5" aria-hidden />
      <span className="tabular">
        {up ? "+" : ""}
        {growth} desde {since}
      </span>
    </span>
  );
}

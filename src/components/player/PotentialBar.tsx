import type { PotentialRange } from "@/game/types";
import { cn } from "@/lib/cn";

const MIN = 40;
const MAX = 99;
const pct = (v: number) => ((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN)) * 100;

/** Faixa de potencial conhecida (escala 40–99). Exata vira um marcador; estimativa vira um trecho. */
export function PotentialBar({ range, ovr, className }: { range: PotentialRange; ovr: number; className?: string }) {
  const lo = Math.round(range.min);
  const hi = Math.round(range.max);
  const exact = range.exact || lo === hi;
  const label = exact ? `Potencial ${hi}` : `Potencial entre ${lo} e ${hi}`;
  return (
    <div className={cn("w-full min-w-0", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-display text-[11px] font-bold uppercase tracking-widest text-mist">Potencial</span>
        <span className="font-display text-lg font-extrabold tabular text-gold-300">{exact ? hi : `${lo}–${hi}`}</span>
      </div>
      <div role="img" aria-label={`${label}; overall atual ${Math.round(ovr)}`} className="relative h-2.5 rounded-full bg-white/8">
        {/* overall atual */}
        <span className="absolute inset-y-0 left-0 rounded-full bg-white/15" style={{ width: `${pct(ovr)}%` }} />
        {exact ? (
          <span className="absolute -top-1 h-4.5 w-1.5 -translate-x-1/2 rounded-full bg-gold-400 shadow-gold" style={{ left: `${pct(hi)}%` }} />
        ) : (
          <span
            className="absolute inset-y-0 rounded-full bg-linear-to-r from-gold-500/60 to-gold-300/80 ring-1 ring-gold-300/60"
            style={{ left: `${pct(lo)}%`, width: `${Math.max(1.5, pct(hi) - pct(lo))}%` }}
          />
        )}
      </div>
      <p className="mt-1 text-[11px] text-mist">{exact ? "Potencial conhecido." : "Estimativa dos olheiros: um relatório completo revela o número exato."}</p>
    </div>
  );
}

import { cn } from "@/lib/cn";

/** Linha de comparação: valor do mandante, rótulo, valor do visitante e barras proporcionais. */
export function StatBar({
  label,
  left,
  right,
  a,
  b,
  colors = ["var(--color-gold-400)", "var(--color-info-400)"],
  className,
}: {
  label: string;
  left: string;
  right: string;
  /** Valores numéricos para as barras (padrão: os textos convertidos). */
  a?: number;
  b?: number;
  colors?: [string, string];
  className?: string;
}) {
  const va = a ?? (parseFloat(left) || 0), vb = b ?? (parseFloat(right) || 0);
  const tot = va + vb || 1;
  const lead = va > vb ? 0 : vb > va ? 1 : -1;
  return (
    <div className={cn("py-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <b className={cn("font-display text-base tabular", lead === 0 ? "text-snow" : "text-mist")}>{left}</b>
        <span className="truncate text-xs uppercase tracking-wide text-mist">{label}</span>
        <b className={cn("font-display text-base tabular", lead === 1 ? "text-snow" : "text-mist")}>{right}</b>
      </div>
      <div className="mt-1 flex gap-1" aria-hidden>
        <span className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-white/8">
          <span className="block h-full rounded-full" style={{ width: `${(va / tot) * 100}%`, background: colors[0] }} />
        </span>
        <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
          <span className="block h-full rounded-full" style={{ width: `${(vb / tot) * 100}%`, background: colors[1] }} />
        </span>
      </div>
    </div>
  );
}

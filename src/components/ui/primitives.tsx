import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ---------- Card ---------- */
export function Card({
  title,
  action,
  className,
  children,
  tone = "default",
  ...rest
}: HTMLAttributes<HTMLElement> & { title?: ReactNode; action?: ReactNode; tone?: "default" | "highlight" }) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-(--radius-card) p-4 shadow-card ring-1 ring-inset ring-white/8 sm:p-5",
        tone === "highlight" ? "bg-linear-to-br from-pitch-700/40 via-ink-800 to-ink-800" : "bg-ink-800",
        className,
      )}
      {...rest}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <SectionTitle>{title}</SectionTitle>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("font-display text-[13px] font-bold uppercase tracking-[0.14em] text-gold-400", className)}>{children}</h3>;
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-extrabold uppercase italic leading-none tracking-tight text-balance sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-prose text-sm text-mist">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Badges ---------- */
const badgeTones = {
  neutral: "bg-white/8 text-snow",
  gold: "bg-gold-400/15 text-gold-300",
  green: "bg-pitch-500/20 text-pitch-400",
  red: "bg-danger-500/20 text-danger-400",
  blue: "bg-info-500/20 text-info-400",
  orange: "bg-warn-400/15 text-warn-400",
} as const;
export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "neutral", className, children, title }: { tone?: BadgeTone; className?: string; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-bold uppercase tracking-wide", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

const posTone: Record<string, string> = {
  GOL: "bg-gold-400 text-ink-950",
  ZAG: "bg-info-500 text-white",
  LAT: "bg-info-500 text-white",
  VOL: "bg-pitch-500 text-ink-950",
  MEI: "bg-pitch-500 text-ink-950",
  ATA: "bg-danger-500 text-white",
};
export function PosBadge({ pos, className }: { pos: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 w-9 shrink-0 items-center justify-center rounded-md font-display text-[11px] font-bold tracking-wide", posTone[pos], className)}>
      {pos}
    </span>
  );
}

export function OvrBadge({ value, size = "md", className }: { value: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const v = Math.round(value);
  const tone =
    v >= 80 ? "bg-gold-400 text-ink-950" : v >= 72 ? "bg-info-400 text-ink-950" : v >= 64 ? "bg-pitch-400 text-ink-950" : v >= 56 ? "bg-[#cfd8a0] text-ink-950" : "bg-mist text-ink-950";
  const sz = size === "lg" ? "h-12 min-w-14 text-2xl rounded-xl" : size === "sm" ? "h-5 min-w-7 text-[11px] rounded-md" : "h-6 min-w-8 text-[13px] rounded-lg";
  return <span className={cn("inline-flex shrink-0 items-center justify-center px-1 font-display font-extrabold tabular", tone, sz, className)}>{v}</span>;
}

export function Stars({ value, className }: { value: number; className?: string }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className={cn("inline-flex text-[13px] leading-none text-gold-400", className)} aria-label={`${value.toFixed(1)} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? "" : i === full && half ? "opacity-60" : "opacity-20"}>★</span>
      ))}
    </span>
  );
}

/* ---------- Medidores ---------- */
export function Meter({ value, className, label }: { value: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v < 55 ? "bg-danger-500" : v < 75 ? "bg-warn-400" : "bg-pitch-400";
  return (
    <span role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={label} className={cn("inline-block h-1.5 w-16 overflow-hidden rounded-full bg-white/10 align-middle", className)}>
      <span className={cn("block h-full rounded-full", color)} style={{ width: `${v}%` }} />
    </span>
  );
}

export function FormChips({ form }: { form: string[] }) {
  if (!form.length) return <span className="text-sm text-mist">—</span>;
  const tone: Record<string, string> = { V: "bg-pitch-500", E: "bg-ink-500", D: "bg-danger-500" };
  return (
    <span className="inline-flex gap-1">
      {form.map((r, i) => (
        <span key={i} className={cn("grid size-5 place-items-center rounded font-display text-[11px] font-bold text-white", tone[r])}>{r}</span>
      ))}
    </span>
  );
}

/* ---------- Linhas chave/valor ---------- */
export function KV({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-white/6 py-2 last:border-0", className)}>
      <span className="text-sm text-mist">{label}</span>
      <span className="text-right font-semibold tabular">{children}</span>
    </div>
  );
}

/* ---------- Alertas ---------- */
const alertTones = {
  info: "bg-info-500/10 ring-info-500/30",
  good: "bg-pitch-500/10 ring-pitch-500/35",
  warn: "bg-warn-400/10 ring-warn-400/35",
  bad: "bg-danger-500/10 ring-danger-500/35",
} as const;
export function Alert({ tone = "info", children, className }: { tone?: keyof typeof alertTones; children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-inset", alertTones[tone], className)}>{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-mist">{children}</p>;
}

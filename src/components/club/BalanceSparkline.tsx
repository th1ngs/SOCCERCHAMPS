"use client";

import { useId, useState, type PointerEvent } from "react";
import { formatMoney } from "@/game";
import type { BalancePoint } from "./finance";

const W = 300, H = 90, PAD = 8;

/** Evolução do caixa na temporada (uma série, com cursor e dica ao passar o dedo/mouse). */
export function BalanceSparkline({ points }: { points: BalancePoint[] }) {
  const gid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <p className="text-sm text-mist">O gráfico aparece após a segunda semana da temporada.</p>;

  const vals = points.map((p) => p.balance);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => PAD + (1 - (v - mn) / rng) * (H - PAD * 2);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  const zeroY = mn < 0 && mx > 0 ? y(0) : null;
  const last = points[points.length - 1];
  const hp = hover !== null ? points[hover] : null;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = (e.clientX - r.left) / r.width;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(t * (points.length - 1)))));
  };

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-24 w-full touch-none overflow-visible text-gold-400"
        role="img"
        aria-label={`Caixa na temporada: de ${formatMoney(points[0].balance)} (semana ${points[0].week}) a ${formatMoney(last.balance)} (semana ${last.week}). Mínimo ${formatMoney(mn)}, máximo ${formatMoney(mx)}.`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`g${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {zeroY !== null && (
          <line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke="var(--color-danger-400)" strokeDasharray="4 4" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.6} />
        )}
        <polygon points={area} fill={`url(#g${gid})`} />
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover !== null && hp && (
          <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--color-mist)" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.6} />
        )}
      </svg>
      {hover !== null && hp && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink-950 px-2.5 py-1.5 text-xs shadow-xl ring-1 ring-white/10"
          style={{ left: `${Math.min(88, Math.max(12, (hover / (points.length - 1)) * 100))}%` }}
        >
          <span className="text-mist">Semana {hp.week}</span> <b className="ml-1 tabular">{formatMoney(hp.balance)}</b>
        </div>
      )}
      <figcaption className="mt-1 flex justify-between text-xs text-mist tabular">
        <span>Mín. {formatMoney(mn)}</span>
        <span>Máx. {formatMoney(mx)}</span>
      </figcaption>
    </figure>
  );
}

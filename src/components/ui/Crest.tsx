import { useId } from "react";

export interface CrestClub {
  short: string;
  colors: string[];
  pattern: string;
}

const SHIELD = "M10 8 H90 V58 C90 88 50 114 50 114 C50 114 10 88 10 58 Z";

/** Escudo do clube gerado em SVG a partir das cores e do padrão da camisa. */
export function Crest({ club, size = 36, className }: { club: CrestClub; size?: number; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [p, s] = club.colors;
  let fill: React.ReactNode;
  switch (club.pattern) {
    case "v":
      fill = Array.from({ length: 7 }, (_, i) => <rect key={i} x={i * 14.3} y={0} width={14.4} height={120} fill={i % 2 ? s : p} />);
      break;
    case "h":
      fill = Array.from({ length: 8 }, (_, i) => <rect key={i} x={0} y={i * 15} width={100} height={15.1} fill={i % 2 ? s : p} />);
      break;
    case "sash":
      fill = (
        <>
          <rect width={100} height={120} fill={p} />
          <path d="M-10 20 L30 -10 L120 100 L80 130 Z" fill={s} />
        </>
      );
      break;
    case "half":
      fill = (
        <>
          <rect width={50} height={120} fill={p} />
          <rect x={50} width={50} height={120} fill={s} />
        </>
      );
      break;
    default:
      fill = (
        <>
          <rect width={100} height={120} fill={p} />
          <path d={SHIELD} fill="none" stroke={s} strokeWidth={14} />
        </>
      );
  }
  return (
    <svg className={className} width={size} height={size * 1.2} viewBox="0 0 100 120" aria-hidden focusable="false">
      <defs>
        <clipPath id={`c${id}`}>
          <path d={SHIELD} />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        {fill}
        <rect x={0} y={64} width={100} height={24} fill="rgba(0,0,0,.45)" />
      </g>
      <path d={SHIELD} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth={4} />
      <text x={50} y={82} textAnchor="middle" fontFamily="var(--font-head), Arial Narrow, sans-serif" fontWeight={800} fontSize={21} fill="#fff">
        {club.short}
      </text>
    </svg>
  );
}

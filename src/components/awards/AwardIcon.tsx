import { useId } from "react";
import type { GalaIcon } from "@/game/types";

/** Troféus da premiação em SVG (dourados, com brilho): Bola de Ouro, chuteira, luva, estrela, broto, prancheta, taça. */
export function AwardIcon({ icon, className }: { icon: GalaIcon; className?: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gold = `g${raw}`, shine = `s${raw}`;
  const defs = (
    <defs>
      <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff3b0" />
        <stop offset="0.35" stopColor="#facc15" />
        <stop offset="0.7" stopColor="#d97706" />
        <stop offset="1" stopColor="#92400e" />
      </linearGradient>
      <radialGradient id={shine} cx="0.35" cy="0.3" r="0.6">
        <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
  const G = `url(#${gold})`, S = `url(#${shine})`;
  const base = <path d="M30 86 H70 V94 H30 Z M36 80 H64 V86 H36 Z" fill="#7c2d12" />;
  let art: React.ReactNode;
  switch (icon) {
    case "ball":
      art = (
        <>
          <circle cx="50" cy="44" r="30" fill={G} />
          <path d="M50 26 L62 35 L58 49 L42 49 L38 35 Z" fill="#92400e" opacity="0.55" />
          <path d="M50 26 V14 M62 35 L76 30 M58 49 L67 62 M42 49 L33 62 M38 35 L24 30" stroke="#92400e" strokeWidth="2" opacity="0.5" />
          <circle cx="50" cy="44" r="30" fill={S} />
          <path d="M40 74 Q50 80 60 74 L62 80 H38 Z" fill={G} />
          {base}
        </>
      );
      break;
    case "boot":
      art = (
        <>
          <path d="M22 30 L44 30 L48 52 Q70 52 80 60 Q86 66 80 72 L24 72 Q18 72 18 64 Z" fill={G} />
          <path d="M26 72 v6 M40 72 v6 M54 72 v6 M68 72 v6" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
          <path d="M30 40 L46 40 M31 47 L47 47" stroke="#92400e" strokeWidth="2" opacity="0.6" />
          <path d="M22 30 L44 30 L48 52 Q70 52 80 60 L60 50 Z" fill={S} />
          {base}
        </>
      );
      break;
    case "glove":
      art = (
        <>
          <path d="M30 74 V40 Q30 34 35 34 Q40 34 40 40 V30 Q40 24 45 24 Q50 24 50 30 V28 Q50 22 55 22 Q60 22 60 28 V32 Q60 26 65 26 Q70 26 70 32 V56 Q74 50 78 52 Q82 55 78 62 L66 78 H34 Z" fill={G} />
          <path d="M40 40 V54 M50 30 V54 M60 32 V54" stroke="#92400e" strokeWidth="2" opacity="0.5" />
          <rect x="32" y="70" width="36" height="8" rx="2" fill="#92400e" opacity="0.7" />
          <ellipse cx="44" cy="38" rx="10" ry="14" fill={S} />
          {base}
        </>
      );
      break;
    case "star":
      art = (
        <>
          <path d="M50 10 L60 34 L86 36 L66 53 L72 78 L50 64 L28 78 L34 53 L14 36 L40 34 Z" fill={G} />
          <path d="M50 10 L60 34 L86 36 L66 53 L50 40 Z" fill={S} />
          {base}
        </>
      );
      break;
    case "sprout":
      art = (
        <>
          <path d="M50 78 V44" stroke={G} strokeWidth="6" strokeLinecap="round" />
          <path d="M50 52 Q26 50 22 28 Q46 26 50 52 Z" fill={G} />
          <path d="M50 44 Q74 40 80 16 Q54 16 50 44 Z" fill={G} />
          <path d="M50 44 Q74 40 80 16 Q60 24 50 44 Z" fill={S} />
          {base}
        </>
      );
      break;
    case "clipboard":
      art = (
        <>
          <rect x="24" y="16" width="52" height="64" rx="5" fill={G} />
          <rect x="38" y="10" width="24" height="12" rx="3" fill="#92400e" />
          <rect x="31" y="27" width="38" height="46" rx="2" fill="#fffbeb" />
          <path d="M37 37 L45 45 M45 37 L37 45 M54 60 a5 5 0 1 0 0.1 0 M44 44 Q52 56 52 56" stroke="#92400e" strokeWidth="2" fill="none" />
          <rect x="24" y="16" width="26" height="64" rx="5" fill={S} />
          {base}
        </>
      );
      break;
    case "assist":
      art = (
        <>
          <circle cx="66" cy="26" r="12" fill={G} />
          <path d="M22 70 Q34 34 58 30" stroke={G} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="2 9" />
          <path d="M18 74 L34 62 L36 76 Z" fill={G} />
          <circle cx="66" cy="26" r="12" fill={S} />
          {base}
        </>
      );
      break;
    default:
      art = (
        <>
          <path d="M30 14 H70 V34 Q70 58 50 62 Q30 58 30 34 Z" fill={G} />
          <path d="M30 20 H18 Q16 40 32 44 M70 20 H82 Q84 40 68 44" stroke={G} strokeWidth="5" fill="none" />
          <rect x="45" y="62" width="10" height="12" fill={G} />
          <rect x="34" y="72" width="32" height="8" rx="2" fill={G} />
          <path d="M34 16 H52 V34 Q52 52 40 56 Q34 46 34 34 Z" fill={S} />
          {base}
        </>
      );
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {defs}
      {art}
    </svg>
  );
}

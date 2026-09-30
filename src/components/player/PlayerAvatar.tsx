import type { Player } from "@/game/types";
import { cn } from "@/lib/cn";

/** Retrato vetorial estável: rosto, cabelo e uniforme variam com o id do jogador. */
export function PlayerAvatar({ player, size = 36, className }: { player: Pick<Player, "id" | "name" | "pos">; size?: number; className?: string }) {
  const hash = [...player.id].reduce((n, char) => Math.imul(n, 31) + char.charCodeAt(0) | 0, 7) >>> 0;
  const skin = ["#f4c9a8", "#dda77e", "#c78d64", "#a86949", "#784733", "#59392e"][hash % 6];
  const shade = ["#d99f80", "#ba7957", "#9d6649", "#855039", "#5e352b", "#42271f"][hash % 6];
  const hair = ["#201c1b", "#503126", "#74482e", "#a57445", "#44413f", "#c6a56c"][(hash >>> 3) % 6];
  const shirt = player.pos === "GOL" ? "#d4a039" : ["#238764", "#3576a1", "#a3404a", "#654ea2", "#e0aa43"][(hash >>> 7) % 5];
  const style = (hash >>> 11) % 5;
  const beard = (hash >>> 15) % 4 === 0;
  const moustache = !beard && (hash >>> 17) % 6 === 0;
  const glasses = (hash >>> 20) % 13 === 0;
  const face = style === 2 ? "M18 26c0-10 6-17 14-17s14 7 14 17v9c0 12-6 20-14 20s-14-8-14-20z" : "M19 25c0-10 5-16 13-16s13 6 13 16v10c0 11-5 18-13 18s-13-7-13-18z";
  const fringe = [
    "M17 27c-2-13 4-21 15-21 10 0 17 7 15 20l-5-9-13 2-9 8z",
    "M18 26c-2-10 3-20 14-20 10 0 16 7 15 18l-5-8-11-3-11 9z",
    "M17 25c1-12 6-18 15-18 10 0 15 7 15 19l-5-9-8-2-10 5z",
    "M18 24c0-12 5-18 14-18 10 0 16 7 15 20l-5-8-11-2-10 8z",
    "M18 25c-2-12 4-20 14-20 11 0 17 8 15 21l-6-9-12 2-9 7z",
  ][style];

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`Avatar de ${player.name}`} className={cn("shrink-0 overflow-hidden rounded-full ring-1 ring-white/25", className)}>
      <circle cx="32" cy="32" r="32" fill="#173b50" />
      <path d="M0 44c9-7 18-9 32-9s23 2 32 9v20H0z" fill="#245267" opacity=".65" />
      <path d="M2 64c1-15 10-23 24-24h12c14 1 23 9 24 24z" fill={shirt} />
      <path d="M23 43l9 11 9-11-5-4h-8z" fill="#f2eee5" />
      <path d="M28 40h8v8l-4 5-4-5z" fill={shade} />
      <path d="M7 62c2-9 8-15 17-18l8 11 8-11c9 3 15 9 17 18" fill="none" stroke="#ffffff" strokeOpacity=".23" strokeWidth="2" />
      <ellipse cx="18" cy="32" rx="3.5" ry="5" fill={shade} />
      <ellipse cx="46" cy="32" rx="3.5" ry="5" fill={shade} />
      <path d={face} fill={skin} stroke={shade} strokeWidth="1.2" />
      <path d="M23 37c3 7 15 8 18 0-2 8-5 12-9 12s-7-4-9-12z" fill={shade} opacity=".2" />
      {style === 1 && <path d="M19 24c-4-4-3-12 2-15M45 24c4-4 3-12-2-15" fill="none" stroke={hair} strokeWidth="4" strokeLinecap="round" />}
      {style === 2 && <path d="M18 22c-5-2-5-10-2-12m4 4c-3-8 3-11 5-11m6 9c-2-8 4-10 6-8m4 11c2-7 7-7 9-3" fill="none" stroke={hair} strokeWidth="4" strokeLinecap="round" />}
      {style !== 3 && <path d={fringe} fill={hair} />}
      {style === 3 && <path d="M18 22c1-10 6-15 14-15 9 0 14 6 14 16" fill="none" stroke={hair} strokeWidth="4" />}
      <path d="M24 28l5-1m6 0 5 1" fill="none" stroke={hair} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="27" cy="31" rx="1.4" ry="1.7" fill="#242323" />
      <ellipse cx="37" cy="31" rx="1.4" ry="1.7" fill="#242323" />
      <path d="M32 31l-1.5 6h3" fill="none" stroke={shade} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {beard && <path d="M21 39c2 9 6 14 11 14s9-5 11-14c-4 4-8 5-11 5s-7-1-11-5z" fill={hair} opacity=".83" />}
      {moustache && <path d="M25 40c3-3 5-2 7 0 2-2 4-3 7 0-4 2-5 3-7 1-2 2-3 1-7-1z" fill={hair} />}
      <path d="M28 43q4 2 8 0" fill="none" stroke={beard ? skin : shade} strokeWidth="1.3" strokeLinecap="round" />
      {glasses && <g fill="none" stroke="#27333b" strokeWidth="1.6"><circle cx="27" cy="31" r="4.6" /><circle cx="37" cy="31" r="4.6" /><path d="M31.5 30.5h1M22 30l-4-1m24 0 4-1" /></g>}
      <circle cx="32" cy="32" r="31" fill="none" stroke="#ffffff" strokeOpacity=".18" strokeWidth="2" />
    </svg>
  );
}

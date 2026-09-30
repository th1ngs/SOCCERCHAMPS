import type { Player } from "@/game/types";
import { cn } from "@/lib/cn";

/** Retrato vetorial estável: a mesma pessoa conserva a aparência em todos os saves. */
export function PlayerAvatar({ player, size = 36, className }: { player: Player; size?: number; className?: string }) {
  const hash = [...player.id].reduce((n, char) => Math.imul(n, 31) + char.charCodeAt(0) | 0, 7) >>> 0;
  const skin = ["#f3c39c", "#d99d72", "#b97750", "#8c5639", "#613b2f"][hash % 5];
  const hair = ["#201b1a", "#4a3026", "#74503a", "#b28a4e", "#4c4844"][(hash >>> 3) % 5];
  const shirt = player.pos === "GOL" ? "#dfa83d" : ["#297d60", "#3d6e9f", "#a15355"][(hash >>> 6) % 3];
  const style = (hash >>> 9) % 3;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={`Avatar de ${player.name}`}
      className={cn("shrink-0 rounded-full ring-1 ring-white/20", className)}>
      <circle cx="24" cy="24" r="24" fill="#173048" />
      <path d="M4 48c1-11 8-17 20-17s19 6 20 17" fill={shirt} />
      <path d="M17 31l7 7 7-7" fill="#f1ece2" />
      <ellipse cx="24" cy="21" rx="10" ry="12" fill={skin} />
      <path d={style === 0 ? "M14 21c-2-12 5-17 12-16 8 0 11 6 8 16l-3-9-14 4z"
        : style === 1 ? "M14 20c0-11 5-15 12-15 8 0 11 7 8 16l-3-9-11 3-4 7z"
          : "M14 19c1-11 7-14 13-13 8 1 10 8 7 15l-4-8-12 3-3 6z"} fill={hair} />
      <circle cx="20" cy="22" r="1" fill="#252224" />
      <circle cx="28" cy="22" r="1" fill="#252224" />
      <path d="M21 27q3 2 6 0" fill="none" stroke="#704b40" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

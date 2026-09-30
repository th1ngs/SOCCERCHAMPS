import { cn } from "@/lib/cn";
import type { LeagueId } from "@/game/types";

/** Bandeiras simplificadas (SVG) das ligas do jogo (códigos = LeagueId). */
export type FlagCode = LeagueId;

/**
 * Bandeira de uma liga. Sem `className`, ocupa ~1em de altura ao lado do texto;
 * com `className`, a altura/borda ficam por conta de quem chama.
 * `decorative` esconde do leitor de tela quando o nome do país já aparece ao lado.
 */
export function Flag({ code, className, decorative = false }: { code: FlagCode; className?: string; decorative?: boolean }) {
  return (
    <svg
      viewBox="0 0 30 20"
      className={cn("inline-block w-auto shrink-0", className ?? "h-[0.85em] rounded-[2px] ring-1 ring-black/25")}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : FLAG_NAMES[code]}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      {!decorative && <title>{FLAG_NAMES[code]}</title>}
      {FLAGS[code]}
    </svg>
  );
}

export const FLAG_NAMES: Record<FlagCode, string> = {
  bra: "Brasil",
  arg: "Argentina",
  por: "Portugal",
  esp: "Espanha",
  eng: "Inglaterra",
  ita: "Itália",
  ger: "Alemanha",
  fra: "França",
  ned: "Holanda",
  bel: "Bélgica",
  tur: "Turquia",
  sco: "Escócia",
  gre: "Grécia",
};

const FLAGS: Record<FlagCode, React.ReactNode> = {
  bra: (
    <>
      <rect width="30" height="20" fill="#009c3b" />
      <path d="M3 10 15 2.2 27 10 15 17.8Z" fill="#ffdf00" />
      <circle cx="15" cy="10" r="4.6" fill="#002776" />
      <path d="M10.6 9.2c3-1 6.3-.6 8.8 1" stroke="#fff" strokeWidth=".7" fill="none" />
    </>
  ),
  arg: (
    <>
      <rect width="30" height="20" fill="#74acdf" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <circle cx="15" cy="10" r="1.9" fill="#f6b40e" />
    </>
  ),
  por: (
    <>
      <rect width="30" height="20" fill="#ff0000" />
      <rect width="12" height="20" fill="#006600" />
      <circle cx="12" cy="10" r="3.4" fill="#ffcc00" />
      <circle cx="12" cy="10" r="2" fill="#ff0000" />
    </>
  ),
  esp: (
    <>
      <rect width="30" height="20" fill="#aa151b" />
      <rect y="5" width="30" height="10" fill="#f1bf00" />
    </>
  ),
  eng: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect x="12.5" width="5" height="20" fill="#ce1124" />
      <rect y="7.5" width="30" height="5" fill="#ce1124" />
    </>
  ),
  ita: (
    <>
      <rect width="30" height="20" fill="#ce2b37" />
      <rect width="20" height="20" fill="#fff" />
      <rect width="10" height="20" fill="#009246" />
    </>
  ),
  ger: <><rect width="30" height="20" fill="#ffce00" /><rect width="30" height="6.67" fill="#111" /><rect y="6.67" width="30" height="6.67" fill="#dd0000" /></>,
  fra: <><rect width="30" height="20" fill="#ed2939" /><rect width="20" height="20" fill="#fff" /><rect width="10" height="20" fill="#002395" /></>,
  ned: <><rect width="30" height="20" fill="#21468b" /><rect width="30" height="13.33" fill="#fff" /><rect width="30" height="6.67" fill="#ae1c28" /></>,
  bel: <><rect width="30" height="20" fill="#ef3340" /><rect width="20" height="20" fill="#fdda24" /><rect width="10" height="20" fill="#111" /></>,
  tur: <><rect width="30" height="20" fill="#e30a17" /><circle cx="12" cy="10" r="5" fill="#fff" /><circle cx="13.5" cy="10" r="4" fill="#e30a17" /><path d="m19 6.7.8 2.1 2.3.1-1.8 1.4.7 2.1-2-1.3-1.9 1.3.6-2.1-1.7-1.4 2.2-.1Z" fill="#fff" /></>,
  sco: <><rect width="30" height="20" fill="#0065bd" /><path d="M0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="4" /></>,
  gre: <><rect width="30" height="20" fill="#0d5eaf" />{[2, 6, 10, 14, 18].map((y) => <rect key={y} y={y} width="30" height="2" fill="#fff" />)}<rect width="12" height="11" fill="#0d5eaf" /><path d="M0 5.5h12M6 0v11" stroke="#fff" strokeWidth="2" /></>,
};

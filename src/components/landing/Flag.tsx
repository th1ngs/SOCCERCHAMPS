/** Bandeiras simplificadas (SVG) das ligas do jogo. */
export type FlagCode = "bra" | "arg" | "por" | "esp" | "eng" | "ita";

export function Flag({ code, className }: { code: FlagCode; className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} role="img" aria-label={FLAG_NAMES[code]}>
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
};

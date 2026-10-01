import type { CSSProperties } from "react";

/** Pseudoaleatório estável (mesmo resultado no servidor e no cliente). */
const rnd = (seed: number, i: number, k: number): number => {
  const x = Math.sin(seed * 9301 + i * 49297 + k * 233.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Chuva de confete em CSS sobre o elemento pai (que deve ser `relative overflow-hidden`). */
export function Confetti({ colors, seed = 1, count = 36, duration = 2.4 }: { colors: string[]; seed?: number; count?: number; duration?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const style = {
          left: `${rnd(seed, i, 1) * 100}%`,
          width: `${6 + rnd(seed, i, 2) * 6}px`,
          height: `${8 + rnd(seed, i, 3) * 8}px`,
          background: colors[i % colors.length],
          borderRadius: rnd(seed, i, 4) > 0.7 ? "999px" : "2px",
          "--cx": `${(rnd(seed, i, 5) - 0.5) * 160}px`,
          "--cr": `${360 + rnd(seed, i, 6) * 720}deg`,
          "--cd": `${duration * (0.7 + rnd(seed, i, 7) * 0.6)}s`,
          "--cdl": `${rnd(seed, i, 8) * 0.5}s`,
        } as CSSProperties;
        return <span key={i} className="animate-confetti absolute top-0 block" style={style} />;
      })}
    </div>
  );
}

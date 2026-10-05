import type { Club } from "@/game/types";

/**
 * Ilustração da sala da diretoria nas cores do clube: flâmulas, escudo na parede, estante com os troféus
 * conquistados (até 5) e os dirigentes à mesa. `mood` (0-100) muda a expressão de quem preside a mesa.
 */
export function BoardArt({ club, mood, className }: { club: Club; mood: number; className?: string }) {
  const [c1, c2] = club.colors;
  const trophies = Math.min(5, club.trophies.length);
  const id = `ba-${club.id}`;
  const smile = mood >= 60 ? "M-4 3 Q0 6 4 3" : mood >= 35 ? "M-4 4 L4 4" : "M-4 5 Q0 2 4 5";
  const seats = [
    { x: 92, y: 86, s: 0.9 },
    { x: 134, y: 82, s: 0.95 },
    { x: 180, y: 79, s: 1.05, chief: true },
    { x: 226, y: 82, s: 0.95 },
    { x: 268, y: 86, s: 0.9 },
  ];
  return (
    <svg viewBox="0 0 360 150" className={className} role="img" aria-label={`Sala da diretoria do ${club.name}`}>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} stopOpacity="0.55" />
          <stop offset="1" stopColor="#0b1220" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${id}-table`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a4a26" />
          <stop offset="1" stopColor="#3b2414" />
        </linearGradient>
        <radialGradient id={`${id}-lamp`} cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="360" height="150" fill={`url(#${id}-wall)`} />
      <rect width="360" height="150" fill={`url(#${id}-lamp)`} />
      {/* Flâmulas */}
      {[24, 56, 304, 336].map((x, i) => (
        <g key={x} transform={`translate(${x} 8)`}>
          <path d="M-9 0 H9 V20 L0 30 L-9 20 Z" fill={i % 2 ? c2 : c1} stroke="#00000055" strokeWidth="0.8" />
          <path d="M-9 8 H9" stroke={i % 2 ? c1 : c2} strokeWidth="3" />
        </g>
      ))}
      {/* Escudo do clube na parede */}
      <g transform="translate(180 30)">
        <circle r="22" fill="#0b1220" opacity="0.35" />
        <path d="M-15 -16 H15 V2 Q15 14 0 20 Q-15 14 -15 2 Z" fill={c1} stroke={c2} strokeWidth="3" />
        <text y="3" textAnchor="middle" fontSize="10" fontWeight="800" fill={c2} fontFamily="system-ui, sans-serif">
          {club.short}
        </text>
      </g>
      {/* Estante de troféus */}
      <rect x="236" y="40" width="96" height="3" rx="1.5" fill="#00000066" />
      {Array.from({ length: trophies }, (_, i) => (
        <g key={i} transform={`translate(${246 + i * 19} 40)`}>
          <path d="M-5 -16 H5 V-10 Q5 -5 0 -4 Q-5 -5 -5 -10 Z" fill="#facc15" />
          <rect x="-1" y="-4" width="2" height="2.5" fill="#eab308" />
          <rect x="-3.5" y="-1.8" width="7" height="1.8" rx="0.5" fill="#a16207" />
        </g>
      ))}
      {!trophies && (
        <text x="284" y="35" textAnchor="middle" fontSize="7" fill="#ffffff99" fontFamily="system-ui, sans-serif">
          estante esperando taças
        </text>
      )}
      {/* Quadro de metas */}
      <g transform="translate(30 42)">
        <rect width="70" height="40" rx="3" fill="#f8fafc" opacity="0.92" />
        <rect x="4" y="5" width="34" height="3" rx="1" fill={c1} />
        {[13, 20, 27, 34].map((y, i) => (
          <g key={y}>
            <rect x="4" y={y - 2.5} width="4" height="4" rx="1" fill={i < 2 ? "#22c55e" : "#cbd5e1"} />
            <rect x="11" y={y - 1.5} width={i % 2 ? 40 : 50} height="2.5" rx="1" fill="#94a3b8" />
          </g>
        ))}
      </g>
      {/* Dirigentes */}
      {seats.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          <path d="M-17 22 Q-17 2 0 2 Q17 2 17 22 Z" fill={p.chief ? c1 : i % 2 ? "#334155" : "#1e293b"} />
          <path d="M-4 3 L0 12 L4 3 Z" fill={p.chief ? c2 : "#e2e8f0"} />
          <circle cy="-9" r="10" fill={["#f1c27d", "#c68642", "#e0ac69", "#8d5524", "#ffdbac"][i]} />
          <path d="M-10 -12 Q0 -24 10 -12 Q6 -17 0 -17 Q-6 -17 -10 -12 Z" fill={["#2b1d0e", "#111", "#7c5a3a", "#111", "#9ca3af"][i]} />
          {p.chief && <path d={smile} transform="translate(0 -6)" stroke="#3b2414" strokeWidth="1.4" fill="none" strokeLinecap="round" />}
        </g>
      ))}
      {/* Mesa */}
      <path d="M40 104 L320 104 L344 150 L16 150 Z" fill={`url(#${id}-table)`} />
      <path d="M40 104 L320 104" stroke="#ffffff33" strokeWidth="1.5" />
      {[110, 158, 202, 250].map((x) => (
        <rect key={x} x={x} y="110" width="18" height="12" rx="1.5" fill="#f8fafc" opacity="0.85" transform={`rotate(${x % 3 ? -6 : 5} ${x + 9} 116)`} />
      ))}
      <g transform="translate(180 112)">
        <path d="M-7 -10 H7 V-3 Q7 4 0 5 Q-7 4 -7 -3 Z" fill="#facc15" />
        <rect x="-1.5" y="5" width="3" height="4" fill="#eab308" />
        <rect x="-6" y="9" width="12" height="3" rx="1" fill="#a16207" />
      </g>
    </svg>
  );
}

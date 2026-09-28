/** Gramado vertical com listras e marcações (ataque para cima). */
export function PitchLines() {
  const line = { fill: "none", stroke: "rgba(255,255,255,.55)", strokeWidth: 0.45 };
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "repeating-linear-gradient(180deg, #1c7a43 0 7.14%, #22884b 7.14% 14.28%)",
          boxShadow: "inset 0 0 60px rgb(0 0 0 / .35)",
        }}
      />
      <svg aria-hidden viewBox="0 0 68 105" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <rect x={1.5} y={1.5} width={65} height={102} {...line} />
        <line x1={1.5} y1={52.5} x2={66.5} y2={52.5} {...line} />
        <circle cx={34} cy={52.5} r={9.15} {...line} />
        <circle cx={34} cy={52.5} r={0.6} fill="rgba(255,255,255,.7)" />
        {/* Área adversária (topo) */}
        <rect x={13.84} y={1.5} width={40.32} height={16.5} {...line} />
        <rect x={24.84} y={1.5} width={18.32} height={5.5} {...line} />
        <circle cx={34} cy={12.5} r={0.5} fill="rgba(255,255,255,.7)" />
        <path d="M26.7 18 A9.15 9.15 0 0 0 41.3 18" {...line} />
        {/* Área própria (base) */}
        <rect x={13.84} y={87} width={40.32} height={16.5} {...line} />
        <rect x={24.84} y={98} width={18.32} height={5.5} {...line} />
        <circle cx={34} cy={92.5} r={0.5} fill="rgba(255,255,255,.7)" />
        <path d="M26.7 87 A9.15 9.15 0 0 1 41.3 87" {...line} />
      </svg>
    </>
  );
}

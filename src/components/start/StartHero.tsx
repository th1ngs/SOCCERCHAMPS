/** Marca e chamada da tela inicial (sem estado: pode ser renderizada no servidor). */
export function StartHero() {
  return (
    <header className="relative isolate overflow-hidden pb-8 pt-12 text-center sm:pb-12 sm:pt-20">
      {/* Linhas do gramado, bem discretas, atrás da marca. */}
      <svg
        aria-hidden
        viewBox="0 0 600 300"
        className="absolute left-1/2 top-1/2 -z-10 w-[900px] max-w-none -translate-x-1/2 -translate-y-1/2 text-white/[0.05]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="10" y="10" width="580" height="280" rx="4" />
        <line x1="300" y1="10" x2="300" y2="290" />
        <circle cx="300" cy="150" r="56" />
        <circle cx="300" cy="150" r="3" fill="currentColor" />
        <rect x="10" y="80" width="80" height="140" />
        <rect x="510" y="80" width="80" height="140" />
      </svg>
      <div aria-hidden className="absolute inset-x-0 -top-40 -z-10 mx-auto h-80 max-w-3xl rounded-full bg-gold-400/10 blur-3xl" />

      <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.35em] text-pitch-400 sm:text-sm">Futebol brasileiro • Modo carreira</p>
      <h1 className="font-display font-extrabold uppercase italic leading-[0.85] tracking-tight">
        <span className="block bg-linear-to-b from-gold-300 via-gold-400 to-gold-500 bg-clip-text pr-2 text-[clamp(3rem,13vw,7.5rem)] text-transparent drop-shadow-[0_6px_24px_rgb(234_168_23/0.25)]">
          Soccer Champs
        </span>
        <span className="mt-1 block text-[clamp(1.6rem,6.5vw,3.5rem)] tracking-[0.18em] text-snow">Manager</span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-balance text-base text-mist sm:text-lg">
        Assuma um clube, monte o elenco, revele craques na base e conquiste o Brasil.
      </p>
    </header>
  );
}

import { HeroActions } from "./HeroActions";
import { LiveTicker } from "./LiveTicker";

/** Abertura: noite de estádio, com placar ao vivo animado ao lado da chamada principal. */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Refletores e linhas do gramado ao fundo */}
      <div aria-hidden className="absolute -left-40 -top-40 -z-10 size-[520px] animate-floodlight rounded-full bg-gold-300/10 blur-3xl" />
      <div aria-hidden className="absolute -right-40 top-10 -z-10 size-[520px] animate-floodlight rounded-full bg-info-400/10 blur-3xl [animation-delay:-4s]" />
      <svg aria-hidden viewBox="0 0 1200 600" className="absolute inset-x-0 bottom-0 -z-10 w-full text-white/[0.035]" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M0 600 L300 260 H900 L1200 600" />
        <line x1="600" y1="260" x2="600" y2="600" />
        <ellipse cx="600" cy="400" rx="140" ry="60" />
      </svg>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
        <div className="animate-rise">
          <p className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.3em] text-pitch-400 sm:text-sm">
            <span className="h-px w-8 bg-pitch-400/60" aria-hidden /> Modo carreira • 13 ligas • 432 clubes
          </p>
          <h1 className="mt-4 font-display font-extrabold uppercase italic leading-[0.82] tracking-tight">
            <span className="block text-[clamp(3.2rem,9vw,6.8rem)] text-snow">Seu clube.</span>
            <span className="block bg-linear-to-b from-gold-300 via-gold-400 to-gold-500 bg-clip-text pr-3 text-[clamp(3.2rem,9vw,6.8rem)] text-transparent drop-shadow-[0_6px_28px_rgb(234_168_23/0.3)]">
              Suas regras.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-mist text-pretty">
            Comande um clube em 13 países, da Série C brasileira à Bundesliga. Revele craques na base, feche contratações na janela e assista a cada partida ao vivo.
          </p>
          <div id="login" className="mt-8 scroll-mt-24">
            <HeroActions />
          </div>
        </div>
        <div className="animate-rise [animation-delay:150ms]">
          <LiveTicker />
        </div>
      </div>
    </section>
  );
}

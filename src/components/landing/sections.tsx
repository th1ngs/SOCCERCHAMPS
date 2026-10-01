import Link from "next/link";
import {
  ArrowLeftRight,
  ChevronRight,
  Cloud,
  Flame,
  Gamepad2,
  Landmark,
  Radio,
  Sprout,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { Flag } from "@/components/ui/Flag";
import { LEAGUE_SHOWCASE, STATS, STEPS } from "./content";

/* ---------- Estrutura comum ---------- */
export function Section({ id, eyebrow, title, lead, children, className }: { id?: string; eyebrow: string; title: ReactNode; lead?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:py-24", className)}>
      <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-pitch-400">{eyebrow}</p>
      <h2 className="mt-2 max-w-3xl font-display text-4xl font-extrabold uppercase italic leading-[0.95] text-balance sm:text-5xl">{title}</h2>
      {lead && <p className="mt-4 max-w-2xl text-base text-mist sm:text-lg">{lead}</p>}
      <div className="mt-10">{children}</div>
    </section>
  );
}

/* ---------- Topo ---------- */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/6 bg-ink-900/70 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3" aria-label="Principal">
        <Link href="/" className="whitespace-nowrap font-display text-lg font-extrabold uppercase italic leading-none tracking-tight sm:text-xl">
          <span className="text-gold-400">Soccer Champs</span> <span className="text-snow">Manager</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <div className="hidden items-center gap-1 sm:flex">
            <a href="#ligas" className={buttonClasses("ghost", "sm")}>Ligas</a>
            <Link href="/hall-da-fama" className={buttonClasses("ghost", "sm")}>Hall da Fama</Link>
            <Link href="/arcade" className={buttonClasses("ghost", "sm")}>Arcade</Link>
            <Link href="/multiplayer" className={buttonClasses("ghost", "sm")}>Multiplayer</Link>
          </div>
          <Link href="/#login" className={buttonClasses("primary", "sm")}>Jogar</Link>
        </div>
      </nav>
    </header>
  );
}

/* ---------- Números ---------- */
export function StatsStrip() {
  return (
    <div className="border-y border-white/6 bg-ink-950/60">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-4 py-8 sm:grid-cols-5">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col-reverse text-center">
            <dt className="text-xs uppercase tracking-[0.18em] text-mist">{s.label}</dt>
            <dd className="font-display text-4xl font-extrabold italic text-snow tabular sm:text-5xl">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------- Recursos (bento) ---------- */
function Tile({ icon, title, text, className, children }: { icon: ReactNode; title: string; text: string; className?: string; children?: ReactNode }) {
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-(--radius-card) bg-ink-800 p-5 shadow-card ring-1 ring-inset ring-white/8 transition-colors hover:ring-white/15 sm:p-6", className)}>
      <span className="mb-4 grid size-11 place-items-center rounded-xl bg-white/6 text-gold-400 ring-1 ring-inset ring-white/10 [&_svg]:size-5">{icon}</span>
      <h3 className="font-display text-2xl font-extrabold uppercase italic leading-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-mist sm:text-[15px]">{text}</p>
      {children}
    </article>
  );
}

export function FeatureBento() {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Tile
        icon={<Radio />}
        title="Partida ao vivo"
        text="Narração lance a lance, campo animado, posse e xG. Mexa no time no intervalo, faça substituições e mude o esquema quando o jogo apertar."
        className="md:col-span-4 md:row-span-2 bg-linear-to-br from-pitch-700/50 via-ink-800 to-ink-800"
      >
        <div className="mt-6 grid grid-cols-3 gap-3 text-center" aria-hidden>
          {[["62%", "posse"], ["14", "finalizações"], ["2.31", "xG"]].map(([v, l]) => (
            <div key={l} className="rounded-xl bg-ink-950/50 px-2 py-3 ring-1 ring-inset ring-white/6">
              <div className="font-display text-3xl font-extrabold text-snow tabular">{v}</div>
              <div className="text-xs uppercase tracking-[0.14em] text-mist">{l}</div>
            </div>
          ))}
        </div>
      </Tile>
      <Tile icon={<Sprout />} title="Categorias de base" text="Uma nova safra a cada temporada. Faça peneiras e promova a próxima joia." className="md:col-span-2" />
      <Tile icon={<ArrowLeftRight />} title="Mercado" text="Janelas, contrapropostas e ofertas de clubes de 13 países." className="md:col-span-2" />
      <Tile icon={<Flame />} title="Clássicos" text="Estádio lotado, renda maior e a torcida cobrando o dobro." className="md:col-span-2" />
      <Tile icon={<Landmark />} title="Diretoria" text="Metas a cada temporada. Resultados ruins custam o emprego; campanhas fortes atraem gigantes." className="md:col-span-2" />
      <Tile icon={<Cloud />} title="Na nuvem" text="Salve a carreira e continue em outro aparelho com um código." className="md:col-span-2" />
    </div>
  );
}

/* ---------- Ligas ---------- */
export function LeaguesShowcase() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {LEAGUE_SHOWCASE.map((l) => (
        <li key={l.code} className="flex flex-col rounded-(--radius-card) bg-ink-800 p-5 shadow-card ring-1 ring-inset ring-white/8">
          <div className="flex items-center gap-3">
            <Flag code={l.code} className="h-7 w-auto shrink-0 rounded-[3px] shadow ring-1 ring-black/20" />
            <h3 className="font-display text-2xl font-extrabold uppercase italic leading-none">{l.country}</h3>
            <span className="ml-auto text-sm text-gold-400" aria-label={`Poder financeiro ${l.money} de 5`} title="Poder financeiro">
              R$
              <span className="ml-1 tracking-[-0.1em]">{"●".repeat(l.money)}<span className="text-white/15">{"●".repeat(5 - l.money)}</span></span>
            </span>
          </div>
          <p className="mt-3 text-sm text-mist">{l.tagline}</p>
          <ol className="mt-4 flex flex-col gap-1.5">
            {l.divisions.map((d, i) => (
              <li key={d} className="flex items-center gap-2 text-sm">
                <span className={cn("grid size-5 place-items-center rounded font-display text-xs font-bold", i === 0 ? "bg-gold-400 text-ink-950" : "bg-white/8 text-mist")}>{i + 1}</span>
                <span className={i === 0 ? "font-semibold text-snow" : "text-mist"}>{d}</span>
                <span className="ml-auto text-xs text-mist/70">16 clubes</span>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Como funciona (sequência real: numerada) ---------- */
export function Steps() {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {STEPS.map((s, i) => (
        <li key={s.title} className="relative rounded-(--radius-card) bg-ink-800/60 p-6 ring-1 ring-inset ring-white/8">
          <span className="font-display text-6xl font-extrabold italic leading-none text-gold-400/25 tabular">{String(i + 1).padStart(2, "0")}</span>
          <h3 className="mt-2 font-display text-2xl font-extrabold uppercase italic">{s.title}</h3>
          <p className="mt-2 text-sm text-mist">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Arcade ---------- */
export function ArcadeBand() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-info-500/25 via-ink-800 to-danger-500/20 p-8 ring-1 ring-inset ring-white/10 sm:p-12">
        <svg aria-hidden viewBox="0 0 200 120" className="absolute -right-6 -top-4 h-56 w-auto text-white/[0.06]" fill="currentColor">
          <circle cx="60" cy="60" r="28" />
          <circle cx="130" cy="40" r="22" />
          <circle cx="150" cy="95" r="16" />
        </svg>
        <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-info-400">Modo arcade</p>
        <h2 className="mt-2 max-w-xl font-display text-4xl font-extrabold uppercase italic leading-[0.95] sm:text-5xl">Futebol de botão</h2>
        <p className="mt-3 max-w-lg text-mist">Mire, puxe e solte. Jogue contra a CPU, chame um amigo para uma partida no mesmo aparelho, dispute a Copa arcade ou jogue online 1x1.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/arcade" className={buttonClasses("secondary", "lg")}>
            <Gamepad2 /> Jogar arcade
          </Link>
          <Link href="/multiplayer" className={buttonClasses("primary", "lg")}>
            <Users /> Multiplayer 1x1
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Chamada final e rodapé ---------- */
export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/6 px-4 py-20 text-center sm:py-28">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-3xl rounded-full bg-gold-400/12 blur-3xl" />
      <Trophy className="mx-auto size-10 text-gold-400" aria-hidden />
      <h2 className="mx-auto mt-4 max-w-3xl font-display text-5xl font-extrabold uppercase italic leading-[0.9] text-balance sm:text-6xl">
        A próxima temporada começa agora
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-mist">Grátis, direto no navegador, no computador ou no celular.</p>
      <Link href="/#login" className={buttonClasses("primary", "lg", false, "mt-8")}>
        Escolher meu clube <ChevronRight />
      </Link>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/6 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-mist sm:flex-row">
        <p>
          <span className="font-display font-bold uppercase italic text-snow">Soccer Champs Manager</span> • clubes, jogadores e competições fictícios.
        </p>
        <div className="flex gap-4">
          <Link href="/hall-da-fama" className="hover:text-snow">Hall da Fama</Link>
          <Link href="/arcade" className="hover:text-snow">Arcade</Link>
          <Link href="/multiplayer" className="hover:text-snow">Multiplayer</Link>
          <Link href="/nova-carreira" className="hover:text-snow">Nova carreira</Link>
          <Link href="/nova-carreira?modo=jogador" className="hover:text-snow">Carreira de jogador</Link>
        </div>
      </div>
    </footer>
  );
}

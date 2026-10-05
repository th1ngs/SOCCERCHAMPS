"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, IdCard } from "lucide-react";
import { LEAGUES, MONTHS, NATION_KITS, divisionName, fanEvent, nextCeremony, recordBreak, titleName } from "@/game";
import type { AwardPlayer, Ceremony, MonthAward } from "@/game/types";
import { Audio } from "@/arcade/audio";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";
import { cn } from "@/lib/cn";
import { AwardIcon } from "./AwardIcon";
import { FansView } from "./FansView";
import { RecordView } from "./RecordView";

function useStage(onClose: () => void) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    Audio.init();
    Audio.goal();
    ref.current?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return ref;
}

function Line({ p, label }: { p: AwardPlayer; label?: string }) {
  const { world: w } = useWorld();
  const club = w.clubs[p.club];
  const mine = p.club === w.userClub;
  return (
    <li className={cn("flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm ring-1 ring-inset", mine ? "bg-gold-400/10 ring-gold-400/40" : "bg-white/5 ring-white/8")}>
      <PlayerAvatar player={p} size={28} />
      <span className="min-w-0 flex-1">
        <b className="block truncate">{p.name}</b>
        <span className="flex items-center gap-1 text-xs text-mist">{club && <Crest club={club} size={12} />} <span className="truncate">{club?.name}</span></span>
      </span>
      <span className="shrink-0 text-right text-xs text-mist">
        {label && <span className="block text-[10px] uppercase tracking-wider text-gold-300">{label}</span>}
        {p.goals}G {p.assists}A • {p.avg.toFixed(2)}
      </span>
    </li>
  );
}

/** Jogador do Mês: folha do calendário virando, o premiado com estatísticas do mês, os indicados e o técnico do mês. */
function MonthAwardView({ a, onClose }: { a: MonthAward; onClose: () => void }) {
  const { world: w, setOverlay } = useWorld();
  const ref = useStage(onClose);
  const p = a.player;
  const club = w.clubs[p.club];
  const mine = p.club === w.userClub;
  const coachMine = a.manager?.club === w.userClub;
  const [c1, c2] = club?.colors ?? ["#1e3a8a", "#facc15"];
  return (
    <div role="dialog" aria-modal="true" aria-label={`Jogador do mês: ${p.name}`} className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4" style={{ background: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${c1} 45%, #07121f) 0%, #07121f 72%)` }}>
      <span aria-hidden className="animate-celebrate-rays pointer-events-none fixed left-1/2 top-[30%] -ml-[80vmax] -mt-[80vmax] size-[160vmax] opacity-10" style={{ background: `repeating-conic-gradient(from 0deg, ${c2} 0deg 5deg, transparent 5deg 15deg)` }} />
      {(mine || coachMine) && <Confetti seed={a.month + a.season} colors={[c1, c2, "#facc15", "#fff"]} count={48} duration={3} />}
      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <div className="animate-calendar-flip w-28 overflow-hidden rounded-xl bg-snow text-ink-950 shadow-2xl">
          <div className="bg-danger-500 py-1 font-display text-xs font-extrabold uppercase tracking-widest text-white">{MONTHS[a.month]}</div>
          <div className="py-1 font-display text-3xl font-extrabold">{a.year ?? a.season}</div>
        </div>
        <p className="animate-slide-up mt-3 font-display text-sm font-bold uppercase tracking-[0.25em] text-gold-300" style={{ animationDelay: "250ms" }}>Jogador do mês • {divisionName(a.div)}</p>
        <div className="animate-reveal-flip relative mt-4 w-full rounded-3xl bg-gradient-to-b from-gold-300 via-gold-500 to-amber-700 p-[3px] shadow-[0_20px_60px_rgb(250_204_21/0.3)]" style={{ animationDelay: "450ms" }}>
          <div className="rounded-[calc(1.5rem-3px)] bg-ink-900/95 p-5">
            <div className="flex items-center justify-center gap-4">
              <PlayerAvatar player={p} size={96} className="ring-4 ring-gold-400/80" />
              <AwardIcon icon="star" className="animate-trophy-lift size-16" />
            </div>
            <h2 className="mt-3 font-display text-3xl font-extrabold uppercase leading-tight">{p.name}</h2>
            {club && <p className="mt-1 flex items-center justify-center gap-2 text-sm text-mist"><Crest club={club} size={20} /> {club.name}</p>}
            <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[["Jogos", p.apps], ["Gols", p.goals], ["Assist.", p.assists], ["Nota", p.avg.toFixed(2)]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/6 py-2">
                  <dt className="text-[10px] uppercase tracking-wider text-mist">{k}</dt>
                  <dd className="font-display text-xl font-extrabold tabular text-snow">{v}</dd>
                </div>
              ))}
            </dl>
            {mine && <span className="animate-stamp mt-4 inline-block rounded-lg border-2 border-gold-400 px-3 py-0.5 font-display text-lg font-extrabold uppercase italic text-gold-400" style={{ animationDelay: "1s" }}>É do seu elenco!</span>}
          </div>
        </div>
        <ul className="animate-slide-up mt-4 grid w-full gap-1.5" style={{ animationDelay: "1.1s" }}>
          {a.nominees.slice(1).map((n) => <Line key={n.id} p={n} label="Indicado" />)}
          {a.young && a.young.id !== p.id && <Line p={a.young} label="Revelação do mês" />}
        </ul>
        {a.manager && (
          <p className={cn("animate-slide-up mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-inset", coachMine ? "bg-gold-400/10 ring-gold-400/40" : "bg-white/5 ring-white/8")} style={{ animationDelay: "1.25s" }}>
            <AwardIcon icon="clipboard" className="size-7 shrink-0" />
            <span className="text-left">
              Técnico do mês: <b>{coachMine ? `${a.manager.name} (você!)` : a.manager.name}</b>
              <span className="block text-xs text-mist">{w.clubs[a.manager.club]?.name} • {a.manager.pts} pontos em {a.manager.j} jogos</span>
            </span>
          </p>
        )}
        <div className="animate-slide-up mt-5 flex flex-wrap justify-center gap-2" style={{ animationDelay: "1.4s" }}>
          {w.players[p.id] && (
            <Button variant="secondary" icon={<IdCard />} onClick={() => { onClose(); setOverlay({ kind: "player", pid: p.id }); }}>Ver ficha</Button>
          )}
          <Button ref={ref} variant="primary" icon={<ChevronRight />} onClick={onClose}>Continuar</Button>
        </div>
      </div>
    </div>
  );
}

/** Comemoração de título: taça subindo nas cores do clube, fogos e o nome da competição. */
function TitleView({ c, onClose }: { c: Extract<Ceremony, { kind: "title" }>; onClose: () => void }) {
  const { world: w } = useWorld();
  const ref = useStage(onClose);
  const club = w.clubs[c.club];
  const [c1, c2] = club?.colors ?? ["#1e3a8a", "#facc15"];
  const name = titleName(c.comp);
  return (
    <div role="dialog" aria-modal="true" aria-label={`Campeão: ${name}`} className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4" style={{ background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${c1} 60%, #07121f) 0%, #050b14 75%)` }}>
      <span aria-hidden className="animate-celebrate-rays pointer-events-none fixed left-1/2 top-[40%] -ml-[80vmax] -mt-[80vmax] size-[160vmax] opacity-20" style={{ background: `repeating-conic-gradient(from 0deg, ${c2} 0deg 6deg, transparent 6deg 16deg)` }} />
      <Confetti seed={c.season + name.length} colors={[c1, c2, "#facc15", "#ffffff"]} count={70} duration={3.6} />
      <div className="relative flex max-w-md flex-col items-center text-center">
        <span className="animate-stamp font-display text-6xl font-extrabold uppercase italic text-gold-400 drop-shadow-[0_4px_0_rgb(0_0_0/0.4)] sm:text-7xl">Campeão!</span>
        <div className="relative mt-4 size-48 sm:size-56">
          <span aria-hidden className="animate-glow-pulse absolute inset-6 rounded-full bg-gold-300/40 blur-3xl" />
          <AwardIcon icon="trophy" className="animate-trophy-lift relative size-full drop-shadow-[0_20px_40px_rgb(250_204_21/0.5)]" />
        </div>
        {club && <Crest club={club} size={64} className="animate-celebrate-in -mt-4" />}
        <h2 className="animate-slide-up mt-3 font-display text-3xl font-extrabold uppercase leading-tight" style={{ animationDelay: "0.9s" }}>{name} {c.season}</h2>
        <p className="animate-slide-up mt-1 text-mist" style={{ animationDelay: "1.05s" }}>O {club?.name} levanta a taça! A torcida invade as ruas e a diretoria está radiante.</p>
        <Button ref={ref} variant="primary" size="lg" icon={<ChevronRight />} className="animate-slide-up mt-6" style={{ animationDelay: "1.3s" }} onClick={onClose}>
          Comemorar e continuar
        </Button>
      </div>
    </div>
  );
}

/** Convocação para a seleção de base: cartões das promessas com a camisa da seleção. */
function CallupView({ c, onClose }: { c: Extract<Ceremony, { kind: "callup" }>; onClose: () => void }) {
  const { world: w, setOverlay } = useWorld();
  const ref = useStage(onClose);
  const list = c.ids.map((id, i) => ({ p: w.players[id], cat: c.cats[i] })).filter((x) => !!x.p);
  const nat = list[0]?.p.nat ?? "bra";
  const [k1, k2] = NATION_KITS[nat]?.colors ?? ["#facc15", "#16a34a"];
  return (
    <div role="dialog" aria-modal="true" aria-label="Promessas convocadas" className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4" style={{ background: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${k2} 45%, #07121f) 0%, #07121f 72%)` }}>
      <span aria-hidden className="animate-celebrate-rays pointer-events-none fixed left-1/2 top-[30%] -ml-[80vmax] -mt-[80vmax] size-[160vmax] opacity-15" style={{ background: `repeating-conic-gradient(from 0deg, ${k1} 0deg 5deg, transparent 5deg 15deg)` }} />
      <Confetti seed={c.season + list.length} colors={[k1, k2, "#ffffff"]} count={44} duration={3} />
      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <span className="animate-stamp rounded-xl border-4 border-gold-400 bg-ink-950/70 px-4 py-1 font-display text-4xl font-extrabold uppercase italic text-gold-400">Convocado{list.length > 1 ? "s" : ""}!</span>
        <p className="animate-slide-up mt-3 text-mist" style={{ animationDelay: "250ms" }}>Promessas da sua base chamadas para as seleções de base.</p>
        <ul className="mt-5 grid w-full gap-3">
          {list.map(({ p, cat }, i) => {
            const kit = NATION_KITS[p.nat];
            return (
              <li key={p.id} className="animate-reveal-flip flex items-center gap-3 rounded-2xl bg-ink-900/90 p-3 text-left ring-2 ring-inset" style={{ animationDelay: `${450 + i * 250}ms`, borderColor: kit?.colors[0], boxShadow: `inset 0 0 0 2px ${kit?.colors[0] ?? "#facc15"}` }}>
                <PlayerAvatar player={p} size={56} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-lg">{p.name}</b>
                  <span className="block text-sm text-mist">{p.age} anos • {p.pos} • overall {Math.round(p.ovr)}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-gold-300">
                    <Flag code={p.nat} /> Seleção {cat === "sub17" ? "Sub-17" : "Sub-20"} • {LEAGUES[p.nat]?.country}
                  </span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => { onClose(); setOverlay({ kind: "player", pid: p.id }); }}>Ficha</Button>
              </li>
            );
          })}
        </ul>
        <p className="animate-slide-up mt-3 text-xs text-mist" style={{ animationDelay: "900ms" }}>Moral +6 e mais valor de mercado; às vezes a experiência rende um ponto de potencial.</p>
        <Button ref={ref} variant="primary" icon={<ChevronRight />} className="animate-slide-up mt-5" style={{ animationDelay: "1s" }} onClick={onClose}>Continuar</Button>
      </div>
    </div>
  );
}

/** Mostra a primeira cerimônia da fila (prêmio do mês ou título). `onClose` a tira da fila e segue o fluxo. */
export function CeremonyHost({ onClose }: { onClose: () => void }) {
  const { world: w } = useWorld();
  const c = nextCeremony(w);
  if (!c) return null;
  if (c.kind === "title") return <TitleView key={`${c.comp}-${c.season}`} c={c} onClose={onClose} />;
  if (c.kind === "fans") {
    const ev = fanEvent(w, c.id);
    const club = w.clubs[w.torcida?.club ?? w.userClub];
    if (!ev || !club) return <Skip onClose={onClose} />;
    return <FansView key={ev.id} club={club} group={w.torcida?.group ?? "Torcida"} ev={ev} onClose={onClose} />;
  }
  if (c.kind === "callup") return <CallupView key={`callup-${c.season}`} c={c} onClose={onClose} />;
  if (c.kind === "record") {
    const b = recordBreak(w, c.id);
    return b ? <RecordView key={b.id} b={b} onClose={onClose} /> : <Skip onClose={onClose} />;
  }
  const a = w.monthAwards?.find((x) => x.id === c.id);
  if (!a) return <Skip onClose={onClose} />;
  return <MonthAwardView key={a.id} a={a} onClose={onClose} />;
}

/** Cerimônia sem dados (prêmio apagado): segue o fluxo. */
function Skip({ onClose }: { onClose: () => void }) {
  useEffect(() => { onClose(); }, [onClose]);
  return null;
}

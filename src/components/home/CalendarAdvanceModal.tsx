"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, ArrowRight, BedDouble, CalendarDays, Dumbbell, FastForward, Megaphone, Sparkles, Stethoscope, Swords, Trophy } from "lucide-react";
import { advanceCalendarDay, calendarDate, currentWeek, DAY_ACTIVITY, DAY_NAMES, simulateWeek } from "@/game";
import type { Message, World } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { calendarHighlights, messageEvent, type CalendarEvent } from "./calendarEvents";

const toneClass = {
  gold: "border-gold-400/40 bg-gold-400/10 text-gold-300",
  green: "border-pitch-400/35 bg-pitch-500/10 text-pitch-300",
  blue: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  red: "border-danger-400/40 bg-danger-500/10 text-danger-300",
};

const condition = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

/** Passagem animada até domingo; todos os efeitos de treino são aplicados antes do pré-jogo. */
export function CalendarAdvanceModal() {
  const { world: w, mutate, setOverlay } = useWorld();
  const [initial] = useState(() => calendarHighlights(w));
  const [scheduled] = useState<CalendarEvent[]>(initial.events);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [day, setDay] = useState(w.day);
  const [done, setDone] = useState(w.day >= 6);
  const [dailyText, setDailyText] = useState("Acompanhe a preparação do elenco até o dia do jogo.");
  const latestMessageId = useRef(initial.latestMessageId);
  const stopped = useRef(false);
  const finished = useRef(false);
  const draft = useRef<World | null>(null);
  const startDay = useRef(w.day);
  const match = currentWeek(w)?.matches.find((fixture) => fixture.h === w.userClub || fixture.a === w.userClub);
  const opponent = match ? w.clubs[match.h === w.userClub ? match.a : match.h] : null;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const advanced = draft.current;
    if (advanced) mutate((world) => {
      Object.assign(world, advanced);
      world.calendarSeenMessageId = Math.max(world.calendarSeenMessageId ?? 0, latestMessageId.current);
    });
    setDone(true);
  }, [mutate]);

  const step = useCallback(() => {
    const world = draft.current ?? (draft.current = structuredClone(w));
    if (world.day >= 6) { finish(); return; }
    const passedDay = world.day;
    const squad = world.clubs[world.userClub]?.squad ?? [];
    const before = condition(squad.map((id) => world.players[id]?.fitness ?? 0));
    const previousMessageId = latestMessageId.current;
    if (!advanceCalendarDay(world)) { finish(); return; }
    const offset = passedDay - startDay.current;
    const remaining = 6 - startDay.current;
    const revealed = scheduled.filter((_, index) => Math.floor(index * remaining / Math.max(1, scheduled.length)) === offset);
    if (revealed.length) setEvents((items) => [...items, ...revealed].slice(-10));
    const after = condition(squad.map((id) => world.players[id]?.fitness ?? 0));
    const fresh = world.inbox.filter((message: Message) => message.id > previousMessageId).reverse();
    if (fresh.length) {
      latestMessageId.current = Math.max(previousMessageId, ...fresh.map((message) => message.id));
      setEvents((items) => [...items, ...fresh.map(messageEvent)].slice(-10));
    }
    const gained = Math.max(0, Math.round(after - before));
    setDailyText(`${DAY_NAMES[passedDay]}: ${DAY_ACTIVITY[passedDay].toLowerCase()} concluído. Condição média ${gained ? `+${gained}` : "estável"}${gained ? " pontos" : ""}${fresh.some((message) => message.kind === "medical") ? " • Há notícia do departamento médico." : "."}`);
    setDay(world.day);
    if (world.day >= 6) finish();
  }, [w, finish, scheduled]);

  useEffect(() => {
    if (done) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 100 : events.at(-1)?.tone === "gold" ? 1900 : 850;
    const timer = window.setTimeout(() => { if (!stopped.current) step(); }, delay);
    return () => window.clearTimeout(timer);
  }, [day, done, events, step]);

  const skip = () => {
    stopped.current = true;
    while ((draft.current?.day ?? w.day) < 6) step();
  };

  const continueToMatch = () => {
    if (match && !match.played) setOverlay({ kind: "prematch", matchId: match.id });
    else {
      mutate((world) => simulateWeek(world));
      setOverlay({ kind: "weekResults" });
    }
  };

  const date = calendarDate(w.season, w.week, day);
  const activity = day === 6 && !match ? "Folga" : DAY_ACTIVITY[day];
  const ActivityIcon = day === 6 ? match ? Swords : BedDouble : activity === "Treino" ? Dumbbell : BedDouble;

  return (
    <Modal open dismissible={false} size="xl" title={<span className="flex items-center gap-2"><CalendarDays className="size-6 text-gold-400" /> Passagem do calendário</span>}
      footer={done ? <>
        <Button variant="secondary" onClick={() => setOverlay(null)}>Revisar elenco</Button>
        <Button variant="primary" size="lg" iconRight={<ArrowRight />} onClick={continueToMatch} data-autofocus>{match ? "Ir para o jogo" : "Ver resultados"}</Button>
      </> : <Button variant="ghost" icon={<FastForward />} onClick={skip}>Pular animação</Button>}
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-linear-to-br from-pitch-900/90 via-ink-800 to-ink-900 p-4 ring-1 ring-gold-400/20 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div key={day} className="animate-calendar-flip" aria-live="polite">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Semana {w.week} • {DAY_NAMES[day]}</span>
              <div className="mt-1 font-display text-5xl font-extrabold tabular text-snow sm:text-7xl">{String(date.getUTCDate()).padStart(2, "0")}<span className="text-gold-400">/</span>{String(date.getUTCMonth() + 1).padStart(2, "0")}</div>
              <span className="mt-2 flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide"><ActivityIcon className="size-5 text-gold-400" /> {activity}</span>
            </div>
            <div className="rounded-xl bg-ink-950/60 px-3 py-2 text-right text-xs text-mist ring-1 ring-white/10">
              <span className="block font-bold uppercase text-gold-300">Domingo</span>
              <span className="block max-w-36 truncate">{match ? opponent?.name ?? "Jogo" : "Sem jogo do clube"}</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Progresso da semana">
            {DAY_NAMES.map((name, index) => (
              <div key={name} className={cn("h-2 rounded-full transition-colors duration-500", index < day ? "bg-pitch-400" : index === day ? "bg-gold-400 shadow-[0_0_12px_rgb(245_190_68/0.65)]" : "bg-white/15")} />
            ))}
          </div>
          <p className="mt-3 min-h-5 text-sm text-snow/85" role="status">{done ? match ? `Dia de jogo: ${opponent?.name ?? "adversário"}. A preparação terminou.` : "Domingo chegou. Veja os resultados da rodada." : dailyText}</p>
        </div>

        <section>
          <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-gold-400"><Sparkles className="size-4" /> Acontecimentos</div>
          {events.length ? (
            <ol className="grid gap-2 sm:grid-cols-2">
              {events.map((event) => (
                <li key={event.id} className={cn("animate-rise rounded-xl border p-3", toneClass[event.tone])}>
                  <div className="flex items-center gap-2 font-display text-sm font-bold uppercase">
                    {event.tone === "gold" ? <Trophy className="size-4 shrink-0" aria-hidden /> : event.tone === "green" ? <ArrowLeftRight className="size-4 shrink-0" aria-hidden /> : event.tone === "red" ? <Stethoscope className="size-4 shrink-0" aria-hidden /> : <Megaphone className="size-4 shrink-0" aria-hidden />}
                    {event.title}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-snow/85">{event.body}</p>
                </li>
              ))}
            </ol>
          ) : <p className="rounded-xl bg-white/5 px-3 py-4 text-sm text-mist">{done ? "Sem notícias importantes nesta semana. O elenco segue se preparando." : "Os acontecimentos aparecem conforme os dias passam."}</p>}
        </section>
      </div>
    </Modal>
  );
}

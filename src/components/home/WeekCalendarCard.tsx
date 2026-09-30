"use client";

import { BedDouble, CalendarDays, Dumbbell, FastForward, Swords } from "lucide-react";
import { advanceCalendarDay, calendarDate, currentWeek, DAY_ACTIVITY, DAY_NAMES } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/** Agenda visível da preparação e do jogo desta semana. */
export function WeekCalendarCard() {
  const { world: w, mutate } = useWorld();
  if (w.week === 0 || w.pendingSeason) return null;
  const match = currentWeek(w)?.matches.find((m) => m.h === w.userClub || m.a === w.userClub);
  const opponent = match ? w.clubs[match.h === w.userClub ? match.a : match.h] : null;
  return (
    <Card title={<span className="flex items-center gap-2"><CalendarDays className="size-4" /> Calendário da semana</span>} className="md:col-span-2 xl:col-span-3">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Agenda de segunda a domingo">
        {DAY_NAMES.map((dayName, index) => {
          const date = calendarDate(w.season, w.week, index);
          const activity = index === 6 && !match ? "Folga" : DAY_ACTIVITY[index];
          const Icon = index === 6 ? match ? Swords : BedDouble : activity === "Treino" ? Dumbbell : BedDouble;
          const today = index === w.day;
          return (
            <div key={dayName} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center ring-1 ring-inset sm:px-2", today ? "bg-gold-400/15 ring-gold-400/70" : index < w.day ? "bg-pitch-500/8 ring-pitch-500/20" : "bg-ink-900/60 ring-white/8")} aria-current={today ? "date" : undefined}>
              <span className={cn("font-display text-xs font-bold uppercase", today ? "text-gold-400" : "text-mist")}>{dayName}</span>
              <span className="text-[11px] tabular text-mist">{String(date.getUTCDate()).padStart(2, "0")}/{String(date.getUTCMonth() + 1).padStart(2, "0")}</span>
              <Icon className={cn("size-4", index === 6 && match ? "text-gold-400" : activity === "Treino" ? "text-pitch-400" : "text-sky-300")} aria-hidden />
              <span className="truncate text-[10px] font-semibold sm:text-xs">{activity}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-mist">
        {w.day < 6 ? "Treinos desenvolvem os jogadores; descansos recuperam o condicionamento." : match ? `Dia de jogo contra ${opponent?.name ?? "o adversário"}.` : "Domingo de folga para o seu clube."}
      </p>
      {w.day < 6 && (
        <Button variant="ghost" size="sm" icon={<FastForward />} className="mt-2" onClick={() => mutate((world) => { while (world.day < 6) advanceCalendarDay(world); })}>
          Simular até domingo
        </Button>
      )}
    </Card>
  );
}

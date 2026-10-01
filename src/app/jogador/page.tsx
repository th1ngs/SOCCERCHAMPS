"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Dumbbell, HeartPulse, Shield } from "lucide-react";
import {
  ATTRS, INTENSITY, attr, career, careerFocusOptions, careerNextMatch, careerPlayer, careerTablePos, competitionName, roleAt, setCareerTraining, windowOpen,
} from "@/game";
import type { CareerFocus, CareerIntensity } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Card, Meter } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { useCareerFlow } from "@/components/playercareer/PlayerShell";
import { ReportBody } from "@/components/playercareer/MatchReportModal";

const TONE = { good: "border-pitch-400", bad: "border-danger-500", info: "border-white/15", gold: "border-gold-400" } as const;

/** Semana do jogador: próximo jogo, situação com o técnico, treino e último jogo. */
export default function CareerWeekPage() {
  const { world: w, version, mutate } = useWorld();
  const flow = useCareerFlow();
  const c = career(w);
  const p = careerPlayer(w);

  const d = useMemo(() => {
    void version;
    if (!p || !c) return null;
    const club = p.clubId ? w.clubs[p.clubId] : null;
    const next = careerNextMatch(w);
    const opp = next && club ? w.clubs[next.h === club.id ? next.a : next.h] : null;
    const role = club ? roleAt(w, p, club) : null;
    const chance = !club ? null : p.inj ? "Lesionado" : p.susp ? "Suspenso" : role === "titular" || (role === "rotacao" && c.trust >= 55) ? "Provável titular" : role === "rotacao" || c.trust >= 70 ? "Briga por vaga" : "Deve começar no banco";
    return { club, next, opp, chance, pos: careerTablePos(w) };
  }, [w, version, p, c]);
  if (!c || !p || !d) return null;

  const setFocus = (focus: CareerFocus) => mutate((x) => setCareerTraining(x, focus, c.intensity));
  const setIntensity = (it: CareerIntensity) => mutate((x) => setCareerTraining(x, c.focus, it));
  const trustTone = c.trust >= 70 ? "text-pitch-400" : c.trust >= 45 ? "text-snow" : "text-danger-400";

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Semana</h1>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Próximo jogo: foco da tela */}
        <Card tone="highlight" title={d.next ? `Próximo jogo • ${competitionName(d.next.comp)}` : "Próximo passo"}>
          {d.next && d.club && d.opp ? (
            <div className="flex items-center gap-3 py-2 sm:gap-6 sm:py-4">
              {[d.next.h === d.club.id ? d.club : d.opp, d.next.h === d.club.id ? d.opp : d.club].map((club, i) => (
                <div key={club.id} className={cn("flex min-w-0 flex-1 flex-col items-center gap-2 text-center", i === 1 && "order-3")}>
                  <Crest club={club} size={72} />
                  <span className="w-full truncate font-display text-lg font-extrabold uppercase sm:text-2xl">{club.name}</span>
                  {club.id === d.club?.id && <span className="-mt-1 text-xs font-bold uppercase tracking-wider text-gold-400">Seu time</span>}
                </div>
              ))}
              <span className="order-2 font-display text-4xl font-extrabold italic text-gold-400">VS</span>
            </div>
          ) : (
            <p className="py-6 text-center text-mist">
              {!d.club ? "Você está sem clube. Escolha uma proposta para voltar a jogar." : w.week === 0 ? `Pré-temporada de ${w.season}. Prepare-se e comece a temporada.` : "Sem jogo do seu time nesta semana: treine e avance."}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Fact label="Situação">{d.chance ?? "—"}</Fact>
            <Fact label="Confiança do técnico"><span className={trustTone}>{Math.round(c.trust)}</span><Meter value={c.trust} className="ml-2 w-12" /></Fact>
            <Fact label="Condição"><HeartPulse className="size-4 text-mist" />{Math.round(p.fitness)}%</Fact>
            <Fact label="Time na tabela">{d.pos ? `${d.pos}º` : "—"}</Fact>
          </div>
          {!d.club ? (
            <Link href="/jogador/propostas" className={buttonClasses("primary", "lg", true, "mt-4")}>Ver propostas <ChevronRight /></Link>
          ) : (
            flow.label && <Button variant="primary" size="lg" block className="mt-4" onClick={flow.advance} disabled={!!w.pendingSeason} iconRight={<ChevronRight />}>{flow.label}</Button>
          )}
          {windowOpen(w) && c.offers.length > 0 && (
            <Link href="/jogador/propostas" className="mt-3 block text-center text-sm font-semibold text-gold-400 hover:underline">
              {c.offers.length} proposta{c.offers.length > 1 ? "s" : ""} na mesa
            </Link>
          )}
        </Card>

        {/* Treino da semana */}
        <Card title={<span className="flex items-center gap-2"><Dumbbell className="size-4" /> Treino da semana</span>}>
          <span className="mb-1.5 block text-sm font-semibold">Foco</span>
          <div role="radiogroup" aria-label="Foco do treino" className="grid grid-cols-3 gap-1.5">
            {careerFocusOptions(p.pos).map((f) => {
              const on = c.focus === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setFocus(f)}
                  className={cn("rounded-xl px-2 py-2 text-left ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400", on ? "bg-gold-400/15 ring-gold-400/70" : "bg-ink-950/50 ring-white/8 hover:bg-white/6")}
                >
                  <span className={cn("block text-xs font-bold", on ? "text-gold-400" : "text-snow")}>{f === "geral" ? "Geral" : ATTRS[f].name}</span>
                  <span className="block text-[11px] text-mist tabular">{f === "geral" ? "+25% evolução" : attr(p, f)}</span>
                </button>
              );
            })}
          </div>
          <span className="mb-1.5 mt-4 block text-sm font-semibold">Intensidade</span>
          <Segmented
            ariaLabel="Intensidade do treino"
            size="sm"
            value={c.intensity}
            onChange={setIntensity}
            className="flex w-full"
            options={(Object.keys(INTENSITY) as CareerIntensity[]).map((k) => ({ value: k, label: INTENSITY[k].name }))}
          />
          <p className="mt-1.5 text-xs text-mist">{INTENSITY[c.intensity].desc}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Último jogo">
          {c.last ? <ReportBody report={c.last} /> : <p className="text-sm text-mist">Nenhum jogo ainda nesta carreira.</p>}
        </Card>
        <Card title={<span className="flex items-center gap-2"><Shield className="size-4" /> Linha do tempo</span>}>
          <ol className="space-y-1.5">
            {c.log.slice(0, 8).map((e, i) => (
              <li key={i} className={cn("border-l-2 pl-3 text-sm", TONE[e.tone])}>
                <span className="block text-[11px] uppercase tracking-wider text-mist">{e.season} • semana {e.week}</span>
                {e.text}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-ink-950/40 px-3 py-2 ring-1 ring-inset ring-white/6">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-mist">{label}</span>
      <span className="mt-0.5 flex min-h-6 items-center gap-1.5 text-sm font-semibold tabular">{children}</span>
    </div>
  );
}

"use client";

import { Briefcase, Check, Send, X } from "lucide-react";
import { MAX_APPLICATIONS, acceptJob, applyForJob, chanceLabel, clubStars, declineJob, divisionFullName, jobChance, managerRep } from "@/game";
import type { JobApplication } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { useCareerMoves } from "@/components/flow/useCareerMoves";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { useToast } from "@/components/ui/Toast";
import { Badge, Card, EmptyState, Stars, type BadgeTone } from "@/components/ui/primitives";

const STATUS: Record<JobApplication["status"], { label: string; tone: BadgeTone }> = {
  pending: { label: "Em análise", tone: "blue" },
  offer: { label: "Proposta!", tone: "green" },
  rejected: { label: "Recusado", tone: "red" },
  accepted: { label: "Aceita", tone: "gold" },
  declined: { label: "Você recusou", tone: "neutral" },
  expired: { label: "Expirou", tone: "neutral" },
};
const CHANCE_TONE: Record<string, BadgeTone> = { Alta: "green", Média: "orange", Baixa: "red", Remota: "red" };

/** Vagas de treinador: reputação, propostas recebidas e o quadro de vagas abertas com candidatura. */
export function VacanciesCard() {
  const { world: w, mutate } = useWorld();
  const toast = useToast();
  const { takeJob } = useCareerMoves();
  const rep = managerRep(w);
  const apps = w.applications ?? [];
  const offers = apps.filter((a) => a.status === "offer" && w.clubs[a.club]);
  const vacancies = (w.vacancies ?? []).filter((v) => v.club !== w.userClub && w.clubs[v.club]);
  const appOf = (club: string) => apps.filter((a) => a.club === club).at(-1);
  const pending = apps.filter((a) => a.status === "pending").length;

  const apply = (club: string) => {
    let err: string | null = null;
    mutate((x) => { err = applyForJob(x, club); });
    if (err) toast(err, "bad");
    else toast(`Candidatura enviada ao ${w.clubs[club].name}. Resposta na próxima semana.`, "good");
  };
  const accept = (club: string) => {
    mutate((x) => void acceptJob(x, club));
    takeJob(club);
  };

  return (
    <Card id="vagas" title="Vagas de treinador" action={<Briefcase className="size-5 text-mist" aria-hidden />} className="scroll-mt-24 lg:col-span-2">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>
          Sua reputação: <b className="font-display text-lg text-gold-300 tabular">{rep}</b>
          <span className="text-mist">/100</span>
        </span>
        <span className="text-xs text-mist">Títulos, metas cumpridas e o tamanho do clube aumentam a reputação. Até {MAX_APPLICATIONS} candidaturas em análise ({pending} agora).</span>
      </div>

      {offers.length > 0 && (
        <ul className="mb-4 space-y-2">
          {offers.map((a) => {
            const c = w.clubs[a.club];
            return (
              <li key={a.club} className="flex flex-wrap items-center gap-3 rounded-xl bg-pitch-500/10 p-3 ring-1 ring-inset ring-pitch-400/40">
                <Crest club={c} size={36} />
                <span className="min-w-0 flex-1">
                  <b className="block">Proposta do {c.name}</b>
                  <span className="text-xs text-mist">{divisionFullName(c.div)} • vale até a semana {a.expires}</span>
                </span>
                <Button variant="primary" size="sm" icon={<Check />} onClick={() => accept(a.club)}>Aceitar</Button>
                <Button variant="ghost" size="sm" icon={<X />} onClick={() => mutate((x) => declineJob(x, a.club))}>Recusar</Button>
              </li>
            );
          })}
        </ul>
      )}

      {vacancies.length ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {vacancies.map((v) => {
            const c = w.clubs[v.club];
            const p = jobChance(w, c.id);
            const label = chanceLabel(p);
            const a = appOf(c.id);
            const applied = !!a && a.season === w.season;
            return (
              <li key={v.club} className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl bg-ink-950/50 p-3 ring-1 ring-inset ring-white/8 sm:flex-nowrap">
                <Crest club={c} size={34} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <Flag code={c.league} />
                    <b className="truncate">{c.name}</b>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-mist">
                    {divisionFullName(c.div)} <Stars value={clubStars(w, c)} className="text-[11px]" />
                  </span>
                  <span className="block truncate text-xs text-mist">{v.reason}</span>
                </span>
                <span className="flex w-full items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:flex-col sm:items-end">
                  <Badge tone={CHANCE_TONE[label]} title={`Chance estimada: ${Math.round(p * 100)}%`}>Chance {label.toLowerCase()}</Badge>
                  {applied ? (
                    <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
                  ) : (
                    <Button variant="secondary" size="sm" icon={<Send />} onClick={() => apply(c.id)} disabled={pending >= MAX_APPLICATIONS}>
                      Candidatar-se
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState>Nenhuma vaga aberta agora. O quadro muda a cada 5 semanas.</EmptyState>
      )}
    </Card>
  );
}

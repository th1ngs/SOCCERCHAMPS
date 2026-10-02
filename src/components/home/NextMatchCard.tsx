"use client";

import { useMemo } from "react";
import { ChevronRight, Flame, Users } from "lucide-react";
import { divisionFullName, expectedGate, formatMoney, isDerby, isKnockout, nextFixture, position, strengthStars, table, teamRating, user, userForm } from "@/game";
import type { Club } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Badge, Card, EmptyState, FormChips, Stars } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { useFlow } from "@/components/game/useFlow";
import { Flag } from "@/components/ui/Flag";
import { roundLabel } from "@/components/comps/derive";
import { CompName } from "@/components/comps/labels";

function Side({ club, you, flag }: { club: Club; you: boolean; flag?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <Crest club={club} size={64} className="drop-shadow-[0_8px_18px_rgb(0_0_0/0.45)] sm:hidden" />
      <Crest club={club} size={84} className="hidden drop-shadow-[0_8px_18px_rgb(0_0_0/0.45)] sm:block" />
      <span className="flex w-full min-w-0 items-center justify-center gap-2 font-display text-lg font-extrabold uppercase leading-tight sm:text-2xl">
        {flag && <Flag code={club.league} />}
        <span className="truncate">{club.name}</span>
      </span>
      {you && <span className="-mt-1 text-xs font-bold uppercase tracking-wider text-gold-400">Seu time</span>}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-ink-950/40 px-3 py-2 ring-1 ring-inset ring-white/6">
      <span className="block text-xs font-bold uppercase tracking-wider text-mist">{label}</span>
      <span className="mt-0.5 flex min-h-6 items-center gap-2 font-semibold tabular">{children}</span>
    </div>
  );
}

/** Próximo jogo do usuário, ocupando a largura toda do painel. */
export function NextMatchCard() {
  const { world: w, version } = useWorld();
  const { advance, label } = useFlow();

  const data = useMemo(() => {
    void version;
    const nf = nextFixture(w);
    if (!nf) return null;
    const u = user(w);
    const home = nf.m.h === u.id;
    const opp = w.clubs[home ? nf.m.a : nf.m.h];
    const league = !isKnockout(nf.m.comp) && opp.div === u.div;
    const started = table(w, u.div).some((r) => r.j > 0);
    return {
      nf,
      u,
      home,
      opp,
      oppPos: league && started ? position(w, opp.id) : null,
      oppForm: userForm({ ...w, userClub: opp.id }, 5),
      oppStr: Math.round(teamRating(w, opp)),
      myStr: Math.round(teamRating(w, u)),
      derby: isDerby(w, nf.m),
      gate: home && !nf.m.neutral ? expectedGate(w, nf.m) : null,
    };
  }, [w, version]);

  if (!data) {
    return (
      <Card title="Próximo jogo">
        <EmptyState>Sem jogos marcados. Os confrontos das copas são sorteados a cada fase.</EmptyState>
      </Card>
    );
  }

  const { nf, u, home, opp, oppPos, oppForm, oppStr, myStr, derby, gate } = data;
  const thisWeek = nf.week === w.week;
  const venue = nf.m.neutral ? "Campo neutro" : home ? "Em casa" : "Fora";
  const diff = myStr - oppStr;
  const cont = nf.m.comp === "cont";

  return (
    <Card
      tone="highlight"
      className="relative overflow-hidden"
      title={
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span>Próximo jogo •</span>
          <CompName comp={nf.m.comp} />
          <span>• {roundLabel(nf.m, nf.wk)}{thisWeek ? ` • ${Math.max(0, 6 - w.day)} dia(s)` : ` • semana ${nf.week}`}</span>
        </span>
      }
      action={derby ? <Badge tone="orange" className="h-6 px-2"><Flame className="size-3.5" aria-hidden /> Clássico</Badge> : null}
    >
      <div className="flex items-center gap-3 py-2 sm:gap-6 sm:py-4">
        <Side club={home ? u : opp} you={home} flag={cont} />
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="rounded-md bg-ink-950/60 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-[0.18em] text-mist">{venue}</span>
          <span className="font-display text-4xl font-extrabold italic text-gold-400 sm:text-5xl">VS</span>
        </div>
        <Side club={home ? opp : u} you={!home} flag={cont} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Fact label="Adversário">
          {oppPos ? (
            `${oppPos}º na tabela`
          ) : (
            <>
              <Flag code={opp.league} />
              <span className="truncate">{divisionFullName(opp.div)}</span>
            </>
          )}
        </Fact>
        <Fact label="Força (titulares)">
          {oppStr}
          <Stars value={strengthStars(oppStr)} className="text-[11px]" />
          <span className={diff >= 0 ? "text-xs text-pitch-400" : "text-xs text-danger-400"}>
            ({diff >= 0 ? "você +" : "você "}{diff})
          </span>
        </Fact>
        <Fact label="Forma do adversário"><FormChips form={oppForm} /></Fact>
        <Fact label={gate ? "Público esperado" : "Local"}>
          {gate ? (
            <>
              <Users className="size-4 shrink-0 text-mist" aria-hidden />
              <span className="truncate">{gate.attendance.toLocaleString("pt-BR")} • {formatMoney(gate.income)}</span>
            </>
          ) : (
            <span className="truncate">{home ? u.stadium : opp.stadium}</span>
          )}
        </Fact>
      </div>

      {!w.fired && !w.pendingSeason && (
        <Button variant="primary" size="lg" block className="mt-4" onClick={advance} iconRight={<ChevronRight />}>
          {label}
        </Button>
      )}
    </Card>
  );
}

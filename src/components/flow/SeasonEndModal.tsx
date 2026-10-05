"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Briefcase, ChevronRight, Globe, Goal, Star } from "lucide-react";
import { compLeague, competitionName, divisionFullName, isSouthAmerican, divisionName, DIVISIONS, jobOffers, LEAGUES } from "@/game";
import type { Club, Competition, DivisionMove, Player } from "@/game/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Alert, SectionTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { useWorld } from "@/components/game/GameProvider";
import { ClubTag } from "@/components/comps/ClubTag";
import { CompIcon, compShortName } from "@/components/comps/labels";
import { AwardsPanel } from "@/components/comps/AwardsPanel";
import { JobOffers } from "./JobOffers";
import { FiredModal } from "./FiredModal";
import { useCareerMoves } from "./useCareerMoves";

function Champion({ club, comp, mine }: { club: Club | undefined; comp: Competition; mine: boolean }) {
  if (!club) return null;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-linear-to-b from-gold-400/15 to-transparent px-2 py-4 text-center ring-1 ring-inset",
        mine ? "ring-2 ring-gold-400" : "ring-gold-400/25",
      )}
    >
      <Crest club={club} size={52} />
      <span className="flex max-w-full items-center gap-1.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-gold-400">
        <CompIcon comp={comp} />
        <span className="truncate">{compShortName(comp)}</span>
      </span>
      <span className="flex max-w-full items-center gap-1.5 font-display text-base font-bold uppercase leading-tight">
        {compLeague(comp) === null && <Flag code={club.league} />}
        <span className="min-w-0 break-words">{club.name}</span>
      </span>
    </div>
  );
}

/** Lista de clubes que sobem ou caem entre duas divisões. */
function MoveList({ title, moves, up, userClub }: { title: string; moves: DivisionMove[]; up: boolean; userClub: string }) {
  if (!moves.length) return null;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <div className="min-w-0">
      <SectionTitle className="mb-2">{title}</SectionTitle>
      <ul className="flex flex-col gap-1.5">
        {moves.map((mv) => (
          <li key={mv.club} className={cn("flex min-w-0 items-center gap-2 rounded-lg text-sm", mv.club === userClub && "bg-gold-400/10 px-1.5 py-1")}>
            <Icon className={cn("size-4 shrink-0", up ? "text-pitch-400" : "text-danger-400")} aria-label={up ? "Acesso" : "Rebaixamento"} />
            <ClubTag id={mv.club} bold={mv.club === userClub} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Award({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
      <span className="mt-0.5 text-gold-400 [&_svg]:size-4">{icon}</span>
      <span className="min-w-0 text-sm">
        <span className="block text-xs uppercase tracking-wide text-mist">{label}</span>
        {children}
      </span>
    </li>
  );
}

function scorerLine(p: Player, clubs: Record<string, Club>) {
  return (
    <>
      <b>{p.name}</b> {p.clubId && clubs[p.clubId] ? `(${clubs[p.clubId].name})` : ""} • {p.s.goals} gols
    </>
  );
}

/** Fim de temporada: campeões, campanha, veredito, acesso/rebaixamento, prêmios e escolha do próximo passo. */
export function SeasonEndModal() {
  const { world: w } = useWorld();
  const { takeJob, startNewSeason } = useCareerMoves();
  const [offers] = useState(() => (w.fired ? jobOffers(w) : []));
  const ps = w.pendingSeason;

  if (!ps) return w.fired ? <FiredModal /> : null;

  const e = ps.entry;
  const u = w.clubs[e.user.club] ?? w.clubs[w.userClub];
  const lg = e.user.league;
  const divs = LEAGUES[lg].divisions;
  const offerClub = !w.fired && ps.offer ? w.clubs[ps.offer] : null;
  // Campeões: divisões e mata-matas da liga do usuário (estadual dele incluído) e os continentais.
  const ownState = u.league === "bra" ? `est:${u.uf}` : "";
  const cupKeys = Object.keys(e.cups).filter((k) => (compLeague(k as Competition) === lg && !k.startsWith("est:")) || k === ownState || compLeague(k as Competition) === null);
  const champs: { comp: Competition; id: string | null | undefined }[] = [
    ...divs.map((d) => ({ comp: d as Competition, id: e.champions[d] })),
    ...cupKeys.map((k) => ({ comp: k as Competition, id: e.cups[k] })),
  ];
  // Acesso/rebaixamento na liga do usuário, agrupados por divisão de destino.
  const moves = ps.moves.filter((mv) => DIVISIONS[mv.from].league === lg);
  const moveGroups = divs.flatMap((d) => {
    const info = DIVISIONS[d];
    const groups: { key: string; title: string; up: boolean; list: DivisionMove[] }[] = [];
    if (info.up) groups.push({ key: `${d}-up`, title: `Sobem para a ${divisionName(info.up)}`, up: true, list: moves.filter((mv) => mv.from === d && mv.to === info.up) });
    if (info.down) groups.push({ key: `${d}-down`, title: `Caem para a ${divisionName(info.down)}`, up: false, list: moves.filter((mv) => mv.from === d && mv.to === info.down) });
    return groups;
  });
  const scorers = divs.map((d) => ({ div: d, p: ps.scorers[d] ?? null })).filter((x): x is { div: typeof x.div; p: Player } => !!x.p);
  // Classificados ao principal continental da região do usuário (Liga dos Campeões ou Libertadores).
  const topComp = isSouthAmerican(lg) ? "lib" : "cont";
  const contNext = (ps.qualified?.[topComp] ?? ps.contNext).map((id) => w.clubs[id]).filter(Boolean).sort((a, b) => a.league.localeCompare(b.league) || b.rep - a.rep);
  const myComp = ps.qualified ? (["cont", "lib", "eur2", "sud"] as const).find((k) => ps.qualified?.[k]?.includes(u.id)) : ps.contNext.includes(u.id) ? "cont" : undefined;
  const qualified = !!myComp;

  return (
    <Modal
      open
      dismissible={false}
      size="lg"
      title={`Fim da temporada ${e.season}`}
      footer={
        w.fired ? (
          <p className="mr-auto text-sm text-mist">Escolha um dos clubes acima para continuar a carreira.</p>
        ) : (
          <Button variant="primary" onClick={startNewSeason} iconRight={<ChevronRight />}>
            Começar temporada {e.season + 1}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <SectionTitle className="mb-2 flex items-center gap-1.5">
            <Flag code={lg} /> Campeões
          </SectionTitle>
          <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", champs.length >= 5 ? "md:grid-cols-5" : "md:grid-cols-4")}>
            {champs.map((c) => (
              <Champion key={c.comp} club={c.id ? w.clubs[c.id] : undefined} comp={c.comp} mine={c.id === u.id} />
            ))}
          </div>
        </div>

        <p className="text-center text-lg">
          {u.name} terminou em <b className="font-display text-2xl text-gold-400">{ps.userPos}º</b> na{" "}
          <span className="inline-flex items-center gap-1.5 align-baseline">
            <Flag code={lg} /> {divisionFullName(e.user.div)}
          </span>
          .
        </p>

        {w.fired ? (
          <Alert tone="bad"><span><b>Você foi demitido.</b> {w.fired.reason}</span></Alert>
        ) : ps.success ? (
          <Alert tone="good"><span><b>Objetivo cumprido!</b> A diretoria esperava {e.user.objective}.</span></Alert>
        ) : (
          <Alert tone="warn">
            <span><b>Objetivo não cumprido.</b> A meta era {e.user.objective}. Confiança da diretoria: {Math.round(w.board.conf)}%.</span>
          </Alert>
        )}

        {moveGroups.some((g) => g.list.length) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {moveGroups.map((g) => (
              <MoveList key={g.key} title={g.title} moves={g.list} up={g.up} userClub={u.id} />
            ))}
          </div>
        )}

        {e.awards && (
          <div>
            <SectionTitle className="mb-2">Gala dos melhores de {e.season}</SectionTitle>
            <AwardsPanel awards={e.awards} clubs={w.clubs} userClub={u.id} />
          </div>
        )}

        {(scorers.length > 0 || (!e.awards && ps.best)) && (
          <div>
            <SectionTitle className="mb-2">Artilheiros por divisão</SectionTitle>
            <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {scorers.map(({ div, p }) => (
                <Award key={div} icon={<Goal />} label={`Artilheiro da ${divisionName(div)}`}>{scorerLine(p, w.clubs)}</Award>
              ))}
              {!e.awards && ps.best && (
                <Award icon={<Star />} label="Craque da temporada">
                  <b>{ps.best.name}</b> {ps.best.clubId && w.clubs[ps.best.clubId] ? `(${w.clubs[ps.best.clubId].name})` : ""} • nota{" "}
                  {(ps.best.s.rsum / Math.max(1, ps.best.s.apps)).toFixed(2)}
                </Award>
              )}
            </ul>
          </div>
        )}

        {contNext.length > 0 && (
          <div>
            <SectionTitle className="mb-2 flex items-center gap-1.5">
              <Globe className="size-4" aria-hidden /> {competitionName(topComp)} {e.season + 1} • classificados
            </SectionTitle>
            {qualified && (
              <Alert tone="good" className="mb-2">
                <span><b>Classificado!</b> O {u.name} disputa a {competitionName(myComp ?? topComp)} na próxima temporada.</span>
              </Alert>
            )}
            <ul className="grid gap-1 sm:grid-cols-2">
              {contNext.map((c) => (
                <li key={c.id} className={cn("flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-sm", c.id === u.id ? "bg-gold-400/10 ring-1 ring-inset ring-gold-400/30" : "bg-white/[0.03]")}>
                  <Crest club={c} size={16} className="shrink-0" />
                  <Flag code={c.league} />
                  <span className={cn("min-w-0 truncate", c.id === u.id && "font-semibold")}>{c.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {w.fired && (
          <div>
            <SectionTitle className="mb-2">Propostas de emprego</SectionTitle>
            <JobOffers ids={offers} onPick={takeJob} />
          </div>
        )}

        {offerClub && (
          <Alert tone="info">
            <Crest club={offerClub} size={32} />
            <span className="min-w-0 flex-1">
              <b>O {offerClub.name} quer contratar você!</b>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-mist">
                <Flag code={offerClub.league} /> {divisionFullName(offerClub.div)} • reputação {Math.round(offerClub.rep)}. Aceitar muda seu clube na próxima temporada.
              </span>
            </span>
            <Button variant="secondary" icon={<Briefcase />} onClick={() => takeJob(offerClub.id)}>
              Aceitar proposta
            </Button>
          </Alert>
        )}
      </div>
    </Modal>
  );
}

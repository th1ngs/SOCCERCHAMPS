"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Briefcase, ChevronRight, Goal, Star } from "lucide-react";
import { jobOffers, user } from "@/game";
import type { Club, Player } from "@/game/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Alert, SectionTitle } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { ClubTag } from "@/components/comps/ClubTag";
import { JobOffers } from "./JobOffers";
import { FiredModal } from "./FiredModal";
import { useCareerMoves } from "./useCareerMoves";

function Champion({ club, label }: { club: Club | undefined; label: string }) {
  if (!club) return null;
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-linear-to-b from-gold-400/15 to-transparent px-2 py-4 text-center ring-1 ring-inset ring-gold-400/25">
      <Crest club={club} size={52} />
      <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-gold-400">{label}</span>
      <span className="font-display text-base font-bold uppercase leading-tight">{club.name}</span>
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

  const u = user(w);
  const e = ps.entry;
  const offerClub = !w.fired && ps.offer ? w.clubs[ps.offer] : null;

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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Champion club={w.clubs[e.champA]} label="Série A" />
          <Champion club={w.clubs[e.champB]} label="Série B" />
          {e.cup && <Champion club={w.clubs[e.cup]} label="Copa" />}
        </div>

        <p className="text-center text-lg">
          {u.name} terminou em <b className="font-display text-2xl text-gold-400">{ps.userPos}º</b> na Série {e.user.div}.
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <SectionTitle className="mb-2">Sobem para a Série A</SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {ps.promoted.map((id) => (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <ArrowUp className="size-4 shrink-0 text-pitch-400" aria-label="Acesso" /> <ClubTag id={id} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionTitle className="mb-2">Caem para a Série B</SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {ps.relegated.map((id) => (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <ArrowDown className="size-4 shrink-0 text-danger-400" aria-label="Rebaixamento" /> <ClubTag id={id} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {(ps.scA || ps.scB || ps.best) && (
          <div>
            <SectionTitle className="mb-2">Prêmios</SectionTitle>
            <ul className="grid gap-2 sm:grid-cols-3">
              {ps.scA && <Award icon={<Goal />} label="Artilheiro da Série A">{scorerLine(ps.scA, w.clubs)}</Award>}
              {ps.scB && <Award icon={<Goal />} label="Artilheiro da Série B">{scorerLine(ps.scB, w.clubs)}</Award>}
              {ps.best && (
                <Award icon={<Star />} label="Craque da temporada">
                  <b>{ps.best.name}</b> {ps.best.clubId && w.clubs[ps.best.clubId] ? `(${w.clubs[ps.best.clubId].name})` : ""} • nota{" "}
                  {(ps.best.s.rsum / Math.max(1, ps.best.s.apps)).toFixed(2)}
                </Award>
              )}
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
              <span className="block text-xs text-mist">
                Série {offerClub.div} • reputação {Math.round(offerClub.rep)}. Aceitar muda seu clube na próxima temporada.
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

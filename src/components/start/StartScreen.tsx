"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { autoLineup, CLUBS, divisionFullName, LEAGUES, newWorld, startSeason } from "@/game";
import type { DivisionId, LeagueId } from "@/game/types";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/components/game/GameProvider";
import { Flag } from "@/components/ui/Flag";
import { ClubGrid, DivisionTabs, LeaguePicker } from "./ClubPicker";

const DEFAULT_NAME = "Treinador";

function Step({ n, title, aside, children }: { n: number; title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-gold-400">
          <span className="grid size-7 place-items-center rounded-full bg-gold-400 text-sm font-extrabold tracking-normal text-ink-950" aria-hidden>{n}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Nova carreira: nome do treinador e escolha do clube. */
export function StartScreen() {
  const g = useGame();
  const router = useRouter();
  const toast = useToast();
  const nameId = useId();
  // O GameProvider já carrega o save local ao montar: `world` é a carreira salva.
  const saved = g.ready ? g.world : null;
  const [name, setName] = useState<string | null>(null);
  const shownName = name ?? saved?.manager.name ?? "";
  const [confirmClub, setConfirmClub] = useState<string | null>(null);
  const [league, setLeague] = useState<LeagueId>("bra");
  // Divisão escolhida em cada liga: voltar a uma liga reabre a mesma aba.
  const [divs, setDivs] = useState<Partial<Record<LeagueId, DivisionId>>>({});
  const div = divs[league] ?? LEAGUES[league].divisions[0];
  const gridId = useId();
  const hasSave = () => !!g.world || g.hasLocalSave();

  const start = (clubId: string) => {
    const manager = shownName.trim() || DEFAULT_NAME;
    const w = newWorld(manager, clubId);
    startSeason(w);
    for (const c of Object.values(w.clubs)) autoLineup(w, c);
    // A nova carreira não pode sobrescrever o save da nuvem da carreira anterior.
    if (g.cloudCode) g.disconnectCloud();
    g.setWorld(w);
    setConfirmClub(null);
    router.push("/jogo");
    toast(`Bem-vindo ao ${w.clubs[clubId].name}, ${manager}!`, "good");
  };

  const pick = (clubId: string) => (hasSave() ? setConfirmClub(clubId) : start(clubId));

  const savedClub = saved ? saved.clubs[saved.userClub] : null;
  const pickedClub = confirmClub ? CLUBS.find((c) => c.id === confirmClub) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="pt-6 sm:pt-10">
        <Link href="/" className={buttonClasses("ghost", "sm")}>
          <ArrowLeft /> Início
        </Link>
      </div>

      <section aria-labelledby="nova-carreira" className="mt-6">
        <h1 id="nova-carreira" className="font-display text-5xl font-extrabold uppercase italic leading-none sm:text-6xl">
          Nova carreira
        </h1>
        <p className="mt-2 max-w-prose text-sm text-mist">
          Seis países, 208 clubes. Clubes menores começam com pouco dinheiro e metas modestas; os grandes cobram títulos.
        </p>

        <Step n={1} title={<label htmlFor={nameId}>Seu nome de treinador</label>}>
          <input
            id={nameId}
            value={shownName}
            onChange={(e) => setName(e.target.value)}
            maxLength={28}
            placeholder="Ex.: Professor Carvalho"
            autoComplete="nickname"
            className="h-11 w-full max-w-md rounded-xl bg-ink-950/70 px-4 text-base text-snow ring-1 ring-inset ring-white/10 placeholder:text-mist/50 focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </Step>

        <Step n={2} title="Escolha a liga">
          <LeaguePicker value={league} onChange={setLeague} />
        </Step>

        <Step
          n={3}
          title="Escolha a divisão e o clube"
          aside={
            <span className="inline-flex items-center gap-1.5 text-sm text-mist">
              <Flag code={league} decorative /> {LEAGUES[league].name}
            </span>
          }
        >
          <DivisionTabs league={league} value={div} onChange={(d) => setDivs((m) => ({ ...m, [league]: d }))} panelId={gridId} />
          <div className="mt-4">
            <ClubGrid key={div} id={gridId} div={div} onPick={pick} />
          </div>
        </Step>
      </section>

      <Modal
        open={!!confirmClub}
        onClose={() => setConfirmClub(null)}
        title="Começar nova carreira?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClub(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => confirmClub && start(confirmClub)}>Começar do zero</Button>
          </>
        }
      >
        <p className="text-sm text-mist">
          A carreira salva será substituída
          {savedClub && saved ? ` (${savedClub.name}, temporada ${saved.season})` : ""}. Isso não pode ser desfeito.
        </p>
        {pickedClub && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
            Novo clube: <b>{pickedClub.name}</b> <span className="text-mist">•</span>
            <Flag code={pickedClub.league} /> {divisionFullName(pickedClub.div)}
          </p>
        )}
        {g.cloudCode && (
          <Alert tone="info" className="mt-4">
            O código da nuvem {g.cloudCode} continua guardando a carreira antiga, mas deixa de ser atualizado neste aparelho.
          </Alert>
        )}
      </Modal>

    </div>
  );
}

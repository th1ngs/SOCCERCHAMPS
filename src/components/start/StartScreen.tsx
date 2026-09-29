"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { autoLineup, CLUBS, newWorld, startSeason } from "@/game";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Alert, SectionTitle } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/components/game/GameProvider";
import { ClubPicker } from "./ClubPicker";

const DEFAULT_NAME = "Treinador";

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
          Escolha seu clube. Clubes menores começam com pouco dinheiro e metas modestas; os grandes cobram títulos.
        </p>

        <div className="mt-5 max-w-md">
          <label htmlFor={nameId} className="mb-1.5 block">
            <SectionTitle>Seu nome de treinador</SectionTitle>
          </label>
          <input
            id={nameId}
            value={shownName}
            onChange={(e) => setName(e.target.value)}
            maxLength={28}
            placeholder="Ex.: Professor Carvalho"
            autoComplete="nickname"
            className="h-11 w-full rounded-xl bg-ink-950/70 px-4 text-base text-snow ring-1 ring-inset ring-white/10 placeholder:text-mist/50 focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>

        <div className="mt-8">
          <ClubPicker onPick={pick} />
        </div>
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
        {pickedClub && <p className="mt-3 text-sm">Novo clube: <b>{pickedClub.name}</b>.</p>}
        {g.cloudCode && (
          <Alert tone="info" className="mt-4">
            O código da nuvem {g.cloudCode} continua guardando a carreira antiga, mas deixa de ser atualizado neste aparelho.
          </Alert>
        )}
      </Modal>

    </div>
  );
}

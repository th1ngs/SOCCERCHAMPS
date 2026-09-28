"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gamepad2, Trophy } from "lucide-react";
import { autoLineup, CLUBS, newWorld, startSeason } from "@/game";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Alert, SectionTitle } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/components/game/GameProvider";
import { StartHero } from "./StartHero";
import { ContinueCard } from "./ContinueCard";
import { CloudLoadForm } from "./CloudLoadForm";
import { ClubPicker } from "./ClubPicker";

const DEFAULT_NAME = "Treinador";

/** Tela inicial: continuar, carregar da nuvem ou começar uma nova carreira. */
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
  const [cloudConfirm, setCloudConfirm] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudErr, setCloudErr] = useState<string | null>(null);

  const hasSave = () => !!g.world || g.hasLocalSave();

  const continueCareer = () => {
    const w = g.world ?? g.loadLocal();
    if (!w) return;
    g.setWorld(w);
    router.push("/jogo");
  };

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

  const loadCloud = async (code: string) => {
    await g.loadFromCloud(code);
    router.push("/jogo");
    toast("Carreira carregada da nuvem.", "good");
  };

  /** Chamado pelo formulário: confirma antes de substituir uma carreira local diferente. */
  const requestCloud = async (code: string) => {
    if (hasSave() && g.cloudCode !== code) {
      setCloudErr(null);
      setCloudConfirm(code);
      return;
    }
    await loadCloud(code);
  };

  const confirmCloud = async () => {
    if (!cloudConfirm) return;
    setCloudBusy(true);
    setCloudErr(null);
    try {
      await loadCloud(cloudConfirm);
      setCloudConfirm(null);
    } catch (e) {
      setCloudErr((e as Error).message || "Não foi possível carregar a carreira.");
    } finally {
      setCloudBusy(false);
    }
  };

  const savedClub = saved ? saved.clubs[saved.userClub] : null;
  const pickedClub = confirmClub ? CLUBS.find((c) => c.id === confirmClub) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <StartHero />

      <div className="flex flex-col gap-4">
        {!g.ready ? (
          <div className="h-[92px] animate-pulse rounded-(--radius-card) bg-ink-800/60" aria-hidden />
        ) : (
          saved && <ContinueCard save={saved} onContinue={continueCareer} />
        )}
        <CloudLoadForm onLoad={requestCloud} />
      </div>

      <section aria-labelledby="nova-carreira" className="mt-10">
        <h2 id="nova-carreira" className="font-display text-3xl font-extrabold uppercase italic leading-none sm:text-4xl">
          {saved ? "Ou comece uma nova carreira" : "Nova carreira"}
        </h2>
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

      <footer className="mt-12 flex flex-wrap items-center justify-center gap-2 border-t border-white/8 pt-6">
        <Link href="/hall-da-fama" className={buttonClasses("ghost")}>
          <Trophy /> Hall da Fama
        </Link>
        <Link href="/arcade" className={buttonClasses("ghost")}>
          <Gamepad2 /> Modo arcade (futebol de botão)
        </Link>
      </footer>

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

      <Modal
        open={!!cloudConfirm}
        onClose={() => !cloudBusy && setCloudConfirm(null)}
        dismissible={!cloudBusy}
        title="Substituir a carreira deste aparelho?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCloudConfirm(null)} disabled={cloudBusy}>Cancelar</Button>
            <Button variant="danger" onClick={confirmCloud} loading={cloudBusy}>Substituir e carregar</Button>
          </>
        }
      >
        <p className="text-sm text-mist">
          A carreira salva neste aparelho será substituída pela carreira do código <b className="text-snow">{cloudConfirm}</b>.
        </p>
        {cloudErr && <Alert tone="bad" className="mt-4">{cloudErr}</Alert>}
      </Modal>
    </div>
  );
}

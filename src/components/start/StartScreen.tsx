"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { autoLineup, CLUBS, divisionFullName, LEAGUES, newWorld, startSeason } from "@/game";
import type { DivisionId, LeagueId } from "@/game/types";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
  const search = useSearchParams();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const requested = Number(search.get("slot"));
  const slot = selectedSlot ?? ([1, 2, 3].includes(requested) ? requested : 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState<string | null>(null);
  const shownName = name ?? g.world?.manager.name ?? "";
  const [confirmClub, setConfirmClub] = useState<string | null>(null);
  const [league, setLeague] = useState<LeagueId>("bra");
  // Divisão escolhida em cada liga: voltar a uma liga reabre a mesma aba.
  const [divs, setDivs] = useState<Partial<Record<LeagueId, DivisionId>>>({});
  const div = divs[league] ?? LEAGUES[league].divisions[0];
  const gridId = useId();
  const hasSave = () => g.slots.some((s) => s.slot === slot);

  const start = async (clubId: string) => {
    const manager = shownName.trim() || DEFAULT_NAME;
    const w = newWorld(manager, clubId);
    startSeason(w);
    for (const c of Object.values(w.clubs)) autoLineup(w, c);
    setBusy(true); setError("");
    try {
      await g.createSlot(slot, w);
      setConfirmClub(null);
      router.push("/jogo");
      toast(`Bem-vindo ao ${w.clubs[clubId].name}, ${manager}!`, "good");
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const pick = (clubId: string) => (hasSave() ? setConfirmClub(clubId) : void start(clubId));

  const existing = g.slots.find((s) => s.slot === slot);
  const pickedClub = confirmClub ? CLUBS.find((c) => c.id === confirmClub) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      {!g.account ? <div className="pt-10"><p>Entre na sua conta para criar uma carreira.</p><Link href="/" className={buttonClasses("primary", "sm", false, "mt-3")}>Ir para o login</Link></div> : <>
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
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm text-mist">Salvar em:</span>
          {[1, 2, 3].map((n) => <Button key={n} variant={slot === n ? "primary" : "outline"} size="sm" onClick={() => setSelectedSlot(n)}>
            Save {n}{g.slots.some((s) => s.slot === n) ? " · ocupado" : " · vazio"}
          </Button>)}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-danger-400">{error}</p>}

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
            <Button variant="danger" loading={busy} onClick={() => confirmClub && void start(confirmClub)}>Substituir save {slot}</Button>
          </>
        }
      >
        <p className="text-sm text-mist">
          O save {slot} será substituído{existing ? ` (${existing.clubName}, temporada ${existing.season})` : ""}. Isso não pode ser desfeito.
        </p>
        {pickedClub && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
            Novo clube: <b>{pickedClub.name}</b> <span className="text-mist">•</span>
            <Flag code={pickedClub.league} /> {divisionFullName(pickedClub.div)}
          </p>
        )}
      </Modal>
      </>}
    </div>
  );
}

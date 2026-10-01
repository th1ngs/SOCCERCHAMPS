"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dices } from "lucide-react";
import { CLUBS, LEAGUES, POS, POS_NAME, divisionFullName, newPlayerCareer, startingClubs } from "@/game";
import type { LeagueId, Position } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Modal } from "@/components/ui/Modal";
import { PosBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useGame } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { LeaguePicker } from "./ClubPicker";
import { Step } from "./Step";

/** Nova carreira de jogador: nome, posição, nacionalidade e um de três clubes pequenos para começar. */
export function PlayerStart({ slot }: { slot: number }) {
  const g = useGame();
  const router = useRouter();
  const toast = useToast();
  const nameId = useId();
  const [name, setName] = useState("");
  const [pos, setPos] = useState<Position>("ATA");
  const [nat, setNat] = useState<LeagueId>("bra");
  const [seed, setSeed] = useState(0);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Sorteio novo ao trocar de país ou ao pedir outros clubes.
  const options = useMemo(() => {
    void seed;
    return startingClubs(nat).map((id) => CLUBS.find((c) => c.id === id)).filter((c) => !!c);
  }, [nat, seed]);
  const existing = g.slots.find((s) => s.slot === slot);

  const start = async (clubId: string) => {
    const player = name.trim() || "Craque";
    setBusy(true);
    setError("");
    try {
      const w = newPlayerCareer({ name: player, pos, nat, clubId });
      await g.createSlot(slot, w);
      setConfirm(null);
      router.push("/jogador");
      toast(`${player} assinou com o ${w.clubs[clubId].name}. Boa sorte!`, "good");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const pick = (clubId: string) => (existing ? setConfirm(clubId) : void start(clubId));
  const picked = confirm ? CLUBS.find((c) => c.id === confirm) : null;

  return (
    <>
      {error && <p role="alert" className="mt-3 text-sm text-danger-400">{error}</p>}
      <Step n={1} title={<label htmlFor={nameId}>Nome do jogador</label>}>
        <input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={28}
          placeholder="Ex.: Wesley Silva"
          className="h-11 w-full max-w-md rounded-xl bg-ink-950/70 px-4 text-base text-snow ring-1 ring-inset ring-white/10 placeholder:text-mist/50 focus:outline-none focus:ring-2 focus:ring-gold-400"
        />
        <p className="mt-2 text-xs text-mist">Você começa com 17 anos, num clube pequeno, com potencial de craque. O resto é com você.</p>
      </Step>

      <Step n={2} title="Posição">
        <div role="radiogroup" aria-label="Posição" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {POS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={p === pos}
              onClick={() => setPos(p)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
                p === pos ? "bg-gold-400/15 ring-gold-400/70" : "bg-ink-800 ring-white/8 hover:bg-white/6",
              )}
            >
              <PosBadge pos={p} />
              <span className="text-xs font-semibold">{POS_NAME[p]}</span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={3} title="Nacionalidade (e país onde você começa)">
        <LeaguePicker value={nat} onChange={(l) => setNat(l)} />
      </Step>

      <Step n={4} title="Escolha o primeiro clube">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-mist">Três clubes das divisões de baixo de {LEAGUES[nat].country} querem você.</p>
          <Button variant="ghost" size="sm" icon={<Dices />} onClick={() => setSeed((s) => s + 1)}>
            Outros clubes
          </Button>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {options.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c.id)}
                disabled={busy}
                className="flex w-full items-center gap-3 rounded-2xl bg-ink-800 p-3 text-left ring-1 ring-inset ring-white/8 transition-colors hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-gold-400 disabled:opacity-60"
              >
                <Crest club={c} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg font-bold uppercase leading-tight">{c.name}</span>
                  <span className="block truncate text-xs text-mist">{divisionFullName(c.div)} • {c.city}</span>
                  <span className="mt-1 block text-xs font-semibold text-gold-400">Assinar contrato</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Step>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Começar carreira de jogador?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button variant="danger" loading={busy} onClick={() => confirm && void start(confirm)}>Substituir save {slot}</Button>
          </>
        }
      >
        <p className="text-sm text-mist">
          O save {slot} será substituído{existing ? ` (${existing.clubName}, temporada ${existing.season})` : ""}. Isso não pode ser desfeito.
        </p>
        {picked && <p className="mt-3 text-sm">Primeiro clube: <b>{picked.name}</b> • {divisionFullName(picked.div)}</p>}
      </Modal>
    </>
  );
}

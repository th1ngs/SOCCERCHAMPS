"use client";

import { useState } from "react";
import { ArrowLeftRight, Bandage, Check, Play } from "lucide-react";
import { FORMATIONS, FORMATION_KEYS, MAX_SUBS, TACTICS } from "@/game";
import type { FormationKey, Player, TacticKey } from "@/game/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Alert, EmptyState, Meter, OvrBadge, PosBadge, SectionTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { LiveController } from "./controller";
import { CardGlyph } from "./FeedIcon";

function PickRow({
  p,
  pos,
  fat,
  selected,
  onPick,
  injured,
  yellow,
}: {
  p: Player;
  pos: string;
  fat: number;
  selected: boolean;
  onPick: () => void;
  injured?: boolean;
  yellow?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className={cn(
        "flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm ring-1 ring-inset transition-colors",
        selected ? "bg-gold-400/15 ring-gold-400" : "bg-ink-900/40 ring-white/6 hover:bg-white/6",
      )}
    >
      <PosBadge pos={pos} />
      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
      {injured && <Bandage className="size-4 shrink-0 text-danger-400" aria-label="Lesionado" />}
      {yellow && <CardGlyph color="yellow" label="Amarelado" />}
      <Meter value={fat} label="Condição física" className="w-12 shrink-0" />
      <OvrBadge value={p.ovr} size="sm" />
      {selected && <Check className="size-4 shrink-0 text-gold-400" aria-hidden />}
    </button>
  );
}

/** Substituições e tática durante o jogo ao vivo. */
export function SubsModal({ ctrl, note }: { ctrl: LiveController; note: string | null }) {
  const sim = ctrl.sim;
  const side = sim.sides[sim.userSide()];
  const [outPid, setOut] = useState<string | null>(null);
  const [inPid, setIn] = useState<string | null>(null);
  const players = ctrl.w.players;
  const full = side.subs >= MAX_SUBS;
  const outOk = !!outPid && side.on.some((o) => o.pid === outPid);
  const inOk = !!inPid && side.bench.includes(inPid);
  const reason = full ? `Limite de ${MAX_SUBS} substituições atingido` : !outOk || !inOk ? "Escolha quem sai e quem entra" : "";

  const confirm = () => {
    if (!outPid || !inPid) return;
    if (ctrl.sub(outPid, inPid)) {
      setOut(null);
      setIn(null);
    }
  };

  const slots = FORMATIONS[side.formation];

  return (
    <Modal
      open
      size="lg"
      onClose={() => ctrl.closeSubs()}
      title="Substituições e tática"
      footer={
        <>
          <Button variant="secondary" icon={<Play />} onClick={() => ctrl.closeSubs()} className="max-sm:flex-1">
            Voltar ao jogo
          </Button>
          <Button variant="primary" icon={<ArrowLeftRight />} onClick={confirm} disabled={!!reason} title={reason || undefined} className="max-sm:flex-1">
            Confirmar substituição ({Math.min(MAX_SUBS, side.subs + (full ? 0 : 1))}/{MAX_SUBS})
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {note && (
          <Alert tone="warn">
            <Bandage className="size-4 shrink-0 text-warn-400" aria-hidden />
            {note}
          </Alert>
        )}
        <p className="text-sm text-mist">
          Substituições: <b className="text-snow tabular">{side.subs}/{MAX_SUBS}</b>. {reason ? `${reason}.` : "Pronto para confirmar."}
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="min-w-0">
            <SectionTitle className="mb-2">Em campo • sai</SectionTitle>
            <div className="space-y-1.5">
              {side.on.map((o) => {
                const p = players[o.pid];
                if (!p) return null;
                return (
                  <PickRow
                    key={o.pid}
                    p={p}
                    pos={slots[o.slot].pos}
                    fat={o.fat}
                    selected={outPid === o.pid}
                    onPick={() => setOut(o.pid)}
                    injured={sim.injuries.some((i) => i.pid === o.pid)}
                    yellow={!!o.yc}
                  />
                );
              })}
            </div>
          </section>
          <section className="min-w-0">
            <SectionTitle className="mb-2">Banco • entra</SectionTitle>
            {side.bench.length ? (
              <div className="space-y-1.5">
                {side.bench.map((id) => {
                  const p = players[id];
                  if (!p) return null;
                  return <PickRow key={id} p={p} pos={p.pos} fat={p.fitness} selected={inPid === id} onPick={() => setIn(id)} />;
                })}
              </div>
            ) : (
              <EmptyState>Banco vazio.</EmptyState>
            )}
          </section>
        </div>
        <section>
          <SectionTitle className="mb-2">Formação</SectionTitle>
          <Segmented<FormationKey>
            ariaLabel="Formação"
            value={side.formation}
            onChange={(f) => ctrl.setFormation(f)}
            options={FORMATION_KEYS.map((f) => ({ value: f, label: f }))}
          />
        </section>
        <section>
          <SectionTitle className="mb-2">Estilo</SectionTitle>
          <Segmented<TacticKey>
            ariaLabel="Estilo de jogo"
            value={side.tactic}
            onChange={(t) => ctrl.setTactic(t)}
            options={(Object.keys(TACTICS) as TacticKey[]).map((k) => ({ value: k, label: TACTICS[k].name }))}
          />
        </section>
      </div>
    </Modal>
  );
}

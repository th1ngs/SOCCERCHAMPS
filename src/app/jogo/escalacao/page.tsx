"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { FORMATIONS, POS_NAME, autoLineup, ensureLineup, sectors, setCaptain, setFkTaker, setPenTaker, user } from "@/game";
import type { FormationKey, Player, TacticKey } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { WandSparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { BenchList } from "@/components/lineup/BenchList";
import { LeadersPanel } from "@/components/lineup/LeadersPanel";
import { Pitch } from "@/components/lineup/Pitch";
import { PlayerPicker } from "@/components/lineup/PlayerPicker";
import { SectorStrip } from "@/components/lineup/SectorStrip";
import { TacticsPanel } from "@/components/lineup/TacticsPanel";
import { InstructionsPanel } from "@/components/lineup/InstructionsPanel";
import { assignBench, assignSlot, candidates, lineupNeedsFix } from "@/components/lineup/lineupLogic";
import { PlayerAvatar } from "@/components/player/PlayerAvatar";

type PanelTab = "bench" | "tactics" | "instr" | "leaders";
type Picking = { kind: "slot" | "bench"; index: number } | null;
type DragSource = { kind: "slot" | "bench"; index: number; playerId: string; x: number; y: number; pointerId: number; active: boolean };
type DragPreview = { player: Player; x: number; y: number };

function targetAt(x: number, y: number): string | null {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-lineup-target]");
  return element?.dataset.lineupTarget ?? null;
}

export default function EscalacaoPage() {
  const { world, version, mutate } = useWorld();
  const toast = useToast();
  const [picking, setPicking] = useState<Picking>(null);
  const [tab, setTab] = useState<PanelTab>("bench");
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragRef = useRef<DragSource | null>(null);
  const dragEndedAt = useRef(0);

  const view = useMemo(() => {
    const u = user(world);
    const starters = u.lineup.map((id) => (id ? world.players[id] : undefined)).filter((p): p is Player => !!p);
    const bench = u.bench.map((id) => world.players[id]).filter((p): p is Player => !!p);
    const captain = u.captain ? world.players[u.captain] ?? null : null;
    const penTaker = u.penTaker ? world.players[u.penTaker] ?? null : null;
    const fkTaker = u.fkTaker ? world.players[u.fkTaker] ?? null : null;
    return { u, starters, bench, captain, penTaker, fkTaker, sec: sectors(world, u), needsFix: lineupNeedsFix(world, u) };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, version]);
  const { u, starters, bench, captain, penTaker, fkTaker, sec, needsFix } = view;

  const startDrag = (kind: "slot" | "bench", index: number, event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const playerId = kind === "slot" ? u.lineup[index] : u.bench[index];
    if (!playerId || !world.players[playerId]) return;
    dragRef.current = { kind, index, playerId, x: event.clientX, y: event.clientY, pointerId: event.pointerId, active: false };
  };

  useEffect(() => {
    const move = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 7) return;
      if (!drag.active) setTab("bench"); // o banco precisa estar à vista para receber o jogador
      drag.active = true;
      const player = world.players[drag.playerId];
      if (!player) return;
      if (event.clientY < 72) window.scrollBy(0, -18);
      else if (event.clientY > window.innerHeight - 72) window.scrollBy(0, 18);
      setDragPreview({ player, x: event.clientX, y: event.clientY });
      const target = targetAt(event.clientX, event.clientY);
      setDropTarget(target === `${drag.kind}:${drag.index}` ? null : target);
    };
    const finish = (event: globalThis.PointerEvent, cancelled = false) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragPreview(null);
      setDropTarget(null);
      if (!drag.active) return;
      dragEndedAt.current = Date.now();
      if (cancelled) return;
      const target = targetAt(event.clientX, event.clientY);
      if (!target || target === `${drag.kind}:${drag.index}`) return;
      const [kind, rawIndex] = target.split(":");
      const index = Number(rawIndex);
      if ((kind !== "slot" && kind !== "bench") || !Number.isInteger(index)) return;
      mutate((w) => {
        const club = user(w);
        if (kind === "slot" && index >= 0 && index < club.lineup.length) assignSlot(club, index, drag.playerId);
        if (kind === "bench" && index >= 0 && index < club.bench.length) assignBench(club, index, drag.playerId);
      });
    };
    const up = (event: globalThis.PointerEvent) => finish(event);
    const cancel = (event: globalThis.PointerEvent) => finish(event, true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [world, mutate]);

  const openPicker = (kind: "slot" | "bench", index: number) => {
    if (Date.now() - dragEndedAt.current < 350) return;
    setPicking({ kind, index });
  };

  // Escalação salva inválida (lesão, suspensão, venda…): corrige fora do render, uma vez por versão.
  const fixedAt = useRef(-1);
  useEffect(() => {
    if (!needsFix || fixedAt.current === version) return;
    fixedAt.current = version + 1;
    mutate((w) => void ensureLineup(w, user(w)));
  }, [needsFix, version, mutate]);

  const picker = useMemo(() => {
    if (!picking) return null;
    if (picking.kind === "slot") {
      const slot = FORMATIONS[u.formation][picking.index];
      return {
        title: `Escolher ${POS_NAME[slot.pos].toLowerCase()} (${slot.pos})`,
        list: candidates(world, u, slot.pos),
        currentId: u.lineup[picking.index] ?? null,
      };
    }
    return { title: "Escolher reserva", list: candidates(world, u, null), currentId: u.bench[picking.index] ?? null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, world, u, version]);

  const closePicker = useCallback(() => setPicking(null), []);

  const pick = (pid: string) => {
    if (!picking) return;
    const { kind, index } = picking;
    const incoming = world.players[pid];
    const outgoingId = kind === "slot" ? u.lineup[index] : u.bench[index];
    const outgoing = outgoingId ? world.players[outgoingId] : null;
    mutate((w) => {
      const c = user(w);
      if (kind === "slot") assignSlot(c, index, pid);
      else assignBench(c, index, pid);
    });
    setPicking(null);
    if (incoming) toast(outgoing ? `${incoming.name} entra no lugar de ${outgoing.name}.` : `${incoming.name} escalado.`);
  };

  const setFormation = (f: FormationKey) => {
    if (f === u.formation) return;
    mutate((w) => {
      const c = user(w);
      c.formation = f;
      autoLineup(w, c);
    });
    toast(`Formação ${f}: melhor time escalado.`);
  };
  const setTactic = (t: TacticKey) =>
    mutate((w) => {
      user(w).tactic = t;
    });
  const auto = () => {
    mutate((w) => autoLineup(w, user(w)));
    toast("Melhor time escalado.", "good");
  };
  const chooseCaptain = (pid: string) => {
    mutate((w) => void setCaptain(w, pid));
    toast(`${world.players[pid]?.name ?? "Jogador"} é o novo capitão.`);
  };
  const choosePenTaker = (pid: string) => {
    mutate((w) => void setPenTaker(w, pid));
    toast(`${world.players[pid]?.name ?? "Jogador"} vai bater os pênaltis.`);
  };
  const chooseFkTaker = (pid: string) => {
    mutate((w) => void setFkTaker(w, pid));
    toast(`${world.players[pid]?.name ?? "Jogador"} vai cobrar as faltas.`);
  };

  return (
    <>
      <PageHeader
        title="Escalação"
        subtitle="Arraste para trocar de posição ou mandar ao banco; toque para escolher pela lista."
        actions={
          <Button variant="secondary" size="sm" icon={<WandSparkles />} onClick={auto}>
            Escalar o melhor
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
        <div className="min-w-0 space-y-3">
          <Pitch world={world} club={u} onPick={(index) => openPicker("slot", index)} onDragStart={(index, event) => startDrag("slot", index, event)} dropTarget={dropTarget} dragging={!!dragPreview} />
          <ul className="mx-auto flex max-w-[520px] flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-mist" aria-label="Legenda">
            <li className="flex items-center gap-1.5">
              <span className="grid size-4 place-items-center rounded-full bg-gold-400 font-display text-xs font-extrabold text-ink-950">C</span> Capitão
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-warn-400" /> Fora de posição
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-danger-500" /> Muito fora de posição
            </li>
          </ul>
          <SectorStrip sec={sec} />
        </div>

        {/* Um painel só, com abas, que acompanha a rolagem no computador. */}
        <section aria-label="Banco e tática" className="flex min-w-0 flex-col rounded-(--radius-card) bg-ink-800 p-3 shadow-card ring-1 ring-inset ring-white/8 lg:sticky lg:top-36 lg:max-h-[calc(100dvh-10rem)]">
          <Segmented
            ariaLabel="Painel da escalação"
            size="sm"
            value={tab}
            onChange={setTab}
            className="flex w-full max-sm:flex-nowrap sm:flex-nowrap"
            itemClassName="px-1.5"
            options={[
              { value: "bench", label: `Banco ${bench.length}` },
              { value: "tactics", label: "Tática" },
              { value: "instr", label: "Instruções" },
              { value: "leaders", label: "Bola parada" },
            ]}
          />
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5">
            {tab === "bench" && <BenchList bench={bench} onPick={(index) => openPicker("bench", index)} onDragStart={(index, event) => startDrag("bench", index, event)} dropTarget={dropTarget} />}
            {tab === "tactics" && <TacticsPanel formation={u.formation} tactic={u.tactic} onFormation={setFormation} onTactic={setTactic} />}
            {tab === "instr" && <InstructionsPanel />}
            {tab === "leaders" && (
              <LeadersPanel
                starters={starters}
                captain={captain}
                penTaker={penTaker}
                fkTaker={fkTaker}
                onCaptain={chooseCaptain}
                onPenTaker={choosePenTaker}
                onFkTaker={chooseFkTaker}
              />
            )}
          </div>
        </section>
      </div>

      {dragPreview && (
        <div className="pointer-events-none fixed z-50 flex items-center gap-2 rounded-xl bg-ink-900/95 px-2 py-1.5 text-sm font-bold text-snow shadow-xl ring-2 ring-gold-400" style={{ left: dragPreview.x + 14, top: dragPreview.y + 14 }} aria-hidden>
          <PlayerAvatar player={dragPreview.player} size={30} />
          <span>{dragPreview.player.name}</span>
        </div>
      )}

      <PlayerPicker open={!!picker} title={picker?.title ?? ""} list={picker?.list ?? []} currentId={picker?.currentId ?? null} onPick={pick} onClose={closePicker} />
    </>
  );
}

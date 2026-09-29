"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FORMATIONS, POS_NAME, autoLineup, ensureLineup, sectors, setCaptain, setPenTaker, user } from "@/game";
import type { FormationKey, Player, TacticKey } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { BenchCard } from "@/components/lineup/BenchCard";
import { LeadersCard } from "@/components/lineup/LeadersCard";
import { Pitch } from "@/components/lineup/Pitch";
import { PlayerPicker } from "@/components/lineup/PlayerPicker";
import { SectorCard } from "@/components/lineup/SectorCard";
import { TacticsCard } from "@/components/lineup/TacticsCard";
import { assignBench, assignSlot, candidates, lineupNeedsFix } from "@/components/lineup/lineupLogic";

type Picking = { kind: "slot" | "bench"; index: number } | null;

export default function EscalacaoPage() {
  const { world, version, mutate } = useWorld();
  const toast = useToast();
  const [picking, setPicking] = useState<Picking>(null);

  const view = useMemo(() => {
    const u = user(world);
    const starters = u.lineup.map((id) => (id ? world.players[id] : undefined)).filter((p): p is Player => !!p);
    const bench = u.bench.map((id) => world.players[id]).filter((p): p is Player => !!p);
    const captain = u.captain ? world.players[u.captain] ?? null : null;
    const penTaker = u.penTaker ? world.players[u.penTaker] ?? null : null;
    return { u, starters, bench, captain, penTaker, sec: sectors(world, u), needsFix: lineupNeedsFix(world, u) };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, version]);
  const { u, starters, bench, captain, penTaker, sec, needsFix } = view;

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

  return (
    <>
      <PageHeader title="Escalação" subtitle="Toque em uma posição no campo ou no banco para trocar o jogador. O triângulo indica jogador fora da posição de origem." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="min-w-0">
          <Pitch world={world} club={u} onPick={(index) => setPicking({ kind: "slot", index })} />
          <ul className="mx-auto mt-3 flex max-w-[520px] flex-wrap gap-x-4 gap-y-1 text-xs text-mist" aria-label="Legenda">
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
        </div>

        <div className="min-w-0 space-y-5">
          <TacticsCard formation={u.formation} tactic={u.tactic} onFormation={setFormation} onTactic={setTactic} onAuto={auto} />
          <LeadersCard starters={starters} captain={captain} penTaker={penTaker} onCaptain={chooseCaptain} onPenTaker={choosePenTaker} />
          <SectorCard sec={sec} />
          <BenchCard bench={bench} onPick={(index) => setPicking({ kind: "bench", index })} />
        </div>
      </div>

      <PlayerPicker open={!!picker} title={picker?.title ?? ""} list={picker?.list ?? []} currentId={picker?.currentId ?? null} onPick={pick} onClose={closePicker} />
    </>
  );
}

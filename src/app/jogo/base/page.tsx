"use client";

import { useCallback, useMemo, useState } from "react";
import { UserMinus } from "lucide-react";
import { SQUAD_MAX, dismissYouth, promoteYouth, runTrial, trialCost, user } from "@/game";
import type { Player } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/player/ConfirmDialog";
import { AcademyCard } from "@/components/youth/AcademyCard";
import { TrialCard } from "@/components/youth/TrialCard";
import { TrialResultModal } from "@/components/youth/TrialResultModal";
import { YouthCard } from "@/components/youth/YouthCard";

export default function BasePage() {
  const { world, version, mutate, setOverlay } = useWorld();
  const toast = useToast();
  const [trialIds, setTrialIds] = useState<string[] | null>(null);
  const [dismissId, setDismissId] = useState<string | null>(null);

  const data = useMemo(() => {
    const u = user(world);
    const youth = u.youth
      .map((id) => world.players[id])
      .filter((p): p is Player => !!p)
      .sort((a, b) => b.pot - a.pot);
    const full = u.squad.length >= SQUAD_MAX ? `Elenco cheio (${u.squad.length}/${SQUAD_MAX})` : null;
    return { u, youth, full, cost: trialCost(u) };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, version]);
  const { u, youth, full, cost } = data;

  const found = useMemo(() => (trialIds ? trialIds.map((id) => world.players[id]).filter((p): p is Player => !!p) : null), [trialIds, world]);
  const dismissing = dismissId ? world.players[dismissId] ?? null : null;

  const closeTrial = useCallback(() => setTrialIds(null), []);
  const cancelDismiss = useCallback(() => setDismissId(null), []);

  const trial = () => {
    const box: { ids: string[] | null } = { ids: null };
    mutate((w) => {
      const r = runTrial(w);
      box.ids = r ? r.map((p) => p.id) : null;
    });
    if (!box.ids) return toast("Não foi possível fazer a peneira agora.", "bad");
    setTrialIds(box.ids);
  };

  const promote = (p: Player) => {
    if (full) return toast(`${full}. Libere uma vaga antes.`, "bad");
    mutate((w) => promoteYouth(w, p.id));
    toast(`${p.name} subiu para o profissional!`, "good");
  };

  const confirmDismiss = () => {
    if (!dismissing) return;
    const name = dismissing.name;
    mutate((w) => dismissYouth(w, dismissing.id));
    setDismissId(null);
    toast(`${name} foi dispensado da base.`);
  };

  return (
    <>
      <PageHeader
        title="Categorias de base"
        subtitle="Todo início de temporada chega uma nova safra. Quanto melhor a estrutura da base, maior o potencial dos garotos. Aos 19 anos eles sobem ao profissional ou são dispensados."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <TrialCard cost={cost} used={world.trialUsed} money={u.money} onRun={trial} />
        <AcademyCard club={u} />
      </div>

      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">
          Garotos da base <span className="text-mist tabular">({youth.length})</span>
        </h2>
        {full && <p className="text-xs text-warn-400">{full}: libere uma vaga para promover.</p>}
      </div>

      {youth.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {youth.map((p) => (
            <YouthCard
              key={p.id}
              player={p}
              promoteBlocked={full}
              onOpen={() => setOverlay({ kind: "player", pid: p.id })}
              onPromote={() => promote(p)}
              onDismiss={() => setDismissId(p.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState>Nenhum garoto na base agora. Faça uma peneira ou aguarde a próxima safra.</EmptyState>
      )}

      <TrialResultModal players={found} onClose={closeTrial} />
      <ConfirmDialog
        open={!!dismissing}
        title={`Dispensar ${dismissing?.name ?? ""}?`}
        confirmLabel="Dispensar da base"
        confirmIcon={<UserMinus />}
        onConfirm={confirmDismiss}
        onCancel={cancelDismiss}
      >
        O garoto deixa o clube e não pode voltar.
      </ConfirmDialog>
    </>
  );
}

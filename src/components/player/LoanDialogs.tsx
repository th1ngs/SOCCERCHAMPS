"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { ensureLineup, formatMoney, loanIn, loanInTerms, loanOut, loanOutOffers, user } from "@/game";
import type { LoanOutOffer } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { Alert, Badge, EmptyState, KV } from "@/components/ui/primitives";
import { divisionName } from "@/game";
import { cn } from "@/lib/cn";

const LONG = "h-auto! min-h-10 whitespace-normal! py-2 text-center";
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Pedir um jogador da CPU emprestado até o fim da temporada, com opção de compra opcional. */
export function LoanInDialog({ pid, onBack, onDone }: { pid: string; onBack: () => void; onDone: () => void }) {
  const { world, version, mutate } = useWorld();
  const toast = useToast();
  const [withOption, setWithOption] = useState<"no" | "yes">("no");
  const data = useMemo(() => {
    const p = world.players[pid];
    if (!p) return null;
    return { p, club: p.clubId ? (world.clubs[p.clubId] ?? null) : null, q: loanInTerms(world, pid), cash: user(world).money };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, pid, version]);
  if (!data) return null;
  const { p, club, q } = data;
  const weekly = Math.round(p.wage * q.wageShare);

  const confirm = () => {
    let ok = false;
    mutate((w) => {
      ok = loanIn(w, pid, withOption === "yes");
      if (ok) ensureLineup(w, user(w));
    });
    if (!ok) return toast("O empréstimo não foi aceito.", "bad");
    const share = world.players[pid]?.loan?.wageShare ?? q.wageShare;
    toast(`${p.name} chega emprestado${club ? ` pelo ${club.name}` : ""}. Você paga ${pct(share)} do salário.`, "good");
    onDone();
  };

  return (
    <Modal
      open
      onClose={onBack}
      title={`Pedir ${p.name} emprestado`}
      footer={
        <>
          <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack} className="mr-auto">
            Voltar à ficha
          </Button>
          {!q.ok && <span className="self-center text-xs text-mist">{q.reason ?? "O clube não quer emprestar"}</span>}
          <Button variant="primary" icon={<PlaneLanding />} onClick={confirm} disabled={!q.ok} title={q.ok ? undefined : q.reason} className={LONG}>
            Pedir emprestado{withOption === "yes" ? " com opção" : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!q.ok ? (
          <Alert tone="bad">
            <span role="status">{q.reason ?? `O ${club?.name ?? "clube"} não empresta este jogador.`}</span>
          </Alert>
        ) : (
          <Alert tone="good">
            <span>O {club?.name ?? "clube"} aceita emprestar {p.name} até o fim da temporada.</span>
          </Alert>
        )}
        <div className="rounded-xl bg-ink-900/60 px-4 py-1 ring-1 ring-inset ring-white/6">
          {club && (
            <KV label="Clube dono">
              <span className="inline-flex items-center gap-1.5">
                {club.name} <Flag code={club.league} />
              </span>
            </KV>
          )}
          <KV label="Salário do jogador">{formatMoney(p.wage)}/sem</KV>
          <KV label="Você paga">
            {pct(q.wageShare)} • {formatMoney(weekly)}/sem
          </KV>
          <KV label="Taxa de empréstimo">Sem custo</KV>
          <KV label="Volta ao clube">No fim da temporada</KV>
        </div>
        {q.ok && q.buyOption > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-semibold">Opção de compra</p>
            <Segmented
              ariaLabel="Opção de compra"
              options={[
                { value: "no", label: "Sem opção" },
                { value: "yes", label: `Com opção • ${formatMoney(q.buyOption)}` },
              ]}
              value={withOption}
              onChange={setWithOption}
            />
            <p className="mt-1.5 text-xs text-mist">
              {withOption === "yes"
                ? `Você pode comprar ${p.name} por ${formatMoney(q.buyOption)} durante o empréstimo. Em troca, paga uma parte maior do salário.`
                : "Sem opção, o jogador volta ao clube no fim da temporada."}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Emprestar um jogador do usuário a um clube da CPU (até 3 interessados). */
export function LoanOutDialog({ pid, onBack, onDone }: { pid: string; onBack: () => void; onDone: () => void }) {
  const { world, version, mutate } = useWorld();
  const toast = useToast();
  const data = useMemo(() => {
    const p = world.players[pid];
    if (!p) return null;
    return { p, offers: loanOutOffers(world, pid) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, pid, version]);
  const [pick, setPick] = useState<string | null>(null);
  if (!data) return null;
  const { p, offers } = data;
  const chosen: LoanOutOffer | undefined = offers.find((o) => o.club === pick) ?? offers[0];
  const chosenClub = chosen ? world.clubs[chosen.club] : null;

  const confirm = () => {
    if (!chosen) return;
    let ok = false;
    mutate((w) => {
      ok = loanOut(w, pid, chosen.club);
      if (ok) ensureLineup(w, user(w));
    });
    if (!ok) return toast("Não foi possível concluir o empréstimo.", "bad");
    toast(`${p.name} foi emprestado ao ${chosenClub?.name ?? "clube"} até o fim da temporada.`, "good");
    onDone();
  };

  return (
    <Modal
      open
      onClose={onBack}
      title={`Emprestar ${p.name}`}
      footer={
        <>
          <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack} className="mr-auto">
            Voltar à ficha
          </Button>
          {!chosen && <span className="self-center text-xs text-mist">Nenhum clube interessado agora</span>}
          <Button variant="primary" icon={<PlaneTakeoff />} onClick={confirm} disabled={!chosen} className={LONG}>
            {chosenClub ? `Emprestar ao ${chosenClub.short || chosenClub.name}` : "Emprestar"}
          </Button>
        </>
      }
    >
      {offers.length === 0 ? (
        <EmptyState>Nenhum clube quer {p.name} emprestado agora. Tente de novo na próxima semana da janela.</EmptyState>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-mist">Escolha o destino. Jogando como titular, ele evolui mais rápido; volta no fim da temporada.</p>
          <div role="radiogroup" aria-label="Clubes interessados" className="space-y-2">
            {offers.map((o) => {
              const c = world.clubs[o.club];
              if (!c) return null;
              const on = chosen?.club === o.club;
              return (
                <button
                  key={o.club}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPick(o.club)}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
                    on ? "bg-gold-400/10 ring-gold-400/60" : "bg-ink-900/60 ring-white/8 hover:bg-ink-700",
                  )}
                >
                  <Crest club={c} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="truncate">{c.name}</span> <Flag code={c.league} />
                    </span>
                    <span className="block text-xs text-mist">
                      {divisionName(c.div)} • paga {pct(o.wageShare)} do salário ({formatMoney(p.wage * o.wageShare)}/sem)
                    </span>
                  </span>
                  <Badge tone={o.role === "titular" ? "green" : "blue"}>{o.role === "titular" ? "Titular" : "Rotação"}</Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

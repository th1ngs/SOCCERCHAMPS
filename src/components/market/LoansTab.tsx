"use client";

import { useMemo, useState } from "react";
import { BadgeDollarSign, FileText, Undo2 } from "lucide-react";
import { ensureLineup, exerciseBuyOption, formatMoney, recallLoan, user, windowOpen } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Badge, Card, EmptyState, OvrBadge, PosBadge } from "@/components/ui/primitives";
import { windowClosedReason } from "@/components/player/playerInfo";
import { ClubLabel } from "./ClubLabel";
import { loanRows, type LoanRow } from "./transferDerive";

const pct = (v: number) => `${Math.round(v * 100)}%`;

type Pending = { kind: "recall" | "buy"; row: LoanRow } | null;

/** Empréstimos: jogadores do usuário em outros clubes e jogadores emprestados ao usuário. */
export function LoansTab({ onOpen }: { onOpen: (pid: string) => void }) {
  const { world, version, mutate } = useWorld();
  const toast = useToast();
  const [pending, setPending] = useState<Pending>(null);
  const data = useMemo(
    () => ({ ...loanRows(world), open: windowOpen(world), cash: user(world).money, closed: windowClosedReason(world) }),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, version],
  );

  const run = () => {
    if (!pending) return;
    const { kind, row } = pending;
    let ok = false;
    mutate((w) => {
      ok = kind === "recall" ? recallLoan(w, row.p.id) : exerciseBuyOption(w, row.p.id);
      if (ok) ensureLineup(w, user(w));
    });
    setPending(null);
    if (kind === "buy") toast(ok ? `${row.p.name} agora é seu em definitivo.` : "Não foi possível exercer a opção.", ok ? "good" : "bad");
    else toast(ok ? `Empréstimo de ${row.p.name} encerrado.` : "Não foi possível encerrar o empréstimo.", ok ? "good" : "bad");
  };

  const item = (r: LoanRow, dir: "out" | "in") => {
    const apps = r.p.s.apps - (r.p.loan?.apps0 ?? 0);
    const goals = r.p.s.goals - (r.p.loan?.goals0 ?? 0);
    return (
      <li key={r.p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-900/60 px-3 py-2.5 ring-1 ring-inset ring-white/6">
        <PosBadge pos={r.p.pos} />
        <div className="min-w-0 flex-1 basis-44">
          <p className="truncate font-semibold">{r.p.name}</p>
          <p className="flex min-w-0 items-center gap-1 text-xs text-mist">
            {dir === "out" ? "No" : "Do"} <ClubLabel club={dir === "out" ? r.club : r.owner} flag />
          </p>
        </div>
        <OvrBadge value={r.p.ovr} />
        <dl className="grid grid-cols-3 gap-x-4 text-xs sm:basis-72">
          <div>
            <dt className="text-mist">Volta</dt>
            <dd className="font-semibold">T{r.until}</dd>
          </div>
          <div>
            <dt className="text-mist">{dir === "out" ? "No empréstimo" : "Pelo clube"}</dt>
            <dd className="font-semibold tabular">
              {apps} J • {goals} G
            </dd>
          </div>
          <div>
            <dt className="text-mist">Você paga</dt>
            <dd className="font-semibold tabular">{formatMoney(r.userPays)}/sem</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          {dir === "in" && r.buyOption != null && (
            <Button variant="secondary" icon={<BadgeDollarSign />} onClick={() => setPending({ kind: "buy", row: r })} disabled={r.buyOption > data.cash} title={r.buyOption > data.cash ? "Caixa insuficiente" : undefined}>
              Comprar • {formatMoney(r.buyOption)}
            </Button>
          )}
          <Button variant="ghost" icon={<Undo2 />} onClick={() => setPending({ kind: "recall", row: r })} disabled={!data.open} title={data.open ? undefined : data.closed}>
            {dir === "out" ? "Chamar de volta" : "Devolver"}
          </Button>
          <Button variant="ghost" size="icon" icon={<FileText />} aria-label={`Ver ficha de ${r.p.name}`} title="Ver ficha" onClick={() => onOpen(r.p.id)} />
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {!data.open && (
        <p className="text-sm text-mist">
          <Badge tone="orange">Janela fechada</Badge> Encerrar empréstimos só com a janela aberta. {data.closed}.
        </p>
      )}
      <Card title={`Emprestados por você (${data.out.length})`}>
        {data.out.length === 0 ? (
          <EmptyState>Nenhum jogador emprestado. Na ficha de um jogador do elenco (ou garoto da base com 17+), toque em “Emprestar” para dar minutos a ele em outro clube.</EmptyState>
        ) : (
          <ul className="space-y-2">{data.out.map((r) => item(r, "out"))}</ul>
        )}
      </Card>
      <Card title={`Emprestados ao seu clube (${data.in.length})`}>
        {data.in.length === 0 ? (
          <EmptyState>Nenhum jogador emprestado ao seu clube. Na ficha de um jogador de outro clube, toque em “Pedir emprestado”.</EmptyState>
        ) : (
          <ul className="space-y-2">{data.in.map((r) => item(r, "in"))}</ul>
        )}
      </Card>

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.kind === "buy" ? `Comprar ${pending.row.p.name}?` : `Encerrar o empréstimo de ${pending?.row.p.name ?? ""}?`}
        footer={
          pending && (
            <>
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancelar
              </Button>
              {pending.kind === "buy" ? (
                <Button variant="primary" icon={<BadgeDollarSign />} onClick={run}>
                  Exercer opção • {formatMoney(pending.row.buyOption ?? 0)}
                </Button>
              ) : (
                <Button variant="primary" icon={<Undo2 />} onClick={run}>
                  {pending.row.owner?.id === world.userClub ? "Chamar de volta" : "Devolver ao clube"}
                </Button>
              )}
            </>
          )
        }
      >
        {pending?.kind === "buy" ? (
          <p className="text-sm text-mist">
            {formatMoney(pending.row.buyOption ?? 0)} saem do caixa agora e {pending.row.p.name} passa a ser do seu clube em definitivo.
          </p>
        ) : pending ? (
          <p className="text-sm text-mist">
            {pending.row.owner?.id === world.userClub
              ? `${pending.row.p.name} volta ao seu elenco agora. Você volta a pagar 100% do salário (hoje ${pct(1 - pending.row.wageShare)}).`
              : `${pending.row.p.name} volta ao ${pending.row.owner?.name ?? "clube dono"} agora e deixa o seu elenco.`}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}

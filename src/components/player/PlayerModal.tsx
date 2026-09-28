"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowUpFromLine, Crown, Handshake, PenLine, Send, Tag, Target, UserMinus, UserPlus, UserX } from "lucide-react";
import {
  SQUAD_MAX,
  available,
  dismissYouth,
  ensureLineup,
  formatMoney,
  promoteYouth,
  release,
  releaseCost,
  renew,
  renewDemand,
  setCaptain,
  setPenTaker,
  user,
  valueOf,
  windowOpen,
} from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { BidPanel } from "./BidPanel";
import { PlayerHeader } from "./PlayerHeader";
import { PlayerStats } from "./PlayerStats";
import { RenewPanel, type RenewYears } from "./RenewPanel";
import { useBidFlow } from "./useBidFlow";
import { windowClosedReason, yearsText } from "./playerInfo";

type View =
  | { kind: "info" }
  | { kind: "renew"; ask: number; years: RenewYears }
  | { kind: "bid" }
  | { kind: "confirmRelease" }
  | { kind: "confirmDismiss" };

/** Rótulos longos com custo quebram linha em telas estreitas em vez de estourar o diálogo. */
const LONG = "h-auto! min-h-10 whitespace-normal! py-2 text-center";

/** Texto do motivo ao lado de um botão desabilitado. */
function Reason({ children }: { children: ReactNode }) {
  return <span className="self-center text-xs text-mist">{children}</span>;
}

/** Ficha do jogador: dados, renovação, venda, funções, rescisão, promoção da base e propostas. */
export function PlayerModal({ pid, onClose }: { pid: string; onClose: () => void }) {
  const { world, version, mutate } = useWorld();
  const toast = useToast();
  const [view, setView] = useState<View>({ kind: "info" });

  // O Modal refaz o foco quando onClose muda; mantém uma referência estável.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  const close = useCallback(() => closeRef.current(), []);

  const bid = useBidFlow(pid, close);

  const info = useMemo(() => {
    const p = world.players[pid];
    if (!p) return null;
    const u = user(world);
    const club = p.clubId ? world.clubs[p.clubId] ?? null : null;
    return {
      p,
      u,
      club,
      own: p.clubId === u.id,
      value: valueOf(p),
      open: windowOpen(world),
      squadFull: u.squad.length >= SQUAD_MAX,
      captain: u.captain === p.id,
      penTaker: u.penTaker === p.id,
      fee: releaseCost(p),
    };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, pid, version]);

  if (!info) return null;
  const { p, u, club, own, value, open, squadFull, captain, penTaker, fee } = info;
  const fullReason = `Elenco cheio (${u.squad.length}/${SQUAD_MAX})`;
  const back = () => setView({ kind: "info" });

  // ---------- Ações ----------
  const promote = () => {
    mutate((w) => promoteYouth(w, pid));
    toast(`${p.name} subiu para o profissional!`, "good");
    close();
  };
  const doDismiss = () => {
    const name = p.name;
    close();
    mutate((w) => dismissYouth(w, pid));
    toast(`${name} foi dispensado da base.`);
  };
  const openRenew = () => {
    let ask = 0;
    mutate((w) => {
      ask = renewDemand(w, w.players[pid]);
    });
    setView({ kind: "renew", ask, years: "3" });
  };
  const doRenew = (years: number) => {
    mutate((w) => renew(w, pid, years));
    toast(`${p.name} renovou por ${yearsText(years)}.`, "good");
    back();
  };
  const toggleList = () => {
    const listed = !p.listed;
    mutate((w) => {
      w.players[pid].listed = listed;
    });
    toast(listed ? `${p.name} está na lista de transferências. Aguarde propostas nas janelas.` : `${p.name} saiu da lista de transferências.`);
  };
  const makeCaptain = () => {
    mutate((w) => void setCaptain(w, pid));
    toast(`${p.name} é o novo capitão.`, "good");
  };
  const makePenTaker = () => {
    mutate((w) => void setPenTaker(w, pid));
    toast(`${p.name} vai bater os pênaltis.`, "good");
  };
  const doRelease = () => {
    const name = p.name;
    close();
    mutate((w) => {
      release(w, pid);
      ensureLineup(w, user(w));
    });
    toast(`${name} foi dispensado. Multa paga: ${formatMoney(fee)}.`);
  };
  const openBid = () => {
    bid.start();
    setView({ kind: "bid" });
  };

  // ---------- Conteúdo por sub-tela ----------
  let title: ReactNode = p.name;
  let body: ReactNode;
  let footer: ReactNode;
  let size: "md" | "lg" = "md";

  switch (view.kind) {
    case "renew": {
      title = `Renovar com ${p.name}`;
      const y = Number(view.years);
      body = <RenewPanel player={p} ask={view.ask} years={view.years} onYears={(years) => setView({ ...view, years })} />;
      footer = (
        <>
          <Button variant="ghost" icon={<ArrowLeft />} onClick={back} className="mr-auto">
            Voltar
          </Button>
          <Button variant="primary" icon={<PenLine />} onClick={() => doRenew(y)} className={LONG}>
            Renovar por {yearsText(y)} • {formatMoney(view.ask)}/sem
          </Button>
        </>
      );
      break;
    }
    case "bid": {
      title = club ? `Proposta por ${p.name}` : `Contratar ${p.name}`;
      const d = bid.deal;
      body = (
        <BidPanel player={p} club={club} value={value} cash={u.money} amount={bid.amount} onAmount={bid.setAmount} outcome={bid.outcome} onSubmit={bid.send} />
      );
      footer = (
        <>
          <Button variant="ghost" icon={<ArrowLeft />} onClick={back} className="mr-auto">
            Voltar
          </Button>
          <Button variant={d ? "secondary" : "primary"} icon={<Send />} onClick={bid.send}>
            {club ? "Enviar proposta" : "Negociar contratação"}
          </Button>
          {d && (
            <Button variant="primary" icon={<Handshake />} onClick={() => bid.close(d)} className={LONG}>
              {d.counter ? `Aceitar contraproposta • ${formatMoney(d.fee)}` : `Fechar contratação • ${d.fee ? formatMoney(d.fee) : "sem custo"}`}
            </Button>
          )}
        </>
      );
      break;
    }
    case "confirmRelease":
      title = `Rescindir com ${p.name}?`;
      body = (
        <p className="text-sm text-mist">
          A multa rescisória é de <b className="text-snow">{formatMoney(fee)}</b>, descontada do caixa agora. O jogador vira agente livre e pode assinar com outro clube.
        </p>
      );
      footer = (
        <>
          <Button variant="ghost" onClick={back}>
            Cancelar
          </Button>
          <Button variant="danger" icon={<UserX />} onClick={doRelease} className={LONG}>
            Rescindir • {formatMoney(fee)}
          </Button>
        </>
      );
      break;
    case "confirmDismiss":
      title = `Dispensar ${p.name}?`;
      body = <p className="text-sm text-mist">O garoto deixa o clube e não pode voltar.</p>;
      footer = (
        <>
          <Button variant="ghost" onClick={back}>
            Cancelar
          </Button>
          <Button variant="danger" icon={<UserMinus />} onClick={doDismiss}>
            Dispensar da base
          </Button>
        </>
      );
      break;
    default: {
      size = "lg";
      const canLead = available(p);
      body = (
        <div className="space-y-5">
          <PlayerHeader player={p} club={club} own={own} captain={own && captain} penTaker={own && penTaker} />
          <PlayerStats player={p} />
          {own && !p.youth && (
            <div className="rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6">
              <p className="mb-2 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-gold-400">Funções em campo</p>
              <div className="flex flex-wrap items-center gap-2">
                {captain ? (
                  <span className="inline-flex h-10 items-center gap-2 px-2 text-sm text-gold-300">
                    <Crown className="size-4" aria-hidden /> É o capitão
                  </span>
                ) : (
                  <Button variant="ghost" icon={<Crown />} onClick={makeCaptain} disabled={!canLead} title={canLead ? undefined : "Indisponível (DM ou suspenso)"}>
                    Definir como capitão
                  </Button>
                )}
                {penTaker ? (
                  <span className="inline-flex h-10 items-center gap-2 px-2 text-sm text-info-400">
                    <Target className="size-4" aria-hidden /> Bate os pênaltis
                  </span>
                ) : (
                  <Button variant="ghost" icon={<Target />} onClick={makePenTaker} disabled={!canLead} title={canLead ? undefined : "Indisponível (DM ou suspenso)"}>
                    Batedor de pênaltis
                  </Button>
                )}
                {!canLead && <Reason>Indisponível: está no DM ou suspenso.</Reason>}
              </div>
            </div>
          )}
        </div>
      );

      if (own && p.youth) {
        footer = (
          <>
            <Button variant="danger" icon={<UserMinus />} onClick={() => setView({ kind: "confirmDismiss" })} className="mr-auto">
              Dispensar da base
            </Button>
            {squadFull && <Reason>{fullReason}</Reason>}
            <Button variant="primary" icon={<ArrowUpFromLine />} onClick={promote} disabled={squadFull} title={squadFull ? fullReason : undefined}>
              Promover ao profissional
            </Button>
          </>
        );
      } else if (own) {
        footer = (
          <>
            <Button variant="danger" icon={<UserX />} onClick={() => setView({ kind: "confirmRelease" })} className="mr-auto">
              Rescindir contrato
            </Button>
            <Button variant="secondary" icon={<Tag />} onClick={toggleList}>
              {p.listed ? "Tirar da lista" : "Colocar à venda"}
            </Button>
            {p.contract <= 2 && (
              <Button variant="primary" icon={<PenLine />} onClick={openRenew}>
                Renovar contrato
              </Button>
            )}
          </>
        );
      } else {
        const reason = !open ? windowClosedReason(world) : squadFull ? fullReason : null;
        footer = (
          <>
            {reason && <Reason>{reason}</Reason>}
            <Button variant="primary" icon={club ? <Send /> : <UserPlus />} onClick={openBid} disabled={!!reason} title={reason ?? undefined}>
              {club ? "Fazer proposta" : "Contratar sem custo"}
            </Button>
          </>
        );
      }
    }
  }

  return (
    <Modal open onClose={close} title={title} size={size} footer={footer}>
      {body}
    </Modal>
  );
}

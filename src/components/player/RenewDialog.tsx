"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, PenLine } from "lucide-react";
import { contractChance, formatMoney, negotiateRenewal, renewAsk } from "@/game";
import type { ContractResponse, Terms } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { KV } from "@/components/ui/primitives";
import { contractText, yearsText } from "./playerInfo";
import { TermsPanel } from "./TermsPanel";

/** Renovação de contrato com os mesmos termos da contratação (salário, anos, luvas e papel). */
export function RenewDialog({ pid, onBack }: { pid: string; onBack: () => void }) {
  const { world, version, mutate } = useWorld();
  const toast = useToast();
  const p = world.players[pid];
  const [ask] = useState<Terms | null>(() => (p ? renewAsk(world, pid) : null));
  const [terms, setTerms] = useState<Terms | null>(ask);
  const [reply, setReply] = useState<ContractResponse | null>(null);

  const chance = useMemo(
    () => (terms && p ? contractChance(world, pid, terms) : 0),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, pid, version, terms],
  );

  if (!p || !ask || !terms) return null;
  const name = p.name;

  const send = () => {
    let r: ContractResponse | null = null;
    mutate((w) => {
      r = negotiateRenewal(w, pid, terms);
    });
    const res = r as ContractResponse | null;
    if (res?.status === "accepted") {
      toast(`${name} renovou por ${yearsText(terms.years)} a ${formatMoney(terms.wage)}/sem.`, "good");
      onBack();
      return;
    }
    setReply(res);
  };

  return (
    <Modal
      open
      onClose={onBack}
      title={`Renovar com ${name}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack} className="mr-auto">
            Voltar à ficha
          </Button>
          <Button variant="primary" icon={<PenLine />} onClick={send} className="h-auto! min-h-10 whitespace-normal! py-2 text-center">
            Propor renovação • {formatMoney(terms.wage)}/sem
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-ink-900/60 px-4 py-1 ring-1 ring-inset ring-white/6">
          <KV label="Contrato atual">{contractText(p.contract)}</KV>
          <KV label="Salário atual">{formatMoney(p.wage)}/sem</KV>
          <KV label="Multa rescisória atual">{p.releaseClause ? formatMoney(p.releaseClause) : "—"}</KV>
        </div>
        <TermsPanel
          ask={ask}
          terms={terms}
          onChange={(t) => {
            setTerms(t);
            if (reply?.status !== "counter") setReply(null);
          }}
          chance={chance}
          reply={reply}
          onUseCounter={() => {
            if (reply?.counter) setTerms(reply.counter);
            setReply(null);
          }}
          agreed={false}
          currentWage={p.wage}
        />
        <p className="text-xs text-mist">Renovar melhora o moral do jogador e atualiza a multa rescisória.</p>
      </div>
    </Modal>
  );
}

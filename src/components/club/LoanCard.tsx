"use client";

import { Banknote, HandCoins } from "lucide-react";
import { formatMoney, loanBalance, LOAN_INTEREST, LOAN_OPTIONS, LOAN_WEEKS, repayLoan, takeLoan, user } from "@/game";
import { Button } from "@/components/ui/Button";
import { Card, KV, Meter } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useWorld } from "@/components/game/GameProvider";
import { loanWeekly } from "./finance";

/** Empréstimo bancário: contratar (sem outro ativo) ou quitar o saldo. */
export function LoanCard() {
  const { world: w, mutate } = useWorld();
  const toast = useToast();
  const u = user(w);
  const loan = u.loan;

  const take = (amount: number) => {
    let ok = false;
    mutate((x) => {
      ok = takeLoan(x, amount);
    });
    toast(ok ? `Empréstimo de ${formatMoney(amount)} depositado no caixa.` : "O banco recusou o empréstimo.", ok ? "good" : "bad");
  };

  const repay = () => {
    let ok = false;
    mutate((x) => {
      ok = repayLoan(x);
    });
    toast(ok ? "Empréstimo quitado." : "Caixa insuficiente para quitar o empréstimo.", ok ? "good" : "bad");
  };

  if (loan) {
    const remaining = loanBalance(u);
    const paid = LOAN_WEEKS - loan.weeksLeft;
    const reason = u.money < remaining ? `Faltam ${formatMoney(remaining - u.money)} em caixa` : null;
    return (
      <Card title="Empréstimo bancário">
        <KV label="Valor contratado">{formatMoney(loan.principal)}</KV>
        <KV label="Parcela semanal"><span className="text-warn-400">{formatMoney(loan.weekly)}</span></KV>
        <KV label="Semanas restantes">{loan.weeksLeft} de {LOAN_WEEKS}</KV>
        <KV label="Saldo devedor">{formatMoney(remaining)}</KV>
        <Meter value={(paid / LOAN_WEEKS) * 100} label="Parcelas pagas" className="mt-3 h-2 w-full" />
        <div className="mt-4 flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          {reason && <span className="text-xs text-mist">{reason}</span>}
          <Button variant="secondary" icon={<Banknote />} disabled={!!reason} title={reason ?? undefined} onClick={repay}>
            Quitar agora • {formatMoney(remaining)}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Empréstimo bancário">
      <p className="text-sm text-mist">
        Dinheiro na hora para reforçar o elenco ou a estrutura. Juros de {Math.round(LOAN_INTEREST * 100)}% no total, pagos em {LOAN_WEEKS} parcelas
        semanais descontadas do caixa. Só um empréstimo por vez.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {LOAN_OPTIONS.map((amount) => (
          <li key={amount} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-950/35 px-3 py-2 ring-1 ring-inset ring-white/6">
            <span className="text-sm">
              <span className="text-mist">Parcela </span>
              <b className="tabular">{formatMoney(loanWeekly(amount))}/sem</b>
            </span>
            <Button variant="outline" icon={<HandCoins />} onClick={() => take(amount)}>
              Pegar {formatMoney(amount)}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

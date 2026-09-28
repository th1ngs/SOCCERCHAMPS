import { CalendarClock, Lock, Wallet } from "lucide-react";
import { formatMoney } from "@/game";
import { Alert } from "@/components/ui/primitives";

/** Situação da janela de transferências e caixa do clube. */
export function WindowAlert({ openUntil, nextOpen, money }: { openUntil: number | null; nextOpen: number | null; money: number }) {
  const open = openUntil !== null;
  return (
    <Alert tone={open ? "good" : "warn"} className="mb-4 justify-between">
      <span className="flex items-center gap-2">
        {open ? <CalendarClock className="size-4 shrink-0 text-pitch-400" aria-hidden /> : <Lock className="size-4 shrink-0 text-warn-400" aria-hidden />}
        {open ? (
          <span>
            Janela <b>aberta</b> até a semana {openUntil}.
          </span>
        ) : (
          <span>
            Janela <b>fechada</b>. {nextOpen !== null ? `Abre na semana ${nextOpen}.` : "Reabre na pré-temporada."} Você pode pesquisar e planejar.
          </span>
        )}
      </span>
      <span className="flex items-center gap-1.5">
        <Wallet className="size-4 text-mist" aria-hidden />
        Caixa: <b className={money < 0 ? "text-danger-400 tabular" : "tabular"}>{formatMoney(money)}</b>
      </span>
    </Alert>
  );
}

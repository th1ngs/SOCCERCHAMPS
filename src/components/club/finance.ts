// Derivações financeiras da tela do clube.
import { LOAN_INTEREST, LOAN_WEEKS } from "@/game";
import type { FinanceCategory, FinanceLog, World } from "@/game/types";

export const FIN_CATS: { key: FinanceCategory; label: string }[] = [
  { key: "tickets", label: "Bilheteria" },
  { key: "tv", label: "Cota de TV" },
  { key: "sponsor", label: "Patrocínio" },
  { key: "prize", label: "Premiações" },
  { key: "transfers", label: "Transferências" },
  { key: "wages", label: "Folha salarial" },
  { key: "loan", label: "Empréstimo" },
  { key: "other", label: "Outros (estrutura, multas)" },
];

export const seasonNet = (fs: FinanceLog): number => FIN_CATS.reduce((s, c) => s + (fs[c.key] ?? 0), 0);

export interface BalancePoint {
  week: number;
  balance: number;
}

/** Saldo semana a semana na temporada atual. */
export const balanceSeries = (w: World): BalancePoint[] =>
  w.finance.filter((f) => f.season === w.season).map((f) => ({ week: f.week, balance: f.balance }));

/** Parcela semanal de um empréstimo (juros totais de LOAN_INTEREST em LOAN_WEEKS semanas). */
export const loanWeekly = (amount: number): number => Math.round((amount * (1 + LOAN_INTEREST)) / LOAN_WEEKS);


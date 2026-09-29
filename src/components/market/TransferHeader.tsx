import type { ReactNode } from "react";
import { CalendarClock, Lock, Receipt, Siren, Users, Wallet, Banknote } from "lucide-react";
import { formatMoney } from "@/game";
import { cn } from "@/lib/cn";
import type { MarketHeader, WindowInfo } from "./transferDerive";

function Tile({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "warn" | "bad" | "gold" }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl bg-ink-800 px-3 py-2.5 shadow-card ring-1 ring-inset",
        tone === "good" ? "ring-pitch-500/35" : tone === "warn" ? "ring-warn-400/35" : tone === "bad" ? "ring-danger-500/40" : tone === "gold" ? "ring-gold-400/50" : "ring-white/8",
      )}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mist">
        <span className="[&_svg]:size-3.5" aria-hidden>
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-0.5 truncate font-display text-lg font-extrabold tabular leading-tight sm:text-xl">{value}</p>
      {hint && <p className="truncate text-xs text-mist">{hint}</p>}
    </div>
  );
}

/** Situação da janela, caixa, folha, elenco e parcelas a pagar. */
export function TransferHeader({ win, h }: { win: WindowInfo; h: MarketHeader }) {
  const full = h.squad >= h.squadMax;
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <div className="col-span-2 sm:col-span-3 lg:col-span-1">
        <Tile
          icon={win.deadline ? <Siren /> : win.open ? <CalendarClock /> : <Lock />}
          label="Janela"
          tone={win.deadline ? "gold" : win.open ? "good" : "warn"}
          value={win.deadline ? "Dia do fechamento" : win.open ? `Aberta até a sem. ${win.until}` : "Fechada"}
          hint={win.deadline ? "Última semana da janela." : win.open ? "Negócios liberados." : win.next !== null ? `Abre na semana ${win.next}.` : "Reabre na pré-temporada."}
        />
      </div>
      <Tile icon={<Wallet />} label="Caixa" value={<span className={h.cash < 0 ? "text-danger-400" : undefined}>{formatMoney(h.cash)}</span>} />
      <Tile icon={<Banknote />} label="Folha semanal" value={formatMoney(h.wageBill)} hint="Salários pagos pelo clube" />
      <Tile icon={<Users />} label="Elenco" tone={full ? "bad" : undefined} value={`${h.squad}/${h.squadMax}`} hint={full ? "Cheio: libere vagas" : `${h.squadMax - h.squad} vagas livres`} />
      <Tile
        icon={<Receipt />}
        label="Parcelas a pagar"
        tone={h.payTotal > h.cash ? "bad" : undefined}
        value={h.payCount ? formatMoney(h.payTotal) : "Nenhuma"}
        hint={h.nextPay ? `Próxima: ${formatMoney(h.nextPay.amount)} na sem. ${h.nextPay.week}` : "Sem compromissos"}
      />
    </div>
  );
}

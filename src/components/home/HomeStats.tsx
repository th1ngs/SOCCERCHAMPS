"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Landmark, ListOrdered, ShieldCheck, Wallet } from "lucide-react";
import { formatMoney, position, table, user, userForm } from "@/game";
import { FormChips } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";
import { confidenceTone } from "./derive";

function Stat({ href, icon, label, children }: { href: string; icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-3 rounded-2xl bg-ink-800 px-3 py-2.5 ring-1 ring-inset ring-white/8 transition-colors hover:bg-ink-700">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-mist [&_svg]:size-[18px]">{icon}</span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-mist">{label}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 font-display text-lg font-bold tabular">{children}</span>
      </span>
    </Link>
  );
}

/** Números da situação num relance: liga, forma, diretoria e caixa. */
export function HomeStats() {
  const { world: w, version } = useWorld();
  const d = useMemo(() => {
    void version;
    const u = user(w);
    const row = table(w, u.div).find((r) => r.id === u.id);
    return { u, pos: position(w, u.id), pts: row?.p ?? 0, played: row?.j ?? 0, form: userForm(w, 5) };
  }, [w, version]);
  const conf = Math.round(w.board.conf);
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Stat href="/jogo/competicoes" icon={<ListOrdered />} label="Liga">
        {d.played ? (
          <>
            {d.pos}º <span className="text-sm font-semibold text-mist">• {d.pts} pts</span>
          </>
        ) : (
          <span className="text-base text-mist">Não começou</span>
        )}
      </Stat>
      <Stat href="/jogo/competicoes" icon={<ShieldCheck />} label="Forma">
        {d.form.length ? <FormChips form={d.form} /> : <span className="text-base text-mist">—</span>}
      </Stat>
      <Stat href="/jogo/clube" icon={<Landmark />} label="Diretoria">
        <span className={cn(confidenceTone(conf).cls)}>{conf}%</span>
        <span className="truncate text-sm font-semibold text-mist">• {w.board.label}</span>
      </Stat>
      <Stat href="/jogo/clube" icon={<Wallet />} label="Caixa">
        <span className={cn("truncate", d.u.money < 0 && "text-danger-400")}>{formatMoney(d.u.money)}</span>
      </Stat>
    </div>
  );
}

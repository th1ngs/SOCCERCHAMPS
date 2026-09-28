"use client";

import type { ReactNode } from "react";
import { Crown, Target } from "lucide-react";
import type { Player } from "@/game/types";
import { Card } from "@/components/ui/primitives";

function LeaderSelect({
  label,
  icon,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  icon: ReactNode;
  value: Player | null;
  options: Player[];
  onChange: (pid: string) => void;
  hint: string;
}) {
  const inList = !!value && options.some((p) => p.id === value.id);
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold [&_svg]:size-4 [&_svg]:text-gold-400">
        {icon}
        {label}
      </span>
      <select
        value={value?.id ?? ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-11 w-full rounded-xl bg-ink-950/70 px-3 text-snow ring-1 ring-inset ring-white/12 focus:outline-2 focus:outline-gold-400"
      >
        {!value && <option value="">Escolher…</option>}
        {value && !inList && (
          <option value={value.id}>
            {value.pos} • {value.name} (fora dos titulares)
          </option>
        )}
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.pos} • {p.name} ({Math.round(p.ovr)})
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-mist">{hint}</span>
    </label>
  );
}

/** Capitão e batedor de pênaltis, escolhidos entre os titulares. */
export function LeadersCard({
  starters,
  captain,
  penTaker,
  onCaptain,
  onPenTaker,
}: {
  starters: Player[];
  captain: Player | null;
  penTaker: Player | null;
  onCaptain: (pid: string) => void;
  onPenTaker: (pid: string) => void;
}) {
  return (
    <Card title="Liderança">
      <div className="space-y-4">
        <LeaderSelect label="Capitão" icon={<Crown />} value={captain} options={starters} onChange={onCaptain} hint="Em campo, dá +1,5% em todos os setores (+3% com Liderança)." />
        <LeaderSelect
          label="Batedor de pênaltis"
          icon={<Target />}
          value={penTaker}
          options={starters.filter((p) => p.pos !== "GOL")}
          onChange={onPenTaker}
          hint="Cobra os pênaltis no jogo e abre a disputa por pênaltis."
        />
      </div>
    </Card>
  );
}

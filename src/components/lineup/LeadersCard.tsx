"use client";

import type { ReactNode } from "react";
import { Crosshair, Crown, Target } from "lucide-react";
import { attr, hasTrait } from "@/game";
import type { TraitKey } from "@/game";
import type { Player } from "@/game/types";
import { Card } from "@/components/ui/primitives";

function LeaderSelect({
  label,
  icon,
  value,
  options,
  onChange,
  hint,
  detail,
}: {
  label: string;
  icon: ReactNode;
  value: Player | null;
  options: Player[];
  onChange: (pid: string) => void;
  hint: string;
  /** Texto extra de cada opção (ex.: bola parada). */
  detail?: (p: Player) => string;
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
            {p.pos} • {p.name} ({detail ? detail(p) : Math.round(p.ovr)})
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-mist">{hint}</span>
    </label>
  );
}

/** Bola parada e a habilidade que mais ajuda nela ("BP 82 • Batedor de falta"). */
const setPiece = (key: TraitKey, label: string) => (p: Player) => `BP ${attr(p, "bp")}${hasTrait(p, key) ? ` • ${label}` : ""}`;

/** Capitão, batedor de pênaltis e batedor de faltas, escolhidos entre os titulares. */
export function LeadersCard({
  starters,
  captain,
  penTaker,
  fkTaker,
  onCaptain,
  onPenTaker,
  onFkTaker,
}: {
  starters: Player[];
  captain: Player | null;
  penTaker: Player | null;
  fkTaker: Player | null;
  onCaptain: (pid: string) => void;
  onPenTaker: (pid: string) => void;
  onFkTaker: (pid: string) => void;
}) {
  const takers = starters.filter((p) => p.pos !== "GOL").sort((a, b) => attr(b, "bp") - attr(a, "bp"));
  return (
    <Card title="Liderança e bola parada">
      <div className="space-y-4">
        <LeaderSelect label="Capitão" icon={<Crown />} value={captain} options={starters} onChange={onCaptain} hint="Em campo, dá +1,5% em todos os setores (+3% com a habilidade Líder)." />
        <LeaderSelect
          label="Batedor de pênaltis"
          icon={<Target />}
          value={penTaker}
          options={takers}
          onChange={onPenTaker}
          detail={setPiece("penalti", "Cobrador")}
          hint="Cobra os pênaltis e abre a disputa. Conta a bola parada (BP), a finalização e a habilidade Cobrador de pênalti."
        />
        <LeaderSelect
          label="Batedor de faltas"
          icon={<Crosshair />}
          value={fkTaker}
          options={takers}
          onChange={onFkTaker}
          detail={setPiece("faltas", "Batedor de falta")}
          hint="Cobra as faltas perto da área. Com a habilidade Batedor de falta, a cobrança fica 70% mais perigosa."
        />
      </div>
    </Card>
  );
}

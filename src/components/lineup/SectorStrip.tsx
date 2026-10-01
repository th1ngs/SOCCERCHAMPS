import type { SectorStrength } from "@/game/types";
import { sectorWidth } from "./lineupLogic";

const ROWS: { k: keyof SectorStrength; label: string }[] = [
  { k: "G", label: "Gol" },
  { k: "D", label: "Defesa" },
  { k: "M", label: "Meio" },
  { k: "A", label: "Ataque" },
];

/** Força por setor do time titular, numa faixa compacta. */
export function SectorStrip({ sec }: { sec: SectorStrength }) {
  return (
    <dl className="grid grid-cols-4 gap-2" aria-label="Força por setor">
      {ROWS.map(({ k, label }) => (
        <div key={k} className="rounded-xl bg-ink-800 px-2.5 py-1.5 ring-1 ring-inset ring-white/8">
          <div className="flex items-baseline justify-between gap-1">
            <dt className="text-xs text-mist">{label}</dt>
            <dd className="font-display text-base font-bold tabular">{Math.round(sec[k])}</dd>
          </div>
          <dd className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8" aria-hidden>
            <span className="block h-full rounded-full bg-linear-to-r from-pitch-500 to-gold-400" style={{ width: `${sectorWidth(sec[k])}%` }} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

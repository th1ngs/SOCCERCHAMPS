import type { SectorStrength } from "@/game/types";
import { Card } from "@/components/ui/primitives";
import { sectorWidth } from "./lineupLogic";

const ROWS: { k: keyof SectorStrength; label: string }[] = [
  { k: "G", label: "Goleiro" },
  { k: "D", label: "Defesa" },
  { k: "M", label: "Meio-campo" },
  { k: "A", label: "Ataque" },
];

/** Força por setor do time titular. */
export function SectorCard({ sec }: { sec: SectorStrength }) {
  return (
    <Card title="Força por setor">
      <dl className="space-y-2.5">
        {ROWS.map(({ k, label }) => (
          <div key={k} className="grid grid-cols-[88px_1fr_32px] items-center gap-3">
            <dt className="text-sm text-mist">{label}</dt>
            <dd className="h-2 overflow-hidden rounded-full bg-white/8" aria-hidden>
              <span className="block h-full rounded-full bg-linear-to-r from-pitch-500 to-gold-400" style={{ width: `${sectorWidth(sec[k])}%` }} />
            </dd>
            <dd className="text-right font-display text-lg font-bold tabular">{Math.round(sec[k])}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

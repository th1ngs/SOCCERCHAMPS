"use client";

import { ArrowUpCircle, Binoculars, Building2, Dumbbell, GraduationCap, type LucideIcon } from "lucide-react";
import { formatMoney, upgrade, UPGRADES, user } from "@/game";
import type { Club, UpgradeKey } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";

const ICON: Record<UpgradeKey, LucideIcon> = { academy: GraduationCap, scouting: Binoculars, training: Dumbbell, stadium: Building2 };
const KEYS: UpgradeKey[] = ["academy", "scouting", "training", "stadium"];

function Pips({ level, max }: { level: number; max: number }) {
  return (
    <span className="inline-flex gap-1" aria-label={`Nível ${level} de ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cn("h-2 w-5 rounded-full", i < level ? "bg-gold-400" : "bg-white/10")} />
      ))}
    </span>
  );
}

/** Estado e custo de uma melhoria para o clube. */
function upgradeInfo(k: UpgradeKey, u: Club) {
  const d = UPGRADES[k];
  const cost = d.cost(u);
  const maxed = k === "stadium" ? u.cap >= d.max : d.level(u) >= d.max;
  const reason = maxed ? "Nível máximo" : u.money < cost ? `Faltam ${formatMoney(cost - u.money)} em caixa` : null;
  return { d, cost, maxed, reason };
}

/** Categoria de base, CT e estádio. */
export function StructureCard() {
  const { world: w, mutate } = useWorld();
  const toast = useToast();
  const u = user(w);

  const buy = (k: UpgradeKey) => {
    let ok = false;
    mutate((x) => {
      ok = upgrade(x, k);
    });
    toast(ok ? `${UPGRADES[k].name}: melhoria concluída!` : "Não foi possível fazer a melhoria.", ok ? "good" : "bad");
  };

  return (
    <Card title="Estrutura">
      <ul className="flex flex-col gap-3">
        {KEYS.map((k) => {
          const { d, cost, maxed, reason } = upgradeInfo(k, u);
          const Icon = ICON[k];
          return (
            <li key={k} className="rounded-xl bg-ink-950/35 p-3 ring-1 ring-inset ring-white/6">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-gold-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="font-display text-lg uppercase leading-tight">{d.name}</b>
                    {k === "stadium" ? (
                      <span className="text-sm font-semibold tabular">{u.cap.toLocaleString("pt-BR")} lugares</span>
                    ) : (
                      <Pips level={d.level(u)} max={d.max} />
                    )}
                  </div>
                  <p className="text-sm text-mist">{d.desc}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                {reason && <span className="text-xs text-mist">{reason}</span>}
                <Button
                  variant="secondary"
                  size="md"
                  icon={<ArrowUpCircle />}
                  disabled={!!reason}
                  title={reason ?? undefined}
                  onClick={() => buy(k)}
                >
                  {maxed ? "No máximo" : `${k === "stadium" ? "Ampliar" : "Melhorar"} • ${formatMoney(cost)}`}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

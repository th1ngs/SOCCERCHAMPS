"use client";

import { Binoculars } from "lucide-react";
import { formatMoney } from "@/game";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";

/** Peneira extra: uma vez por temporada, 1 a 3 garotos novos. */
export function TrialCard({ cost, used, money, onRun }: { cost: number; used: boolean; money: number; onRun: () => void }) {
  const reason = used ? "Peneira já realizada nesta temporada" : money < cost ? `Caixa insuficiente (${formatMoney(money)})` : null;
  return (
    <Card title="Peneira" tone={reason ? "default" : "highlight"}>
      <p className="mb-4 text-sm text-mist">Os olheiros rodam o país atrás de talentos e trazem de 1 a 3 garotos novos para a base. Uma vez por temporada.</p>
      <Button variant={reason ? "secondary" : "primary"} icon={<Binoculars />} onClick={onRun} disabled={!!reason} title={reason ?? undefined}>
        Fazer peneira • {formatMoney(cost)}
      </Button>
      {reason && <p className="mt-2 text-xs text-mist">{reason}.</p>}
    </Card>
  );
}

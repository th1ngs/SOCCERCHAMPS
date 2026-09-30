"use client";

import { useMemo } from "react";
import { Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { LEAGUES, financeProfile, formatMoney, user } from "@/game";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { cn } from "@/lib/cn";

function Row({ label, value, hint, negative }: { label: string; value: number; hint?: string; negative?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/6 py-2 last:border-0">
      <dt className="min-w-0 text-sm text-mist">
        {label}
        {hint && <span className="block text-xs text-mist/80">{hint}</span>}
      </dt>
      <dd className={cn("shrink-0 font-semibold tabular", negative ? "text-danger-400" : "text-snow")}>
        {negative ? "−" : ""}
        {formatMoney(value)}
      </dd>
    </div>
  );
}

/** Descrição curta da economia da liga (para o jogador entender por que o clube fatura o que fatura). */
function leagueNote(id: keyof typeof LEAGUES): string {
  const L = LEAGUES[id];
  const tv = L.tv >= 2 ? "o maior contrato de TV do mundo" : L.tv >= 1.2 ? "um contrato de TV forte" : L.tv >= 0.9 ? "um contrato de TV médio" : "um contrato de TV modesto";
  const split = L.tvSplit >= 0.6 ? "concentrado nos grandes" : L.tvSplit <= 0.3 ? "dividido de forma igualitária" : "dividido em parte pelo tamanho do clube";
  const wages = L.wages >= 1.3 ? "salários altos" : L.wages <= 0.8 ? "salários baixos" : "salários médios";
  const q = L.quality >= 3 ? "elencos entre os melhores do mundo" : L.quality >= 0 ? "elencos fortes" : L.quality >= -2.5 ? "elencos de nível médio" : "elencos mais modestos";
  return `${L.name}: ${q}, ${tv}, ${split}, e ${wages}.`;
}

/** Orçamento semanal estimado: de onde vem e para onde vai o dinheiro, e o teto salarial da diretoria. */
export function BudgetCard() {
  const { world: w, version } = useWorld();
  const u = user(w);
  const f = useMemo(() => {
    void version;
    return financeProfile(w, u);
  }, [w, u, version]);
  const costs = f.wages + f.upkeep + f.debt;
  const net = f.revenue - costs;
  const usage = f.wageCap ? Math.min(130, (f.wages / f.wageCap) * 100) : 0;
  const over = f.room < 0;

  return (
    <Card title="Orçamento semanal">
      <div className="mb-4 rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold">Teto salarial da diretoria</span>
          <span className="font-display text-xl font-bold tabular">{formatMoney(f.wageCap)}/sem</span>
        </div>
        <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-white/8" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usage)} aria-label="Folha em relação ao teto">
          <span className={cn("absolute inset-y-0 left-0 rounded-full", over ? "bg-danger-500" : usage > 90 ? "bg-warn-400" : "bg-pitch-400")} style={{ width: `${Math.min(100, usage)}%` }} />
        </div>
        <p className={cn("mt-2 text-sm", over ? "text-danger-400" : "text-mist")}>
          Folha atual {formatMoney(f.wages)}/sem •{" "}
          {over ? `${formatMoney(-f.room)}/sem acima do teto: contratações novas serão vetadas.` : `espaço para contratar: ${formatMoney(f.room)}/sem.`}
        </p>
      </div>

      <SectionTitle className="mb-1">Receitas estimadas</SectionTitle>
      <dl className="mb-3">
        <Row label="Cota de TV" value={f.tv} hint="Depende da liga, da divisão e do peso do clube" />
        <Row label="Patrocínio master" value={f.sponsor} hint="Renegociado a cada temporada pela reputação" />
        <Row label="Sócios e produtos" value={f.commercial} hint="Cresce com a reputação e o humor da torcida" />
        <Row label="Bilheteria (média)" value={f.gate} hint="Estádio, preço do ingresso e adversários" />
        <Row label="Premiações (média)" value={f.prize} />
      </dl>
      <SectionTitle className="mb-1">Despesas</SectionTitle>
      <dl>
        <Row label="Folha salarial" value={f.wages} negative />
        <Row label="Manutenção" value={f.upkeep} hint="Estádio, CT, base e olheiros" negative />
        {f.debt > 0 && <Row label="Parcela da dívida bancária" value={f.debt} negative />}
      </dl>
      <div className={cn("mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset", net >= 0 ? "bg-pitch-500/10 ring-pitch-500/30" : "bg-danger-500/10 ring-danger-500/30")}>
        <span className="flex items-center gap-2 text-sm font-semibold">
          {net >= 0 ? <TrendingUp className="size-4 text-pitch-400" aria-hidden /> : <TrendingDown className="size-4 text-danger-400" aria-hidden />}
          Saldo estimado por semana
        </span>
        <span className={cn("font-display text-xl font-bold tabular", net >= 0 ? "text-pitch-400" : "text-danger-400")}>
          {net >= 0 ? "+" : "−"}
          {formatMoney(Math.abs(net))}
        </span>
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs text-mist">
        <Landmark className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {leagueNote(u.league)}
      </p>
    </Card>
  );
}

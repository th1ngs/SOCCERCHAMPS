"use client";

import { BadgeCheck, Handshake } from "lucide-react";
import { SPONSOR_KINDS, chooseSponsor, sponsorSummary, user } from "@/game";
import type { SponsorDeal, SponsorKind } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Badge, Card, type BadgeTone } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const TONE: Record<SponsorKind, BadgeTone> = { fixo: "blue", desempenho: "orange", longo: "green" };

function DealBody({ d }: { d: SponsorDeal }) {
  return (
    <>
      <p className="font-display text-lg font-extrabold leading-tight text-snow">{d.brand}</p>
      <Badge tone={TONE[d.kind]} className="mt-1">{SPONSOR_KINDS[d.kind].name}</Badge>
      <p className="mt-2 text-sm text-snow/90">{sponsorSummary(d)}</p>
      <p className="mt-1 text-xs text-mist">{SPONSOR_KINDS[d.kind].desc}</p>
    </>
  );
}

/** Patrocínio master: contrato atual e, quando há, as propostas para escolher. */
export function SponsorCard() {
  const { world: w, mutate } = useWorld();
  const toast = useToast();
  const u = user(w);
  const offers = w.sponsorOffers ?? [];
  const deal = u.sponsorDeal;

  const sign = (d: SponsorDeal) => {
    let ok = false;
    mutate((x) => { ok = chooseSponsor(x, d.id); });
    if (ok) toast(`Contrato assinado com a ${d.brand}!`, "good");
  };

  return (
    <Card id="patrocinio" title="Patrocínio master" action={<Handshake className="size-5 text-mist" aria-hidden />} className={cn("scroll-mt-24", offers.length > 0 && "ring-gold-400/40 md:col-span-2 xl:col-span-3")}>
      {offers.length > 0 ? (
        <>
          <p className="mb-3 text-sm text-mist">Escolha quem estampa a camisa. Sem escolha até o fim da janela, a diretoria assina a de valor fixo.</p>
          <ul className="grid gap-3 md:grid-cols-3">
            {offers.map((d) => (
              <li key={d.id} className="flex flex-col rounded-xl bg-ink-950/50 p-3 ring-1 ring-inset ring-white/8">
                <DealBody d={d} />
                <p className="mt-2 text-xs text-mist">Duração: {d.seasons} temporada{d.seasons > 1 ? "s" : ""}</p>
                <Button variant="primary" size="sm" icon={<BadgeCheck />} className="mt-3 self-start" onClick={() => sign(d)}>
                  Assinar
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : deal ? (
        <div>
          <DealBody d={deal} />
          <p className="mt-2 text-xs text-mist">
            {deal.seasonsLeft > 1 ? `Faltam ${deal.seasonsLeft} temporadas de contrato.` : "Último ano de contrato: novas propostas chegam na próxima temporada."}
          </p>
        </div>
      ) : (
        <p className="text-sm text-mist">Patrocínio automático da diretoria. Novas propostas chegam no começo da próxima temporada.</p>
      )}
    </Card>
  );
}

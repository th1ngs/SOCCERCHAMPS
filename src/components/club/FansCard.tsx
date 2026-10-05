"use client";

import { Flame, Megaphone, Mic, PartyPopper, Users } from "lucide-react";
import { LEAGUES, MEMBER_FEE, baseMembers, formatMoney, groupName, user } from "@/game";
import type { FanEventKind } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Card, Meter } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const ANGRY: FanEventKind[] = ["faixas", "protesto", "cobranca"];

/** Torcida organizada: humor, sócios (com a receita semanal) e os últimos eventos nas arquibancadas. */
export function FansCard() {
  const { world: w } = useWorld();
  const u = user(w);
  const press = (w.press ?? [])
    .flatMap((p) => [p.headline && { text: p.headline, season: p.season, week: p.week, reason: p.reason }, p.postHeadline && { text: p.postHeadline, season: p.season, week: p.week, reason: p.reason }])
    .filter((x): x is { text: string; season: number; week: number; reason: string } => !!x)
    .slice(-3)
    .reverse();
  if (w.playerCareer) return null;
  const t = w.torcida && w.torcida.club === u.id ? w.torcida : { group: groupName(u), members: baseMembers(u), events: [] as NonNullable<typeof w.torcida>['events'] };
  const mood = Math.round(u.fans ?? 60);
  const label = mood >= 80 ? "Em festa" : mood >= 60 ? "Confiante" : mood >= 40 ? "Desconfiada" : mood >= 25 ? "Irritada" : "Em pé de guerra";
  const income = Math.round(t.members * MEMBER_FEE * LEAGUES[u.league].wealth);
  return (
    <Card title="Torcida organizada" action={<Flame className="size-5 text-mist" aria-hidden />}>
      <p className="font-display text-xl font-extrabold uppercase italic" style={{ color: u.colors[0] === "#FFFFFF" ? u.colors[1] : undefined }}>{t.group}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className={cn("font-display text-3xl font-extrabold tabular", mood >= 60 ? "text-pitch-400" : mood >= 40 ? "text-warn-400" : "text-danger-400")}>{mood}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Humor: {label}</span>
          <Meter value={mood} label="Humor da torcida" className="mt-1 h-2 w-full" />
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-ink-950/50 p-2.5 ring-1 ring-inset ring-white/6">
          <span className="flex items-center gap-1.5 text-xs text-mist"><Users className="size-3.5" aria-hidden /> Sócios</span>
          <b className="font-display text-lg tabular">{t.members.toLocaleString("pt-BR")}</b>
        </div>
        <div className="rounded-xl bg-ink-950/50 p-2.5 ring-1 ring-inset ring-white/6">
          <span className="text-xs text-mist">Receita dos sócios</span>
          <b className="block font-display text-lg tabular">{formatMoney(income)}<span className="text-xs font-normal text-mist">/sem</span></b>
        </div>
      </div>
      <p className="mt-3 text-xs text-mist">Sequências ruins geram faixas, protestos e cobrança (pressão na diretoria e no elenco); vitórias, clássicos e títulos trazem festa, mosaicos, carreatas e novos sócios.</p>
      {t.events.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {t.events.slice(-4).reverse().map((e) => {
            const angry = ANGRY.includes(e.kind);
            return (
              <li key={e.id} className={cn("flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ring-1 ring-inset", angry ? "bg-danger-500/10 ring-danger-500/25" : "bg-pitch-500/10 ring-pitch-500/25")}>
                {angry ? <Megaphone className="mt-0.5 size-4 shrink-0 text-danger-400" aria-hidden /> : <PartyPopper className="mt-0.5 size-4 shrink-0 text-pitch-400" aria-hidden />}
                <span className="min-w-0">
                  <span className="block">{e.title.charAt(0).toUpperCase() + e.title.slice(1)}</span>
                  <span className="block truncate text-xs text-mist">T{e.season} sem. {e.week} • “{e.banners[0]}”</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {press.length > 0 && (
        <>
          <h4 className="mt-4 flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-mist"><Mic className="size-3.5" aria-hidden /> Coletivas recentes</h4>
          <ul className="mt-2 space-y-1.5">
            {press.map((h, i) => (
              <li key={i} className="rounded-lg bg-[#f5efe0] px-2 py-1.5 text-ink-950">
                <b className="block font-display text-sm font-extrabold uppercase leading-tight">{h.text}</b>
                <span className="block text-[11px] text-ink-700">T{h.season} sem. {h.week} • {h.reason}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

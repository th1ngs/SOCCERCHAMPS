"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftRight, BatteryLow, ChevronRight, CircleCheck, ClipboardList, FileClock, HandCoins, Lightbulb, Mail, MessageCircle, Sprout, TriangleAlert, Wallet } from "lucide-react";
import { formatMoney, nextWindow, user, WINDOWS, windowOpen } from "@/game";
import type { World } from "@/game/types";
import { Card } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";
import { offerState } from "@/components/inbox/offers";
import { lineupNeedsFix } from "@/components/lineup/lineupLogic";
import { cn } from "@/lib/cn";
import { squadAlerts } from "./derive";

type Tone = "todo" | "warn" | "ok";
interface Item {
  key: string;
  tone: Tone;
  icon: ReactNode;
  title: string;
  detail?: string;
  href: string;
}

/** O que vale olhar antes de avançar a semana, do mais urgente ao informativo. */
function checklist(w: World): Item[] {
  const u = user(w);
  const a = squadAlerts(w);
  const items: Item[] = [];
  const offers = w.inbox.filter((m) => offerState(w, m) === "pending").length;
  const unread = w.inbox.filter((m) => !m.read).length;
  const open = windowOpen(w);

  if (lineupNeedsFix(w, u) || a.injured.some((p) => u.lineup.includes(p.id)) || a.suspended.some((p) => u.lineup.includes(p.id))) {
    items.push({ key: "lineup", tone: "warn", icon: <ClipboardList />, title: "Arrume a escalação", detail: "Há titulares lesionados, suspensos ou vagas abertas.", href: "/jogo/escalacao" });
  } else if (a.tired.length) {
    items.push({
      key: "tired",
      tone: "todo",
      icon: <BatteryLow />,
      title: `${a.tired.length} titular${a.tired.length > 1 ? "es" : ""} cansado${a.tired.length > 1 ? "s" : ""}`,
      detail: "Poupe quem está com menos de 70% de condição.",
      href: "/jogo/escalacao",
    });
  } else {
    items.push({ key: "lineup-ok", tone: "ok", icon: <CircleCheck />, title: "Time escalado", detail: `${u.formation} • ${a.size} jogadores no elenco`, href: "/jogo/escalacao" });
  }

  const talks = w.inbox.filter((m) => m.talk && !m.talk.answer && m.season === w.season);
  if (talks.length) {
    const who = talks[0].talk ? w.players[talks[0].talk.pid]?.name : undefined;
    items.push({
      key: "talks",
      tone: "warn",
      icon: <MessageCircle />,
      title: talks.length > 1 ? `${talks.length} jogadores querem conversar` : `${who ?? "Um jogador"} quer conversar`,
      detail: "Responda antes que ele se sinta ignorado (moral −8).",
      href: "/jogo/mensagens",
    });
  }

  if (offers) {
    items.push({ key: "offers", tone: "todo", icon: <HandCoins />, title: `${offers} proposta${offers > 1 ? "s" : ""} por jogadores`, detail: "Aceite, recuse ou faça uma contraproposta.", href: "/jogo/mensagens" });
  } else if (unread) {
    items.push({ key: "inbox", tone: "todo", icon: <Mail />, title: `${unread} mensage${unread > 1 ? "ns" : "m"} não lida${unread > 1 ? "s" : ""}`, href: "/jogo/mensagens" });
  }

  if (u.money < 0) {
    items.push({ key: "money", tone: "warn", icon: <Wallet />, title: "Caixa no vermelho", detail: `${formatMoney(u.money)}. Venda jogadores ou reveja os gastos.`, href: "/jogo/clube" });
  }

  if (a.short) {
    items.push({ key: "short", tone: "warn", icon: <TriangleAlert />, title: "Elenco curto", detail: `Só ${a.size} jogadores. O ideal é ter pelo menos 20.`, href: "/jogo/mercado" });
  }

  if (open) {
    const end = WINDOWS.find(([s, e]) => w.week >= s && w.week <= e)?.[1];
    items.push({ key: "window", tone: "todo", icon: <ArrowLeftRight />, title: "Janela de transferências aberta", detail: end != null ? `Fecha na semana ${end}. Reforce o elenco ou venda sobras.` : undefined, href: "/jogo/mercado" });
  }

  if (a.expiring.length) {
    items.push({
      key: "expiring",
      tone: "todo",
      icon: <FileClock />,
      title: `${a.expiring.length} contrato${a.expiring.length > 1 ? "s" : ""} no último ano`,
      detail: "Renove quem você quer manter antes que saia de graça.",
      href: "/jogo/elenco",
    });
  }

  if (!w.trialUsed) {
    items.push({ key: "trial", tone: "todo", icon: <Sprout />, title: "Peneira da temporada disponível", detail: "Descubra novos garotos para a base.", href: "/jogo/base" });
  }

  if (!open) {
    const nx = nextWindow(w);
    if (nx != null) items.push({ key: "next-window", tone: "ok", icon: <ArrowLeftRight />, title: "Mercado fechado", detail: `A próxima janela abre na semana ${nx}.`, href: "/jogo/mercado" });
  }

  const rank: Record<Tone, number> = { warn: 0, todo: 1, ok: 2 };
  return items.sort((x, y) => rank[x.tone] - rank[y.tone]);
}

const toneCls: Record<Tone, string> = {
  warn: "bg-warn-400/15 text-warn-400",
  todo: "bg-info-500/15 text-info-400",
  ok: "bg-pitch-500/15 text-pitch-400",
};

/** Checklist da semana: guia o jogador pelo que falta fazer antes de avançar. */
export function ChecklistCard({ compact = false }: { compact?: boolean }) {
  const { world: w, version } = useWorld();
  const all = useMemo(
    () => checklist(w),
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w, version],
  );
  const pending = all.filter((i) => i.tone !== "ok").length;
  // Compacto: só o que falta fazer (até 4); sem pendências, o primeiro item "ok" confirma que está tudo certo.
  const items = compact ? (pending ? all.filter((i) => i.tone !== "ok").slice(0, 4) : all.slice(0, 1)) : all;
  const firstWeeks = w.week <= 1 && w.history.length === 0;

  return (
    <Card
      title={compact ? "Antes de avançar" : "Checklist da semana"}
      action={
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", pending ? "bg-info-500/15 text-info-400" : "bg-pitch-500/15 text-pitch-400")}>
          {pending ? `${pending} pendente${pending > 1 ? "s" : ""}` : "Tudo certo"}
        </span>
      }
    >
      {firstWeeks && (
        <p className="mb-3 flex items-start gap-2.5 rounded-xl bg-gold-400/10 p-3 text-sm leading-snug ring-1 ring-inset ring-gold-400/25">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-gold-400" aria-hidden />
          <span>
            Cada toque no botão <b className="text-gold-300">amarelo</b> avança uma semana ou leva ao jogo. Antes, confira os itens abaixo.
          </span>
        </p>
      )}
      <ul className="-mx-2 flex flex-col">
        {items.map((it) => (
          <li key={it.key}>
            <Link href={it.href} className={cn("group flex items-center gap-3 rounded-xl px-2 transition-colors hover:bg-white/5 active:bg-white/8", compact ? "min-h-12 py-1.5" : "min-h-14 py-2")}>
              <span className={cn("grid shrink-0 place-items-center rounded-xl", compact ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-5", toneCls[it.tone])}>{it.icon}</span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className={cn("block font-semibold", compact && "text-sm", it.tone === "ok" ? "text-snow/85" : "text-snow")}>{it.title}</span>
                {it.detail && <span className={cn("mt-0.5 block text-mist", compact ? "truncate text-xs" : "text-sm")}>{it.detail}</span>}
              </span>
              <ChevronRight className="size-5 shrink-0 text-mist transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Cloud, CloudAlert, CloudOff, LoaderCircle, Mail, Menu, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { calendarDayLabel, divisionName, formatMoney, user, weekLabel, windowOpen } from "@/game";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { useWorld } from "@/components/game/GameProvider";
import { useFlow } from "@/components/game/useFlow";
import { OverlayHost } from "@/components/game/OverlayHost";
import { NAV, isActive } from "./nav";

function CloudIndicator() {
  const { cloudStatus, cloudError } = useWorld();
  const map = {
    off: { Icon: CloudOff, text: "Salvo só neste aparelho", cls: "text-mist" },
    idle: { Icon: Cloud, text: "Nuvem conectada", cls: "text-info-400" },
    saving: { Icon: LoaderCircle, text: "Salvando na nuvem…", cls: "text-info-400 animate-spin" },
    saved: { Icon: Cloud, text: "Salvo na nuvem", cls: "text-pitch-400" },
    error: { Icon: CloudAlert, text: cloudError ?? "Falha ao salvar na nuvem", cls: "text-danger-400" },
  } as const;
  const { Icon, text, cls } = map[cloudStatus];
  return (
    <Link href="/jogo/clube#nuvem" title={text} aria-label={text} className="grid size-11 place-items-center rounded-xl hover:bg-white/6">
      <Icon className={cn("size-5", cls)} />
    </Link>
  );
}

function Count({ n, className }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={cn("grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 font-sans text-xs font-bold leading-none text-white tabular", className)}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const g = useWorld();
  const w = g.world;
  const u = user(w);
  const { label, hint, advance } = useFlow();
  const path = usePathname();
  const [more, setMore] = useState(false);
  const unread = w.inbox.filter((m) => !m.read).length;
  const busy = !!g.matchMode;
  const open = windowOpen(w);
  const dock = NAV.filter((n) => n.dock);
  const extra = NAV.filter((n) => !n.dock);
  const extraActive = extra.find((n) => isActive(n.href, path));

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(148px+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-ink-900/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 md:py-3">
          <Link href="/jogo" className="flex min-w-0 items-center gap-2.5">
            <Crest club={u} size={36} />
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold uppercase leading-tight">{u.name}</span>
              <span className="flex items-center gap-1.5 text-sm text-mist">
                <Flag code={u.league} /> <span className="truncate">{divisionName(u.div)} • {w.season}</span>
              </span>
            </span>
          </Link>
          <div className="hidden flex-1 flex-wrap items-center gap-2 lg:flex">
            <Badge className="h-8 px-2.5 text-sm normal-case tracking-normal">{weekLabel(w)}{w.week > 0 && ` • ${calendarDayLabel(w)}`}</Badge>
            <Badge tone={u.money < 0 ? "red" : "neutral"} className="h-8 px-2.5 text-sm normal-case tracking-normal tabular">
              <Wallet className="size-4" /> {formatMoney(u.money)}
            </Badge>
            {open && <Badge tone="green" className="h-8 px-2.5 text-sm">Janela aberta</Badge>}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/jogo/mensagens"
              aria-label={unread ? `Mensagens: ${unread} não lidas` : "Mensagens"}
              className="relative grid size-11 place-items-center rounded-xl hover:bg-white/6 md:hidden"
            >
              <Mail className="size-5 text-snow" />
              <Count n={unread} className="absolute right-0.5 top-0.5" />
            </Link>
            <CloudIndicator />
            <div className="ml-2 hidden items-center gap-3 md:flex">
              <span className="max-w-64 text-right text-sm leading-tight text-mist">
                <span className="block text-xs font-bold uppercase tracking-wider text-gold-400">Próximo passo</span>
                <span className="line-clamp-2">{hint}</span>
              </span>
              <Button variant="primary" onClick={advance} disabled={busy} iconRight={<ChevronRight />}>
                {label}
              </Button>
            </div>
          </div>
        </div>
        {/* Situação rápida no celular e em telas médias. */}
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-2 lg:hidden">
          <Badge className="h-7 shrink-0 px-2.5 text-[13px] normal-case tracking-normal">{weekLabel(w)}{w.week > 0 && ` • ${calendarDayLabel(w)}`}</Badge>
          <Badge tone={u.money < 0 ? "red" : "neutral"} className="h-7 shrink-0 px-2.5 text-[13px] normal-case tracking-normal tabular">
            <Wallet className="size-3.5" /> {formatMoney(u.money)}
          </Badge>
          {open && <Badge tone="green" className="h-7 shrink-0 px-2.5 text-[13px]">Janela</Badge>}
        </div>
        <nav aria-label="Seções" className="mx-auto hidden max-w-7xl gap-1 overflow-x-auto px-3 md:flex">
          {NAV.map(({ href, label: l, icon: Icon }) => {
            const on = isActive(href, path);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 whitespace-nowrap rounded-t-lg border-b-[3px] px-3 py-3 font-display text-base font-bold uppercase tracking-wide transition-colors",
                  on ? "border-gold-400 bg-white/4 text-snow" : "border-transparent text-mist hover:bg-white/4 hover:text-snow",
                )}
              >
                <Icon className="size-[18px]" />
                {l}
                {href.endsWith("mensagens") && <Count n={unread} />}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:py-7">{children}</main>

      {/* Celular: ação principal fixa logo acima da barra de seções, sem cobrir o conteúdo. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-900/97 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-10px_rgb(0_0_0/0.7)] backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3 px-4 pt-2.5 pb-2">
          <div className="min-w-0 flex-1 leading-tight">
            <span className="block text-xs font-bold uppercase tracking-wider text-gold-400">Próximo passo</span>
            <span className="line-clamp-2 text-sm text-snow/90">{hint}</span>
          </div>
          <Button variant="primary" onClick={advance} disabled={busy} iconRight={<ChevronRight />} className="shrink-0">
            {label}
          </Button>
        </div>
        <nav aria-label="Seções" className="grid grid-cols-5 border-t border-white/6">
          {dock.map(({ href, label: l, icon: Icon }) => {
            const on = isActive(href, path);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-semibold", on ? "text-gold-400" : "text-mist")}
              >
                {on && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-gold-400" aria-hidden />}
                <Icon className="size-6" />
                {l}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMore(true)}
            aria-haspopup="dialog"
            className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-semibold", extraActive ? "text-gold-400" : "text-mist")}
          >
            {extraActive && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-gold-400" aria-hidden />}
            {extraActive ? <extraActive.icon className="size-6" /> : <Menu className="size-6" />}
            {extraActive ? (extraActive.short ?? extraActive.label) : "Mais"}
            {unread > 0 && <span className="absolute right-[calc(50%-18px)] top-2.5 size-2.5 rounded-full bg-danger-500 ring-2 ring-ink-900" aria-hidden />}
          </button>
        </nav>
      </div>

      <Modal open={more} onClose={() => setMore(false)} title="Mais seções">
        <div className="grid grid-cols-2 gap-3 pb-[env(safe-area-inset-bottom)]">
          {extra.map(({ href, label: l, icon: Icon, hint: h }) => {
            const on = isActive(href, path);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMore(false)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex min-h-28 flex-col justify-between gap-3 rounded-2xl p-4 ring-1 ring-inset transition-colors",
                  on ? "bg-gold-400/12 ring-gold-400/50" : "bg-ink-800 ring-white/8 active:bg-ink-700",
                )}
              >
                <Icon className={cn("size-7", on ? "text-gold-400" : "text-snow")} />
                <span>
                  <span className="flex items-center gap-2 font-display text-lg font-bold uppercase leading-tight">
                    {l}
                    {href.endsWith("mensagens") && <Count n={unread} />}
                  </span>
                  <span className="block text-sm leading-snug text-mist">{h}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Modal>
      <OverlayHost />
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Cloud, CloudAlert, CloudOff, LoaderCircle, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { formatMoney, user, weekLabel, windowOpen } from "@/game";
import { Crest } from "@/components/ui/Crest";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { useWorld } from "@/components/game/GameProvider";
import { useFlow } from "@/components/game/useFlow";
import { OverlayHost } from "@/components/game/OverlayHost";
import { NAV } from "./nav";

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
    <Link href="/jogo/clube#nuvem" title={text} aria-label={text} className="grid size-9 place-items-center rounded-lg hover:bg-white/6">
      <Icon className={cn("size-[18px]", cls)} />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const g = useWorld();
  const w = g.world;
  const u = user(w);
  const { label, advance } = useFlow();
  const path = usePathname();
  const unread = w.inbox.filter((m) => !m.read).length;
  const busy = !!g.matchMode;

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(136px+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-ink-900/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link href="/jogo" className="flex min-w-0 items-center gap-2.5">
            <Crest club={u} size={30} />
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-bold uppercase leading-tight">{u.name}</span>
              <span className="block text-xs text-mist">Série {u.div} • {w.season}</span>
            </span>
          </Link>
          <div className="hidden flex-1 flex-wrap items-center gap-2 sm:flex">
            <Badge tone="neutral" className="h-6 px-2 text-xs normal-case tracking-normal">{weekLabel(w)}</Badge>
            <Badge tone={u.money < 0 ? "red" : "neutral"} className="h-6 px-2 text-xs normal-case tracking-normal tabular">
              <Wallet className="size-3.5" /> {formatMoney(u.money)}
            </Badge>
            {windowOpen(w) && <Badge tone="green" className="h-6 px-2 text-xs">Janela aberta</Badge>}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <CloudIndicator />
            <div className="hidden md:block">
              <Button variant="primary" onClick={advance} disabled={busy} iconRight={<ChevronRight />}>
                {label}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-2 sm:hidden">
          <Badge className="h-6 px-2 text-xs normal-case tracking-normal">{weekLabel(w)}</Badge>
          <Badge tone={u.money < 0 ? "red" : "neutral"} className="h-6 px-2 text-xs normal-case tracking-normal tabular">{formatMoney(u.money)}</Badge>
          {windowOpen(w) && <Badge tone="green" className="h-6 px-2 text-xs">Janela</Badge>}
        </div>
        <nav aria-label="Seções" className="mx-auto hidden max-w-7xl gap-1 overflow-x-auto px-3 md:flex">
          {NAV.map(({ href, label: l, icon: Icon }) => {
            const on = href === "/jogo" ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 font-display text-[15px] font-bold uppercase tracking-wide transition-colors",
                  on ? "border-gold-400 text-snow" : "border-transparent text-mist hover:text-snow",
                )}
              >
                <Icon className="size-4" />
                {l}
                {href.endsWith("mensagens") && unread > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-[11px] text-white tabular">{unread}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:py-7">{children}</main>

      {/* Ação principal no celular: sempre no mesmo lugar, acima da barra. */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex justify-end px-4 pb-3 md:hidden">
        <Button variant="primary" size="lg" onClick={advance} disabled={busy} iconRight={<ChevronRight />} className="shadow-xl">
          {label}
        </Button>
      </div>
      <nav aria-label="Seções" className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-white/8 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {NAV.map(({ href, label: l, icon: Icon }) => {
          const on = href === "/jogo" ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={cn("relative flex h-16 min-w-[72px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold", on ? "text-gold-400" : "text-mist")}
            >
              <Icon className="size-5" />
              {l}
              {href.endsWith("mensagens") && unread > 0 && <span className="absolute right-4 top-2 size-2 rounded-full bg-danger-500" />}
            </Link>
          );
        })}
      </nav>
      <OverlayHost />
    </div>
  );
}

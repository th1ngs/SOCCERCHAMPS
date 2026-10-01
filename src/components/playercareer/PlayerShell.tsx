"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Award, ChevronRight, House, ListOrdered, LogOut, type LucideIcon } from "lucide-react";
import { careerNewSeason, careerNextMatch, careerPlayer, divisionName, formatMoney, playCareerWeek, weekLabel } from "@/game";
import type { CareerWeekResult } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { OvrBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { MatchReportModal } from "./MatchReportModal";
import { CareerSeasonModal } from "./CareerSeasonModal";
import { RetiredScreen } from "./RetiredScreen";
import { OverlayHost } from "@/components/game/OverlayHost";

interface CareerFlow {
  label: string | null;
  hint: string;
  advance: () => void;
}

const Ctx = createContext<CareerFlow | null>(null);
export const useCareerFlow = (): CareerFlow => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCareerFlow fora do PlayerShell");
  return v;
};

interface NavItem { href: string; label: string; icon: LucideIcon }
const NAV: NavItem[] = [
  { href: "/jogador", label: "Semana", icon: House },
  { href: "/jogador/carreira", label: "Carreira", icon: Award },
  { href: "/jogador/propostas", label: "Propostas", icon: ArrowLeftRight },
  { href: "/jogador/tabela", label: "Tabela", icon: ListOrdered },
];
const isActive = (href: string, path: string) => (href === "/jogador" ? path === href : path.startsWith(href));

/** Moldura da carreira de jogador: cabeçalho com o jogador, seções e o botão de avançar. */
export function PlayerShell({ children }: { children: ReactNode }) {
  const { world: w, version, mutate } = useWorld();
  const toast = useToast();
  const path = usePathname();
  const [result, setResult] = useState<CareerWeekResult | null>(null);
  const c = w.playerCareer;
  const p = careerPlayer(w);

  const info = useMemo(() => {
    void version;
    const club = p?.clubId ? w.clubs[p.clubId] : null;
    const next = careerNextMatch(w);
    return { club, next, offers: c?.offers.length ?? 0 };
  }, [w, version, p, c]);

  const label = !c || c.retired ? null : w.pendingSeason ? "Fim da temporada" : w.week === 0 ? "Iniciar temporada" : info.next ? "Jogar a semana" : "Avançar semana";
  const hint = !p ? "" : !info.club ? "Sem clube: veja as propostas" : w.week === 0 ? `Pré-temporada ${w.season}` : info.next
    ? `${info.next.h === info.club.id ? "Casa" : "Fora"} • ${w.clubs[info.next.h === info.club.id ? info.next.a : info.next.h].name}`
    : `${weekLabel(w)} • sem jogo`;

  const advance = useCallback(() => {
    if (w.pendingSeason) return;
    let r: CareerWeekResult | null = null;
    mutate((x) => {
      r = playCareerWeek(x);
    });
    const res = r as CareerWeekResult | null;
    if (res?.injury) toast(res.injury, "bad");
    if (res?.report) setResult(res);
    else if (w.week === 1) toast(`Temporada ${w.season} iniciada!`, "good");
  }, [mutate, toast, w]);

  const flow = useMemo<CareerFlow>(() => ({ label, hint, advance }), [label, hint, advance]);

  if (!c || !p) return null;
  if (c.retired) return <RetiredScreen />;

  return (
    <Ctx.Provider value={flow}>
      <div className="flex min-h-dvh flex-col pb-[calc(140px+env(safe-area-inset-bottom))] md:pb-0">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-ink-900/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 md:py-3">
            <Link href="/jogador" className="flex min-w-0 items-center gap-2.5">
              {info.club ? <Crest club={info.club} size={36} /> : <span className="grid size-9 place-items-center rounded-full bg-white/8 text-xs text-mist">—</span>}
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-display text-xl font-bold uppercase leading-tight">{p.name}</span>
                  <OvrBadge value={p.ovr} size="sm" />
                </span>
                <span className="flex items-center gap-1.5 text-sm text-mist">
                  <Flag code={p.nat} />
                  <span className="truncate">
                    {p.pos} • {p.age} anos • {info.club ? `${info.club.name} (${divisionName(info.club.div)})` : "sem clube"}
                  </span>
                </span>
              </span>
            </Link>
            <span className="ml-auto hidden text-right text-sm leading-tight text-mist lg:block">
              <span className="block text-xs font-bold uppercase tracking-wider text-gold-400">{weekLabel(w)} • {w.season}</span>
              Patrimônio <b className="text-snow tabular">{formatMoney(c.money)}</b>
            </span>
            <div className="ml-auto hidden items-center gap-3 md:flex lg:ml-4">
              <span className="max-w-56 text-right text-sm leading-tight text-mist">
                <span className="block text-xs font-bold uppercase tracking-wider text-gold-400">Próximo passo</span>
                <span className="line-clamp-2">{hint}</span>
              </span>
              {label && (
                <Button variant="primary" onClick={advance} disabled={!!w.pendingSeason} iconRight={<ChevronRight />}>
                  {label}
                </Button>
              )}
            </div>
            <Link href="/" aria-label="Sair para o menu" className="grid size-11 place-items-center rounded-xl text-mist hover:bg-white/6 md:ml-1">
              <LogOut className="size-5" />
            </Link>
          </div>
          <nav aria-label="Seções" className="mx-auto hidden max-w-6xl gap-1 px-3 md:flex">
            {NAV.map(({ href, label: l, icon: Icon }) => {
              const on = isActive(href, path);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-t-lg border-b-[3px] px-3 py-3 font-display text-base font-bold uppercase tracking-wide transition-colors",
                    on ? "border-gold-400 bg-white/4 text-snow" : "border-transparent text-mist hover:bg-white/4 hover:text-snow",
                  )}
                >
                  <Icon className="size-[18px]" />
                  {l}
                  {href.endsWith("propostas") && info.offers > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 font-sans text-xs text-white">{info.offers}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:py-7">{children}</main>

        {/* Celular: ação principal e seções fixas embaixo. */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-900/97 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
          <div className="flex items-center gap-3 px-4 pt-2.5 pb-2">
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block text-xs font-bold uppercase tracking-wider text-gold-400">Próximo passo</span>
              <span className="line-clamp-2 text-sm text-snow/90">{hint}</span>
            </div>
            {label && (
              <Button variant="primary" onClick={advance} disabled={!!w.pendingSeason} iconRight={<ChevronRight />} className="shrink-0">
                {label}
              </Button>
            )}
          </div>
          <nav aria-label="Seções" className="grid grid-cols-4 border-t border-white/6">
            {NAV.map(({ href, label: l, icon: Icon }) => {
              const on = isActive(href, path);
              return (
                <Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("relative flex h-15 flex-col items-center justify-center gap-1 text-[13px] font-semibold", on ? "text-gold-400" : "text-mist")}>
                  {on && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-gold-400" aria-hidden />}
                  <Icon className="size-6" />
                  {l}
                  {href.endsWith("propostas") && info.offers > 0 && <span className="absolute right-[calc(50%-20px)] top-2 size-2.5 rounded-full bg-danger-500" aria-hidden />}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {result?.report && <MatchReportModal report={result.report} onClose={() => setResult(null)} />}
      {w.pendingSeason && <CareerSeasonModal onNext={() => mutate((x) => careerNewSeason(x))} />}
      <OverlayHost />
    </Ctx.Provider>
  );
}

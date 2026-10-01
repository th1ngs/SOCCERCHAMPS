"use client";

import { useCallback, useMemo, useState } from "react";
import {
  dismissYouth,
  fireScout,
  formatMoney,
  hireScout,
  loanOut,
  loanOutOffers,
  promoteYouth,
  recallLoan,
  requestScoutReport,
  runTrial,
  setAcademyFocus,
  trialCost,
  user,
  windowOpen,
} from "@/game";
import type { LeagueId, Player, TrialOptions } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { PageHeader } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { AcademySummary } from "@/components/youth/AcademySummary";
import { DismissDialog } from "@/components/youth/DismissDialog";
import { FocusPicker } from "@/components/youth/FocusPicker";
import { HowItWorks } from "@/components/youth/HowItWorks";
import { LoanOutDialog, type LoanOfferView } from "@/components/youth/LoanOutDialog";
import { LoanedOutSection } from "@/components/youth/LoanedOutSection";
import { ScoutingCard } from "@/components/youth/ScoutingCard";
import { TrialCard } from "@/components/youth/TrialCard";
import { TrialResultModal } from "@/components/youth/TrialResultModal";
import { YouthList, type YouthActions } from "@/components/youth/YouthList";
import {
  academySummary,
  focusName,
  loanBlock,
  loanedViews,
  openYouthOffers,
  promoteBlock,
  scoutBlock,
  scoutState,
  trialState,
  windowText,
  youthView,
  type AcademyFocusKey,
  type PosFilter,
  type YouthView,
} from "@/components/youth/derive";

export default function BasePage() {
  const { world, version, mutate, setOverlay } = useWorld();
  const toast = useToast();

  const homeLeague = world.clubs[world.userClub].league;
  const [region, setRegion] = useState<LeagueId>(homeLeague);
  const [trialPos, setTrialPos] = useState<PosFilter>("all");
  const [trial, setTrial] = useState<{ key: number; ids: string[] } | null>(null);
  const [loan, setLoan] = useState<{ pid: string; offers: LoanOfferView[] } | null>(null);
  const [dismissId, setDismissId] = useState<string | null>(null);

  // `version` muda a cada mutação do mesmo objeto `world`: todas as derivações dependem dele.
  const data = useMemo(() => {
    void version;
    const u = user(world);
    const offers = openYouthOffers(world);
    const views = u.youth
      .map((id) => world.players[id])
      .filter((p): p is Player => !!p)
      .map((p) => youthView(world, p, u.academyFocus, offers));
    const scout = scoutState(world);
    return {
      u,
      views,
      scout,
      summary: academySummary(world, views),
      loaned: loanedViews(world),
      promote: promoteBlock(u),
      window: windowOpen(world) ? null : windowText(world),
    };
  }, [world, version]);
  const { u, views, scout, summary, loaned } = data;

  const trialOpts = useMemo<TrialOptions>(
    () => ({ region: region === homeLeague ? undefined : region, pos: trialPos === "all" ? undefined : trialPos }),
    [region, homeLeague, trialPos],
  );
  const cost = useMemo(() => {
    void version;
    return trialCost(world, trialOpts);
  }, [world, version, trialOpts]);
  const trialInfo = useMemo(() => {
    void version;
    return trialState(world, trialOpts);
  }, [world, version, trialOpts]);
  const trialBlock = trialInfo.left <= 0 ? "Todas as peneiras da temporada já foram feitas" : u.money < cost ? `Caixa insuficiente (${formatMoney(u.money)})` : null;

  const trialViews = useMemo(() => {
    void version;
    if (!trial) return null;
    const offers = openYouthOffers(world);
    const focus = user(world).academyFocus;
    return trial.ids.map((id) => world.players[id]).filter((p): p is Player => !!p).map((p) => youthView(world, p, focus, offers));
  }, [trial, world, version]);

  const loanPlayer = loan ? world.players[loan.pid] ?? null : null;
  const dismissing = dismissId ? world.players[dismissId] ?? null : null;

  const openPlayer = useCallback((pid: string) => setOverlay({ kind: "player", pid }), [setOverlay]);
  const closeTrial = useCallback(() => setTrial(null), []);
  const closeLoan = useCallback(() => setLoan(null), []);
  const cancelDismiss = useCallback(() => setDismissId(null), []);

  const changeFocus = (f: AcademyFocusKey) => {
    mutate((w) => setAcademyFocus(w, f));
    toast(`Foco da base: ${focusName(f)}. Vale para as próximas safras e peneiras.`, "good");
  };

  const doTrial = () => {
    const box: { ids: string[] | null } = { ids: null };
    mutate((w) => {
      const r = runTrial(w, trialOpts);
      box.ids = r ? r.map((p) => p.id) : null;
    });
    if (!box.ids) return toast("Não foi possível fazer a peneira agora.", "bad");
    setTrial((t) => ({ key: (t?.key ?? 0) + 1, ids: box.ids as string[] }));
  };

  const hire = (id: string) => {
    const name = world.scoutMarket?.find((s) => s.id === id)?.name ?? "O olheiro";
    const box: { r: ReturnType<typeof hireScout> | null } = { r: null };
    mutate((w) => {
      box.r = hireScout(w, id);
    });
    toast(box.r?.ok ? `${name} é o novo olheiro do clube!` : box.r?.reason ?? "Não foi possível contratar agora.", box.r?.ok ? "good" : "bad");
  };
  const fire = (id: string) => {
    const name = world.scoutStaff?.find((s) => s.id === id)?.name ?? "O olheiro";
    const box: { r: ReturnType<typeof fireScout> | null } = { r: null };
    mutate((w) => {
      box.r = fireScout(w, id);
    });
    toast(box.r?.ok ? `${name} foi dispensado.` : box.r?.reason ?? "Não foi possível dispensar agora.", box.r?.ok ? "good" : "bad");
  };

  const recall = (pid: string) => {
    const name = world.players[pid]?.name ?? "O jogador";
    const box = { ok: false };
    mutate((w) => {
      box.ok = recallLoan(w, pid);
    });
    toast(box.ok ? `${name} voltou do empréstimo.` : "Não foi possível encerrar o empréstimo agora.", box.ok ? "good" : "bad");
  };

  const confirmLoan = (clubId: string) => {
    if (!loanPlayer) return;
    const name = loanPlayer.name;
    const club = world.clubs[clubId];
    const box = { ok: false };
    mutate((w) => {
      box.ok = loanOut(w, loanPlayer.id, clubId);
    });
    setLoan(null);
    toast(box.ok ? `${name} foi emprestado ao ${club?.name ?? "clube"}.` : "O empréstimo não foi concluído.", box.ok ? "good" : "bad");
  };

  const confirmDismiss = () => {
    if (!dismissing) return;
    const name = dismissing.name;
    mutate((w) => dismissYouth(w, dismissing.id));
    setDismissId(null);
    toast(`${name} foi dispensado da base.`);
  };

  const actions: YouthActions = {
    open: openPlayer,
    promote: (v: YouthView) => {
      if (data.promote) return toast(`${data.promote}. Libere uma vaga antes.`, "bad");
      mutate((w) => promoteYouth(w, v.p.id));
      toast(`${v.p.name} subiu para o profissional!`, "good");
    },
    loan: (v: YouthView) => {
      const offers = loanOutOffers(world, v.p.id)
        .map((o) => ({ club: world.clubs[o.club], wageShare: o.wageShare, role: o.role }))
        .filter((o): o is LoanOfferView => !!o.club);
      setLoan({ pid: v.p.id, offers });
    },
    scout: (v: YouthView) => {
      const box: { r: ReturnType<typeof requestScoutReport> | null } = { r: null };
      mutate((w) => {
        box.r = requestScoutReport(w, v.p.id);
      });
      const r = box.r;
      if (r?.ok) toast(`Olheiro a caminho: relatório de ${v.p.name} pronto na semana ${r.readyWeek}.`, "good");
      else toast(r?.reason ?? "Não foi possível pedir o relatório.", "bad");
    },
    dismiss: (v: YouthView) => setDismissId(v.p.id),
  };

  return (
    <>
      <PageHeader
        title="Categorias de base"
        subtitle="Revele joias, acompanhe a evolução e decida o futuro dos garotos: promover, emprestar ou dispensar. Aos 19 anos eles sobem ao profissional ou deixam o clube."
      />

      <AcademySummary s={summary} season={world.season} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TrialCard
          homeLeague={homeLeague}
          region={region}
          onRegion={setRegion}
          pos={trialPos}
          onPos={setTrialPos}
          cost={cost}
          block={trialBlock}
          left={trialInfo.left}
          max={trialInfo.max}
          kids={trialInfo.kids}
          specialists={trialInfo.specialists}
          onRun={doTrial}
        />
        <ScoutingCard s={scout} academy={summary.academy} week={world.week} money={u.money} onHire={hire} onFire={fire} onOpenPlayer={openPlayer} />
      </div>

      <div className="mt-4">
        <FocusPicker value={u.academyFocus} onChange={changeFocus} />
      </div>

      <YouthList
        world={world}
        views={views}
        scout={scout}
        promoteBlock={data.promote}
        windowBlock={data.window}
        scoutBlockFor={(v) => scoutBlock(world, v, scout)}
        loanBlockFor={(v) => loanBlock(world, v.p)}
        actions={actions}
      />

      <LoanedOutSection list={loaned} recallBlock={data.window} onRecall={recall} onOpen={openPlayer} />

      <HowItWorks />

      <TrialResultModal trialKey={trial?.key ?? 0} views={trialViews} onClose={closeTrial} />
      <LoanOutDialog player={loanPlayer} offers={loan?.offers ?? []} onConfirm={confirmLoan} onClose={closeLoan} />
      <DismissDialog player={dismissing} onConfirm={confirmDismiss} onCancel={cancelDismiss} />
    </>
  );
}

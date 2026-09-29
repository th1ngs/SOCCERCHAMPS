"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpFromLine,
  BadgeDollarSign,
  Crown,
  FileSearch,
  Gavel,
  Handshake,
  PenLine,
  PlaneLanding,
  PlaneTakeoff,
  Send,
  Star,
  Tag,
  Target,
  Undo2,
  UserMinus,
  UserPlus,
  UserX,
} from "lucide-react";
import {
  SQUAD_MAX,
  available,
  dismissYouth,
  ensureLineup,
  exerciseBuyOption,
  formatMoney,
  knownTraits,
  loanInTerms,
  observe,
  payReleaseClause,
  potentialRange,
  promoteYouth,
  recallLoan,
  release,
  releaseCost,
  requestScoutReport,
  setCaptain,
  setPenTaker,
  toggleWatch,
  user,
  valueOf,
  windowOpen,
} from "@/game";
import type { ClubResponse } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Alert, Badge, KV, Meter } from "@/components/ui/primitives";
import { PATIENCE_MAX, negotiationInfo, scoutStatus } from "@/components/market/transferDerive";
import { loanMark, promiseStatus, ROLE_SHORT } from "@/components/squad/transferMarks";
import { LoanInDialog, LoanOutDialog } from "./LoanDialogs";
import { NegotiationDialog, type NegotiationMode } from "./NegotiationDialog";
import { PlayerHeader } from "./PlayerHeader";
import { PlayerStats } from "./PlayerStats";
import { RenewDialog } from "./RenewDialog";
import { windowClosedReason } from "./playerInfo";

type View =
  | { kind: "info" }
  | { kind: "negotiate"; mode: NegotiationMode }
  | { kind: "renew" }
  | { kind: "loanIn" }
  | { kind: "loanOut" }
  | { kind: "confirmClause" }
  | { kind: "confirmBuy" }
  | { kind: "confirmRelease" }
  | { kind: "confirmDismiss" };

/** Rótulos longos com custo quebram linha em telas estreitas em vez de estourar o diálogo. */
const LONG = "h-auto! min-h-10 whitespace-normal! py-2 text-center";
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Texto do motivo ao lado de um botão desabilitado. */
function Reason({ children }: { children: ReactNode }) {
  return <span className="self-center text-xs text-mist">{children}</span>;
}

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.14em] text-gold-400">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Ficha do jogador: dados, olheiros, negociação, empréstimos, renovação, venda, funções, rescisão e base. */
export function PlayerModal({ pid, onClose }: { pid: string; onClose: () => void }) {
  const { world, version, mutate } = useWorld();
  const toast = useToast();
  const [view, setView] = useState<View>({ kind: "info" });

  // O Modal refaz o foco quando onClose muda; mantém uma referência estável.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  const close = useCallback(() => closeRef.current(), []);

  // Abrir a ficha de um jogador de fora conta como observação (nível 1), uma vez por jogador.
  const observed = useRef<string | null>(null);
  useEffect(() => {
    if (observed.current === pid) return;
    observed.current = pid;
    const p = world.players[pid];
    if (!p || p.clubId === world.userClub || p.loan?.from === world.userClub) return;
    if ((world.scouting[pid]?.level ?? 0) < 1) mutate((w) => observe(w, pid));
  }, [pid, world, mutate]);

  const info = useMemo(() => {
    const p = world.players[pid];
    if (!p) return null;
    const u = user(world);
    const loanIn = p.loan?.to === u.id;
    const loanOut = p.loan?.from === u.id;
    const own = (p.clubId === u.id && !loanIn) || loanOut;
    const club = p.clubId ? (world.clubs[p.clubId] ?? null) : null;
    return {
      p,
      u,
      club,
      own,
      loanIn,
      loanOut,
      inSquad: p.clubId === u.id,
      other: !own && !loanIn,
      value: valueOf(p),
      open: windowOpen(world),
      squadFull: u.squad.length >= SQUAD_MAX,
      captain: u.captain === p.id,
      penTaker: u.penTaker === p.id,
      fee: releaseCost(p),
      range: potentialRange(world, p),
      traits: knownTraits(world, p),
      watched: world.watchlist.includes(pid),
      scout: scoutStatus(world, pid),
      neg: negotiationInfo(world, pid),
      loanQuote: !own && !loanIn && p.clubId ? loanInTerms(world, pid) : null,
      promise: promiseStatus(world, p),
      loan: loanMark(world, p),
    };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, pid, version]);

  if (!info) return null;
  const { p, u, club, own, loanIn, loanOut, inSquad, other, value, open, squadFull, captain, penTaker, fee, range, traits, watched, scout, neg, loanQuote } = info;
  const fullReason = `Elenco cheio (${u.squad.length}/${SQUAD_MAX})`;
  const back = () => setView({ kind: "info" });
  const name = p.name;

  // ---------- Sub-telas com diálogo próprio ----------
  if (view.kind === "negotiate") return <NegotiationDialog pid={pid} mode={view.mode} onBack={back} onDone={close} />;
  if (view.kind === "renew") return <RenewDialog pid={pid} onBack={back} />;
  if (view.kind === "loanIn") return <LoanInDialog pid={pid} onBack={back} onDone={close} />;
  if (view.kind === "loanOut") return <LoanOutDialog pid={pid} onBack={back} onDone={close} />;

  // ---------- Ações ----------
  const promote = () => {
    mutate((w) => promoteYouth(w, pid));
    toast(`${name} subiu para o profissional!`, "good");
    close();
  };
  const doDismiss = () => {
    close();
    mutate((w) => dismissYouth(w, pid));
    toast(`${name} foi dispensado da base.`);
  };
  const toggleList = () => {
    const listed = !p.listed;
    mutate((w) => {
      w.players[pid].listed = listed;
    });
    toast(listed ? `${name} está na lista de transferências. Aguarde propostas nas janelas.` : `${name} saiu da lista de transferências.`);
  };
  const makeCaptain = () => {
    mutate((w) => void setCaptain(w, pid));
    toast(`${name} é o novo capitão.`, "good");
  };
  const makePenTaker = () => {
    mutate((w) => void setPenTaker(w, pid));
    toast(`${name} vai bater os pênaltis.`, "good");
  };
  const doRelease = () => {
    close();
    mutate((w) => {
      release(w, pid);
      ensureLineup(w, user(w));
    });
    toast(`${name} foi dispensado. Multa paga: ${formatMoney(fee)}.`);
  };
  const doWatch = () => {
    let on = false;
    mutate((w) => {
      on = toggleWatch(w, pid);
    });
    toast(on ? `${name} entrou na lista de observação. Você será avisado das novidades.` : `${name} saiu da lista de observação.`);
  };
  const doScout = () => {
    let r: { ok: boolean; reason?: string; readyWeek?: number } = { ok: false };
    mutate((w) => {
      r = requestScoutReport(w, pid);
    });
    toast(r.ok ? `Olheiro a caminho: relatório de ${name} pronto na semana ${r.readyWeek}.` : (r.reason ?? "Não foi possível pedir o relatório."), r.ok ? "good" : "bad");
  };
  const doClause = () => {
    let r: ClubResponse | null = null;
    mutate((w) => {
      r = payReleaseClause(w, pid);
    });
    const res = r as ClubResponse | null;
    if (res?.status === "accepted") setView({ kind: "negotiate", mode: "clause" });
    else {
      toast(res?.text ?? "Não foi possível pagar a multa.", "bad");
      back();
    }
  };
  const doRecall = () => {
    let ok = false;
    mutate((w) => {
      ok = recallLoan(w, pid);
      if (ok) ensureLineup(w, user(w));
    });
    toast(ok ? (loanIn ? `${name} voltou ao ${info.loan?.club ?? "clube de origem"}.` : `${name} está de volta ao elenco.`) : "Não foi possível encerrar o empréstimo.", ok ? "good" : "bad");
    if (ok) close();
  };
  const doBuy = () => {
    let ok = false;
    const price = p.loan?.buyOption ?? 0;
    mutate((w) => {
      ok = exerciseBuyOption(w, pid);
    });
    toast(ok ? `${name} agora é do ${u.name} em definitivo por ${formatMoney(price)}.` : "Não foi possível exercer a opção (caixa insuficiente?).", ok ? "good" : "bad");
    back();
  };

  // ---------- Confirmações ----------
  let title: ReactNode = name;
  let body: ReactNode;
  let footer: ReactNode;
  let size: "md" | "lg" = "md";

  switch (view.kind) {
    case "confirmClause":
      title = `Pagar a multa de ${name}?`;
      body = (
        <div className="space-y-3 text-sm text-mist">
          <p>
            A multa rescisória é de <b className="text-snow">{formatMoney(p.releaseClause)}</b>. O {club?.name ?? "clube"} não pode recusar: você passa direto para o contrato com o jogador.
          </p>
          <p>O valor sai do caixa ({formatMoney(u.money)}) só quando você fechar a contratação. Se o jogador recusar os termos, nada é cobrado.</p>
        </div>
      );
      footer = (
        <>
          <Button variant="ghost" onClick={back}>
            Cancelar
          </Button>
          <Button variant="primary" icon={<Gavel />} onClick={doClause} className={LONG}>
            Pagar multa • {formatMoney(p.releaseClause)}
          </Button>
        </>
      );
      break;
    case "confirmBuy": {
      const price = p.loan?.buyOption ?? 0;
      const short = price > u.money;
      title = `Comprar ${name}?`;
      body = (
        <p className="text-sm text-mist">
          A opção de compra custa <b className="text-snow">{formatMoney(price)}</b>, paga agora ao {info.loan?.club ?? "clube dono"}. O jogador fica no {u.name} em definitivo, com contrato de pelo menos 3 anos.
        </p>
      );
      footer = (
        <>
          <Button variant="ghost" onClick={back}>
            Cancelar
          </Button>
          {short && <Reason>Caixa insuficiente ({formatMoney(u.money)})</Reason>}
          <Button variant="primary" icon={<BadgeDollarSign />} onClick={doBuy} disabled={short} className={LONG}>
            Exercer opção • {formatMoney(price)}
          </Button>
        </>
      );
      break;
    }
    case "confirmRelease":
      title = `Rescindir com ${name}?`;
      body = (
        <p className="text-sm text-mist">
          A multa por rescisão é de <b className="text-snow">{formatMoney(fee)}</b>, descontada do caixa agora. O jogador vira agente livre e pode assinar com outro clube.
        </p>
      );
      footer = (
        <>
          <Button variant="ghost" onClick={back}>
            Cancelar
          </Button>
          <Button variant="danger" icon={<UserX />} onClick={doRelease} className={LONG}>
            Rescindir • {formatMoney(fee)}
          </Button>
        </>
      );
      break;
    case "confirmDismiss":
      title = `Dispensar ${name}?`;
      body = <p className="text-sm text-mist">O garoto deixa o clube e não pode voltar.</p>;
      footer = (
        <>
          <Button variant="ghost" onClick={back}>
            Cancelar
          </Button>
          <Button variant="danger" icon={<UserMinus />} onClick={doDismiss}>
            Dispensar da base
          </Button>
        </>
      );
      break;
    default: {
      size = "lg";
      const canLead = available(p);
      const cooldown = neg?.cooldownUntil != null ? `O ${club?.name ?? "clube"} só volta a negociar na semana ${neg.cooldownUntil}` : null;

      // ---- Painel de mercado (jogadores de fora) ----
      const scoutLabel =
        scout.level >= 2 ? (
          <Badge tone="green">Relatório completo</Badge>
        ) : scout.readyWeek != null ? (
          <Badge tone="blue">Pronto na semana {scout.readyWeek}</Badge>
        ) : (
          <Badge tone="neutral">{scout.level === 1 ? "Observado" : "Só o básico"}</Badge>
        );
      const clauseOk = p.releaseClause > 0 && p.releaseClause <= u.money;
      const marketPanel = other && (
        <Panel
          title="Olheiros e mercado"
          action={
            <Button variant={watched ? "secondary" : "outline"} icon={<Star className={watched ? "fill-current text-gold-400" : undefined} />} onClick={doWatch} aria-pressed={watched}>
              {watched ? "Observando" : "Observar"}
            </Button>
          }
        >
          <KV label="Relatório do olheiro">{scoutLabel}</KV>
          <KV label="Valor de mercado">{formatMoney(value)}</KV>
          {club && (
            <KV label="Multa rescisória">
              <span className="inline-flex flex-wrap items-center justify-end gap-2">
                {p.releaseClause ? formatMoney(p.releaseClause) : "—"}
                {p.releaseClause > 0 && <Badge tone={clauseOk ? "green" : "neutral"}>{clauseOk ? "Cabe no caixa" : "Acima do caixa"}</Badge>}
              </span>
            </KV>
          )}
          {neg && club && (
            <KV label="Negociação">
              {neg.agreed ? (
                <span className="text-pitch-400">Acordo com o clube: {formatMoney(neg.agreed.fee)}</span>
              ) : cooldown ? (
                <span className="text-danger-400">Encerrada até a semana {neg.cooldownUntil}</span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Meter value={(neg.patience / PATIENCE_MAX) * 100} label="Paciência do clube" className="w-14" />
                  <span className="text-sm">
                    Paciência {neg.patience}/{PATIENCE_MAX}
                    {neg.lastFee ? ` • última ${formatMoney(neg.lastFee)}` : ""}
                  </span>
                </span>
              )}
            </KV>
          )}
          {loanQuote && (
            <KV label="Empréstimo">
              <span className={loanQuote.ok ? "text-pitch-400" : "text-mist"}>{loanQuote.ok ? `Possível • você paga ${pct(loanQuote.wageShare)} do salário` : (loanQuote.reason ?? "Indisponível")}</span>
            </KV>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {scout.level < 2 && scout.readyWeek == null && (
              <>
                <Button variant="secondary" icon={<FileSearch />} onClick={doScout} disabled={!!scout.reason} title={scout.reason ?? undefined} className={LONG}>
                  Relatório do olheiro • {formatMoney(scout.cost)}
                </Button>
                <span className="text-xs text-mist">
                  {scout.reason ?? `Revela potencial exato e características em 1–2 semanas. Olheiros livres: ${scout.slots - scout.busy}/${scout.slots}.`}
                </span>
              </>
            )}
          </div>
        </Panel>
      );

      // ---- Painel de contrato (jogadores do usuário e emprestados) ----
      const l = p.loan;
      const contractPanel = (own || loanIn) && (
        <Panel title={loanIn ? "Empréstimo" : "Contrato"}>
          {l && (
            <>
              <KV label={loanIn ? "Clube dono" : "Emprestado ao"}>{info.loan?.club}</KV>
              <KV label="Volta">Temporada {l.until}</KV>
              <KV label={loanIn ? "Você paga" : "Você paga do salário"}>
                {pct(loanIn ? l.wageShare : 1 - l.wageShare)} • {formatMoney(p.wage * (loanIn ? l.wageShare : 1 - l.wageShare))}/sem
              </KV>
              {loanOut && (
                <KV label="No empréstimo">
                  {p.s.apps - (l.apps0 ?? 0)} jogos • {p.s.goals - (l.goals0 ?? 0)} gols
                </KV>
              )}
              {loanIn && l.buyOption != null && <KV label="Opção de compra">{formatMoney(l.buyOption)}</KV>}
            </>
          )}
          {!loanIn && !p.youth && <KV label="Multa rescisória">{p.releaseClause ? formatMoney(p.releaseClause) : "—"}</KV>}
          {info.promise && (
            <KV label="Papel prometido">
              <span className="inline-flex flex-wrap items-center justify-end gap-2">
                <Badge tone={ROLE_SHORT[info.promise.role].tone}>{ROLE_SHORT[info.promise.role].name}</Badge>
                {info.promise.warn && <Badge tone="red">Cobra promessa</Badge>}
              </span>
            </KV>
          )}
          {info.promise && <p className={`pb-1 text-xs ${info.promise.warn ? "text-danger-400" : "text-mist"}`}>{info.promise.text}</p>}
        </Panel>
      );

      body = (
        <div className="space-y-4">
          <PlayerHeader player={p} club={club} own={own} captain={inSquad && captain} penTaker={inSquad && penTaker} range={range} traits={traits} />
          {marketPanel}
          {contractPanel}
          <PlayerStats player={p} />
          {inSquad && !p.youth && (
            <Panel title="Funções em campo">
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {captain ? (
                  <span className="inline-flex h-10 items-center gap-2 px-2 text-sm text-gold-300">
                    <Crown className="size-4" aria-hidden /> É o capitão
                  </span>
                ) : (
                  <Button variant="ghost" icon={<Crown />} onClick={makeCaptain} disabled={!canLead} title={canLead ? undefined : "Indisponível (DM ou suspenso)"}>
                    Definir como capitão
                  </Button>
                )}
                {penTaker ? (
                  <span className="inline-flex h-10 items-center gap-2 px-2 text-sm text-info-400">
                    <Target className="size-4" aria-hidden /> Bate os pênaltis
                  </span>
                ) : (
                  <Button variant="ghost" icon={<Target />} onClick={makePenTaker} disabled={!canLead} title={canLead ? undefined : "Indisponível (DM ou suspenso)"}>
                    Batedor de pênaltis
                  </Button>
                )}
                {!canLead && <Reason>Indisponível: está no DM ou suspenso.</Reason>}
              </div>
            </Panel>
          )}
          {loanOut && (
            <Alert tone="info">
              <PlaneTakeoff className="size-4 shrink-0 text-info-400" aria-hidden />
              <span>{info.loan?.text}</span>
            </Alert>
          )}
        </div>
      );

      const closedReason = open ? null : windowClosedReason(world);
      if (loanOut) {
        footer = (
          <>
            {closedReason && <Reason>{closedReason}</Reason>}
            <Button variant="secondary" icon={<Undo2 />} onClick={doRecall} disabled={!open} title={closedReason ?? undefined}>
              Encerrar empréstimo
            </Button>
          </>
        );
      } else if (loanIn) {
        const opt = p.loan?.buyOption ?? null;
        footer = (
          <>
            {closedReason && <Reason>{closedReason}</Reason>}
            <Button variant="outline" icon={<Undo2 />} onClick={doRecall} disabled={!open} title={closedReason ?? undefined} className="mr-auto">
              Devolver ao clube
            </Button>
            {opt != null && (
              <Button variant="primary" icon={<BadgeDollarSign />} onClick={() => setView({ kind: "confirmBuy" })} className={LONG}>
                Exercer opção • {formatMoney(opt)}
              </Button>
            )}
          </>
        );
      } else if (own && p.youth) {
        const canLoan = p.age >= 17;
        const loanReason = !canLoan ? "Empréstimo só a partir dos 17 anos" : closedReason;
        footer = (
          <>
            <Button variant="danger" icon={<UserMinus />} onClick={() => setView({ kind: "confirmDismiss" })} className="mr-auto">
              Dispensar da base
            </Button>
            {loanReason && <Reason>{loanReason}</Reason>}
            <Button variant="outline" icon={<PlaneTakeoff />} onClick={() => setView({ kind: "loanOut" })} disabled={!!loanReason} title={loanReason ?? undefined}>
              Emprestar
            </Button>
            {squadFull && <Reason>{fullReason}</Reason>}
            <Button variant="primary" icon={<ArrowUpFromLine />} onClick={promote} disabled={squadFull} title={squadFull ? fullReason : undefined}>
              Promover ao profissional
            </Button>
          </>
        );
      } else if (own) {
        const renewMain = p.contract <= 2;
        footer = (
          <>
            <Button variant="danger" icon={<UserX />} onClick={() => setView({ kind: "confirmRelease" })} className="mr-auto">
              Rescindir contrato
            </Button>
            {closedReason && <Reason>{closedReason}</Reason>}
            <Button variant="outline" icon={<PlaneTakeoff />} onClick={() => setView({ kind: "loanOut" })} disabled={!open} title={closedReason ?? undefined}>
              Emprestar
            </Button>
            <Button variant="secondary" icon={<Tag />} onClick={toggleList}>
              {p.listed ? "Tirar da lista" : "Colocar à venda"}
            </Button>
            <Button variant={renewMain ? "primary" : "secondary"} icon={<PenLine />} onClick={() => setView({ kind: "renew" })}>
              Renovar contrato
            </Button>
          </>
        );
      } else if (!club) {
        const reason = closedReason ?? (squadFull ? fullReason : null);
        footer = (
          <>
            {reason && <Reason>{reason}</Reason>}
            <Button variant="primary" icon={<UserPlus />} onClick={() => setView({ kind: "negotiate", mode: "free" })} disabled={!!reason} title={reason ?? undefined}>
              Negociar contrato
            </Button>
          </>
        );
      } else {
        const reason = closedReason ?? (squadFull ? fullReason : null);
        const bidReason = reason ?? cooldown;
        const clauseReason = reason ?? (p.releaseClause > u.money ? "Multa acima do seu caixa" : null);
        const loanReason = reason ?? (loanQuote && !loanQuote.ok ? (loanQuote.reason ?? "O clube não empresta") : null);
        const resume = !!neg?.agreed;
        // Motivos visíveis (também no celular, sem tooltip): geral, depois os específicos de cada botão.
        const notes = Array.from(
          new Set(
            [reason ?? cooldown, !reason && clauseReason && p.releaseClause > 0 ? clauseReason : null, !reason && loanReason ? `Empréstimo: ${loanReason}` : null].filter(
              (x): x is string => !!x,
            ),
          ),
        );
        footer = (
          <>
            {notes.length > 0 && <Reason>{notes.join(" • ")}</Reason>}
            <Button variant="outline" icon={<PlaneLanding />} onClick={() => setView({ kind: "loanIn" })} disabled={!!loanReason} title={loanReason ?? undefined}>
              Pedir emprestado
            </Button>
            {p.releaseClause > 0 && (
              <Button variant="secondary" icon={<Gavel />} onClick={() => setView({ kind: "confirmClause" })} disabled={!!clauseReason} title={clauseReason ?? undefined} className={LONG}>
                Pagar multa • {formatMoney(p.releaseClause)}
              </Button>
            )}
            <Button
              variant="primary"
              icon={resume ? <Handshake /> : <Send />}
              onClick={() => setView({ kind: "negotiate", mode: neg?.agreed?.clause ? "clause" : "bid" })}
              disabled={!!bidReason && !(resume && !reason)}
              title={bidReason ?? undefined}
            >
              {resume ? "Continuar negociação" : "Fazer proposta"}
            </Button>
          </>
        );
      }
    }
  }

  return (
    <Modal open onClose={close} title={title} size={size} footer={footer}>
      {body}
    </Modal>
  );
}

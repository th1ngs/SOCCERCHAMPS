"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Ban, Check, Handshake, Send } from "lucide-react";
import { SQUAD_MAX, TOTAL_WEEKS, completeTransfer, contractAsk, contractChance, ensureLineup, formatMoney, negotiateContract, negotiateTransfer, user, valueOf, windowOpen } from "@/game";
import type { ClubResponse, ContractResponse, Terms } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Flag } from "@/components/ui/Flag";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { Alert, KV, Meter } from "@/components/ui/primitives";
import { PATIENCE_MAX, installmentPlan, negotiationInfo, type Installments } from "@/components/market/transferDerive";
import { cn } from "@/lib/cn";
import { feeFromMillions, toMillions, windowClosedReason, yearsText } from "./playerInfo";
import { TermsPanel } from "./TermsPanel";

export type NegotiationMode = "bid" | "clause" | "free";

const QUICK = [0.9, 1, 1.15, 1.3];
const INSTALLMENTS = [
  { value: "1", label: "À vista" },
  { value: "2", label: "2x" },
  { value: "3", label: "3x" },
] as const;
type InstOpt = (typeof INSTALLMENTS)[number]["value"];

/** Rótulos longos com valor quebram linha em telas estreitas. */
const LONG = "h-auto! min-h-10 whitespace-normal! py-2 text-center";

interface Deal {
  fee: number;
  installments: Installments;
}

const sameTerms = (a: Terms | null, b: Terms) => !!a && a.wage === b.wage && a.years === b.years && a.bonus === b.bonus && a.role === b.role;

function Steps({ phase, skipClub }: { phase: "club" | "terms"; skipClub: boolean }) {
  const steps = skipClub ? [{ k: "terms", label: "Contrato com o jogador" }] : [
    { k: "club", label: "1. Acordo com o clube" },
    { k: "terms", label: "2. Contrato com o jogador" },
  ];
  return (
    <ol className="mb-4 flex flex-wrap gap-2" aria-label="Etapas da negociação">
      {steps.map((s) => {
        const on = s.k === phase;
        const done = s.k === "club" && phase === "terms";
        return (
          <li
            key={s.k}
            aria-current={on ? "step" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-display text-xs font-bold uppercase tracking-wide ring-1 ring-inset",
              on ? "bg-gold-400/15 text-gold-300 ring-gold-400/40" : done ? "text-pitch-400 ring-pitch-500/30" : "text-mist ring-white/10",
            )}
          >
            {done && <Check className="size-3.5" aria-hidden />}
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

function Reason({ children }: { children: ReactNode }) {
  return <span className="self-center text-xs text-mist">{children}</span>;
}

/**
 * Negociação em duas etapas: (1) taxa e parcelas com o clube vendedor, com paciência limitada;
 * (2) termos pessoais com o jogador (salário, anos, luvas, papel) e fechamento.
 * Multa paga e agentes livres começam direto na etapa 2.
 */
export function NegotiationDialog({ pid, mode, onBack, onDone }: { pid: string; mode: NegotiationMode; onBack: () => void; onDone: () => void }) {
  const { world, version, mutate } = useWorld();
  const toast = useToast();
  const p = world.players[pid];

  // Estado inicial: retoma um acordo já feito com o clube (w.negotiations) se houver.
  const [init] = useState(() => {
    const neg = negotiationInfo(world, pid);
    const agreed = neg?.agreed ?? null;
    const deal: Deal | null =
      mode === "free" ? { fee: 0, installments: 1 } : agreed ? { fee: agreed.fee, installments: agreed.installments } : mode === "clause" ? { fee: p?.releaseClause ?? 0, installments: 1 } : null;
    const ask = deal && p ? contractAsk(world, pid) : null;
    return { neg, deal, ask, contract: neg?.contract ?? null };
  });

  const [phase, setPhase] = useState<"club" | "terms">(init.deal ? "terms" : "club");
  const [deal, setDeal] = useState<Deal | null>(init.deal);
  // Etapa 1
  const [amount, setAmountRaw] = useState(() => toMillions(init.neg?.lastFee || (p ? valueOf(p) : 0)));
  const [inst, setInst] = useState<InstOpt>("1");
  const [clubReply, setClubReply] = useState<ClubResponse | null>(null);
  // Etapa 2
  const [ask, setAsk] = useState<Terms | null>(init.ask);
  const [terms, setTerms] = useState<Terms | null>(init.contract ?? init.ask);
  const [termsReply, setTermsReply] = useState<ContractResponse | null>(null);
  const [agreedTerms, setAgreedTerms] = useState<Terms | null>(init.contract);

  const info = useMemo(() => {
    if (!p) return null;
    const u = user(world);
    return {
      u,
      club: p.clubId ? (world.clubs[p.clubId] ?? null) : null,
      value: valueOf(p),
      neg: negotiationInfo(world, pid),
      open: windowOpen(world),
      full: u.squad.length >= SQUAD_MAX,
    };
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, pid, version]);

  const chance = useMemo(
    () => (terms && p ? contractChance(world, pid, terms) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, pid, version, terms],
  );

  if (!p || !info) return null;
  const { u, club, value, neg, open, full } = info;
  const skipClub = mode !== "bid";
  const name = p.name;

  // ---------- Etapa 1: clube ----------
  const fee = feeFromMillions(amount);
  const installments = Number(inst) as Installments;
  const setAmount = (v: string) => {
    setAmountRaw(v);
    if (clubReply?.status !== "walkout") setClubReply(null);
  };
  const blocked = neg?.cooldownUntil != null;
  const walkedOut = clubReply?.status === "walkout" || blocked;
  const patience = clubReply ? clubReply.patience : (neg?.patience ?? PATIENCE_MAX);

  const goTerms = (d: Deal) => {
    let a: Terms | null = null;
    mutate((w) => {
      a = contractAsk(w, pid);
    });
    setDeal(d);
    setAsk(a);
    setTerms((cur) => cur ?? a);
    setTermsReply(null);
    setPhase("terms");
  };

  const sendBid = () => {
    let r: ClubResponse | null = null;
    mutate((w) => {
      r = negotiateTransfer(w, pid, { fee, installments });
    });
    setClubReply(r);
  };

  const acceptCounter = () => {
    if (!clubReply?.counterFee) return;
    const f = clubReply.counterFee;
    let r: ClubResponse | null = null;
    mutate((w) => {
      r = negotiateTransfer(w, pid, { fee: f, installments });
    });
    const res = r as ClubResponse | null;
    if (res?.status === "accepted") {
      toast(`Acordo com o ${club?.name ?? "clube"} por ${formatMoney(f)}. Agora, o contrato de ${name}.`, "good");
      goTerms({ fee: f, installments });
    } else {
      setClubReply(res);
      setAmountRaw(toMillions(f));
    }
  };

  // ---------- Etapa 2: jogador ----------
  const editTerms = (t: Terms) => {
    setTerms(t);
    if (termsReply?.status !== "counter") setTermsReply(null);
  };
  const sendTerms = () => {
    if (!terms) return;
    let r: ContractResponse | null = null;
    mutate((w) => {
      r = negotiateContract(w, pid, terms);
    });
    const res = r as ContractResponse | null;
    setTermsReply(res);
    setAgreedTerms(res?.status === "accepted" ? terms : null);
  };
  const useCounter = () => {
    if (termsReply?.counter) {
      setTerms(termsReply.counter);
      setTermsReply(null);
    }
  };

  const agreed = !!terms && sameTerms(agreedTerms, terms);
  const plan = deal ? installmentPlan(deal.fee, deal.installments) : null;
  const dueNow = (plan?.now ?? 0) + (terms?.bonus ?? 0);
  const closeReason = !open ? windowClosedReason(world) : full ? `Elenco cheio (${u.squad.length}/${SQUAD_MAX})` : dueNow > u.money ? `Caixa insuficiente: precisa de ${formatMoney(dueNow)} agora` : null;

  const closeDeal = () => {
    if (!deal || !terms) return;
    let ok = false;
    let msg = "";
    mutate((w) => {
      const res: unknown = completeTransfer(w, pid, { ...terms, fee: deal.fee, installments: deal.installments });
      ok = w.players[pid]?.clubId === w.userClub;
      if (res && typeof res === "object" && "text" in res) msg = String((res as { text: unknown }).text);
      else if (res && typeof res === "object" && "reason" in res) msg = String((res as { reason: unknown }).reason);
      if (ok) ensureLineup(w, user(w));
    });
    if (!ok) return toast(msg || "Não foi possível fechar a contratação.", "bad");
    toast(`${name} é o novo reforço do ${u.name}${deal.fee ? ` por ${formatMoney(deal.fee)}` : ""}!`, "good");
    onDone();
  };

  // ---------- Render ----------
  let body: ReactNode;
  let footer: ReactNode;
  const title = phase === "club" ? `Proposta por ${name}` : `Contrato de ${name}`;

  if (phase === "club") {
    const tone = !clubReply ? "info" : clubReply.status === "accepted" ? "good" : clubReply.status === "counter" ? "info" : "bad";
    const bidPlan = installmentPlan(fee, installments);
    body = (
      <div className="space-y-4">
        <Steps phase="club" skipClub={false} />
        <div className="rounded-xl bg-ink-900/60 px-4 py-1 ring-1 ring-inset ring-white/6">
          {club && (
            <KV label="Clube">
              <span className="inline-flex items-center gap-1.5">
                {club.name} <Flag code={club.league} />
              </span>
            </KV>
          )}
          <KV label="Valor de mercado">{formatMoney(value)}</KV>
          <KV label="Multa rescisória">{p.releaseClause ? formatMoney(p.releaseClause) : "—"}</KV>
          {neg && neg.lastFee > 0 && <KV label="Sua última proposta">{formatMoney(neg.lastFee)}</KV>}
          <KV label="Seu caixa">
            <span className={u.money < 0 ? "text-danger-400" : undefined}>{formatMoney(u.money)}</span>
          </KV>
        </div>

        <div className="rounded-xl bg-ink-900/60 p-3 ring-1 ring-inset ring-white/6">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">Paciência do clube</span>
            <span className="font-display font-bold tabular">
              {Math.max(0, patience)} de {PATIENCE_MAX}
            </span>
          </div>
          <Meter value={(Math.max(0, patience) / PATIENCE_MAX) * 100} label="Paciência do clube vendedor" className="mt-2 h-2.5 w-full" />
          <p className="mt-2 text-xs text-mist">Propostas baixas gastam paciência. Se acabar, o clube encerra as conversas por 4 semanas.</p>
        </div>

        {walkedOut ? (
          <Alert tone="bad" className="animate-pop">
            <Ban className="size-4 shrink-0 text-danger-400" aria-hidden />
            <span role="status" className="min-w-0 flex-1">
              {clubReply?.status === "walkout" ? clubReply.text : `O ${club?.name ?? "clube"} encerrou as conversas.`}{" "}
              {neg?.cooldownUntil != null && (
                <b>
                  Volta a negociar na semana {neg.cooldownUntil}
                  {neg.cooldownSeason != null && neg.cooldownSeason !== world.season ? ` da temporada ${neg.cooldownSeason}` : ""}.
                </b>
              )}
            </span>
          </Alert>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!clubReply || clubReply.status !== "accepted") sendBid();
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Taxa de transferência (R$ milhões)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.05}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-autofocus
                className="h-11 w-full rounded-xl bg-ink-950/70 px-3 font-display text-xl font-bold tabular ring-1 ring-inset ring-white/12 focus:outline-2 focus:outline-gold-400"
              />
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Atalhos de valor (percentual do valor de mercado)">
              {QUICK.map((f) => {
                const v = toMillions(value * f);
                const on = amount === v;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setAmount(v)}
                    aria-pressed={on}
                    className={cn(
                      "h-10 min-w-16 rounded-lg px-3 font-display text-sm font-bold tabular ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-gold-400",
                      on ? "bg-gold-400 text-ink-950 ring-gold-400" : "text-mist ring-white/12 hover:bg-white/6 hover:text-snow",
                    )}
                  >
                    {Math.round(f * 100)}%
                  </button>
                );
              })}
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">Pagamento</p>
              <Segmented
                ariaLabel="Forma de pagamento"
                options={INSTALLMENTS.map((o) => ({ value: o.value, label: o.label }))}
                value={inst}
                onChange={(v) => {
                  setInst(v);
                  if (clubReply?.status !== "walkout") setClubReply(null);
                }}
              />
              <p className="mt-1.5 text-xs text-mist">
                {installments === 1 ? (
                  <>
                    Pagamento de <b className="text-snow">{formatMoney(fee)}</b> na assinatura.
                  </>
                ) : (
                  <>
                    <b className="text-snow">{formatMoney(bidPlan.now)}</b> agora e mais {bidPlan.rest}× {formatMoney(bidPlan.each)} nas próximas semanas. Parcelar exige cerca de 5% a mais.
                  </>
                )}
                {bidPlan.now > u.money && <span className="text-danger-400"> Acima do seu caixa.</span>}
              </p>
            </div>
          </form>
        )}

        {clubReply && clubReply.status !== "walkout" && (
          <Alert tone={tone} className="animate-pop">
            <span role="status">{clubReply.text}</span>
          </Alert>
        )}
      </div>
    );

    const accepted = clubReply?.status === "accepted";
    const counter = clubReply?.status === "counter" && clubReply.counterFee != null ? clubReply.counterFee : null;
    const bidReason = !open ? windowClosedReason(world) : full ? `Elenco cheio (${u.squad.length}/${SQUAD_MAX})` : fee <= 0 ? "Digite um valor" : null;
    footer = (
      <>
        <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack} className="mr-auto">
          Voltar à ficha
        </Button>
        {walkedOut ? null : accepted ? (
          <Button variant="primary" icon={<ArrowRight />} onClick={() => goTerms({ fee, installments })}>
            Negociar salário
          </Button>
        ) : (
          <>
            {bidReason && <Reason>{bidReason}</Reason>}
            <Button variant={counter ? "secondary" : "primary"} icon={<Send />} onClick={sendBid} disabled={!!bidReason} title={bidReason ?? undefined} className={LONG}>
              Enviar proposta • {formatMoney(fee)}
            </Button>
            {counter != null && (
              <Button variant="primary" icon={<Handshake />} onClick={acceptCounter} disabled={!!bidReason} className={LONG}>
                Aceitar contraproposta • {formatMoney(counter)}
              </Button>
            )}
          </>
        )}
      </>
    );
  } else {
    body =
      ask && terms && deal ? (
        <div className="space-y-4">
          <Steps phase="terms" skipClub={skipClub} />
          {mode === "clause" && (
            <Alert tone="good">
              <Check className="size-4 text-pitch-400" aria-hidden />
              <span>Multa rescisória acionada: o {club?.name ?? "clube"} não pode recusar. Falta acertar o contrato com {name}.</span>
            </Alert>
          )}
          {mode === "free" && <p className="text-sm text-mist">Agente livre: não há taxa de transferência, só o contrato com o jogador.</p>}
          <TermsPanel ask={ask} terms={terms} onChange={editTerms} chance={chance} reply={termsReply} onUseCounter={useCounter} agreed={agreed} />
          <DealSummary deal={deal} terms={terms} cash={u.money} />
        </div>
      ) : (
        <p className="text-sm text-mist">Carregando o pedido do jogador…</p>
      );
    footer = (
      <>
        <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack} className="mr-auto">
          Voltar à ficha
        </Button>
        {agreed ? (
          <>
            {closeReason && <Reason>{closeReason}</Reason>}
            <Button variant="primary" icon={<Handshake />} onClick={closeDeal} disabled={!!closeReason} title={closeReason ?? undefined} className={LONG}>
              Fechar contratação • {formatMoney(dueNow)} agora
            </Button>
          </>
        ) : (
          <Button variant="primary" icon={<Send />} onClick={sendTerms} disabled={!terms}>
            Enviar proposta ao jogador
          </Button>
        )}
      </>
    );
  }

  return (
    <Modal open onClose={onBack} title={title} size="lg" footer={footer}>
      {body}
    </Modal>
  );
}

/** Resumo do custo total: taxa, parcelas, luvas e salários do contrato. */
function DealSummary({ deal, terms, cash }: { deal: Deal; terms: Terms; cash: number }) {
  const plan = installmentPlan(deal.fee, deal.installments);
  const now = plan.now + terms.bonus;
  const wages = terms.wage * TOTAL_WEEKS * terms.years;
  return (
    <div className="rounded-xl bg-ink-900/60 px-4 py-1 ring-1 ring-inset ring-white/6">
      <p className="pt-2 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-gold-400">Resumo do negócio</p>
      <KV label="Taxa de transferência">{deal.fee ? formatMoney(deal.fee) : "Sem custo"}</KV>
      {deal.installments > 1 && (
        <KV label="Parcelas">
          {formatMoney(plan.now)} agora + {plan.rest}× {formatMoney(plan.each)}
        </KV>
      )}
      <KV label="Luvas (na assinatura)">{formatMoney(terms.bonus)}</KV>
      <KV label="Salário">
        {formatMoney(terms.wage)}/sem • {yearsText(terms.years)}
      </KV>
      <KV label="Salários no contrato (aprox.)">{formatMoney(wages)}</KV>
      <KV label="Sai do caixa agora">
        <span className={now > cash ? "text-danger-400" : "text-gold-300"}>{formatMoney(now)}</span>
      </KV>
      <KV label="Caixa depois">
        <span className={cash - now < 0 ? "text-danger-400" : undefined}>{formatMoney(cash - now)}</span>
      </KV>
    </div>
  );
}

"use client";

import type { CareerMatchReport } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { careerPlayer } from "@/game";

export const STATUS_TEXT: Record<CareerMatchReport["status"], string> = {
  titular: "Titular",
  reserva: "Entrou no 2º tempo",
  banco: "Ficou no banco",
  fora: "Não foi relacionado",
  lesionado: "Lesionado",
  suspenso: "Suspenso",
};

export const ratingTone = (r: number | null): string =>
  r == null ? "bg-white/10 text-mist" : r >= 7.5 ? "bg-gold-400 text-ink-950" : r >= 6.8 ? "bg-pitch-400 text-ink-950" : r >= 6 ? "bg-white/15 text-snow" : "bg-danger-500 text-white";

/** Placar e atuação do jogador num jogo. */
export function ReportBody({ report }: { report: CareerMatchReport }) {
  const { world: w } = useWorld();
  const p = careerPlayer(w);
  const mine = p?.clubId ? w.clubs[p.clubId] : null;
  const opp = w.clubs[report.opp];
  const result = report.gf > report.ga ? "Vitória" : report.gf < report.ga ? "Derrota" : "Empate";
  const left = report.home ? mine : opp, right = report.home ? opp : mine;
  const [ls, rs] = report.home ? [report.gf, report.ga] : [report.ga, report.gf];
  return (
    <div>
      <p className="text-center text-xs font-bold uppercase tracking-wider text-mist">{report.comp} • semana {report.week}</p>
      <div className="mt-2 flex items-center justify-center gap-3">
        {left && <Crest club={left} size={40} />}
        <span className="font-display text-4xl font-extrabold tabular">{ls} x {rs}</span>
        {right && <Crest club={right} size={40} />}
      </div>
      {report.pens && <p className="text-center text-xs text-gold-400">Pênaltis {report.home ? report.pens[0] : report.pens[1]} x {report.home ? report.pens[1] : report.pens[0]}</p>}
      <p className={cn("mt-1 text-center text-sm font-semibold", result === "Vitória" ? "text-pitch-400" : result === "Derrota" ? "text-danger-400" : "text-mist")}>
        {result} {report.home ? "em casa" : "fora"} contra o {opp?.name ?? "adversário"}
      </p>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-xl bg-ink-950/50 p-2 ring-1 ring-inset ring-white/8">
          <span className="block text-[11px] uppercase tracking-wider text-mist">Nota</span>
          <span className={cn("mt-1 inline-block rounded-lg px-2 font-display text-xl font-extrabold tabular", ratingTone(report.rating))}>{report.rating?.toFixed(1).replace(".", ",") ?? "—"}</span>
        </div>
        {[["Gols", report.goals], ["Assist.", report.assists], ["Confiança", Math.round(report.trust)]].map(([k, v]) => (
          <div key={k as string} className="rounded-xl bg-ink-950/50 p-2 ring-1 ring-inset ring-white/8">
            <span className="block text-[11px] uppercase tracking-wider text-mist">{k}</span>
            <span className="mt-1 block font-display text-xl font-extrabold tabular">{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-sm text-mist">{STATUS_TEXT[report.status]}</p>
      {report.moments.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {report.moments.map((m, i) => (
            <li key={i} className="rounded-lg bg-ink-950/40 px-3 py-1.5 text-sm">{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Relatório do jogo logo depois de jogar a semana. */
export function MatchReportModal({ report, onClose }: { report: CareerMatchReport; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Seu jogo" footer={<Button variant="primary" onClick={onClose} data-autofocus>Continuar</Button>}>
      <ReportBody report={report} />
    </Modal>
  );
}

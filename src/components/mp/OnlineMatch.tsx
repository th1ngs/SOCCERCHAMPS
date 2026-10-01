"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DoorOpen, Trophy } from "lucide-react";
import { teamById } from "@/arcade/teams";
import type { MpRoom } from "@/lib/mp";
import { ButtonStage } from "@/components/arcade/ButtonStage";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { ONLINE_TURN_S, OnlineSession } from "./onlineSession";

const REASON: Record<string, string> = { fim: "Fim de jogo", abandono: "O adversário abandonou a partida", ausencia: "Vitória por ausência do adversário" };

/** Partida online de botão: placar, vez, tempo da jogada e campo. */
export function OnlineMatch({ room, onExit }: { room: MpRoom; onExit: () => void }) {
  const [session] = useState(() => new OnlineSession(room));
  const st = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [leaving, setLeaving] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const home = teamById(room.host.team), away = teamById(room.guest?.team);

  useEffect(() => {
    session.start();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      session.dispose();
      document.body.style.overflow = prev;
    };
  }, [session]);

  if (!home || !away) return null;
  const names = [room.host.name, room.guest?.name ?? "?"];
  const mine = session.side;
  const won = st.result && st.result.winner === mine;
  const draw = st.result && st.result.winner === -1;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[radial-gradient(ellipse_at_top,#10294a,#07121f_70%)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" role="dialog" aria-modal="true" aria-label={`${home.name} x ${away.name} online`}>
      <header className="border-b border-white/8 bg-black/30 px-2 py-2 sm:px-4">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
            {[home, away].map((t, i) => (
              <div key={i} className={cn("flex min-w-0 items-center gap-2 rounded-xl border-2 px-2 py-1", i === 1 ? "order-3 flex-row-reverse text-right" : "", st.phase === "playing" && (st.myTurn ? i === mine : i !== mine) ? "border-gold-400 bg-gold-400/12" : "border-transparent")}>
                <Crest club={t.club} size={28} className="shrink-0" />
                <span className="min-w-0 leading-tight">
                  <b className="block truncate font-display text-sm font-bold uppercase sm:text-base">{t.name}</b>
                  <span className="block truncate text-[11px] text-mist">{names[i]}{i === mine ? " (você)" : ""}</span>
                </span>
              </div>
            ))}
            <div className="order-2 text-center">
              <div className="rounded-lg bg-ink-950 px-3 py-1 font-display text-3xl font-extrabold tabular ring-1 ring-inset ring-white/10">{st.score[0]}<span className="mx-1.5 text-mist">:</span>{st.score[1]}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-wider text-mist tabular">Jogada {Math.min(st.played + 1, st.turns)}/{st.turns}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={<DoorOpen />} onClick={() => setLeaving(true)} disabled={st.phase === "over"} aria-label="Sair da partida" className="px-2">
            <span className="max-sm:sr-only">Sair</span>
          </Button>
        </div>
        <p className={cn("mt-1 text-center text-xs font-semibold", st.myTurn ? "text-gold-300" : "text-mist")} aria-live="polite">
          {st.phase === "over" ? "Partida encerrada" : st.myTurn ? `Sua vez • ${st.turnLeft}s` : "Vez do adversário"}
          {st.error && <span className="ml-2 text-danger-400">• {st.error}</span>}
        </p>
        {st.myTurn && (
          <div className="mx-auto mt-1 h-1 max-w-5xl overflow-hidden rounded-full bg-white/8" aria-hidden>
            <div className={cn("h-full transition-[width] duration-500 ease-linear", st.turnLeft <= 7 ? "bg-danger-500" : "bg-pitch-400")} style={{ width: `${(st.turnLeft / ONLINE_TURN_S) * 100}%` }} />
          </div>
        )}
      </header>

      <ButtonStage runner={session.runner}>
        {st.phase === "playing" && !st.myTurn && st.opponentIdle >= 90 && (
          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
            <div className="rounded-xl bg-ink-900/95 p-3 text-center text-sm shadow-xl ring-1 ring-white/10">
              <p>O adversário está sem jogar há {st.opponentIdle}s.</p>
              <Button variant="primary" size="sm" className="mt-2" onClick={async () => setClaimMsg(await session.claim())}>Reivindicar vitória</Button>
              {claimMsg && <p className="mt-1 text-xs text-danger-400">{claimMsg}</p>}
            </div>
          </div>
        )}
        {st.phase === "over" && st.result && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink-950/60 p-4 backdrop-blur-[3px]">
            <div className="w-full max-w-sm animate-pop rounded-2xl bg-ink-850 p-6 text-center shadow-2xl ring-1 ring-white/10">
              <Trophy className={cn("mx-auto size-10", won ? "text-gold-400" : "text-mist")} />
              <h2 className="mt-2 font-display text-3xl font-extrabold uppercase italic">{draw ? "Empate" : won ? "Vitória!" : "Derrota"}</h2>
              <p className="mt-1 font-display text-4xl font-extrabold tabular">{st.result.score[0]} x {st.result.score[1]}</p>
              <p className="mt-1 text-sm text-mist">{REASON[st.result.reason]}</p>
              <Button variant="primary" size="lg" block className="mt-5" onClick={onExit}>Voltar ao lobby</Button>
            </div>
          </div>
        )}
      </ButtonStage>
      <p className="px-4 pb-2 text-center text-xs text-mist">
        Você joga com o {mine === 0 ? home.name : away.name} ({mine === 0 ? "esquerda" : "direita"}). Arraste para trás a partir de um jogador seu e solte para chutar. {ONLINE_TURN_S}s por jogada.
      </p>

      <Modal
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Sair da partida?"
        footer={<><Button variant="ghost" onClick={() => setLeaving(false)}>Continuar jogando</Button><Button variant="danger" onClick={async () => { await session.leave(); onExit(); }}>Sair e perder</Button></>}
      >
        <p className="text-sm text-mist">Sair agora conta como abandono: a vitória fica com o adversário.</p>
      </Modal>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DoorOpen, Play, RefreshCw, Trophy } from "lucide-react";
import { teamById } from "@/arcade/teams";
import { Audio } from "@/arcade/audio";
import { botParams } from "@/lances/difficulty";
import type { LanceResult } from "@/lances/engine";
import { genericChance } from "@/lances/scenario";
import { MpHttpError, mpApi, type MpMove, type MpResult, type MpRoom } from "@/lib/mp";
import { LanceStage } from "@/components/lances/LanceStage";
import { Button } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

/** Nível do bot no duelo (igual para os dois: entre médio e difícil). */
const DUEL_LEVEL = 1.4;
const POLL_MS = 1500;
const REASON: Record<string, string> = { fim: "Fim do duelo", abandono: "O adversário abandonou a partida", ausencia: "Vitória por ausência do adversário" };

/**
 * Duelo de lances online: anfitrião e visitante se alternam; cada um ataca em 3D contra a defesa
 * (bot) do time do outro. O servidor grava os lances em ordem; o placar sai deles.
 */
export function DuelMatch({ room: initial, onExit }: { room: MpRoom; onExit: () => void }) {
  const [moves, setMoves] = useState<MpMove[]>(initial.moves);
  const [status, setStatus] = useState(initial.status);
  const [result, setResult] = useState<MpResult | null>(initial.result);
  const [idle, setIdle] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const finishing = useRef(false);
  const side = initial.side as 0 | 1;
  const total = initial.turns;
  const home = teamById(initial.host.team), away = teamById(initial.guest?.team);
  const me = side === 0 ? home : away, opp = side === 0 ? away : home;
  const names = [initial.host.name, initial.guest?.name ?? "?"];

  const poll = useCallback(async () => {
    try {
      const { room } = await mpApi.room(initial.code, 0);
      setMoves(room.moves);
      setStatus(room.status);
      setResult(room.result);
      setIdle(room.idle);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [initial.code]);

  useEffect(() => {
    const t = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  const score = useMemo(() => {
    const s: [number, number] = [0, 0];
    for (const m of moves) if (m.goal) s[m.by]++;
    return s;
  }, [moves]);
  const over = status === "done" || status === "abandoned" || moves.length >= total;
  const myTurn = !over && moves.length % 2 === side;

  // Fim: o anfitrião registra no servidor (o placar vem dos lances gravados).
  useEffect(() => {
    if (moves.length >= total && status === "playing" && side === 0 && !finishing.current) {
      finishing.current = true;
      void mpApi.finish(initial.code).then((r) => { setStatus(r.room.status); setResult(r.room.result); }).catch(() => { finishing.current = false; });
    }
  }, [moves.length, total, status, side, initial.code]);

  const setup = useMemo(() => (playing && me && opp ? genericChance(me, opp, botParams(DUEL_LEVEL)) : null), [playing, me, opp]);

  const done = async (r: LanceResult) => {
    setPlaying(false);
    const move: MpMove = { by: side, kind: "chance", goal: r.goal, text: r.text };
    const seq = moves.length;
    setMoves((m) => [...m, move]);
    for (let attempt = 0; attempt < 4; attempt++) {
      try { await mpApi.move(initial.code, seq, move); return; } catch (e) {
        if (e instanceof MpHttpError && e.status === 409) { await poll(); return; }
        await new Promise((res) => setTimeout(res, 700 * 2 ** attempt));
      }
    }
    setError("Sem conexão: o lance não foi registrado.");
  };

  if (!home || !away || !me || !opp) return null;
  if (playing && setup) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-ink-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" role="dialog" aria-modal="true" aria-label="Seu lance no duelo">
        <LanceStage setup={setup} onDone={done} top={<p className="mx-auto w-fit rounded-xl bg-ink-950/80 px-3 py-1 font-display text-sm font-bold uppercase text-gold-300 ring-1 ring-white/10">Duelo • {score[0]} x {score[1]} • seu lance</p>} />
      </div>
    );
  }

  const rounds = Math.ceil(total / 2);
  const finalScore = result?.score ?? score;
  const won = result ? result.winner === side : finalScore[side] > finalScore[1 - side];
  const draw = result ? result.winner === -1 : finalScore[0] === finalScore[1];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-mist">Duelo de lances • sala {initial.code}</p>
        <Button variant="ghost" size="sm" icon={<DoorOpen />} onClick={() => setLeaving(true)} disabled={over}>Sair</Button>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl bg-ink-800 p-4 ring-1 ring-inset ring-white/8">
        {[home, away].map((t, i) => (
          <div key={i} className={cn("flex min-w-0 flex-col items-center gap-1 text-center", i === 1 && "order-3")}>
            <Crest club={t.club} size={52} />
            <span className="w-full truncate font-display text-base font-bold uppercase">{t.name}</span>
            <span className="text-xs text-mist">{names[i]}{i === side ? " (você)" : ""}</span>
          </div>
        ))}
        <span className="order-2 font-display text-5xl font-extrabold tabular">{finalScore[0]}<span className="mx-1 text-mist">:</span>{finalScore[1]}</span>
      </div>

      <ol className="mt-4 grid gap-1.5">
        {Array.from({ length: rounds }, (_, r) => (
          <li key={r} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 rounded-xl bg-ink-900/60 px-3 py-2 text-sm ring-1 ring-inset ring-white/6">
            <span className="w-16 text-xs font-bold uppercase tracking-wider text-mist">Lance {r + 1}</span>
            {[0, 1].map((s) => {
              const m = moves[r * 2 + s];
              return (
                <span key={s} className={cn("truncate", !m ? "text-mist/60" : m.goal ? "font-semibold text-gold-300" : "text-mist")} title={m?.text}>
                  {m ? (m.goal ? "⚽ Gol" : `✗ ${m.text || "Perdeu"}`) : r * 2 + s === moves.length && !over ? "jogando…" : "—"}
                </span>
              );
            })}
          </li>
        ))}
      </ol>

      {!over && (
        <div className="mt-5 text-center">
          {myTurn ? (
            <Button variant="primary" size="lg" icon={<Play />} onClick={() => { Audio.init(); setPlaying(true); }}>Jogar o seu lance</Button>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm text-mist"><RefreshCw className="size-4 animate-spin" /> Vez do adversário: ele está atacando contra a sua defesa…</p>
          )}
          {!myTurn && idle >= 120 && (
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={async () => { try { const r = await mpApi.claim(initial.code); setStatus(r.room.status); setResult(r.room.result); } catch (e) { setClaimMsg((e as Error).message); } }}>Adversário sumiu: reivindicar vitória</Button>
              {claimMsg && <p className="mt-1 text-xs text-danger-400">{claimMsg}</p>}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-danger-400">{error}</p>}
        </div>
      )}

      {over && (
        <div className="mt-6 rounded-3xl bg-ink-850 p-6 text-center ring-1 ring-white/10">
          <Trophy className={cn("mx-auto size-10", won ? "text-gold-400" : "text-mist")} />
          <p className="mt-2 font-display text-3xl font-extrabold uppercase italic">{draw ? "Empate" : won ? "Vitória!" : "Derrota"}</p>
          <p className="text-sm text-mist">{result ? REASON[result.reason] : "Registrando o resultado…"}</p>
          <Button variant="primary" size="lg" className="mt-4" onClick={onExit}>Voltar ao lobby</Button>
        </div>
      )}

      <Modal
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Sair do duelo?"
        footer={<><Button variant="ghost" onClick={() => setLeaving(false)}>Continuar</Button><Button variant="danger" onClick={async () => { await mpApi.leave(initial.code).catch(() => {}); onExit(); }}>Sair e perder</Button></>}
      >
        <p className="text-sm text-mist">Sair agora conta como abandono: a vitória fica com o adversário.</p>
      </Modal>
    </div>
  );
}

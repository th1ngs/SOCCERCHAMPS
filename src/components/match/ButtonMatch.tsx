"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Play } from "lucide-react";
import type { Match, World } from "@/game/types";
import { useWorld } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { ButtonHud } from "@/components/arcade/ButtonHud";
import { ButtonStage } from "@/components/arcade/ButtonStage";
import { ButtonSession, LEVEL_LABEL, buttonMatchResult } from "./buttonResult";
import { isKnockout } from "@/game";
import { compName, findMatch, settleMatch } from "./matchUtils";

/** Partida do Manager decidida no futebol de botão (o placar vale para a temporada). */
export function ButtonMatch({ matchId }: { matchId: string }) {
  const { world: w, setMatchMode } = useWorld();
  const [m] = useState(() => findMatch(w, matchId));
  if (!m || m.played) {
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-ink-950/95 p-6 text-center">
        <div className="space-y-4">
          <p className="text-mist">{m ? "Esta partida já foi disputada." : "Partida não encontrada."}</p>
          <Button variant="primary" onClick={() => setMatchMode(null)}>
            Voltar ao jogo
          </Button>
        </div>
      </div>
    );
  }
  return <ButtonMatchScreen w={w} m={m} />;
}

function ButtonMatchScreen({ w, m }: { w: World; m: Match }) {
  const { commit, setMatchMode, setOverlay, scratch } = useWorld();
  const [session] = useState(() => new ButtonSession(w, m));
  const { runner, user: u, opp, level } = session;
  const hud = useSyncExternalStore(runner.subscribe, runner.getSnapshot, runner.getServerSnapshot);

  useEffect(
    () =>
      session.onEnd((r) => {
        settleMatch(w, m, buttonMatchResult(w, m, r.score), scratch);
        commit();
        setMatchMode(null);
        setOverlay({ kind: "summary", matchId: m.id });
      }),
    [session, w, m, scratch, commit, setMatchMode, setOverlay],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") runner.setPaused(!runner.match?.paused);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [runner]);

  const turnLabel = hud.aiming ? (hud.turn === 0 ? `Sua vez • ${hud.turnSecs}s` : `Vez do ${opp.name}`) : "";

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-[radial-gradient(ellipse_at_top,#10294a,#07121f_70%)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      role="dialog"
      aria-modal="true"
      aria-label={`${u.name} x ${opp.name} no botão`}
    >
      <ButtonHud teams={[u, opp]} hud={hud} onTogglePause={() => runner.setPaused(!hud.paused)} turnLabel={turnLabel} compLabel={compName(w, m)} />
      <ButtonStage runner={runner}>
        {hud.paused && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-ink-950/60 p-4 backdrop-blur-[3px]">
            <div className="w-full max-w-sm animate-pop rounded-2xl bg-ink-850 p-6 text-center shadow-2xl ring-1 ring-white/10">
              <h2 className="font-display text-3xl font-extrabold uppercase italic">Pausado</h2>
              <p className="mt-1 text-sm text-mist">
                {compName(w, m)} • o placar do botão vale para a temporada.
              </p>
              <Button variant="primary" size="lg" block icon={<Play />} className="mt-5" onClick={() => runner.setPaused(false)}>
                Continuar partida
              </Button>
            </div>
          </div>
        )}
      </ButtonStage>
      <p className="px-4 pb-2 text-center text-xs text-mist">
        Arraste para trás a partir de um jogador seu (piscando) e solte para chutar. CPU no nível {LEVEL_LABEL[level]}.
        {isKnockout(m.comp) && " Empate vai para a morte súbita."}
      </p>
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { competitionName, endWeek, simulateWeek, userMatch, weekLabel } from "@/game";
import { useToast } from "@/components/ui/Toast";
import { useWorld } from "./GameProvider";

/** Fluxo semanal: rótulo do botão principal, avançar e encerrar a semana. */
export function useFlow() {
  const g = useWorld();
  const toast = useToast();
  const { world: w, commit, setOverlay } = g;

  const label = w.fired
    ? "Ver propostas"
    : w.pendingSeason
      ? "Encerrar temporada"
      : w.week === 0
        ? "Iniciar temporada"
        : userMatch(w)
          ? "Ir para o jogo"
          : "Avançar semana";

  // Contexto curto do próximo passo, mostrado junto do botão principal.
  const next = userMatch(w);
  const hint = w.fired
    ? "Você foi demitido"
    : w.pendingSeason
      ? "Fim da temporada"
      : w.week === 0
        ? `Pré-temporada ${w.season}`
        : next
          ? `${next.h === w.userClub ? "Casa" : "Fora"} • ${w.clubs[next.h === w.userClub ? next.a : next.h].name} • ${competitionName(next.comp)}`
          : `${weekLabel(w)} • sem jogo do seu time`;

  const finishWeek = useCallback(() => {
    const before = w.inbox.length ? w.inbox[0].id : 0;
    const rep = endWeek(w);
    commit();
    if (rep.seasonEnd) return setOverlay({ kind: "seasonEnd" });
    if (w.fired) return setOverlay({ kind: "fired" });
    setOverlay(null);
    const fresh = w.inbox.filter((m) => m.id > before);
    const offers = fresh.filter((m) => m.offer).length;
    if (offers) toast(`Você recebeu ${offers} proposta(s) por jogadores. Veja em Mensagens.`);
    else if (fresh.length) toast(fresh[0].title);
  }, [w, commit, setOverlay, toast]);

  const advance = useCallback(() => {
    if (w.fired && !w.pendingSeason) return setOverlay({ kind: "fired" });
    if (w.pendingSeason) return setOverlay({ kind: "seasonEnd" });
    if (w.week === 0) {
      endWeek(w);
      commit();
      toast(`Temporada ${w.season} iniciada. Boa sorte!`, "good");
      return;
    }
    const m = userMatch(w);
    if (m) return setOverlay({ kind: "prematch", matchId: m.id });
    simulateWeek(w);
    commit();
    setOverlay({ kind: "weekResults" });
  }, [w, commit, setOverlay, toast]);

  return { label, hint, advance, finishWeek };
}

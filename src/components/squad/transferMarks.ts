"use client";
// Promessas de papel e empréstimos dos jogadores do elenco (derivação pura + hook memoizado).
import { useMemo } from "react";
import { potentialRange } from "@/game";
import type { Player, PotentialRange, Role, World } from "@/game/types";
import type { BadgeTone } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";

/** Semana-limite em que o motor confere a promessa de titular (40% dos jogos). */
export const PROMISE_WEEK = 20;
export const PROMISE_SHARE = 0.4;

export const ROLE_SHORT: Record<Role, { label: string; tone: BadgeTone; name: string }> = {
  titular: { label: "TIT", tone: "green", name: "Titular" },
  rotacao: { label: "ROT", tone: "blue", name: "Rotação" },
  reserva: { label: "RES", tone: "neutral", name: "Reserva" },
};

export interface PromiseStatus {
  role: Role;
  apps: number;
  games: number;
  /** Fração dos jogos do clube em que atuou (desde a chegada nesta temporada). */
  ratio: number;
  /** Titular prometido abaixo de 40%: vai cobrar (ou já cobrou) a promessa. */
  warn: boolean;
  /** Já cobrou nesta temporada. */
  broken: boolean;
  text: string;
}

/** Jogos disputados pelo clube na temporada, a partir de uma semana. */
export function clubGames(w: World, clubId: string, fromWeek = 0): number {
  let n = 0;
  for (let i = Math.max(1, fromWeek + 1); i <= w.week && i < w.weeks.length; i++) {
    const wk = w.weeks[i];
    if (!wk) continue;
    for (const m of wk.matches) if (m.played && (m.h === clubId || m.a === clubId)) n++;
  }
  return n;
}

export function promiseStatus(w: World, p: Player, games?: number): PromiseStatus | null {
  const role = p.promise;
  if (!role || !p.clubId) return null;
  const from = p.joined && p.joined.season === w.season ? p.joined.week : 0;
  const g = games ?? clubGames(w, p.clubId, from);
  const apps = Math.min(p.s.apps, g);
  const ratio = g ? apps / g : 1;
  const broken = p.promiseChecked === w.season;
  const warn = role === "titular" && (broken || (g >= 4 && ratio < PROMISE_SHARE));
  const pct = Math.round(ratio * 100);
  const text =
    role !== "titular"
      ? `Prometido: ${ROLE_SHORT[role].name}. Jogou ${apps} de ${g} jogos (${pct}%).`
      : broken
        ? `Cobrou a promessa de titular: jogou só ${apps} de ${g} jogos (${pct}%).`
        : warn
          ? `Cobra promessa: jogou ${apps} de ${g} jogos (${pct}%). Precisa de 40% até a semana ${PROMISE_WEEK}.`
          : `Promessa de titular em dia: ${apps} de ${g} jogos (${pct}%).`;
  return { role, apps, games: g, ratio, warn, broken, text };
}

export interface LoanMark {
  dir: "in" | "out";
  club: string;
  until: number;
  text: string;
}

export function loanMark(w: World, p: Player): LoanMark | null {
  const l = p.loan;
  if (!l) return null;
  if (l.to === w.userClub) {
    const c = w.clubs[l.from];
    return { dir: "in", club: c?.name ?? l.from, until: l.until, text: `Emprestado pelo ${c?.name ?? l.from}: volta na temporada ${l.until}.` };
  }
  const c = w.clubs[l.to];
  return { dir: "out", club: c?.name ?? l.to, until: l.until, text: `Emprestado ao ${c?.name ?? l.to} até a temporada ${l.until}.` };
}

export interface TransferMarks {
  promise: PromiseStatus | null;
  loan: LoanMark | null;
  /** Potencial conhecido (exato só após 10 semanas no clube). */
  range: PotentialRange;
}

/** Marcas de transferência de uma lista de jogadores, recalculadas a cada mutação do mundo. */
export function useTransferMarks(players: Player[]): Map<string, TransferMarks> {
  const { world, version } = useWorld();
  const ids = players.map((p) => p.id).join(",");
  return useMemo(
    () => {
      const out = new Map<string, TransferMarks>();
      for (const id of ids ? ids.split(",") : []) {
        const p = world.players[id];
        if (p) out.set(id, { promise: promiseStatus(world, p), loan: loanMark(world, p), range: potentialRange(world, p) });
      }
      return out;
    },
    // `version` muda a cada mutação do mesmo objeto world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, version, ids],
  );
}

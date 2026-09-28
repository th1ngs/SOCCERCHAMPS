// Derivações puras das telas de competições (sem React).
import { CUP_ROUNDS, TOTAL_WEEKS } from "@/game";
import type { Competition, Division, FormResult, Match, Week, World } from "@/game/types";

/** "Copa • Semifinal" ou "Série A • Rodada 12". */
export function compLabel(m: Pick<Match, "comp">, wk: Week): string {
  return m.comp === "CUP" ? `Copa • ${CUP_ROUNDS[wk.round]}` : `Série ${m.comp} • Rodada ${wk.round}`;
}

/** Resultado de uma partida jogada do ponto de vista de um clube (pênaltis decidem empates). */
export function resultFor(m: Match, clubId: string): FormResult | null {
  if (!m.played || (m.h !== clubId && m.a !== clubId)) return null;
  const home = m.h === clubId;
  const gf = (home ? m.hs : m.as) ?? 0, ga = (home ? m.as : m.hs) ?? 0;
  if (m.pens) return (home ? m.pens[0] > m.pens[1] : m.pens[1] > m.pens[0]) ? "V" : "D";
  return gf > ga ? "V" : gf < ga ? "D" : "E";
}

/** Lado vencedor: 0 mandante, 1 visitante, -1 empate/não jogada. */
export function winnerSide(m: Match): number {
  if (!m.played) return -1;
  const hs = m.hs ?? 0, as = m.as ?? 0;
  if (hs !== as) return hs > as ? 0 : 1;
  if (m.pens) return m.pens[0] > m.pens[1] ? 0 : 1;
  return -1;
}

/** Última semana de liga (até a atual) com jogos disputados na divisão. */
export function lastLeagueRound(w: World, div: Division): { week: number; wk: Week } | null {
  for (let i = Math.min(w.week, TOTAL_WEEKS); i >= 1; i--) {
    const wk = w.weeks[i];
    if (wk && wk.type === "league" && wk.matches.some((m) => m.played && m.comp === div)) return { week: i, wk };
  }
  return null;
}

export interface CupRound {
  round: number;
  name: string;
  /** Semana do calendário em que a fase é disputada. */
  week: number | null;
  matches: Match[];
}

/** As cinco fases da Copa, com a semana de cada uma e os confrontos (se já sorteados). */
export function cupRounds(w: World): CupRound[] {
  return CUP_ROUNDS.map((name, round) => {
    const week = w.weeks.findIndex((x) => !!x && x.type === "cup" && x.round === round);
    const wk = week > 0 ? w.weeks[week] : null;
    return { round, name, week: week > 0 ? week : null, matches: wk ? wk.matches : [] };
  });
}

export interface FixtureRow {
  week: number;
  wk: Week;
  label: string;
  match: Match | null;
  /** Texto para semanas de Copa sem jogo do usuário. */
  note?: string;
}

/** Calendário do usuário semana a semana (semanas de Copa sem jogo aparecem com observação). */
export function userFixtures(w: World): FixtureRow[] {
  const rows: FixtureRow[] = [];
  for (let i = 1; i <= TOTAL_WEEKS; i++) {
    const wk = w.weeks[i];
    if (!wk) continue;
    const m = wk.matches.find((x) => x.h === w.userClub || x.a === w.userClub) ?? null;
    const label = wk.type === "cup" ? `Copa • ${CUP_ROUNDS[wk.round]}` : `Rodada ${wk.round}`;
    if (m) rows.push({ week: i, wk, label, match: m });
    else if (wk.type === "cup") {
      const out = wk.matches.length > 0 || !w.cup.alive.includes(w.userClub);
      rows.push({ week: i, wk, label, match: null, note: out ? "Sem jogo (fora da Copa)" : "Sorteio pendente" });
    }
  }
  return rows;
}

/** Competições exibidas no resumo de uma semana: a Copa, ou a divisão do usuário e depois a outra. */
export function weekComps(wk: Week, userDiv: Division): Competition[] {
  return wk.type === "cup" ? ["CUP"] : [userDiv, userDiv === "A" ? "B" : "A"];
}

/** Aproveitamento em % (pontos ganhos / pontos disputados). */
export const aproveitamento = (p: number, j: number): number => (j ? Math.round((p / (j * 3)) * 100) : 0);

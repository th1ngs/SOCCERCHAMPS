// Derivações puras das telas de competições (sem React).
import {
  competitionName,
  CONT_WEEKS,
  CUP_WEEKS,
  cupId,
  cupRoundName,
  DIVISIONS,
  isKnockout,
  knockoutStatus,
  LEAGUES,
  PROMOTION_SPOTS,
  TOTAL_WEEKS,
  user,
} from "@/game";
import type { Competition, DivisionId, FormResult, KnockoutId, Match, Week, World } from "@/game/types";

/** Fase/rodada de uma partida: "Semifinal" ou "Rodada 12". */
export function roundLabel(m: Pick<Match, "comp">, wk: Week): string {
  return isKnockout(m.comp) ? cupRoundName(m.comp, wk.round) : `Rodada ${wk.round}`;
}

/** "Copa Nacional (Brasil) • Semifinal" ou "Série A • Rodada 12". */
export function compLabel(m: Pick<Match, "comp">, wk: Week): string {
  return `${competitionName(m.comp)} • ${roundLabel(m, wk)}`;
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
export function lastLeagueRound(w: World, div: DivisionId): { week: number; wk: Week } | null {
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
  week: number;
  matches: Match[];
}

/** Fases de uma copa (Copa Nacional: 5; Copa dos Campeões: 4), com a semana e os confrontos já sorteados. */
export function knockoutRounds(w: World, comp: KnockoutId): CupRound[] {
  const weeks = comp === "cont" ? CONT_WEEKS : CUP_WEEKS;
  return weeks.map((week, round) => {
    const wk = w.weeks[week];
    return { round, name: cupRoundName(comp, round), week, matches: wk ? wk.matches.filter((m) => m.comp === comp) : [] };
  });
}

export interface FixtureRow {
  week: number;
  wk: Week;
  /** Competição da semana para o usuário. */
  comp: Competition;
  /** Fase/rodada ("Rodada 3", "Oitavas de final"). */
  round: string;
  match: Match | null;
  /** Texto para semanas de copa sem jogo do usuário. */
  note?: string;
}

/**
 * Calendário do usuário semana a semana, em todas as competições.
 * Semanas de copa sem jogo aparecem com observação quando o clube está inscrito nela.
 */
export function userFixtures(w: World): FixtureRow[] {
  const rows: FixtureRow[] = [];
  const u = user(w);
  const natCup = cupId(u.league);
  for (let i = 1; i <= TOTAL_WEEKS; i++) {
    const wk = w.weeks[i];
    if (!wk) continue;
    const m = wk.matches.find((x) => x.h === w.userClub || x.a === w.userClub) ?? null;
    if (m) {
      rows.push({ week: i, wk, comp: m.comp, round: roundLabel(m, wk), match: m });
      continue;
    }
    if (wk.type === "league") continue;
    const comp: KnockoutId = wk.type === "cont" ? "cont" : natCup;
    const st = knockoutStatus(w, comp, u.id);
    if (st === "out") continue;
    const drawn = wk.matches.some((x) => x.comp === comp);
    const note =
      st === "eliminated" ? "Sem jogo (eliminado)" : st === "champion" ? "Campeão" : drawn ? "Passou direto" : "Sorteio pendente";
    rows.push({ week: i, wk, comp, round: cupRoundName(comp, wk.round), match: null, note });
  }
  return rows;
}

/**
 * Competições mostradas no resumo de uma semana, na ordem:
 * liga → divisão do usuário e depois as outras da sua liga; copa → a Copa Nacional da liga do usuário;
 * Copa dos Campeões → ela mesma.
 */
export function weekComps(w: World, wk: Week): Competition[] {
  const u = user(w);
  if (wk.type === "cont") return ["cont"];
  if (wk.type === "cup") return [cupId(u.league)];
  return [u.div, ...LEAGUES[u.league].divisions.filter((d) => d !== u.div)];
}

export type Zone = "champ" | "up" | "down" | null;

/** Zona de uma posição (0-based) na tabela da divisão: campeão, acesso ou rebaixamento. */
export function zoneOf(div: DivisionId, i: number, n: number, spots = PROMOTION_SPOTS): Zone {
  const info = DIVISIONS[div];
  if (i === 0) return "champ";
  if (info.up && i < spots) return "up";
  if (info.down && i >= n - spots) return "down";
  return null;
}

/** Aproveitamento em % (pontos ganhos / pontos disputados). */
export const aproveitamento = (p: number, j: number): number => (j ? Math.round((p / (j * 3)) * 100) : 0);

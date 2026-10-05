// Derivações puras das telas de competições (sem React).
import {
  compLeague,
  competitionName,
  CONT_WEEKS,
  CUP_WEEKS,
  cupRoundName,
  DIVISIONS,
  isContinental,
  knockoutStatus,
  LEAGUES,
  matchStage,
  PROMOTION_SPOTS,
  roundNameBySize,
  seasonWeeks,
  user,
  weekComps as koComps,
} from "@/game";
import type { Competition, DivisionId, FormResult, KnockoutId, Match, Week, World } from "@/game/types";

/** Fase/rodada de uma partida: "Semifinal" ou "Rodada 12". */
export function roundLabel(m: Pick<Match, "comp" | "size">, wk: Week): string {
  return matchStage(m, wk.round);
}

/** "Copa Nacional (Brasil) • Semifinal" ou "Série A • Rodada 12". */
export function compLabel(m: Pick<Match, "comp" | "size">, wk: Week): string {
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
  for (let i = Math.min(w.week, seasonWeeks(w)); i >= 1; i--) {
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

/** Fases de uma copa, com a semana e os confrontos já sorteados (as futuras pelo tamanho esperado). */
export function knockoutRounds(w: World, comp: KnockoutId): CupRound[] {
  // Semanas da copa pelo calendário montado (vale também para saves do calendário antigo).
  const found = w.weeks.map((wk, i) => (wk && koComps(wk).includes(comp) ? i : -1)).filter((i) => i > 0);
  const legacy = !found.length || !w.weeks[found[0]]?.comps;
  const weeks = found.length ? found : comp === "cont" ? CONT_WEEKS : CUP_WEEKS;
  let size = w.cups[comp]?.entrants.length ?? 2;
  return weeks.map((week, round) => {
    const wk = w.weeks[week];
    const matches = wk ? wk.matches.filter((m) => m.comp === comp) : [];
    if (matches[0]?.size) size = matches[0].size;
    const name = legacy ? cupRoundName(comp, round) : roundNameBySize(size);
    size = Math.ceil(size / 2);
    return { round, name, week, matches };
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
  for (let i = 1; i <= seasonWeeks(w); i++) {
    const wk = w.weeks[i];
    if (!wk) continue;
    const m = wk.matches.find((x) => x.h === w.userClub || x.a === w.userClub) ?? null;
    if (m) {
      rows.push({ week: i, wk, comp: m.comp, round: roundLabel(m, wk), match: m });
      continue;
    }
    if (wk.type === "league") continue;
    const comp = koComps(wk).find((c) => knockoutStatus(w, c, u.id) !== "out");
    if (!comp) continue;
    const st = knockoutStatus(w, comp, u.id);
    const drawn = wk.matches.some((x) => x.comp === comp);
    const note =
      st === "eliminated" ? "Sem jogo (eliminado)" : st === "champion" ? "Campeão" : drawn ? "Passou direto" : "Sorteio pendente";
    const first = wk.matches.find((x) => x.comp === comp);
    rows.push({ week: i, wk, comp, round: first ? roundLabel(first, wk) : wk.comps ? "Mata-mata" : cupRoundName(comp, wk.round), match: null, note });
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
  if (wk.type === "league") return [u.div, ...LEAGUES[u.league].divisions.filter((d) => d !== u.div)];
  // Mata-matas: os do usuário, depois os da liga dele, depois os continentais.
  const played = koComps(wk).filter((c) => wk.matches.some((m) => m.comp === c));
  const rank = (c: KnockoutId) => (knockoutStatus(w, c, u.id) !== "out" ? 0 : compLeague(c) === u.league ? 1 : isContinental(c) ? 2 : 3);
  return played.sort((a, b) => rank(a) - rank(b)).slice(0, 6);
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

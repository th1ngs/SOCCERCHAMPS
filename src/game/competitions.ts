// Competições do usuário, status nas copas e classificação para a Copa dos Campeões.
import { CONT_SIZE, CONT_SPOTS, cupId, firstDivisions } from './leagues';
import type { Club, Competition, Cup, DivisionId, KnockoutId, LeagueId, TableRow, World } from './types';
import { table, user } from './world';

/** Status de um clube numa copa. */
export type KnockoutStatus = 'out' | 'alive' | 'eliminated' | 'champion';

/** Clubes de uma liga (objetos do World). */
export const leagueClubsOf = (w: World, league: LeagueId): Club[] => Object.values(w.clubs).filter((c) => c.league === league);

/** Corta para CONT_SIZE descartando os de menor reputação. */
/**
 * Corta a lista para CONT_SIZE clubes. `ids` vem em grupos de CONT_SPOTS por primeira divisão,
 * com o campeão (ou o de maior reputação) primeiro: esses nunca são cortados; o corte recai
 * sobre os demais de menor reputação.
 */
function cutByRep(w: World, ids: string[]): string[] {
  const leaders = ids.filter((_, i) => i % CONT_SPOTS === 0);
  const rest = ids.filter((_, i) => i % CONT_SPOTS !== 0).sort((a, b) => w.clubs[b].rep - w.clubs[a].rep);
  return [...leaders, ...rest].slice(0, CONT_SIZE);
}

/** 1ª temporada: os CONT_SPOTS de maior reputação de cada primeira divisão (cortando para 16). */
export function contByRep(w: World): string[] {
  const ids: string[] = [];
  for (const div of firstDivisions()) {
    const clubs = Object.values(w.clubs).filter((c) => c.div === div).sort((a, b) => b.rep - a.rep);
    ids.push(...clubs.slice(0, CONT_SPOTS).map((c) => c.id));
  }
  return cutByRep(w, ids);
}

/** Classificados pela tabela: os CONT_SPOTS primeiros de cada primeira divisão (cortando os de menor reputação). */
export function contQualifiers(w: World, tables?: Partial<Record<DivisionId, TableRow[]>>): string[] {
  const ids: string[] = [];
  for (const div of firstDivisions()) {
    const t = tables?.[div] ?? table(w, div);
    ids.push(...t.slice(0, CONT_SPOTS).map((r) => r.id));
  }
  return cutByRep(w, ids);
}

/** Projeção dos classificados à próxima Copa dos Campeões pelas tabelas atuais. */
export const projectedCont = (w: World): string[] => contQualifiers(w);

/** Copa da temporada (ou null). */
export const cupOf = (w: World, comp: KnockoutId): Cup | null => w.cups[comp] ?? null;

/** Copa Nacional da liga do usuário. */
export const userCup = (w: World): Cup | null => cupOf(w, cupId(user(w).league));

/** Participantes da Copa dos Campeões desta temporada. */
export const contEntrants = (w: World): string[] => w.cups.cont?.entrants ?? [];

/** Clubes ainda vivos na Copa dos Campeões. */
export const contAlive = (w: World): string[] => w.cups.cont?.alive ?? [];

export function knockoutStatus(w: World, comp: KnockoutId, clubId: string): KnockoutStatus {
  const cup = w.cups[comp];
  if (!cup || !cup.entrants.includes(clubId)) return 'out';
  if (cup.champion === clubId) return 'champion';
  return cup.alive.includes(clubId) ? 'alive' : 'eliminated';
}

/** Status do clube na Copa dos Campeões. */
export const contStatus = (w: World, clubId: string): KnockoutStatus => knockoutStatus(w, 'cont', clubId);

/** Está na Copa dos Campeões desta temporada? */
export const inCont = (w: World, clubId: string): boolean => contEntrants(w).includes(clubId);

/** Competições que o clube disputa nesta temporada: divisão, Copa Nacional (se inscrito) e Copa dos Campeões. */
export function clubCompetitions(w: World, clubId: string): Competition[] {
  const c = w.clubs[clubId];
  const out: Competition[] = [c.div];
  const nat = cupId(c.league);
  if (w.cups[nat]?.entrants.includes(clubId)) out.push(nat);
  if (inCont(w, clubId)) out.push('cont');
  return out;
}

/** Competições do usuário nesta temporada. */
export const userCompetitions = (w: World): Competition[] => clubCompetitions(w, w.userClub);

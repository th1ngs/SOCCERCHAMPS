// Agregador dos dados de clubes: atribui liga e divisão inicial pela ordem de prestígio.
import { DIVISION_SIZE, LEAGUES, LEAGUE_IDS } from '../leagues';
import type { ClubSeed, ClubStatic, LeagueId } from '../types';
import { ARG_CLUBS } from './arg';
import { BRA_CLUBS } from './bra';
import { ENG_CLUBS } from './eng';
import { ESP_CLUBS } from './esp';
import { ITA_CLUBS } from './ita';
import { POR_CLUBS } from './por';
import { EXPANDED_CLUBS } from './expanded';
import { lowerClubs } from './lower';

export { DIVISIONS, LEAGUES } from '../leagues';

const BASE_SEEDS: Record<LeagueId, ClubSeed[]> = {
  bra: BRA_CLUBS, arg: ARG_CLUBS, por: POR_CLUBS, esp: ESP_CLUBS, eng: ENG_CLUBS, ita: ITA_CLUBS,
  ...EXPANDED_CLUBS,
};

/**
 * Dados brutos por liga (ordenados por prestígio): os clubes originais e, depois deles, os das divisões
 * de baixo da expansão (a reputação continua caindo a partir do último original).
 */
export const CLUB_SEEDS: Record<LeagueId, ClubSeed[]> = Object.fromEntries(LEAGUE_IDS.map((lg) => {
  const base = BASE_SEEDS[lg];
  const last = base[base.length - 1].rep;
  const deepest = LEAGUES[lg].divisions.length >= 4 ? 20 : LEAGUES[lg].divisions.length >= 3 ? 28 : last - 5;
  const used = new Set(base.map((c) => c.short));
  return [lg, [...base, ...lowerClubs(lg, base.length, last - 1, deepest, used)]];
})) as Record<LeagueId, ClubSeed[]>;

function toStatic(seed: ClubSeed, league: LeagueId, index: number): ClubStatic {
  const divs = LEAGUES[league].divisions;
  const div = divs[Math.min(divs.length - 1, Math.floor(index / DIVISION_SIZE))];
  const c = seed.colors;
  return { ...seed, colors: [c[0] ?? '#ffffff', c[1] ?? c[0] ?? '#111111'], league, div };
}

/** Todos os clubes, com liga e divisão inicial. */
export const CLUBS: ClubStatic[] = LEAGUE_IDS.flatMap((lg) =>
  CLUB_SEEDS[lg].slice(0, LEAGUES[lg].divisions.length * DIVISION_SIZE).map((s, i) => toStatic(s, lg, i)));

/** Clubes de uma liga (dados fixos). */
export const leagueClubs = (league: LeagueId): ClubStatic[] => CLUBS.filter((c) => c.league === league);

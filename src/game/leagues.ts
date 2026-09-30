// Ligas, divisões e nomes de competições (sem dados de clubes).
import type { Competition, CupId, DivisionId, DivisionInfo, KnockoutId, LeagueId, LeagueInfo } from './types';

export const LEAGUE_IDS: LeagueId[] = ['bra', 'arg', 'por', 'esp', 'eng', 'ita', 'ger', 'fra', 'ned', 'bel', 'tur', 'sco', 'gre'];

/**
 * Economia de cada liga (Brasil = 1). Inspirada nas diferenças reais:
 * - a Inglaterra tem o maior contrato de TV e divide a cota de forma mais igualitária;
 * - Portugal e Argentina têm poucos clubes ricos e cotas concentradas;
 * - Brasil, Itália e Argentina têm mais clubes endividados.
 */
export const LEAGUES: Record<LeagueId, LeagueInfo> = {
  bra: { id: 'bra', name: 'Brasil', country: 'Brasil', flag: '🇧🇷', wealth: 1.0, tv: 1.0, tvSplit: 0.55, commercial: 1.0, ticket: 1.0, wages: 1.0, debt: 0.4, divisions: ['bra1', 'bra2', 'bra3'] },
  arg: { id: 'arg', name: 'Argentina', country: 'Argentina', flag: '🇦🇷', wealth: 0.75, tv: 0.55, tvSplit: 0.5, commercial: 0.65, ticket: 0.6, wages: 0.65, debt: 0.45, divisions: ['arg1', 'arg2'] },
  por: { id: 'por', name: 'Portugal', country: 'Portugal', flag: '🇵🇹', wealth: 0.85, tv: 0.6, tvSplit: 0.75, commercial: 0.8, ticket: 0.85, wages: 0.75, debt: 0.3, divisions: ['por1', 'por2'] },
  esp: { id: 'esp', name: 'Espanha', country: 'Espanha', flag: '🇪🇸', wealth: 1.35, tv: 1.45, tvSplit: 0.45, commercial: 1.4, ticket: 1.45, wages: 1.3, debt: 0.3, divisions: ['esp1', 'esp2'] },
  eng: { id: 'eng', name: 'Inglaterra', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', wealth: 1.6, tv: 2.3, tvSplit: 0.25, commercial: 1.6, ticket: 1.9, wages: 1.6, debt: 0.15, divisions: ['eng1', 'eng2'] },
  ita: { id: 'ita', name: 'Itália', country: 'Itália', flag: '🇮🇹', wealth: 1.25, tv: 1.25, tvSplit: 0.45, commercial: 1.2, ticket: 1.2, wages: 1.15, debt: 0.4, divisions: ['ita1', 'ita2'] },
  ger: { id: 'ger', name: 'Alemanha', country: 'Alemanha', flag: '🇩🇪', wealth: 1.45, tv: 1.65, tvSplit: 0.35, commercial: 1.5, ticket: 1.55, wages: 1.35, debt: 0.2, divisions: ['ger1', 'ger2'] },
  fra: { id: 'fra', name: 'França', country: 'França', flag: '🇫🇷', wealth: 1.2, tv: 1.2, tvSplit: 0.5, commercial: 1.25, ticket: 1.2, wages: 1.15, debt: 0.28, divisions: ['fra1', 'fra2'] },
  ned: { id: 'ned', name: 'Holanda', country: 'Holanda', flag: '🇳🇱', wealth: 1.0, tv: 0.95, tvSplit: 0.55, commercial: 1.1, ticket: 1.15, wages: 0.95, debt: 0.22, divisions: ['ned1', 'ned2'] },
  bel: { id: 'bel', name: 'Bélgica', country: 'Bélgica', flag: '🇧🇪', wealth: 0.95, tv: 0.85, tvSplit: 0.55, commercial: 1.0, ticket: 1.05, wages: 0.9, debt: 0.25, divisions: ['bel1', 'bel2'] },
  tur: { id: 'tur', name: 'Turquia', country: 'Turquia', flag: '🇹🇷', wealth: 0.9, tv: 0.85, tvSplit: 0.6, commercial: 1.05, ticket: 0.9, wages: 0.95, debt: 0.45, divisions: ['tur1', 'tur2'] },
  sco: { id: 'sco', name: 'Escócia', country: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', wealth: 0.85, tv: 0.7, tvSplit: 0.55, commercial: 0.9, ticket: 1.1, wages: 0.85, debt: 0.3, divisions: ['sco1', 'sco2'] },
  gre: { id: 'gre', name: 'Grécia', country: 'Grécia', flag: '🇬🇷', wealth: 0.75, tv: 0.6, tvSplit: 0.6, commercial: 0.8, ticket: 0.8, wages: 0.75, debt: 0.45, divisions: ['gre1', 'gre2'] },
};

const DIV_NAMES: Record<DivisionId, string> = {
  bra1: 'Série A', bra2: 'Série B', bra3: 'Série C',
  arg1: 'Primera División', arg2: 'Primera Nacional',
  por1: 'Primeira Liga', por2: 'Segunda Liga',
  esp1: 'Primera División', esp2: 'Segunda División',
  eng1: 'Premier Division', eng2: 'First Division',
  ita1: 'Serie A', ita2: 'Serie B',
  ger1: 'Bundesliga', ger2: '2. Bundesliga',
  fra1: 'Ligue 1', fra2: 'Ligue 2',
  ned1: 'Eredivisie', ned2: 'Eerste Divisie',
  bel1: 'Pro League', bel2: 'Challenger Pro League',
  tur1: 'Süper Lig', tur2: '1. Lig',
  sco1: 'Premiership', sco2: 'Championship',
  gre1: 'Super League', gre2: 'Super League 2',
};

export const DIVISIONS = {} as Record<DivisionId, DivisionInfo>;
for (const lg of LEAGUE_IDS) {
  const divs = LEAGUES[lg].divisions;
  divs.forEach((id, i) => {
    DIVISIONS[id] = { id, league: lg, name: DIV_NAMES[id], level: i + 1, up: divs[i - 1] ?? null, down: divs[i + 1] ?? null };
  });
}
export const DIVISION_IDS = Object.keys(DIVISIONS) as DivisionId[];
/** Clubes por divisão. */
export const DIVISION_SIZE = 16;
/** Quantos sobem/caem entre divisões vizinhas. */
export const PROMOTION_SPOTS = 3;

export const leagueOf = (div: DivisionId): LeagueId => DIVISIONS[div].league;
export const divisionName = (div: DivisionId): string => DIVISIONS[div]?.name ?? div;
/** Nome completo: "Série A (Brasil)". */
export const divisionFullName = (div: DivisionId): string => `${divisionName(div)} (${LEAGUES[leagueOf(div)].name})`;
export const divisionLevel = (div: DivisionId): number => DIVISIONS[div].level;
export const firstDivisions = (): DivisionId[] => LEAGUE_IDS.map((l) => LEAGUES[l].divisions[0]);

export const cupId = (league: LeagueId): CupId => `cup:${league}`;
export const isDivision = (comp: string): comp is DivisionId => comp in DIVISIONS;
export const isNationalCup = (comp: string): comp is CupId => comp.startsWith('cup:') && (comp.slice(4) in LEAGUES);
export const isKnockout = (comp: string): comp is KnockoutId => comp === 'cont' || isNationalCup(comp);
/** Liga de uma competição (null para a Copa dos Campeões). */
export const compLeague = (comp: Competition): LeagueId | null =>
  isDivision(comp) ? leagueOf(comp) : isNationalCup(comp) ? (comp.slice(4) as LeagueId) : null;

export const CONT_NAME = 'Copa dos Campeões';

/** "Série A", "Copa Nacional (Brasil)" ou "Copa dos Campeões". */
export function competitionName(comp: string): string {
  if (comp === 'cont') return CONT_NAME;
  if (isNationalCup(comp)) return `Copa Nacional (${LEAGUES[comp.slice(4) as LeagueId].name})`;
  if (isDivision(comp)) return divisionName(comp);
  return comp;
}

// ---------- Copas ----------
/** Semanas das Copas Nacionais e da Copa dos Campeões. */
export const CUP_WEEKS = [4, 10, 16, 22, 28];
export const CONT_WEEKS = [7, 13, 19, 25];
export const TOTAL_WEEKS = 39;
export const LEAGUE_ROUNDS = 30;

/** Nome da fase pelo número de clubes vivos (32 → "1ª fase" … 2 → "Final"). */
export function roundNameBySize(size: number): string {
  if (size >= 32) return '1ª fase';
  if (size >= 16) return 'Oitavas de final';
  if (size >= 8) return 'Quartas de final';
  if (size >= 4) return 'Semifinal';
  return 'Final';
}
/** Fases da Copa Nacional (32 clubes). */
export const CUP_ROUNDS = ['1ª fase', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
/** Fases da Copa dos Campeões (16 clubes). */
export const CONT_ROUNDS = CUP_ROUNDS.slice(1);
/** Nome da fase `round` de uma copa. */
export const cupRoundName = (comp: KnockoutId, round: number): string => (comp === 'cont' ? CONT_ROUNDS : CUP_ROUNDS)[round] ?? '';

/** Prêmio (antes do fator `wealth`) por fase vencida na Copa Nacional. */
export const CUP_PRIZE = [1e6, 2e6, 3.5e6, 6e6, 12e6];
/** Prêmio por fase vencida na Copa dos Campeões (sem fator wealth). */
export const CONT_PRIZE = [4e6, 8e6, 15e6, 30e6];
/** Cota de TV semanal por nível de divisão (× wealth). */
export const TV_BASE = [380000, 190000, 140000];
/** Prêmio da liga por posição: (17 − posição) × base[nível] × wealth. */
export const LEAGUE_PRIZE_BASE = [0.8e6, 0.25e6, 0.1e6];
/** Vagas por primeira divisão na Copa dos Campeões (antes do corte para 16). */
export const CONT_SPOTS = 3;
export const CONT_SIZE = 16;

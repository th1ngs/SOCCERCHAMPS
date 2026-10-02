// Ligas, divisões e nomes de competições (sem dados de clubes).
import type { Competition, CupId, DivisionId, DivisionInfo, KnockoutId, LeagueId, LeagueInfo } from './types';

export const LEAGUE_IDS: LeagueId[] = ['bra', 'arg', 'por', 'esp', 'eng', 'ita', 'ger', 'fra', 'ned', 'bel', 'tur', 'sco', 'gre'];

/**
 * Economia e qualidade de cada liga (Brasil = 1 nas economias), inspiradas nas diferenças reais:
 * - `quality`: nível do futebol. Inglaterra, Espanha, Alemanha e Itália têm os melhores elencos;
 *   França vem logo atrás; Portugal, Brasil, Holanda e Argentina ficam no meio; Bélgica, Turquia,
 *   Escócia e Grécia ficam abaixo. Os valores somam ~zero para não mexer na média do mundo.
 * - `talent`: Brasil, Argentina e França formam (e exportam) mais craques; Holanda, Bélgica e Portugal também.
 * - `domestic`: Brasil e Argentina usam quase só jogadores locais; Inglaterra, Portugal e Bélgica importam muito.
 * - TV: a Inglaterra tem o maior contrato e divide a cota de forma mais igualitária; Portugal e Argentina
 *   têm poucos clubes ricos e cotas concentradas.
 */
export const LEAGUES: Record<LeagueId, LeagueInfo> = {
  bra: { id: 'bra', name: 'Brasil', country: 'Brasil', flag: '🇧🇷', wealth: 1.0, tv: 1.0, tvSplit: 0.55, commercial: 1.0, ticket: 1.0, quality: -0.5, talent: 1.3, domestic: 0.92, wages: 1.0, debt: 0.4, divisions: ['bra1', 'bra2', 'bra3', 'bra4'] },
  arg: { id: 'arg', name: 'Argentina', country: 'Argentina', flag: '🇦🇷', wealth: 0.75, tv: 0.55, tvSplit: 0.5, commercial: 0.65, ticket: 0.6, quality: -1.5, talent: 1.25, domestic: 0.93, wages: 0.65, debt: 0.45, divisions: ['arg1', 'arg2', 'arg3'] },
  por: { id: 'por', name: 'Portugal', country: 'Portugal', flag: '🇵🇹', wealth: 0.85, tv: 0.6, tvSplit: 0.75, commercial: 0.8, ticket: 0.85, quality: -0.5, talent: 1.1, domestic: 0.55, wages: 0.68, debt: 0.3, divisions: ['por1', 'por2', 'por3'] },
  esp: { id: 'esp', name: 'Espanha', country: 'Espanha', flag: '🇪🇸', wealth: 1.35, tv: 1.45, tvSplit: 0.45, commercial: 1.4, ticket: 1.45, quality: 3.5, talent: 1.1, domestic: 0.72, wages: 0.81, debt: 0.3, divisions: ['esp1', 'esp2', 'esp3'] },
  eng: { id: 'eng', name: 'Inglaterra', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', wealth: 1.6, tv: 2.3, tvSplit: 0.25, commercial: 1.6, ticket: 1.9, quality: 4, talent: 1.0, domestic: 0.58, wages: 1.0, debt: 0.15, divisions: ['eng1', 'eng2', 'eng3'] },
  ita: { id: 'ita', name: 'Itália', country: 'Itália', flag: '🇮🇹', wealth: 1.25, tv: 1.25, tvSplit: 0.45, commercial: 1.2, ticket: 1.2, quality: 2.5, talent: 1.0, domestic: 0.65, wages: 0.77, debt: 0.4, divisions: ['ita1', 'ita2', 'ita3'] },
  ger: { id: 'ger', name: 'Alemanha', country: 'Alemanha', flag: '🇩🇪', wealth: 1.45, tv: 1.65, tvSplit: 0.35, commercial: 1.5, ticket: 1.55, quality: 3, talent: 1.05, domestic: 0.62, wages: 1.02, debt: 0.2, divisions: ['ger1', 'ger2', 'ger3'] },
  fra: { id: 'fra', name: 'França', country: 'França', flag: '🇫🇷', wealth: 1.2, tv: 1.2, tvSplit: 0.5, commercial: 1.25, ticket: 1.2, quality: 1, talent: 1.3, domestic: 0.72, wages: 1.03, debt: 0.28, divisions: ['fra1', 'fra2', 'fra3'] },
  ned: { id: 'ned', name: 'Holanda', country: 'Holanda', flag: '🇳🇱', wealth: 1.0, tv: 0.95, tvSplit: 0.55, commercial: 1.1, ticket: 1.15, quality: -1, talent: 1.2, domestic: 0.6, wages: 1.11, debt: 0.22, divisions: ['ned1', 'ned2'] },
  bel: { id: 'bel', name: 'Bélgica', country: 'Bélgica', flag: '🇧🇪', wealth: 0.95, tv: 0.85, tvSplit: 0.55, commercial: 1.0, ticket: 1.05, quality: -2, talent: 1.15, domestic: 0.52, wages: 1.17, debt: 0.25, divisions: ['bel1', 'bel2'] },
  tur: { id: 'tur', name: 'Turquia', country: 'Turquia', flag: '🇹🇷', wealth: 0.9, tv: 0.85, tvSplit: 0.6, commercial: 1.05, ticket: 0.9, quality: -3, talent: 1.0, domestic: 0.66, wages: 1.28, debt: 0.45, divisions: ['tur1', 'tur2'] },
  sco: { id: 'sco', name: 'Escócia', country: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', wealth: 0.85, tv: 0.7, tvSplit: 0.55, commercial: 0.9, ticket: 1.1, quality: -4.5, talent: 0.9, domestic: 0.6, wages: 1.46, debt: 0.3, divisions: ['sco1', 'sco2'] },
  gre: { id: 'gre', name: 'Grécia', country: 'Grécia', flag: '🇬🇷', wealth: 0.75, tv: 0.6, tvSplit: 0.6, commercial: 0.8, ticket: 0.8, quality: -5, talent: 0.9, domestic: 0.7, wages: 1.18, debt: 0.45, divisions: ['gre1', 'gre2'] },
};

// ---------- Qualidade e prestígio ----------
/** Quanto da qualidade da liga vale em cada divisão (a diferença entre países é menor nas divisões de baixo). */
const QUALITY_BY_LEVEL = [1, 0.75, 0.6, 0.5];
/** Pontos de prestígio por ponto de qualidade da liga (para comparar clubes de países diferentes). */
export const PRESTIGE_PER_QUALITY = 2;

/** Ajuste de overall dos elencos de um clube pela qualidade da liga (e da divisão em que o clube está). */
export function qualityBonus(c: { league: LeagueId; div: DivisionId }): number {
  const level = Number(c.div.slice(3)) || 1;
  return LEAGUES[c.league].quality * (QUALITY_BY_LEVEL[level - 1] ?? QUALITY_BY_LEVEL[QUALITY_BY_LEVEL.length - 1]);
}

/** Overall médio esperado de um jogador do elenco de um clube (reputação + qualidade da liga). */
export const clubBaseOvr = (c: { rep: number; league: LeagueId; div: DivisionId }): number => 48 + c.rep * 0.32 + qualityBonus(c);

/**
 * Prestígio de um clube entre países: reputação mais o peso da liga. Decide quem compra de quem,
 * quem aceita trocar de clube e quais clubes entram na Copa dos Campeões.
 */
export const prestigeOf = (c: { rep: number; league: LeagueId }): number => c.rep + LEAGUES[c.league].quality * PRESTIGE_PER_QUALITY;

const DIV_NAMES: Record<DivisionId, string> = {
  bra1: 'Série A', bra2: 'Série B', bra3: 'Série C', bra4: 'Série D',
  arg1: 'Primera División', arg2: 'Primera Nacional', arg3: 'Primera B',
  por1: 'Primeira Liga', por2: 'Segunda Liga', por3: 'Liga 3',
  esp1: 'Primera División', esp2: 'Segunda División', esp3: 'Primera Federación',
  eng1: 'Premier Division', eng2: 'First Division', eng3: 'Second Division',
  ita1: 'Serie A', ita2: 'Serie B', ita3: 'Serie C',
  ger1: 'Bundesliga', ger2: '2. Bundesliga', ger3: '3. Liga',
  fra1: 'Ligue 1', fra2: 'Ligue 2', fra3: 'National',
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
/** Clubes por divisão (38 rodadas, turno e returno). */
export const DIVISION_SIZE = 20;
/** Quantos sobem/caem entre divisões vizinhas. */
export const PROMOTION_SPOTS = 4;

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
export const CUP_WEEKS = [5, 13, 21, 29, 37];
export const CONT_WEEKS = [9, 17, 25, 33];
/** Semanas da temporada: 38 rodadas de liga + 5 da Copa Nacional + 4 da Copa dos Campeões. */
export const TOTAL_WEEKS = 47;
export const LEAGUE_ROUNDS = 38;
/** Semanas da temporada antiga (16 clubes por divisão), para escalas calibradas nela. */
export const LEGACY_SEASON_WEEKS = 39;

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
export const TV_BASE = [380000, 190000, 140000, 90000];
/** Prêmio da liga por posição: (17 − posição) × base[nível] × wealth. */
export const LEAGUE_PRIZE_BASE = [0.8e6, 0.25e6, 0.1e6, 0.05e6];
/** Vagas por primeira divisão na Copa dos Campeões (antes do corte para 16). */
export const CONT_SPOTS = 3;
export const CONT_SIZE = 16;

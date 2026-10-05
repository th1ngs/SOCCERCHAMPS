// Ligas, divisões e nomes de competições (sem dados de clubes).
import type { Competition, ContinentalId, CupId, DivisionId, DivisionInfo, KnockoutId, LeagueCupId, LeagueId, LeagueInfo, StateCupId, SuperCupId } from './types';

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
export const leagueCupId = (league: LeagueId): LeagueCupId => `lcup:${league}`;
export const superCupId = (league: LeagueId): SuperCupId => `sup:${league}`;
export const stateCupId = (uf: string): StateCupId => `est:${uf}`;
export const isDivision = (comp: string): comp is DivisionId => comp in DIVISIONS;
export const isNationalCup = (comp: string): comp is CupId => comp.startsWith('cup:') && (comp.slice(4) in LEAGUES);
export const isLeagueCup = (comp: string): comp is LeagueCupId => comp.startsWith('lcup:') && (comp.slice(5) in LEAGUES);
export const isSuperCup = (comp: string): comp is SuperCupId => comp.startsWith('sup:') && (comp.slice(4) in LEAGUES);
export const isStateCup = (comp: string): comp is StateCupId => comp.startsWith('est:') && comp.length > 4;
export const CONTINENTAL_IDS: ContinentalId[] = ['cont', 'eur2', 'lib', 'sud', 'ne', 'inter'];
export const isContinental = (comp: string): comp is ContinentalId => (CONTINENTAL_IDS as string[]).includes(comp);
export const isKnockout = (comp: string): comp is KnockoutId =>
  isContinental(comp) || isNationalCup(comp) || isLeagueCup(comp) || isSuperCup(comp) || isStateCup(comp);
/** Liga de uma competição (null para continentais; 'bra' para estaduais e Copa do Nordeste). */
export const compLeague = (comp: Competition): LeagueId | null => {
  if (isDivision(comp)) return leagueOf(comp);
  if (isNationalCup(comp) || isSuperCup(comp)) return comp.slice(4) as LeagueId;
  if (isLeagueCup(comp)) return comp.slice(5) as LeagueId;
  if (isStateCup(comp) || comp === 'ne') return 'bra';
  return null;
};

/** Ligas de cada continente (Libertadores e Sul-Americana para a América do Sul; o resto, Europa). */
export const SOUTH_AMERICA: LeagueId[] = ['bra', 'arg'];
export const isSouthAmerican = (lg: LeagueId): boolean => SOUTH_AMERICA.includes(lg);

export const CONT_NAME = 'Liga dos Campeões';
const CONTINENTAL_NAMES: Record<ContinentalId, string> = {
  cont: CONT_NAME, eur2: 'Liga Europa', lib: 'Copa Libertadores', sud: 'Copa Sul-Americana', ne: 'Copa do Nordeste', inter: 'Copa Intercontinental',
};
/** "do Brasil", "da Inglaterra"… */
const OF: Record<LeagueId, string> = {
  bra: 'do Brasil', arg: 'da Argentina', por: 'de Portugal', esp: 'da Espanha', eng: 'da Inglaterra', ita: 'da Itália', ger: 'da Alemanha',
  fra: 'da França', ned: 'da Holanda', bel: 'da Bélgica', tur: 'da Turquia', sco: 'da Escócia', gre: 'da Grécia',
};
/** Copas nacionais pelos nomes usados no Brasil. */
const CUP_NAMES: Partial<Record<LeagueId, string>> = { arg: 'Copa Argentina', por: 'Taça de Portugal', esp: 'Copa do Rei' };
const LEAGUE_CUP_NAMES: Partial<Record<LeagueId, string>> = { eng: 'Copa da Liga Inglesa', por: 'Taça da Liga', sco: 'Copa da Liga Escocesa', arg: 'Copa da Liga Argentina' };
const SUPER_CUP_NAMES: Partial<Record<LeagueId, string>> = { por: 'Supertaça de Portugal', arg: 'Supercopa Argentina' };
/** Gentílico de cada estado para o nome do estadual ("Campeonato Mineiro"). */
export const STATE_NAMES: Record<string, string> = {
  AC: 'Acreano', AL: 'Alagoano', AP: 'Amapaense', AM: 'Amazonense', BA: 'Baiano', CE: 'Cearense', DF: 'Brasiliense', ES: 'Capixaba',
  GO: 'Goiano', MA: 'Maranhense', MT: 'Mato-Grossense', MS: 'Sul-Mato-Grossense', MG: 'Mineiro', PA: 'Paraense', PB: 'Paraibano',
  PR: 'Paranaense', PE: 'Pernambucano', PI: 'Piauiense', RJ: 'Carioca', RN: 'Potiguar', RS: 'Gaúcho', RO: 'Rondoniense',
  RR: 'Roraimense', SC: 'Catarinense', SP: 'Paulista', SE: 'Sergipano', TO: 'Tocantinense',
};
/** Estados do Nordeste (Copa do Nordeste). */
export const NORTHEAST_UF = ['BA', 'CE', 'PE', 'RN', 'PB', 'AL', 'SE', 'PI', 'MA'];
/** Ligas com Copa da Liga e com Supercopa (a Escócia não tem supercopa). */
export const LEAGUE_CUP_LEAGUES: LeagueId[] = ['eng', 'por', 'sco', 'arg'];
export const SUPER_CUP_LEAGUES: LeagueId[] = LEAGUE_IDS.filter((lg) => lg !== 'sco');

/** "Série A", "Copa do Brasil", "Campeonato Paulista", "Liga dos Campeões"… */
export function competitionName(comp: string): string {
  if (isContinental(comp)) return CONTINENTAL_NAMES[comp];
  if (isNationalCup(comp)) { const lg = comp.slice(4) as LeagueId; return CUP_NAMES[lg] ?? `Copa ${OF[lg]}`; }
  if (isLeagueCup(comp)) { const lg = comp.slice(5) as LeagueId; return LEAGUE_CUP_NAMES[lg] ?? `Copa da Liga ${OF[lg]}`; }
  if (isSuperCup(comp)) { const lg = comp.slice(4) as LeagueId; return SUPER_CUP_NAMES[lg] ?? `Supercopa ${OF[lg]}`; }
  if (isStateCup(comp)) { const uf = comp.slice(4); return `Campeonato ${STATE_NAMES[uf] ?? uf}`; }
  if (isDivision(comp)) return divisionName(comp);
  return comp;
}

/** Peso de um título (diretoria, conquistas): continentais > liga/copa nacional > copa da liga/supercopa > estadual. */
export function compWeight(comp: KnockoutId): number {
  if (comp === 'cont' || comp === 'lib' || comp === 'inter') return 1;
  if (comp === 'eur2' || comp === 'sud') return 0.75;
  if (isNationalCup(comp)) return 0.75;
  if (isLeagueCup(comp) || isSuperCup(comp) || comp === 'ne') return 0.45;
  return 0.35;
}

// ---------- Calendário e copas ----------
/** Semana das Supercopas (abre a temporada). */
export const SUPER_WEEK = 1;
/** Estaduais e Copas da Liga (início da temporada, entre as primeiras rodadas). */
export const REGIONAL_WEEKS = [2, 4, 6, 8, 10];
/** Copas Nacionais. */
export const CUP_WEEKS = [13, 21, 29, 37, 45];
/** Continentais (Liga dos Campeões, Liga Europa, Libertadores, Sul-Americana) e Copa do Nordeste. */
export const CONT_WEEKS = [16, 24, 32, 40, 48];
/** Copa Intercontinental: fecha a temporada. */
export const INTER_WEEK = 55;
/** Semanas da temporada: 38 rodadas de liga + 17 de mata-matas. */
export const TOTAL_WEEKS = 55;
export const LEAGUE_ROUNDS = 38;
/** Semanas da temporada antiga (16 clubes por divisão), para escalas calibradas nela. */
export const LEGACY_SEASON_WEEKS = 39;

/** Nome da fase pelo número de clubes vivos (32 → "1ª fase" … 2 → "Final"). */
export function roundNameBySize(size: number): string {
  if (size > 16) return size > 32 ? 'Fase preliminar' : '1ª fase';
  if (size > 8) return 'Oitavas de final';
  if (size > 4) return 'Quartas de final';
  if (size > 2) return 'Semifinal';
  return 'Final';
}
/** Fases da Copa Nacional (32 clubes). */
export const CUP_ROUNDS = ['1ª fase', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
/** Fases da Copa dos Campeões antiga (16 clubes, saves anteriores à v10). */
export const CONT_ROUNDS = CUP_ROUNDS.slice(1);
/** Nome da fase `round` de uma copa nos calendários antigos (sem `Match.size`). */
export const cupRoundName = (comp: KnockoutId, round: number): string => (comp === 'cont' ? CONT_ROUNDS : CUP_ROUNDS)[round] ?? '';
/** Nome da fase de um jogo de mata-mata (pelo tamanho da fase, ou pela semana nos saves antigos). */
export const matchStage = (m: { comp: Competition; size?: number }, round: number): string =>
  m.size ? roundNameBySize(m.size) : isKnockout(m.comp) ? cupRoundName(m.comp, round) : `Rodada ${round}`;

/** Prêmio (antes do fator `wealth`) por fase vencida na Copa Nacional (1ª fase … final). */
export const CUP_PRIZE = [1e6, 2e6, 3.5e6, 6e6, 12e6];
/** Prêmio por fase vencida na Liga dos Campeões (1ª fase … final, sem fator wealth). */
export const CONT_PRIZE = [3e6, 4e6, 8e6, 15e6, 30e6];
/** Fator sobre o prêmio da Copa Nacional (copas da liga, estaduais…) ou da Liga dos Campeões (outros continentais). */
const PRIZE_SCALE: Partial<Record<ContinentalId, number>> = { eur2: 0.45, lib: 0.6, sud: 0.3, ne: 0.12, inter: 0.8 };
/** Prêmio por vencer uma fase de `size` clubes (2 = final). */
export function knockoutPrizeBySize(comp: KnockoutId, size: number): number {
  const fromEnd = Math.max(0, Math.ceil(Math.log2(Math.max(2, size))) - 1);
  const idx = Math.max(0, 4 - fromEnd);
  if (isContinental(comp) && comp !== 'ne') return Math.round((CONT_PRIZE[idx] ?? CONT_PRIZE[0]) * (PRIZE_SCALE[comp] ?? 1));
  const lg = compLeague(comp);
  const wealth = lg ? LEAGUES[lg].wealth : 1;
  const k = isNationalCup(comp) ? 1 : isLeagueCup(comp) ? 0.4 : isSuperCup(comp) ? 0.25 : comp === 'ne' ? 0.35 : 0.2;
  return Math.round((CUP_PRIZE[idx] ?? CUP_PRIZE[0]) * k * wealth);
}

/** Cota de TV semanal por nível de divisão (× wealth). */
export const TV_BASE = [380000, 190000, 140000, 90000];
/** Prêmio da liga por posição: (17 − posição) × base[nível] × wealth. */
export const LEAGUE_PRIZE_BASE = [0.8e6, 0.25e6, 0.1e6, 0.05e6];
/** Vagas por primeira divisão na Copa dos Campeões (antes do corte para 16). */
export const CONT_SPOTS = 3;
export const CONT_SIZE = 16;
/** Vagas de cada liga europeia na Liga dos Campeões (32) e na Liga Europa (32), pela tabela da primeira divisão. */
export const CONT_SLOTS: Partial<Record<LeagueId, number>> = { eng: 4, esp: 4, ita: 4, ger: 4, fra: 3, por: 3, ned: 2, bel: 2, tur: 2, sco: 2, gre: 2 };
export const EUR2_SLOTS: Partial<Record<LeagueId, number>> = { eng: 3, esp: 3, ita: 3, ger: 3, fra: 3, por: 3, ned: 3, bel: 3, tur: 3, sco: 3, gre: 2 };
/** Vagas do Brasil e da Argentina na Libertadores (16) e na Sul-Americana (16). */
export const LIB_SLOTS: Partial<Record<LeagueId, number>> = { bra: 8, arg: 8 };
export const SUD_SLOTS: Partial<Record<LeagueId, number>> = { bra: 8, arg: 8 };

/** Como funciona cada mata-mata (subtítulos das telas). */
export function competitionInfo(comp: KnockoutId): string {
  if (comp === 'cont') return 'Os melhores da Europa: 32 clubes das primeiras divisões europeias, pela tabela da temporada anterior. Jogo único; final em campo neutro.';
  if (comp === 'eur2') return 'A segunda copa europeia: 32 clubes que ficaram logo abaixo das vagas da Liga dos Campeões.';
  if (comp === 'lib') return 'Os 8 primeiros da Série A e da Primera División argentina disputam a América do Sul. Jogo único; final em campo neutro.';
  if (comp === 'sud') return 'Do 9º ao 16º da Série A e da Primera División argentina, em mata-mata de jogo único.';
  if (comp === 'ne') return 'Os 16 maiores clubes do Nordeste que não estão na Libertadores nem na Sul-Americana.';
  if (comp === 'inter') return 'Campeão da Liga dos Campeões x campeão da Libertadores, em jogo único no fim da temporada.';
  if (isNationalCup(comp)) return 'Mata-mata em jogo único com 32 clubes: a primeira divisão inteira e os maiores da segunda. Empate vai para os pênaltis.';
  if (isLeagueCup(comp)) return 'Copa da Liga: até 32 clubes, das primeiras divisões para baixo, no começo da temporada.';
  if (isSuperCup(comp)) return 'Abre a temporada: campeão da liga x campeão da copa nacional da temporada anterior, em jogo único.';
  if (isStateCup(comp)) return 'Estadual no começo da temporada: os clubes do estado em mata-mata de jogo único.';
  return '';
}

/** Artigo de uma competição: "o Campeonato Mineiro", "a Copa do Brasil". */
export const compArticle = (name: string): 'o' | 'a' => (/^(Campeonato|Torneio|Mundial|Brasileirão)/.test(name) ? 'o' : 'a');
/** "da Copa do Brasil" / "do Campeonato Mineiro" (prep: de, em, a). */
export function compWith(prep: 'de' | 'em' | 'a', comp: string): string {
  const name = isDivision(comp) || isKnockout(comp) ? competitionName(comp) : comp;
  const o = compArticle(name) === 'o';
  const p = prep === 'de' ? (o ? 'do' : 'da') : prep === 'em' ? (o ? 'no' : 'na') : o ? 'ao' : 'à';
  return `${p} ${name}`;
}

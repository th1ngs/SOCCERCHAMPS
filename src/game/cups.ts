// Mata-matas da temporada (v10): quem disputa cada copa e em que semanas.
// - Supercopas (semana 1): campeão da liga x campeão da copa nacional da temporada anterior.
// - Estaduais (Brasil, por UF) e Copas da Liga (Inglaterra, Portugal, Escócia, Argentina) nas semanas de REGIONAL_WEEKS.
// - Copas Nacionais (CUP_WEEKS).
// - Liga dos Campeões e Liga Europa (Europa), Libertadores e Sul-Americana (Brasil e Argentina) e Copa do Nordeste (CONT_WEEKS).
// - Copa Intercontinental (INTER_WEEK): campeão da Liga dos Campeões x campeão da Libertadores.
// Cada copa ocupa as ÚLTIMAS semanas do seu grupo (uma copa de 16 joga 4 das 5 semanas), então a final sempre fecha o grupo.
import {
  CONT_SLOTS, CONT_WEEKS, CUP_WEEKS, EUR2_SLOTS, INTER_WEEK, LEAGUES, LEAGUE_CUP_LEAGUES, LEAGUE_IDS, LIB_SLOTS, NORTHEAST_UF,
  REGIONAL_WEEKS, SUD_SLOTS, SUPER_CUP_LEAGUES, SUPER_WEEK, TOTAL_WEEKS, cupId, isSouthAmerican, leagueCupId, stateCupId, superCupId,
} from './leagues';
import type { Club, Cup, KnockoutId, LeagueId, TableRow, Week, World } from './types';
import { shuffle } from './util';
import { table } from './world';

type Continental = 'cont' | 'eur2' | 'lib' | 'sud';

/** Mata-matas de uma semana (saves antigos não têm `comps`: deduzido do tipo). */
export function weekComps(wk: Week | null | undefined): KnockoutId[] {
  if (!wk || wk.type === 'league') return [];
  if (wk.comps) return wk.comps;
  return wk.type === 'cont' ? ['cont'] : LEAGUE_IDS.map(cupId);
}

/** Rodadas de um mata-mata com `n` clubes (byes para os ímpares). */
export const roundsFor = (n: number): number => (n < 2 ? 0 : Math.ceil(Math.log2(n)));

const clubsOf = (w: World, lg: LeagueId): Club[] => Object.values(w.clubs).filter((c) => c.league === lg);
const byRep = (a: Club, b: Club) => b.rep - a.rep;

/** Classificados aos continentais pela tabela das primeiras divisões (ou pela reputação, sem tabela). */
export function continentalQualifiers(w: World, tables?: Partial<Record<string, TableRow[]>>): Record<Continental, string[]> {
  const out: Record<Continental, string[]> = { cont: [], eur2: [], lib: [], sud: [] };
  for (const lg of LEAGUE_IDS) {
    const d1 = LEAGUES[lg].divisions[0];
    const order = tables ? (tables[d1] ?? table(w, d1)).map((r) => r.id) : clubsOf(w, lg).filter((c) => c.div === d1).sort(byRep).map((c) => c.id);
    const [top, second] = isSouthAmerican(lg) ? (['lib', 'sud'] as const) : (['cont', 'eur2'] as const);
    const a = (isSouthAmerican(lg) ? LIB_SLOTS : CONT_SLOTS)[lg] ?? 0;
    const b = (isSouthAmerican(lg) ? SUD_SLOTS : EUR2_SLOTS)[lg] ?? 0;
    out[top].push(...order.slice(0, a));
    out[second].push(...order.slice(a, a + b));
  }
  return out;
}

/** Supercopa: campeão da liga e campeão da copa nacional da última temporada (ou os maiores, na primeira). */
function superCupEntrants(w: World, lg: LeagueId): string[] {
  const d1 = LEAGUES[lg].divisions[0];
  const last = w.history[w.history.length - 1];
  const picks: string[] = [];
  const add = (id: string | null | undefined) => { if (id && w.clubs[id] && !picks.includes(id)) picks.push(id); };
  if (last) { add(last.champions?.[d1]); add(last.cups?.[cupId(lg)] ?? null); }
  for (const c of clubsOf(w, lg).filter((x) => x.div === d1).sort(byRep)) { if (picks.length >= 2) break; add(c.id); }
  return picks.slice(0, 2);
}

/** Estaduais: um por UF com ao menos 2 clubes brasileiros. */
function stateCups(w: World): Map<string, string[]> {
  const by = new Map<string, string[]>();
  for (const c of clubsOf(w, 'bra').sort(byRep)) {
    if (!c.uf) continue;
    by.set(c.uf, [...(by.get(c.uf) ?? []), c.id]);
  }
  for (const [uf, ids] of by) if (ids.length < 2) by.delete(uf);
  return by;
}

/** Copa da Liga: até 32 clubes, das primeiras divisões para baixo (as semanas não batem com as continentais). */
function leagueCupEntrants(w: World, lg: LeagueId): string[] {
  const divs = LEAGUES[lg].divisions;
  return clubsOf(w, lg).sort((a, b) => divs.indexOf(a.div) - divs.indexOf(b.div) || b.rep - a.rep).slice(0, 32).map((c) => c.id);
}

const cup = (entrants: string[]): Cup => ({ entrants: entrants.slice(), alive: shuffle(entrants.slice()), champion: null });

/**
 * Monta as copas da temporada (`w.cups`) e devolve as semanas de mata-mata com as copas de cada uma.
 * `qualified` são os classificados aos continentais (da temporada anterior); sem eles, a reputação decide.
 */
export function buildSeasonCups(w: World, qualified?: Partial<Record<Continental, string[]>> | null): Map<number, KnockoutId[]> {
  w.cups = {};
  const weeks = new Map<number, KnockoutId[]>();
  const place = (id: KnockoutId, group: number[], n: number) => {
    const r = Math.min(group.length, roundsFor(n));
    for (const wk of group.slice(group.length - r)) weeks.set(wk, [...(weeks.get(wk) ?? []), id]);
  };

  // Supercopas
  for (const lg of SUPER_CUP_LEAGUES) {
    const e = superCupEntrants(w, lg);
    if (e.length === 2) { w.cups[superCupId(lg)] = cup(e); place(superCupId(lg), [SUPER_WEEK], 2); }
  }

  // Continentais
  const byRepQ = continentalQualifiers(w);
  const cont: Record<Continental, string[]> = { cont: [], eur2: [], lib: [], sud: [] };
  for (const k of Object.keys(cont) as Continental[]) {
    const q = (qualified?.[k] ?? []).filter((id) => w.clubs[id]);
    cont[k] = q.length >= 8 ? q : byRepQ[k];
  }
  // Ninguém em duas continentais (um clube rebaixado e promovido continua com a vaga que ganhou).
  const taken = new Set<string>();
  for (const k of ['cont', 'lib', 'eur2', 'sud'] as Continental[]) {
    cont[k] = cont[k].filter((id) => !taken.has(id));
    cont[k].forEach((id) => taken.add(id));
    if (cont[k].length >= 2) { w.cups[k] = cup(cont[k]); place(k, CONT_WEEKS, cont[k].length); }
  }
  // Copa do Nordeste: os 16 maiores do Nordeste que não estão na Libertadores nem na Sul-Americana.
  const ne = clubsOf(w, 'bra').filter((c) => NORTHEAST_UF.includes(c.uf) && !taken.has(c.id)).sort(byRep).slice(0, 16).map((c) => c.id);
  if (ne.length >= 4) { w.cups.ne = cup(ne); place('ne', CONT_WEEKS, ne.length); }
  // Intercontinental: definida na semana dela (campeões da Liga dos Campeões e da Libertadores).
  w.cups.inter = { entrants: [], alive: [], champion: null };
  weeks.set(INTER_WEEK, ['inter']);

  // Copas Nacionais: 32 clubes — a primeira divisão inteira e os de maior reputação da segunda.
  for (const lg of LEAGUE_IDS) {
    const [d1, d2] = LEAGUES[lg].divisions;
    const first = clubsOf(w, lg).filter((c) => c.div === d1);
    const second = clubsOf(w, lg).filter((c) => c.div === d2).sort(byRep).slice(0, Math.max(0, 32 - first.length));
    const e = [...first, ...second].map((c) => c.id);
    w.cups[cupId(lg)] = cup(e);
    place(cupId(lg), CUP_WEEKS, e.length);
  }

  // Estaduais e Copas da Liga (grupos de clubes que não se cruzam: Brasil x outras ligas).
  for (const [uf, ids] of stateCups(w)) { w.cups[stateCupId(uf)] = cup(ids); place(stateCupId(uf), REGIONAL_WEEKS, ids.length); }
  for (const lg of LEAGUE_CUP_LEAGUES) {
    const e = leagueCupEntrants(w, lg);
    if (e.length >= 4) { w.cups[leagueCupId(lg)] = cup(e); place(leagueCupId(lg), REGIONAL_WEEKS, e.length); }
  }
  return weeks;
}

/** Tipo da semana de mata-mata (para rótulos e telas antigas). */
export function koWeekType(wk: number): Week['type'] {
  if (CUP_WEEKS.includes(wk)) return 'cup';
  if (CONT_WEEKS.includes(wk) || wk === INTER_WEEK) return 'cont';
  return 'ko';
}

/** Semanas reservadas a mata-matas no calendário v10. */
export const KO_WEEKS = new Set([SUPER_WEEK, ...REGIONAL_WEEKS, ...CUP_WEEKS, ...CONT_WEEKS, INTER_WEEK].filter((x) => x <= TOTAL_WEEKS));

/** Copa Intercontinental: entra quem venceu a Liga dos Campeões e a Libertadores. */
export function fillIntercontinental(w: World): void {
  const inter = w.cups.inter;
  if (!inter || inter.entrants.length) return;
  const a = w.cups.cont?.champion, b = w.cups.lib?.champion;
  if (a && b && a !== b) { inter.entrants = [a, b]; inter.alive = [a, b]; }
}

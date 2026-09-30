// Copa das Nações: todas as nacionalidades se enfrentam entre uma temporada e outra,
// a cada 4 anos (2026, 2030, …). Convocação automática dos 23 melhores de cada país, todos contra todos
// em jogo único e final entre os dois primeiros. Os jogos não contam para os clubes.
import { addTitle, unlock } from './career';
import { Sim } from './engine';
import { DEFAULT_INSTRUCTIONS } from './tactics';
import { LEAGUE_IDS, LEAGUES } from './leagues';
import { autoLineup } from './squad';
import type { Club, LeagueId, NationMatch, NationRow, NationsEdition, Player, Position, World } from './types';
import { clamp } from './util';
import { pushMessage, user } from './world';

export const NATIONS_NAME = 'Copa das Nações';
/** A primeira edição é no fim da temporada 2026; depois, a cada 4 temporadas. */
export const NATIONS_EVERY = 4;
const FIRST_SEASON = 2026;
const SQUAD: Record<Position, number> = { GOL: 3, ZAG: 4, LAT: 4, VOL: 3, MEI: 5, ATA: 4 };
const SQUAD_SIZE = 23;

/** Uniforme e sigla de cada seleção. */
export const NATION_KITS: Record<LeagueId, { short: string; colors: [string, string]; pattern: Club['pattern'] }> = {
  bra: { short: 'BRA', colors: ['#FFDF00', '#009C3B'], pattern: 'solid' },
  arg: { short: 'ARG', colors: ['#75AADB', '#FFFFFF'], pattern: 'v' },
  por: { short: 'POR', colors: ['#C8102E', '#006600'], pattern: 'half' },
  esp: { short: 'ESP', colors: ['#C60B1E', '#FFC400'], pattern: 'solid' },
  eng: { short: 'ING', colors: ['#FFFFFF', '#CE1124'], pattern: 'solid' },
  ita: { short: 'ITA', colors: ['#0066B3', '#FFFFFF'], pattern: 'solid' },
  ger: { short: 'ALE', colors: ['#FFFFFF', '#111111'], pattern: 'solid' },
  fra: { short: 'FRA', colors: ['#1D4ED8', '#FFFFFF'], pattern: 'solid' },
  ned: { short: 'HOL', colors: ['#EA580C', '#FFFFFF'], pattern: 'solid' },
  bel: { short: 'BEL', colors: ['#DC2626', '#111111'], pattern: 'solid' },
  tur: { short: 'TUR', colors: ['#DC2626', '#FFFFFF'], pattern: 'solid' },
  sco: { short: 'ESC', colors: ['#1D4ED8', '#FFFFFF'], pattern: 'solid' },
  gre: { short: 'GRE', colors: ['#1D4ED8', '#FFFFFF'], pattern: 'solid' },
};

export const isNationsSeason = (season: number): boolean => season >= FIRST_SEASON && (season - FIRST_SEASON) % NATIONS_EVERY === 0;
/** Próxima temporada (a atual ou uma futura) em cujo fim há Copa das Nações. */
export const nextNationsSeason = (season: number): number => {
  let s = Math.max(season, FIRST_SEASON);
  while (!isNationsSeason(s)) s++;
  return s;
};
export const nationId = (lg: LeagueId): string => `nat:${lg}`;
export const nationName = (lg: LeagueId): string => LEAGUES[lg].country;

/** Convocação: os melhores disponíveis por posição (3 goleiros), completando com os melhores restantes. */
export function callUp(w: World, lg: LeagueId): string[] {
  const pool = Object.values(w.players)
    .filter((p) => p.nat === lg && p.clubId && !p.youth && !p.inj && !p.susp)
    .sort((a, b) => b.ovr - a.ovr);
  const picked: Player[] = [];
  for (const pos of Object.keys(SQUAD) as Position[]) picked.push(...pool.filter((p) => p.pos === pos).slice(0, SQUAD[pos]));
  for (const p of pool) {
    if (picked.length >= SQUAD_SIZE) break;
    if (!picked.includes(p) && p.pos !== 'GOL') picked.push(p);
  }
  return picked.slice(0, SQUAD_SIZE).map((p) => p.id);
}

/** Clube temporário que representa a seleção durante o torneio. */
function nationClub(w: World, lg: LeagueId, squad: string[]): Club {
  const kit = NATION_KITS[lg];
  const avg = squad.reduce((s, id) => s + (w.players[id]?.ovr ?? 60), 0) / Math.max(1, squad.length);
  return {
    id: nationId(lg), name: nationName(lg), short: kit.short, city: '', uf: '', colors: kit.colors, pattern: kit.pattern,
    league: lg, div: LEAGUES[lg].divisions[0], rep: clamp(Math.round(avg), 40, 99), cap: 70000,
    nickname: 'Seleção', mascot: '', stadium: 'Estádio neutro', rival: '',
    money: 0, sponsor: 0, wageCap: 0, academy: 1, training: 1, formation: '4-3-3', tactic: 'bal', trainingInt: 'mid',
    squad: squad.slice(), youth: [], lineup: [], bench: [], trophies: [], fans: 60, ticketPrice: 'normal',
    captain: null, penTaker: null, fkTaker: null, instr: { ...DEFAULT_INSTRUCTIONS }, loan: null, scouting: 1, academyFocus: 'balanced',
  };
}

/** Todos contra todos; um país folga a cada rodada quando o total é ímpar. */
function roundRobin(ids: LeagueId[]): [LeagueId, LeagueId][][] {
  const t: (LeagueId | null)[] = ids.length % 2 ? [...ids, null] : ids.slice();
  const rounds: [LeagueId, LeagueId][][] = [];
  for (let r = 0; r < t.length - 1; r++) {
    const games: [LeagueId, LeagueId][] = [];
    for (let i = 0; i < t.length / 2; i++) {
      const a = t[i], b = t[t.length - 1 - i];
      if (a && b) games.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(games);
    t.splice(1, 0, t.pop() as LeagueId | null);
  }
  return rounds;
}

/** Disputa a Copa das Nações da temporada `w.season` (chamado no início de newSeason). Devolve a edição ou null. */
export function runNationsCup(w: World): NationsEdition | null {
  if (!isNationsSeason(w.season) || w.nations?.some((e) => e.season === w.season)) return null;
  const squads = {} as Record<LeagueId, string[]>;
  for (const lg of LEAGUE_IDS) squads[lg] = callUp(w, lg);
  const active = LEAGUE_IDS.filter((lg) => squads[lg].length >= 16);
  if (active.length < 2) return null;
  // Seleções entram no mundo só durante o torneio.
  for (const lg of active) w.clubs[nationId(lg)] = nationClub(w, lg, squads[lg]);
  const table = new Map<LeagueId, NationRow>(active.map((id) => [id, { id, p: 0, j: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0 }]));
  const matches: NationMatch[] = [];
  const goals = new Map<string, number>();
  const intl = new Map<string, [number, number]>();
  const play = (h: LeagueId, a: LeagueId, round: number): NationMatch => {
    for (const lg of [h, a]) autoLineup(w, w.clubs[nationId(lg)]);
    const sim = new Sim(w, nationId(h), nationId(a), { neutral: true, knockout: round === 0 }).runToEnd();
    const res = sim.result();
    const m: NationMatch = { h, a, hs: res.hs, as: res.as, pens: res.pens, round, goals: res.goals.map((g) => [g.pid, g.side]) };
    for (const g of res.goals) goals.set(g.pid, (goals.get(g.pid) ?? 0) + 1);
    res.played.forEach((list) => list.forEach((pid) => { const c = intl.get(pid) ?? [0, 0]; c[0]++; intl.set(pid, c); }));
    for (const g of res.goals) { const c = intl.get(g.pid) ?? [0, 0]; c[1]++; intl.set(g.pid, c); }
    matches.push(m);
    return m;
  };
  roundRobin(active).forEach((games, r) => {
    for (const [h, a] of games) {
      const m = play(h, a, r + 1);
      const th = table.get(h) as NationRow, ta = table.get(a) as NationRow;
      th.j++; ta.j++; th.gf += m.hs; th.ga += m.as; ta.gf += m.as; ta.ga += m.hs;
      if (m.hs > m.as) { th.v++; ta.d++; th.p += 3; } else if (m.hs < m.as) { ta.v++; th.d++; ta.p += 3; } else { th.e++; ta.e++; th.p++; ta.p++; }
    }
  });
  const rows = [...table.values()].sort((x, y) => y.p - x.p || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf);
  const final = play(rows[0].id, rows[1].id, 0);
  const homeWon = final.hs > final.as || (final.hs === final.as && !!final.pens && final.pens[0] > final.pens[1]);
  const champion = homeWon ? final.h : final.a, runnerUp = homeWon ? final.a : final.h;
  for (const lg of active) delete w.clubs[nationId(lg)];

  // Jogos pela seleção, título no histórico e moral dos campeões.
  for (const [pid, c] of intl) {
    const p = w.players[pid];
    if (!p) continue;
    const prev = p.intl ?? [0, 0];
    p.intl = [prev[0] + c[0], prev[1] + c[1]];
  }
  const winners = squads[champion].filter((pid) => intl.has(pid));
  for (const pid of winners) {
    const p = w.players[pid];
    if (!p || !p.clubId) continue;
    addTitle(p, w.season, p.clubId, NATIONS_NAME);
    p.morale = clamp(p.morale + 8, 10, 100);
  }
  const scorers = [...goals.entries()]
    .map(([pid, n]) => ({ pid, name: w.players[pid]?.name ?? '?', nat: (w.players[pid]?.nat ?? 'bra') as LeagueId, goals: n }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);
  const edition: NationsEdition = { season: w.season, squads, table: rows, matches, champion, runnerUp, scorers };
  (w.nations ||= []).push(edition);

  // Aviso ao usuário, destacando os jogadores do clube dele.
  const u = user(w);
  const mine = LEAGUE_IDS.flatMap((lg) => squads[lg]).filter((pid) => w.players[pid]?.clubId === u.id);
  const mineChamps = winners.filter((pid) => w.players[pid]?.clubId === u.id);
  if (mineChamps.length) unlock(w, 'nacoes');
  const score = `${nationName(final.h)} ${final.hs} x ${final.as} ${nationName(final.a)}${final.pens ? ` (pênaltis ${final.pens[0]} x ${final.pens[1]})` : ''}`;
  const top = scorers[0];
  pushMessage(w, {
    kind: 'trophy',
    title: `${NATIONS_NAME} ${w.season}: ${nationName(champion)} campeão!`,
    body: [
      `Final: ${score}.`,
      top ? `Artilheiro: ${top.name} (${nationName(top.nat)}), ${top.goals} gols.` : '',
      mine.length ? `Convocados do ${u.name}: ${mine.map((pid) => w.players[pid].name).join(', ')}.` : `Nenhum jogador do ${u.name} foi convocado.`,
      mineChamps.length ? `Campeões pelo clube: ${mineChamps.map((pid) => w.players[pid].name).join(', ')} (moral +8).` : '',
      `Veja a campanha completa em Competições → ${NATIONS_NAME}.`,
    ].filter(Boolean).join('\n'),
  });
  return edition;
}

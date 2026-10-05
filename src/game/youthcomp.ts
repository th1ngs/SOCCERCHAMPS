// Campeonatos de base (v12): Sub-17 e Sub-20 entre os clubes da divisão do usuário, com tabela, artilharia,
// final entre os dois primeiros e título; e a convocação das seleções Sub-17 e Sub-20 no meio da temporada.
// Os jogos de base usam um modelo rápido (gols de Poisson pela força dos onze melhores elegíveis).
import { LEAGUES } from './leagues';
import type { Club, Player, World, YouthCat, YouthCallup, YouthLeague, YouthRow } from './types';
import { clamp, shuffle } from './util';
import { pushMessage, seasonWeeks, user } from './world';

export const YOUTH_CATS: YouthCat[] = ['sub17', 'sub20'];
export const YOUTH_NAMES: Record<YouthCat, string> = { sub17: 'Sub-17', sub20: 'Sub-20' };
const MAX_AGE: Record<YouthCat, number> = { sub17: 17, sub20: 20 };
const SHOOT: Record<string, number> = { GOL: 0, ZAG: 0.5, LAT: 0.8, VOL: 1.2, MEI: 3, ATA: 5 };

/** Garotos que podem jogar a categoria pelo clube (os titulares do time principal ficam de fora do Sub-20). */
export function eligible(w: World, c: Club, cat: YouthCat): Player[] {
  const ids = [...c.youth, ...c.squad];
  return ids
    .map((id) => w.players[id])
    .filter((p): p is Player => !!p && !p.loan && p.age <= MAX_AGE[cat] && !p.inj && !(cat === 'sub20' && c.lineup.includes(p.id)))
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 16);
}

/** Força do time de base: média dos 11 melhores, completando com garotos anônimos pelo nível da base. */
function strength(w: World, c: Club, cat: YouthCat): number {
  const filler = (cat === 'sub17' ? 36 : 41) + c.academy * 4 + (LEAGUES[c.league].quality ?? 0);
  const best = eligible(w, c, cat).slice(0, 11).map((p) => p.ovr);
  while (best.length < 11) best.push(filler);
  return best.reduce((s, v) => s + v, 0) / 11;
}

function poisson(lambda: number): number {
  const l = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > l);
  return k - 1;
}

const emptyRow = (id: string): YouthRow => ({ id, p: 0, j: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0 });

/** Turno único (todos contra todos uma vez). */
function rounds(ids: string[]): [string, string][][] {
  const t = ids.length % 2 ? [...ids, ''] : ids.slice();
  const out: [string, string][][] = [];
  for (let r = 0; r < t.length - 1; r++) {
    const games: [string, string][] = [];
    for (let i = 0; i < t.length / 2; i++) {
      const a = t[i], b = t[t.length - 1 - i];
      if (a && b) games.push(r % 2 ? [b, a] : [a, b]);
    }
    out.push(games);
    t.splice(1, 0, t.pop() as string);
  }
  return out;
}

/** Monta os campeonatos de base da temporada (chamado em startSeason). */
export function startYouthLeagues(w: World): void {
  if (w.playerCareer) { w.youthLeagues = null; return; }
  const div = user(w).div;
  const ids = shuffle(Object.values(w.clubs).filter((c) => c.div === div).map((c) => c.id));
  const cats = {} as Record<YouthCat, YouthLeague>;
  for (const cat of YOUTH_CATS) {
    cats[cat] = { rounds: rounds(ids), round: 0, table: ids.map(emptyRow), scorers: {}, results: [], final: null, champion: null };
  }
  w.youthLeagues = { season: w.season, div, cats };
}

/** Joga um jogo de base e registra gols e artilheiros. */
function play(w: World, lg: YouthLeague, cat: YouthCat, h: string, a: string, neutral: boolean): [number, number] {
  const ch = w.clubs[h], ca = w.clubs[a];
  if (!ch || !ca) return [0, 0];
  const sh = strength(w, ch, cat), sa = strength(w, ca, cat);
  const hs = poisson(1.3 * Math.exp((sh - sa) / 11) * (neutral ? 1 : 1.1));
  const as = poisson(1.3 * Math.exp((sa - sh) / 11));
  for (const [club, goals] of [[ch, hs], [ca, as]] as [Club, number][]) {
    const squad = eligible(w, club, cat).slice(0, 11);
    // Quem joga a base evolui como quem joga (e a moral sobe com os gols).
    for (const p of squad) p.played = true;
    const scored = new Map<string, number>();
    for (let g = 0; g < goals; g++) {
      // Quem já marcou no jogo (e quem já tem muitos gols no campeonato) perde peso: artilharia realista.
      const weights = squad.map((p) => (SHOOT[p.pos] ?? 1) * Math.pow(p.ovr / 60, 1.5) * Math.pow(0.45, scored.get(p.id) ?? 0) / (1 + (lg.scorers[p.id]?.goals ?? 0) / 12));
      // As vagas completadas por garotos anônimos (sem cadastro) também marcam, sem entrar na artilharia.
      const fillers = (11 - squad.length) * 1;
      let r = Math.random() * (weights.reduce((s, x) => s + x, 0) + fillers);
      let pick: Player | null = null;
      for (let i = 0; i < squad.length; i++) { r -= weights[i]; if (r <= 0) { pick = squad[i]; break; } }
      if (!pick) continue;
      const row = (lg.scorers[pick.id] ??= { name: pick.name, club: club.id, goals: 0 });
      row.goals++;
      scored.set(pick.id, (scored.get(pick.id) ?? 0) + 1);
      pick.morale = clamp(pick.morale + 1, 10, 100);
    }
  }
  return [hs, as];
}

function record(lg: YouthLeague, h: string, a: string, hs: number, as: number): void {
  const rh = lg.table.find((r) => r.id === h), ra = lg.table.find((r) => r.id === a);
  if (!rh || !ra) return;
  rh.j++; ra.j++; rh.gf += hs; rh.ga += as; ra.gf += as; ra.ga += hs;
  if (hs > as) { rh.v++; ra.d++; rh.p += 3; } else if (hs < as) { ra.v++; rh.d++; ra.p += 3; } else { rh.e++; ra.e++; rh.p++; ra.p++; }
}

/** Classificação ordenada de uma categoria. */
export const youthTable = (lg: YouthLeague): YouthRow[] =>
  lg.table.slice().sort((x, y) => y.p - x.p || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.id.localeCompare(y.id));

/** Artilharia de uma categoria. */
export const youthScorers = (lg: YouthLeague, n = 10) =>
  Object.entries(lg.scorers).map(([pid, s]) => ({ pid, ...s })).sort((a, b) => b.goals - a.goals).slice(0, n);

/**
 * Uma rodada de base nas rodadas ímpares de liga; na última rodada de liga, a final entre os dois primeiros
 * (campo neutro, pênaltis no empate). Chamado em simulateWeek nas semanas de liga.
 */
export function playYouthRound(w: World, leagueRound: number, lastRound: number): void {
  const yl = w.youthLeagues;
  if (!yl || w.playerCareer || yl.season !== w.season) return;
  const u = user(w);
  for (const cat of YOUTH_CATS) {
    const lg = yl.cats[cat];
    if (lg.champion) continue;
    const playRound = () => {
      const res: [string, string, number, number][] = [];
      for (const [h, a] of lg.rounds[lg.round]) { const [hs, as] = play(w, lg, cat, h, a, false); record(lg, h, a, hs, as); res.push([h, a, hs, as]); }
      lg.results.push(res);
      lg.round++;
    };
    if (leagueRound < lastRound) {
      if (lg.round < lg.rounds.length && leagueRound % 2 === 1) playRound();
      continue;
    }
    // Na última rodada de liga: completa o que faltar (saves migrados no meio da temporada) e joga a final.
    while (lg.round < lg.rounds.length) playRound();
    const [first, second] = youthTable(lg);
    if (!first || !second) continue;
    const [hs, as] = play(w, lg, cat, first.id, second.id, true);
    let pens: [number, number] | null = null;
    if (hs === as) { const a = 3 + Math.floor(Math.random() * 3); pens = Math.random() < 0.5 ? [a, a - 1] : [a - 1, a]; }
    const champ = hs > as || (pens && pens[0] > pens[1]) ? first.id : second.id;
    lg.final = { h: first.id, a: second.id, hs, as, pens };
    lg.champion = champ;
    const top = youthScorers(lg, 1)[0];
    const mine = champ === u.id;
    const finalist = first.id === u.id || second.id === u.id;
    if (mine || finalist) {
      pushMessage(w, {
        kind: mine ? 'trophy' : 'youth',
        title: mine ? `Campeões do ${YOUTH_NAMES[cat]}!` : `Vice no ${YOUTH_NAMES[cat]}`,
        body: `Final do ${YOUTH_NAMES[cat]}: ${w.clubs[first.id].name} ${hs} x ${as} ${w.clubs[second.id].name}${pens ? ` (pênaltis ${pens[0]} x ${pens[1]})` : ''}.${top ? ` Artilheiro: ${top.name} (${top.goals} gols).` : ''}`,
      });
    }
    if (mine) {
      w.board.conf = clamp(w.board.conf + 3, 0, 100);
      u.trophies.push({ season: w.season, comp: `${YOUTH_NAMES[cat]} (base)` });
      (w.ceremonies ??= []).push({ kind: 'title', comp: `youth:${cat}`, season: w.season, club: u.id });
    }
  }
}

/** Semana da convocação das seleções de base (metade da temporada). */
export const callupWeek = (w: World): number => Math.round(seasonWeeks(w) / 2);

/**
 * Convocação das seleções Sub-17 e Sub-20 de todos os países (os 20 melhores de cada idade). Os garotos do usuário
 * ganham moral, às vezes um ponto de potencial, e uma cerimônia de convocação.
 */
export function youthCallups(w: World): YouthCallup | null {
  if (w.playerCareer || w.youthCallups?.some((c) => c.season === w.season)) return null;
  const u = user(w);
  const out: YouthCallup = { season: w.season, sub17: {}, sub20: {} };
  const pool = Object.values(w.players).filter((p) => p.clubId && p.age <= 20);
  for (const cat of YOUTH_CATS) {
    const byNat = new Map<string, Player[]>();
    for (const p of pool) if (p.age <= MAX_AGE[cat] && (cat === 'sub17' || p.age > 17)) byNat.set(p.nat, [...(byNat.get(p.nat) ?? []), p]);
    for (const [nat, ps] of byNat) out[cat][nat] = ps.sort((a, b) => b.ovr + b.pot / 4 - (a.ovr + a.pot / 4)).slice(0, 20).map((p) => p.id);
  }
  (w.youthCallups ??= []).push(out);
  if (w.youthCallups.length > 6) w.youthCallups.shift();
  const mine = YOUTH_CATS.flatMap((cat) => Object.values(out[cat]).flat().filter((id) => w.players[id]?.clubId === u.id).map((id) => ({ id, cat })));
  for (const { id } of mine) {
    const p = w.players[id];
    p.morale = clamp(p.morale + 6, 10, 100);
    p.ycalls = (p.ycalls ?? 0) + 1;
    if (p.pot < 95 && Math.random() < 0.4) p.pot = Math.min(99, p.pot + 1);
  }
  if (mine.length) {
    pushMessage(w, {
      kind: 'youth',
      pid: mine[0].id,
      title: `${mine.length} promessa${mine.length > 1 ? 's' : ''} convocada${mine.length > 1 ? 's' : ''} para a seleção de base`,
      body: mine.map(({ id, cat }) => `${w.players[id].name} (${w.players[id].age} anos): seleção ${YOUTH_NAMES[cat]} de ${LEAGUES[w.players[id].nat]?.country ?? '—'}`).join('\n'),
    });
    (w.ceremonies ??= []).push({ kind: 'callup', season: w.season, ids: mine.map((x) => x.id), cats: mine.map((x) => x.cat) });
  }
  return out;
}

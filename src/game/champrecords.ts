// Recordes do campeonato (v12): maiores artilheiros da história de cada divisão da liga do usuário, recorde de gols
// numa temporada, maior goleada, mais pontos, mais gols de um time e mais títulos. O passado é inventado na primeira
// vez (lendas e títulos pela reputação), para os recordes terem peso; quando um cai na divisão do usuário, sai aviso.
import { makeName } from './gen';
import { DIVISIONS, divisionName, LEAGUES } from './leagues';
import type { ChampRecordKey, DivisionId, DivRecords, Match, RecordBreak, RecordMark, TableRow, Week, World } from './types';
import { pick } from './util';
import { pushMessage, user } from './world';

export const RECORD_NAMES: Record<ChampRecordKey, string> = {
  allTime: 'Maior artilheiro da história',
  seasonGoals: 'Mais gols numa temporada',
  biggestWin: 'Maior goleada',
  points: 'Mais pontos numa temporada',
  teamGoals: 'Mais gols de um time numa temporada',
  titles: 'Maior campeão',
};

const randInt = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));

/** Peso de uma goleada: saldo primeiro, gols depois. */
const winScore = (hs: number, as: number): number => Math.abs(hs - as) * 100 + hs + as;

function seed(w: World, div: DivisionId): DivRecords {
  const info = DIVISIONS[div];
  const lv = info.level;
  const lg = info.league;
  const clubs = Object.values(w.clubs).filter((c) => c.div === div).sort((a, b) => b.rep - a.rep);
  const big = clubs.slice(0, Math.max(1, Math.ceil(clubs.length / 3)));
  const past = (n: number) => w.season - randInt(3, 60) - n;
  const legend = () => makeName(lg);
  const clubName = () => (pick(big) ?? clubs[0])?.id ?? '';
  // Lendas da artilharia (em ordem decrescente).
  const allTime: DivRecords['allTime'] = {};
  let g = Math.round((lv === 1 ? 230 : 150 - lv * 15) * (0.85 + Math.random() * 0.3));
  for (let i = 0; i < 8; i++) {
    allTime[`leg:${div}:${i}`] = { name: legend(), club: clubName(), goals: g };
    g = Math.round(g * (0.86 + Math.random() * 0.08));
  }
  // Títulos pela reputação (os grandes de hoje são os maiores campeões).
  const titles: Record<string, number> = {};
  for (const c of clubs) {
    const t = Math.round(Math.pow(Math.max(0, (c.rep - 50) / 40), 1.5) * (lv === 1 ? 28 : 8) * (0.6 + Math.random() * 0.6));
    if (t > 0) titles[c.id] = t;
  }
  const mark = (value: number, score?: string): RecordMark => ({ value, name: score ? '' : legend(), club: clubName(), season: past(0), score });
  const margin = randInt(7, 8), lose = randInt(0, 1);
  const bw = mark(winScore(margin + lose, lose), `${margin + lose} x ${lose}`);
  bw.name = w.clubs[bw.club]?.name ?? '';
  const pts = mark(randInt(88, 95));
  pts.name = w.clubs[pts.club]?.name ?? '';
  const tg = mark(randInt(96, 106));
  tg.name = w.clubs[tg.club]?.name ?? '';
  return {
    allTime, titles,
    seasonGoals: mark(randInt(35, 40)),
    biggestWin: bw,
    points: pts,
    teamGoals: tg,
    cur: {}, curSeason: w.season, live: {},
  };
}

/** Recordes de uma divisão (criados na primeira vez, com o passado inventado). */
export function champRecords(w: World, div: DivisionId): DivRecords {
  const all = (w.champRecords ??= {});
  return (all[div] ??= seed(w, div));
}

/** Cria os recordes das divisões acompanhadas (início de temporada e migração). */
export function ensureRecords(w: World): void {
  if (!w.clubs[w.userClub]) return;
  for (const div of tracked(w)) champRecords(w, div);
}

/** Maiores artilheiros da história da divisão (encerradas + temporada atual). */
export function allTimeScorers(w: World, div: DivisionId, n = 10): { key: string; name: string; club: string; goals: number; active: boolean }[] {
  const r = champRecords(w, div);
  const map = new Map<string, { key: string; name: string; club: string; goals: number; active: boolean }>();
  for (const [k, v] of Object.entries(r.allTime)) map.set(k, { key: k, ...v, active: !k.startsWith('leg:') && !!w.players[k]?.clubId });
  if (r.curSeason === w.season) {
    for (const [pid, goals] of Object.entries(r.cur)) {
      const p = w.players[pid];
      const prev = map.get(pid);
      map.set(pid, { key: pid, name: p?.name ?? prev?.name ?? '?', club: p?.clubId ?? prev?.club ?? '', goals: (prev?.goals ?? 0) + goals, active: !!p?.clubId });
    }
  }
  return [...map.values()].sort((a, b) => b.goals - a.goals).slice(0, n);
}

/** Maiores campeões da divisão. */
export const titleRanking = (w: World, div: DivisionId, n = 8): { club: string; titles: number }[] =>
  Object.entries(champRecords(w, div).titles).map(([club, titles]) => ({ club, titles })).sort((a, b) => b.titles - a.titles).slice(0, n);

/** Divisões com recordes acompanhados: as da liga do usuário. */
const tracked = (w: World): DivisionId[] => LEAGUES[user(w).league].divisions;

function broke(w: World, div: DivisionId, key: ChampRecordKey, old: RecordMark | null, now: RecordMark, text: string): void {
  const r = champRecords(w, div);
  r.live[key] = true;
  if (div !== user(w).div) return;
  const ev: RecordBreak = { id: `${w.season}-${w.week}-${div}-${key}`, season: w.season, week: w.week, div, key, title: RECORD_NAMES[key], text, old, now };
  const list = (w.recordBreaks ??= []);
  if (list.some((x) => x.id === ev.id)) return;
  list.push(ev);
  if (list.length > 12) list.shift();
  pushMessage(w, { kind: 'news', title: `Recorde quebrado: ${RECORD_NAMES[key].toLowerCase()}`, body: `${text} (${divisionName(div)}).`, pid: now.pid });
  if (!w.playerCareer) {
    (w.ceremonies ??= []).push({ kind: 'record', id: ev.id });
    if (w.ceremonies.length > 8) w.ceremonies.splice(0, w.ceremonies.length - 8);
  }
}

/** Recorde quebrado pelo id (para a cerimônia). */
export const recordBreak = (w: World, id: string): RecordBreak | undefined => w.recordBreaks?.find((x) => x.id === id);

/** Depois de uma semana de liga: gols da temporada, maior goleada e marcas que caem durante o campeonato. */
export function recordsWeek(w: World, wk: Week, tables: (div: DivisionId) => TableRow[]): void {
  if (wk.type !== 'league') return;
  for (const div of tracked(w)) {
    const r = champRecords(w, div);
    if (r.curSeason !== w.season) { r.cur = {}; r.curSeason = w.season; r.live = {}; }
    const ms = wk.matches.filter((m: Match) => m.comp === div && m.played);
    if (!ms.length) continue;
    // A maior goleada da rodada (se houver duas acima do recorde, vale só a maior: um aviso por rodada).
    let rout: Match | null = null;
    for (const m of ms) {
      for (const [pid] of m.goals ?? []) r.cur[pid] = (r.cur[pid] ?? 0) + 1;
      const hs = m.hs ?? 0, as = m.as ?? 0;
      if (hs !== as && winScore(hs, as) > (rout ? winScore(rout.hs ?? 0, rout.as ?? 0) : r.biggestWin.value)) rout = m;
    }
    if (rout) {
      const hs = rout.hs ?? 0, as = rout.as ?? 0;
      const win = hs > as ? rout.h : rout.a, lose = hs > as ? rout.a : rout.h;
      const old = { ...r.biggestWin };
      const score = `${Math.max(hs, as)} x ${Math.min(hs, as)}`;
      r.biggestWin = { value: winScore(hs, as), name: w.clubs[win]?.name ?? '', club: win, season: w.season, score: `${score} no ${w.clubs[lose]?.name ?? ''}` };
      broke(w, div, 'biggestWin', old, r.biggestWin, `${w.clubs[win]?.name} fez ${score} no ${w.clubs[lose]?.name}: a maior goleada da história do campeonato (antes: ${(old.score ?? '').split(' no ')[0]})`);
    }
    // Artilheiro da temporada
    let best = '', bestG = 0;
    for (const [pid, g] of Object.entries(r.cur)) if (g > bestG) { best = pid; bestG = g; }
    const bp = w.players[best];
    if (bp && bestG > r.seasonGoals.value) {
      const old = { ...r.seasonGoals };
      r.seasonGoals = { value: bestG, name: bp.name, club: bp.clubId ?? '', season: w.season, pid: bp.id };
      if (!r.live.seasonGoals) broke(w, div, 'seasonGoals', old, r.seasonGoals, `${bp.name} chegou a ${bestG} gols e passou ${old.name} (${old.value} gols em ${old.season}): ninguém marcou tanto numa temporada`);
    }
    // Maior artilheiro da história
    const top = allTimeScorers(w, div, 2);
    const leader = top[0];
    if (leader && !leader.key.startsWith('leg:') && r.cur[leader.key] && top[1] && leader.goals > top[1].goals && leader.goals - r.cur[leader.key] <= top[1].goals && !r.live.allTime) {
      const p = w.players[leader.key];
      broke(w, div, 'allTime', { value: top[1].goals, name: top[1].name, club: top[1].club, season: w.season }, { value: leader.goals, name: leader.name, club: leader.club, season: w.season, pid: leader.key },
        `${p?.name ?? leader.name} chegou a ${leader.goals} gols e passou ${top[1].name} (${top[1].goals}): é o maior artilheiro da história do campeonato`);
    }
    // Pontos e gols de um time
    const t = tables(div);
    const lead = t.slice().sort((a, b) => b.p - a.p)[0], scorer = t.slice().sort((a, b) => b.gf - a.gf)[0];
    if (lead && lead.p > r.points.value) {
      const old = { ...r.points };
      r.points = { value: lead.p, name: w.clubs[lead.id]?.name ?? '', club: lead.id, season: w.season };
      if (!r.live.points) broke(w, div, 'points', old, r.points, `O ${w.clubs[lead.id]?.name} chegou a ${lead.p} pontos e passou o ${old.name} (${old.value} em ${old.season})`);
    }
    if (scorer && scorer.gf > r.teamGoals.value) {
      const old = { ...r.teamGoals };
      r.teamGoals = { value: scorer.gf, name: w.clubs[scorer.id]?.name ?? '', club: scorer.id, season: w.season };
      if (!r.live.teamGoals) broke(w, div, 'teamGoals', old, r.teamGoals, `O ${w.clubs[scorer.id]?.name} chegou a ${scorer.gf} gols no campeonato, mais que o ${old.name} (${old.value} em ${old.season})`);
    }
  }
}

/** Fim da temporada: títulos e gols da temporada entram na história. */
export function recordsSeasonEnd(w: World, champions: Partial<Record<DivisionId, string>>): void {
  for (const div of tracked(w)) {
    const r = champRecords(w, div);
    const champ = champions[div];
    if (champ) {
      const before = titleRanking(w, div, 1)[0];
      r.titles[champ] = (r.titles[champ] ?? 0) + 1;
      if (before && before.club !== champ && r.titles[champ] > before.titles) {
        const c = w.clubs[champ];
        broke(w, div, 'titles', { value: before.titles, name: w.clubs[before.club]?.name ?? '', club: before.club, season: w.season },
          { value: r.titles[champ], name: c?.name ?? '', club: champ, season: w.season }, `O ${c?.name} conquistou o ${r.titles[champ]}º título e virou o maior campeão da história`);
      }
    }
    if (r.curSeason === w.season) {
      for (const [pid, g] of Object.entries(r.cur)) {
        const p = w.players[pid];
        const prev = r.allTime[pid];
        r.allTime[pid] = { name: p?.name ?? prev?.name ?? '?', club: p?.clubId ?? prev?.club ?? '', goals: (prev?.goals ?? 0) + g };
      }
      r.allTime = Object.fromEntries(Object.entries(r.allTime).sort((a, b) => b[1].goals - a[1].goals).slice(0, 30));
      r.cur = {};
      r.curSeason = w.season + 1;
      r.live = {};
    }
  }
}

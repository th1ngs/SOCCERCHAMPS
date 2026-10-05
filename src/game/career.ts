// Carreira (v6): histórico de cada jogador, recordes e conquistas do treinador e lendas do clube.
import { competitionName, divisionLevel } from './leagues';
import type {
  Achievement, AchievementKey, HistRow, Legend, Match, Player, Records, SeasonSummary, TransferRecord, World,
} from './types';
import { formatMoney } from './util';
import { isDerby, pushMessage, user } from './world';

/** Temporadas guardadas no histórico de cada jogador. */
export const HIST_MAX = 12;
/** Lendas guardadas no save. */
const LEGENDS_MAX = 60;

export const ACHIEVEMENTS: Record<AchievementKey, { name: string; desc: string }> = {
  primeira_vitoria: { name: 'Primeira vitória', desc: 'Vença a primeira partida no comando.' },
  goleada: { name: 'Goleada', desc: 'Vença por 4 ou mais gols de diferença.' },
  classico: { name: 'Dono do clássico', desc: 'Vença um clássico contra o rival.' },
  sequencia5: { name: 'Embalado', desc: 'Vença 5 jogos seguidos.' },
  invicto10: { name: 'Invicto', desc: 'Fique 10 jogos sem perder.' },
  titulo: { name: 'Primeira taça', desc: 'Conquiste qualquer título.' },
  liga: { name: 'Campeão nacional', desc: 'Ganhe a primeira divisão do seu país.' },
  acesso: { name: 'Acesso!', desc: 'Suba de divisão.' },
  copa: { name: 'Rei de copas', desc: 'Ganhe a Copa Nacional.' },
  continental: { name: 'Campeão dos campeões', desc: 'Ganhe a Liga dos Campeões ou a Libertadores.' },
  triplice: { name: 'Tríplice coroa', desc: 'Liga, copa nacional e Liga dos Campeões (ou Libertadores) na mesma temporada.' },
  venda50: { name: 'Negociante', desc: 'Venda um jogador por R$ 50 mi ou mais.' },
  contratacao30: { name: 'Contratação de peso', desc: 'Contrate um jogador por R$ 30 mi ou mais.' },
  cria: { name: 'Cria da casa', desc: 'Um jogador revelado na sua base chega a 75 de overall.' },
  artilheiro: { name: 'Artilheiro da casa', desc: 'Tenha o artilheiro da sua divisão.' },
  caixa100: { name: 'Cofre cheio', desc: 'Chegue a R$ 100 mi em caixa.' },
  meta3: { name: 'Homem de confiança', desc: 'Cumpra a meta da diretoria 3 temporadas seguidas.' },
  veterano: { name: 'Veterano', desc: 'Complete 5 temporadas como treinador.' },
  nacoes: { name: 'Orgulho nacional', desc: 'Tenha um jogador campeão da Copa do Mundo.' },
};
export const ACHIEVEMENT_KEYS = Object.keys(ACHIEVEMENTS) as AchievementKey[];

export const emptyRecords = (): Records => ({
  biggestWin: null,
  worstLoss: null,
  biggestSale: null,
  biggestBuy: null,
  topScorer: null,
  unbeaten: { current: 0, best: 0 },
  wins: { current: 0, best: 0 },
  matches: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 },
  titles: [],
});

const recs = (w: World): Records => (w.records ||= emptyRecords());

export const hasAchievement = (w: World, key: AchievementKey): boolean => !!w.achievements?.some((a) => a.key === key);

/** Desbloqueia uma conquista (uma vez) e avisa o usuário. */
export function unlock(w: World, key: AchievementKey): boolean {
  if (hasAchievement(w, key)) return false;
  (w.achievements ||= []).push({ key, season: w.season, week: w.week } satisfies Achievement);
  const a = ACHIEVEMENTS[key];
  pushMessage(w, { kind: 'trophy', title: `Conquista desbloqueada: ${a.name}`, body: `${a.desc} Veja todas em Carreira.` });
  return true;
}

// ---------- Histórico dos jogadores ----------
/** Grava a temporada no histórico de quem entrou em campo (fim da temporada). */
export function recordSeasonHistory(w: World, titles: Record<string, string[]>): void {
  for (const p of Object.values(w.players)) {
    if (!p.clubId || p.s.apps <= 0) continue;
    const t = p.s.apps >= 3 ? titles[p.clubId] : undefined;
    const row: HistRow = [w.season, p.clubId, p.s.apps, p.s.goals, p.s.assists, Math.round((p.s.rsum / p.s.apps) * 100)];
    if (t?.length) row.push(t.slice());
    (p.hist ||= []).push(row);
    if (p.hist.length > HIST_MAX) p.hist.splice(0, p.hist.length - HIST_MAX);
  }
}

/** Acrescenta um título à linha da temporada `season` (cria a linha se preciso). */
export function addTitle(p: Player, season: number, clubId: string, title: string): void {
  const rows = (p.hist ||= []);
  let row = rows.find((r) => r[0] === season);
  if (!row) {
    row = [season, clubId, 0, 0, 0, 0];
    rows.push(row);
    rows.sort((a, b) => a[0] - b[0]);
  }
  (row[6] ||= []).push(title);
}

export interface CareerRow {
  season: number;
  club: string;
  apps: number;
  goals: number;
  assists: number;
  rating: number | null;
  titles: string[];
  current: boolean;
}

/** Carreira do jogador: temporadas passadas e a atual (em andamento), da mais recente para a mais antiga. */
export function playerCareer(w: World, p: Player): CareerRow[] {
  const rows: CareerRow[] = (p.hist ?? []).map((r) => ({
    season: r[0], club: r[1], apps: r[2], goals: r[3], assists: r[4], rating: r[5] ? r[5] / 100 : null, titles: r[6] ?? [], current: false,
  }));
  // Temporada em andamento (ainda não gravada no histórico).
  if (p.clubId && !rows.some((r) => r.season === w.season)) {
    rows.push({ season: w.season, club: p.clubId, apps: p.s.apps, goals: p.s.goals, assists: p.s.assists, rating: p.s.apps ? p.s.rsum / p.s.apps : null, titles: [], current: true });
  }
  return rows.sort((a, b) => b.season - a.season);
}

/** Totais da carreira do jogador (temporadas guardadas + a atual). */
export function careerTotals(w: World, p: Player): { apps: number; goals: number; assists: number; titles: number } {
  const t = { apps: p.c.apps, goals: p.c.goals, assists: p.c.assists, titles: 0 };
  for (const r of p.hist ?? []) t.titles += r[6]?.length ?? 0;
  return t;
}

/** Jogos e gols do jogador por um clube (histórico + temporada atual). */
export function clubTotals(p: Player, clubId: string, season: number): { apps: number; goals: number; from: number; to: number } {
  let apps = 0, goals = 0, from = Infinity, to = 0;
  for (const r of p.hist ?? []) {
    if (r[1] !== clubId) continue;
    apps += r[2]; goals += r[3]; from = Math.min(from, r[0]); to = Math.max(to, r[0]);
  }
  if (p.clubId === clubId && p.s.apps) { apps += p.s.apps; goals += p.s.goals; from = Math.min(from, season); to = Math.max(to, season); }
  return { apps, goals, from: from === Infinity ? season : from, to: to || season };
}

/** Na aposentadoria: quem marcou época no clube do usuário vira lenda. */
export function rememberLegend(w: World, p: Player): void {
  const t = clubTotals(p, w.userClub, w.season);
  if (t.apps < 60 && t.goals < 25) return;
  const legends = (w.legends ||= []);
  legends.push({ club: w.userClub, name: p.name, pos: p.pos, apps: t.apps, goals: t.goals, from: t.from, to: t.to } satisfies Legend);
  if (legends.length > LEGENDS_MAX) legends.sort((a, b) => b.apps - a.apps).splice(LEGENDS_MAX);
}

export interface Idol {
  name: string;
  pos: string;
  apps: number;
  goals: number;
  from: number;
  to: number;
  pid: string | null;
  active: boolean;
}

/** Ídolos de um clube: lendas aposentadas e jogadores (de qualquer clube hoje) com mais jogos por ele. */
export function clubIdols(w: World, clubId: string, n = 10): Idol[] {
  const out: Idol[] = (w.legends ?? []).filter((l) => l.club === clubId).map((l) => ({ ...l, pid: null, active: false }));
  for (const p of Object.values(w.players)) {
    if (!p.hist?.some((r) => r[1] === clubId) && p.clubId !== clubId) continue;
    const t = clubTotals(p, clubId, w.season);
    if (t.apps < 10) continue;
    out.push({ name: p.name, pos: p.pos, apps: t.apps, goals: t.goals, from: t.from, to: t.to, pid: p.id, active: true });
  }
  return out.sort((a, b) => b.apps - a.apps || b.goals - a.goals).slice(0, n);
}

// ---------- Recordes e conquistas ----------
/** Atualiza recordes e conquistas depois de um jogo do usuário. */
export function onUserMatch(w: World, m: Match): void {
  const u = user(w);
  if (m.h !== u.id && m.a !== u.id) return;
  const r = recs(w);
  const home = m.h === u.id;
  const gf = (home ? m.hs : m.as) ?? 0, ga = (home ? m.as : m.hs) ?? 0;
  const pensWon = m.pens ? (home ? m.pens[0] > m.pens[1] : m.pens[1] > m.pens[0]) : null;
  const won = gf > ga || (gf === ga && pensWon === true);
  const lost = gf < ga || (gf === ga && pensWon === false);
  const opp = home ? m.a : m.h;
  const rec = { season: w.season, opp, gf, ga, comp: competitionName(m.comp) };
  r.matches.played++; r.matches.gf += gf; r.matches.ga += ga;
  if (won) r.matches.won++; else if (lost) r.matches.lost++; else r.matches.drawn++;
  if (gf > ga && (!r.biggestWin || gf - ga > r.biggestWin.gf - r.biggestWin.ga || (gf - ga === r.biggestWin.gf - r.biggestWin.ga && gf > r.biggestWin.gf))) r.biggestWin = rec;
  if (gf < ga && (!r.worstLoss || ga - gf > r.worstLoss.ga - r.worstLoss.gf)) r.worstLoss = rec;
  r.wins.current = won ? r.wins.current + 1 : 0;
  r.wins.best = Math.max(r.wins.best, r.wins.current);
  r.unbeaten.current = lost ? 0 : r.unbeaten.current + 1;
  r.unbeaten.best = Math.max(r.unbeaten.best, r.unbeaten.current);
  if (won) unlock(w, 'primeira_vitoria');
  if (gf - ga >= 4) unlock(w, 'goleada');
  if (won && isDerby(w, m)) unlock(w, 'classico');
  if (r.wins.current >= 5) unlock(w, 'sequencia5');
  if (r.unbeaten.current >= 10) unlock(w, 'invicto10');
}

/** Maiores venda e compra da carreira. */
export function onTransfer(w: World, t: Omit<TransferRecord, 'season' | 'week' | 'user'>): void {
  if (!t.fee) return;
  const r = recs(w);
  if (t.from === w.userClub) {
    if (!r.biggestSale || t.fee > r.biggestSale.fee) r.biggestSale = { season: w.season, name: t.name, club: t.to, fee: t.fee };
    if (t.fee >= 50e6) unlock(w, 'venda50');
  } else if (t.to === w.userClub) {
    if (!r.biggestBuy || t.fee > r.biggestBuy.fee) r.biggestBuy = { season: w.season, name: t.name, club: t.from, fee: t.fee };
    if (t.fee >= 30e6) unlock(w, 'contratacao30');
  }
}

/** Checagens semanais baratas (caixa e crias da base). */
export function weeklyAchievements(w: World): void {
  const u = user(w);
  if (u.money >= 100e6) unlock(w, 'caixa100');
  if (!hasAchievement(w, 'cria') && u.squad.some((id) => { const p = w.players[id]; return p && p.cria === u.id && p.ovr >= 75; })) unlock(w, 'cria');
}

/** Fim de temporada: títulos, artilheiro, acesso, metas e tempo de casa. */
export function seasonAchievements(w: World, ps: SeasonSummary, titles: Record<string, string[]>): void {
  const u = user(w);
  const r = recs(w);
  const mine = titles[u.id] ?? [];
  for (const comp of mine) r.titles.push({ season: w.season, comp, club: u.id });
  // Artilheiro do elenco na temporada.
  let best: Player | null = null;
  for (const id of u.squad) { const p = w.players[id]; if (p && (!best || p.s.goals > best.s.goals)) best = p; }
  if (best && best.s.goals > 0 && (!r.topScorer || best.s.goals > r.topScorer.goals)) r.topScorer = { season: w.season, name: best.name, goals: best.s.goals };
  if (mine.length) unlock(w, 'titulo');
  const league = ps.entry.champions[u.div] === u.id && divisionLevel(u.div) === 1;
  const cup = Object.entries(ps.entry.cups).some(([k, v]) => k.startsWith('cup:') && v === u.id);
  const cont = ps.entry.cups.cont === u.id || ps.entry.cups.lib === u.id;
  if (league) unlock(w, 'liga');
  if (cup) unlock(w, 'copa');
  if (cont) unlock(w, 'continental');
  if (league && cup && cont) unlock(w, 'triplice');
  if (ps.promoted.includes(u.id)) unlock(w, 'acesso');
  const top = ps.scorers[u.div];
  if (top && w.players && u.squad.some((id) => w.players[id]?.name === top.name)) unlock(w, 'artilheiro');
  const mineHist = w.history.slice(-3);
  if (mineHist.length === 3 && mineHist.every((h) => h.user.success)) unlock(w, 'meta3');
  if (w.history.length >= 5) unlock(w, 'veterano');
}

/** Títulos por clube na temporada (divisões, copas nacionais e Copa dos Campeões). */
export function seasonTitles(ps: SeasonSummary): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const add = (club: string | null | undefined, comp: string) => { if (club) (out[club] ||= []).push(competitionName(comp)); };
  for (const [div, club] of Object.entries(ps.entry.champions)) add(club, div);
  for (const [comp, club] of Object.entries(ps.entry.cups)) add(club, comp);
  return out;
}

/** Texto curto de um recorde de partida ("5 x 0 no Fulano FC, Série A 2027"). */
export function matchRecordText(w: World, r: { gf: number; ga: number; opp: string; comp: string; season: number }): string {
  return `${r.gf} x ${r.ga} contra o ${w.clubs[r.opp]?.name ?? 'adversário'} (${r.comp}, ${r.season})`;
}

export const dealText = (w: World, d: { name: string; fee: number; club: string | null; season: number }, to: boolean): string =>
  `${d.name} por ${formatMoney(d.fee)} ${to ? 'ao' : 'do'} ${d.club ? w.clubs[d.club]?.name ?? '?' : 'mercado livre'} (${d.season})`;

// Premiações e cerimônias (v11): Jogador e Técnico do Mês da divisão do usuário, prêmios do campeonato no fim
// da temporada (Noite de Gala, com os prêmios globais) e comemorações de título. As telas consomem a fila
// `w.ceremonies` (uma por vez) e a gala de `SeasonSummary.gala`.
import { coachName } from './awards';
import { competitionName, divisionName, isDivision } from './leagues';
import type { Ceremony, DivisionId, Gala, GalaCategory, GalaNominee, MonthAward, Player, Position, SeasonAwards, TableRow, World } from './types';
import { calendarDate, pushMessage, user } from './world';

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const avg = (p: Player): number => (p.s.apps ? p.s.rsum / p.s.apps : 0);
const r2 = (v: number): number => Math.round(v * 100) / 100;

/** "Março de 2027". */
export const monthLabel = (a: { month: number; year?: number }): string => `${MONTHS[a.month]}${a.year ? ` de ${a.year}` : ''}`;

/** Mês do calendário de uma semana (0-11). */
export const monthOf = (w: World, week: number): number => calendarDate(w.season, Math.max(1, week), 0).getUTCMonth();

/** Começa a contagem do mês: fotografia das estatísticas de quem joga na divisão do usuário. */
export function startMonth(w: World): void {
  if (w.playerCareer && !w.userClub) return;
  const div = user(w).div;
  const snap: Record<string, [number, number, number, number]> = {};
  for (const c of Object.values(w.clubs)) {
    if (c.div !== div) continue;
    for (const id of c.squad) { const p = w.players[id]; if (p) snap[id] = [p.s.apps, p.s.goals, p.s.assists, p.s.rsum]; }
  }
  w.month = { div, month: monthOf(w, w.week), fromWeek: Math.max(1, w.week), snap };
}

/** Pontos de cada clube da divisão nos jogos de liga entre as semanas `from` e `to`. */
function monthPoints(w: World, div: DivisionId, from: number, to: number): Map<string, { pts: number; j: number; gf: number; ga: number }> {
  const out = new Map<string, { pts: number; j: number; gf: number; ga: number }>();
  for (let i = from; i <= to; i++) {
    const wk = w.weeks[i];
    if (!wk || wk.type !== 'league') continue;
    for (const m of wk.matches) {
      if (!m.played || m.comp !== div) continue;
      for (const [id, gf, ga] of [[m.h, m.hs!, m.as!], [m.a, m.as!, m.hs!]] as [string, number, number][]) {
        const r = out.get(id) ?? { pts: 0, j: 0, gf: 0, ga: 0 };
        r.j++; r.gf += gf; r.ga += ga; r.pts += gf > ga ? 3 : gf === ga ? 1 : 0;
        out.set(id, r);
      }
    }
  }
  return out;
}

/**
 * Fecha o mês (chamado no fim de semana, já com a semana nova): se o calendário virou de mês, escolhe o
 * Jogador do Mês e o Técnico do Mês da divisão do usuário e abre a cerimônia. Devolve o prêmio ou null.
 */
export function closeMonth(w: World, force = false): MonthAward | null {
  const cur = w.month;
  if (!cur) { startMonth(w); return null; }
  if (!force && monthOf(w, w.week) === cur.month) return null;
  const award = monthAward(w, cur.div, cur.month, cur.fromWeek, w.week - 1, cur.snap);
  startMonth(w);
  if (!award) return null;
  (w.monthAwards ??= []).push(award);
  if (w.monthAwards.length > 60) w.monthAwards.splice(0, w.monthAwards.length - 60);
  queue(w, { kind: 'month', id: award.id });
  const mine = award.player.club === w.userClub;
  const coach = award.manager?.club === w.userClub;
  pushMessage(w, {
    kind: 'award',
    pid: award.player.id,
    title: `Prêmios de ${monthLabel(award)} (${divisionName(award.div)})`,
    body: [
      `Jogador do mês: ${award.player.name} (${w.clubs[award.player.club]?.name ?? '—'}), ${award.player.goals} gol(s), ${award.player.assists} assistência(s) e nota ${award.player.avg.toFixed(2)} em ${award.player.apps} jogo(s).`,
      award.manager ? `Técnico do mês: ${award.manager.name} (${w.clubs[award.manager.club]?.name ?? '—'}), ${award.manager.pts} pontos em ${award.manager.j} jogos.` : '',
      mine ? 'O prêmio de jogador do mês é do seu elenco!' : '',
      coach ? 'E o técnico do mês é você!' : '',
    ].filter(Boolean).join('\n'),
  });
  return award;
}

function monthAward(w: World, div: DivisionId, month: number, from: number, to: number, snap: Record<string, [number, number, number, number]>): MonthAward | null {
  const rows: { p: Player; apps: number; goals: number; assists: number; avg: number; score: number }[] = [];
  for (const [pid, [a0, g0, as0, r0]] of Object.entries(snap)) {
    const p = w.players[pid];
    if (!p || !p.clubId || w.clubs[p.clubId]?.div !== div) continue;
    const apps = p.s.apps - a0;
    if (apps < 2) continue;
    const goals = p.s.goals - g0, assists = p.s.assists - as0;
    const a = (p.s.rsum - r0) / apps;
    rows.push({ p, apps, goals, assists, avg: a, score: (a - 6) * 4 + goals * 1.4 + assists * 0.9 + apps * 0.15 });
  }
  if (!rows.length) return null;
  rows.sort((x, y) => y.score - x.score || y.goals - x.goals);
  const pick = (x: (typeof rows)[number]) => ({ id: x.p.id, name: x.p.name, club: x.p.clubId!, pos: x.p.pos, age: x.p.age, apps: x.apps, goals: x.goals, assists: x.assists, avg: r2(x.avg) });
  const young = rows.find((x) => x.p.age <= 21);
  const pts = [...monthPoints(w, div, from, to).entries()].sort((a, b) => b[1].pts - a[1].pts || (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga));
  const best = pts[0];
  return {
    id: `${w.season}-${from}-${div}`,
    season: w.season,
    month,
    year: calendarDate(w.season, Math.max(1, from), 0).getUTCFullYear(),
    div,
    player: pick(rows[0]),
    nominees: rows.slice(0, 3).map(pick),
    young: young ? pick(young) : null,
    manager: best ? { club: best[0], name: coachName(w, best[0]), pts: best[1].pts, j: best[1].j } : null,
  };
}

/** Comemoração de título do usuário (chamado quando ele levanta uma taça). */
export function celebrateTitle(w: World, comp: string): void {
  queue(w, { kind: 'title', comp, season: w.season, club: w.userClub });
}

/** Enfileira uma cerimônia (no máximo 8 esperando: as mais antigas saem). */
function queue(w: World, c: Ceremony): void {
  const q = (w.ceremonies ??= []);
  q.push(c);
  if (q.length > 8) q.splice(0, q.length - 8);
}

/** Próxima cerimônia da fila (sem tirá-la). */
export const nextCeremony = (w: World): Ceremony | null => w.ceremonies?.[0] ?? null;
/** Tira a primeira cerimônia da fila. */
export function popCeremony(w: World): void {
  w.ceremonies?.shift();
}

// ---------- Noite de Gala ----------
function nom(kind: GalaNominee['kind'], id: string, name: string, club: string, stat: string, pos?: Position): GalaNominee {
  return pos ? { kind, id, name, club, stat, pos } : { kind, id, name, club, stat };
}

/** Gols e assistências só na liga (divisão) da temporada. */
function leagueTotals(w: World, div: DivisionId): Map<string, { goals: number; assists: number }> {
  const out = new Map<string, { goals: number; assists: number }>();
  const row = (pid: string) => { let r = out.get(pid); if (!r) { r = { goals: 0, assists: 0 }; out.set(pid, r); } return r; };
  for (const wk of w.weeks) {
    if (!wk || wk.type !== 'league') continue;
    for (const m of wk.matches) {
      if (m.comp !== div || !m.played) continue;
      for (const [pid, , , assist] of m.goals) { row(pid).goals++; if (assist) row(assist).assists++; }
    }
  }
  return out;
}

/**
 * Prêmios da Noite de Gala: os do campeonato do usuário (campeão, artilheiro, garçom, craque, revelação, goleiro,
 * técnico) e os globais da temporada (Chuteira de Ouro, Jovem, Goleiro, Técnico e Bola de Ouro, por último).
 */
export function buildGala(w: World, tables: Record<DivisionId, TableRow[]>, awards: SeasonAwards): Gala {
  const u = user(w);
  const div = u.div;
  const divName = divisionName(div);
  const clubs = new Set(tables[div]?.map((r) => r.id) ?? []);
  const players = Object.values(w.players).filter((p) => p.clubId && clubs.has(p.clubId));
  const totals = leagueTotals(w, div);
  const g = (p: Player) => totals.get(p.id)?.goals ?? 0;
  const a = (p: Player) => totals.get(p.id)?.assists ?? 0;
  const cats: GalaCategory[] = [];
  const add = (c: GalaCategory) => { if (c.nominees.length) cats.push(c); };
  const champ = tables[div]?.[0];
  if (champ) {
    add({
      key: 'champion', icon: 'trophy', title: `Campeão da ${divName}`, scope: 'league',
      nominees: tables[div].slice(0, 3).map((r) => nom('club', r.id, w.clubs[r.id].name, r.id, `${r.p} pontos, ${r.v} vitórias`)),
    });
  }
  const scorers = players.filter((p) => g(p) > 0).sort((x, y) => g(y) - g(x) || a(y) - a(x) || avg(y) - avg(x)).slice(0, 3);
  add({ key: 'scorer', icon: 'boot', title: `Artilheiro da ${divName}`, scope: 'league', nominees: scorers.map((p) => nom('player', p.id, p.name, p.clubId!, `${g(p)} gols`, p.pos)) });
  const makers = players.filter((p) => a(p) > 0).sort((x, y) => a(y) - a(x) || g(y) - g(x)).slice(0, 3);
  add({ key: 'assists', icon: 'assist', title: `Rei das assistências`, scope: 'league', nominees: makers.map((p) => nom('player', p.id, p.name, p.clubId!, `${a(p)} assistências`, p.pos)) });
  const regular = players.filter((p) => p.s.apps >= 12);
  const best = regular.slice().sort((x, y) => avg(y) + g(y) * 0.03 - (avg(x) + g(x) * 0.03)).slice(0, 3);
  add({ key: 'craque', icon: 'star', title: `Craque da ${divName}`, scope: 'league', nominees: best.map((p) => nom('player', p.id, p.name, p.clubId!, `nota ${avg(p).toFixed(2)} • ${g(p)} gols`, p.pos)) });
  const young = players.filter((p) => p.age <= 21 && p.s.apps >= 8).sort((x, y) => avg(y) - avg(x)).slice(0, 3);
  add({ key: 'young', icon: 'sprout', title: `Revelação da ${divName}`, scope: 'league', nominees: young.map((p) => nom('player', p.id, p.name, p.clubId!, `${p.age} anos • nota ${avg(p).toFixed(2)}`, p.pos)) });
  const gks = players.filter((p) => p.pos === 'GOL' && p.s.apps >= 10).sort((x, y) => avg(y) - avg(x)).slice(0, 3);
  add({ key: 'keeper', icon: 'glove', title: `Melhor goleiro da ${divName}`, scope: 'league', nominees: gks.map((p) => nom('player', p.id, p.name, p.clubId!, `nota ${avg(p).toFixed(2)} • ${p.s.apps} jogos`, p.pos)) });
  // Técnico do campeonato: quem mais superou a expectativa (reputação) com bons pontos.
  const rows = tables[div] ?? [];
  const byRep = rows.slice().sort((x, y) => w.clubs[y.id].rep - w.clubs[x.id].rep).map((r) => r.id);
  const coach = rows.map((r, i) => ({ r, s: (byRep.indexOf(r.id) - i) * 0.6 + (r.j ? r.p / r.j : 0) * 3 + (i === 0 ? 2 : 0) })).sort((x, y) => y.s - x.s).slice(0, 3);
  add({ key: 'coach', icon: 'clipboard', title: `Técnico da ${divName}`, scope: 'league', nominees: coach.map(({ r }) => nom('coach', r.id, coachName(w, r.id), r.id, `${rows.indexOf(r) + 1}º lugar, ${r.p} pontos`)) });

  // Globais
  const snapNom = (p: { id: string; name: string; club: string; pos: Position }, stat: string) => nom('player', p.id, p.name, p.club, stat, p.pos);
  if (awards.goldenBoot) add({ key: 'boot', icon: 'boot', title: 'Chuteira de Ouro', scope: 'world', nominees: [snapNom(awards.goldenBoot, `${awards.goldenBoot.goals} gols na temporada`)] });
  if (awards.young) add({ key: 'gyoung', icon: 'sprout', title: 'Melhor jovem do mundo (sub-21)', scope: 'world', nominees: [snapNom(awards.young, `${awards.young.age} anos • nota ${awards.young.avg.toFixed(2)}`)] });
  if (awards.goalkeeper) add({ key: 'gkeeper', icon: 'glove', title: 'Goleiro do ano', scope: 'world', nominees: [snapNom(awards.goalkeeper, `nota ${awards.goalkeeper.avg.toFixed(2)}`)] });
  if (awards.manager) add({ key: 'gcoach', icon: 'clipboard', title: 'Técnico do ano', scope: 'world', nominees: [nom('coach', awards.manager.club, awards.manager.name, awards.manager.club, w.clubs[awards.manager.club]?.name ?? '')] });
  const ballot = (awards.ranking ?? []).slice(0, 3).map((e) => snapNom(e.player, `${e.points.toFixed(1)} pts • ${e.player.goals} gols • nota ${e.player.avg.toFixed(2)}`));
  if (!ballot.length && awards.player) ballot.push(snapNom(awards.player, `nota ${awards.player.avg.toFixed(2)}`));
  add({ key: 'ballon', icon: 'ball', title: 'Bola de Ouro', scope: 'world', nominees: ballot });
  return { season: w.season, div, categories: cats };
}

/** A gala desta temporada pendente já foi vista? */
export const galaSeen = (w: World): boolean => !w.pendingSeason?.gala || w.galaSeen === w.pendingSeason.entry.season;
export function markGalaSeen(w: World): void {
  if (w.pendingSeason) w.galaSeen = w.pendingSeason.entry.season;
}

/** Nome de uma competição para a comemoração ("Série A", "Copa do Brasil"…). */
export const titleName = (comp: string): string =>
  comp.startsWith('youth:') ? (comp === 'youth:sub17' ? 'Sub-17 (base)' : 'Sub-20 (base)') : isDivision(comp) ? divisionName(comp) : competitionName(comp);

/** Quantos prêmios da gala ficaram com o clube do usuário. */
export const galaWins = (w: World, gala: Gala): number => gala.categories.filter((c) => c.nominees[0]?.club === w.userClub).length;

// Temporada: calendário, resultados, tabela, Copa, semana a semana e virada de ano.
import { TRAINING } from './data';
import { Sim } from './engine';
import { assignNumbers, makeFreeAgent, makeYouth, newPlayer, wageFor } from './gen';
import { aiOffersToUser, aiTransfers, promoteYouth, transfer } from './market';
import { autoLineup, ensureLineup, teamRating } from './squad';
import type {
  Club, Competition, Division, FinanceCategory, Fixture, FormResult, HistoryEntry, Match, MatchResult, MessageInput,
  Player, Position, SeasonSummary, SimOptions, TableRow, Week, WeekReport, World,
} from './types';
import { chance, clamp, gauss, pick, rand, randi, shuffle, sum } from './util';

const CUP_WEEKS = [4, 10, 16, 22, 28];
export const TOTAL_WEEKS = 35;
export const CUP_ROUNDS = ['1ª fase', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
export const CUP_PRIZE = [1e6, 2e6, 3.5e6, 6e6, 12e6];
export const WINDOWS: [number, number][] = [[0, 4], [15, 19]];
export const windowOpen = (w: World): boolean => WINDOWS.some(([a, b]) => w.week >= a && w.week <= b);
export const nextWindow = (w: World): number | null => {
  const nx = WINDOWS.find(([a]) => a > w.week);
  return nx ? nx[0] : null;
};

const TV: Record<Division, number> = { A: 380000, B: 120000 };

// ---------- Mensagens ----------
/** Adiciona uma mensagem à caixa de entrada (era M.msg). */
export function pushMessage(w: World, m: MessageInput): void {
  w.inbox.unshift({ id: w.nextMsg++, season: w.season, week: w.week, read: false, kind: 'info', ...m });
  if (w.inbox.length > 80) w.inbox.length = 80;
}

export const user = (w: World): Club => w.clubs[w.userClub];
export const clubPlayers = (w: World, club: Club): Player[] => club.squad.map((id) => w.players[id]);

/** Movimenta o caixa de um clube; registra em finWeek/finSeason se for o clube do usuário (era M.money). */
export function addMoney(w: World, clubId: string, amount: number, cat: FinanceCategory): void {
  w.clubs[clubId].money += amount;
  if (clubId === w.userClub) {
    w.finWeek[cat] = (w.finWeek[cat] || 0) + amount;
    w.finSeason[cat] = (w.finSeason[cat] || 0) + amount;
  }
}

// ---------- Calendário ----------
type Pair = [string, string];
function roundRobin(ids: string[]): Pair[][] {
  const n = ids.length, arr = ids.slice(), rounds: Pair[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Pair[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      pairs.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop() as string);
  }
  return rounds.concat(rounds.map((r) => r.map(([a, b]): Pair => [b, a])));
}

let mid = 1;
const mkMatch = (h: string, a: string, comp: Competition): Match => ({ id: 'm' + Date.now().toString(36) + mid++, h, a, comp, hs: null, as: null, pens: null, played: false, goals: [] });

export const divClubs = (w: World, div: Division): string[] => Object.values(w.clubs).filter((c) => c.div === div).map((c) => c.id);

export function startSeason(w: World): void {
  const rA = roundRobin(shuffle(divClubs(w, 'A')));
  const rB = roundRobin(shuffle(divClubs(w, 'B')));
  w.weeks = [null];
  let li = 0;
  for (let wk = 1; wk <= TOTAL_WEEKS; wk++) {
    if (CUP_WEEKS.includes(wk)) {
      w.weeks.push({ type: 'cup', round: CUP_WEEKS.indexOf(wk), matches: [] });
    } else {
      const ms = rA[li].map(([h, a]) => mkMatch(h, a, 'A')).concat(rB[li].map(([h, a]) => mkMatch(h, a, 'B')));
      w.weeks.push({ type: 'league', round: li + 1, matches: ms });
      li++;
    }
  }
  w.cup = { alive: shuffle(Object.keys(w.clubs)), champion: null };
  for (const p of Object.values(w.players)) p.s = { apps: 0, goals: 0, assists: 0, rsum: 0 };
  w.finSeason = {};
  w.finWeek = {};
  w.trialUsed = false;
  setObjective(w);
  const u = user(w);
  pushMessage(w, {
    kind: 'board',
    title: `Temporada ${w.season}: objetivo da diretoria`,
    body: `A diretoria do ${u.name} espera: ${w.board.label} na Série ${u.div}. A janela de transferências está aberta até a semana ${WINDOWS[0][1]}.`,
  });
}

function drawCup(w: World, week: Week): void {
  const alive = shuffle(w.cup.alive.slice());
  for (let i = 0; i + 1 < alive.length; i += 2) week.matches.push(mkMatch(alive[i], alive[i + 1], 'CUP'));
  if (week.round === 4) week.matches.forEach((m) => (m.neutral = true));
}

export const currentWeek = (w: World): Week | null => w.weeks[w.week] || null;

export function userMatch(w: World): Match | null {
  const wk = currentWeek(w);
  if (!wk) return null;
  return wk.matches.find((m) => (m.h === w.userClub || m.a === w.userClub) && !m.played) || null;
}

/** Próximo jogo do usuário a partir da semana atual (antes em views.js). */
export function nextFixture(w: World): Fixture | null {
  for (let i = Math.max(1, w.week); i <= TOTAL_WEEKS; i++) {
    const wk = w.weeks[i];
    if (!wk) continue;
    const m = wk.matches.find((x) => !x.played && (x.h === w.userClub || x.a === w.userClub));
    if (m) return { m, week: i, wk };
  }
  return null;
}

export function weekLabel(w: World): string {
  if (w.week === 0) return 'Pré-temporada';
  const wk = currentWeek(w);
  if (!wk) return 'Fim de temporada';
  return wk.type === 'cup' ? `Copa • ${CUP_ROUNDS[wk.round]}` : `Rodada ${wk.round} de 30`;
}

// ---------- Tabela ----------
export function table(w: World, div: Division): TableRow[] {
  const rows: Record<string, TableRow> = {};
  for (const id of divClubs(w, div)) rows[id] = { id, p: 0, j: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, form: [] };
  for (const wk of w.weeks) {
    if (!wk || wk.type !== 'league') continue;
    for (const m of wk.matches) {
      if (m.comp !== div || !m.played || !rows[m.h] || !rows[m.a]) continue;
      const hs = m.hs as number, as = m.as as number;
      const h = rows[m.h], a = rows[m.a];
      h.j++; a.j++; h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
      if (hs > as) { h.v++; h.p += 3; a.d++; h.form.push('V'); a.form.push('D'); }
      else if (hs < as) { a.v++; a.p += 3; h.d++; h.form.push('D'); a.form.push('V'); }
      else { h.e++; a.e++; h.p++; a.p++; h.form.push('E'); a.form.push('E'); }
    }
  }
  return Object.values(rows).sort((x, y) => y.p - x.p || y.v - x.v || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || w.clubs[x.id].name.localeCompare(w.clubs[y.id].name));
}

export const position = (w: World, clubId: string): number => table(w, w.clubs[clubId].div).findIndex((r) => r.id === clubId) + 1;

export function topScorers(w: World, div: Division, n = 10): Player[] {
  return Object.values(w.players)
    .filter((p) => p.clubId && w.clubs[p.clubId].div === div && p.s.goals > 0)
    .sort((a, b) => b.s.goals - a.s.goals || b.s.assists - a.s.assists)
    .slice(0, n);
}

export function userForm(w: World, n = 5): FormResult[] {
  const res: FormResult[] = [];
  for (let i = w.week; i >= 1 && res.length < n; i--) {
    const wk = w.weeks[i];
    if (!wk) continue;
    const m = wk.matches.find((x) => x.played && (x.h === w.userClub || x.a === w.userClub));
    if (!m) continue;
    const home = m.h === w.userClub;
    const gf = (home ? m.hs : m.as) as number, ga = (home ? m.as : m.hs) as number;
    let r: FormResult = gf > ga ? 'V' : gf < ga ? 'D' : 'E';
    if (m.pens) r = (home ? m.pens[0] > m.pens[1] : m.pens[1] > m.pens[0]) ? 'V' : 'D';
    res.push(r);
  }
  return res.reverse();
}

// ---------- Diretoria ----------
function setObjective(w: World): void {
  const u = user(w);
  const rank = Object.values(w.clubs).filter((c) => c.div === u.div).sort((a, b) => b.rep - a.rep).findIndex((c) => c.id === u.id) + 1;
  let target: number, label: string;
  if (u.div === 'A') {
    if (rank <= 3) { target = 3; label = 'brigar pelo título (top 3)'; }
    else if (rank <= 8) { target = 8; label = 'terminar entre os 8 primeiros'; }
    else if (rank <= 12) { target = 12; label = 'fazer uma campanha tranquila (top 12)'; }
    else { target = 13; label = 'evitar o rebaixamento'; }
  } else {
    if (rank <= 5) { target = 3; label = 'conquistar o acesso (top 3)'; }
    else if (rank <= 10) { target = 9; label = 'terminar entre os 9 primeiros'; }
    else { target = 14; label = 'fazer uma campanha digna (top 14)'; }
  }
  w.board.target = target;
  w.board.label = label;
}

function expectedPoints(w: World, m: Match): number {
  const home = m.h === w.userClub;
  const me = w.clubs[w.userClub], op = w.clubs[home ? m.a : m.h];
  const d = teamRating(w, me) - teamRating(w, op) + (m.neutral ? 0 : home ? 2 : -2);
  return clamp(1.35 + d * 0.09, 0.65, 2.4);
}

// ---------- Resultados ----------
export function applyResult(w: World, m: Match, res: MatchResult): void {
  m.hs = res.hs; m.as = res.as; m.pens = res.pens; m.played = true;
  m.goals = res.goals.map((g) => [g.pid, g.side, g.min, g.assist || 0, g.pen ? 1 : 0]);
  const clubsIds = [m.h, m.a];
  const winner = res.winner;
  const playedSet = new Set(res.played[0].concat(res.played[1]));

  // Suspensões cumpridas
  for (const cid of clubsIds) {
    for (const pid of w.clubs[cid].squad) {
      const p = w.players[pid];
      if (p.susp > 0 && !playedSet.has(pid)) p.susp--;
    }
  }
  res.played.forEach((list, s) => {
    for (const pid of list) {
      const p = w.players[pid];
      if (!p) continue;
      p.s.apps++; p.c.apps++;
      p.s.rsum += res.ratings[pid] || 6;
      p.played = true;
      if (res.fat[pid] != null) p.fitness = Math.round(res.fat[pid]);
      const mor = winner === s ? 5 : winner === 1 - s ? -5 : 0;
      p.morale = clamp(p.morale + mor, 10, 100);
    }
  });
  for (const g of res.goals) {
    const p = w.players[g.pid];
    if (p) { p.s.goals++; p.c.goals++; }
    const a = g.assist ? w.players[g.assist] : undefined;
    if (a) { a.s.assists++; a.c.assists++; }
  }
  for (const c of res.cards) {
    const p = w.players[c.pid];
    if (!p) continue;
    if (c.type === 'yellow') { p.yc++; if (p.yc >= 3) { p.susp = 1; p.yc = 0; } }
    else if (c.type === 'red') p.susp = 2;
    else p.susp = 1;
  }
  for (const inj of res.injuries) {
    const p = w.players[inj.pid];
    if (p) { p.inj = Math.max(p.inj, inj.weeks); p.injNew = true; }
  }

  // Bilheteria para o mandante
  if (!m.neutral) {
    const hc = w.clubs[m.h], ac = w.clubs[m.a];
    const occ = clamp(0.35 + hc.rep / 200 + ac.rep / 400 + (m.comp === 'CUP' ? 0.1 : 0), 0.2, 1);
    const income = Math.round(hc.cap * occ * (15 + hc.rep * 0.3));
    m.attendance = Math.round(hc.cap * occ);
    addMoney(w, m.h, income, 'tickets');
  }
  if (m.comp === 'CUP') {
    const wk = currentWeek(w);
    const winId = winner === 0 ? m.h : m.a;
    if (wk) addMoney(w, winId, CUP_PRIZE[wk.round], 'prize');
  }

  // Confiança da diretoria
  if (clubsIds.includes(w.userClub) && m.comp !== 'CUP') {
    const s = m.h === w.userClub ? 0 : 1;
    const pts = winner === s ? 3 : winner === -1 ? 1 : 0;
    w.board.conf = clamp(w.board.conf + (pts - expectedPoints(w, m)) * 2.4, 0, 100);
  } else if (clubsIds.includes(w.userClub)) {
    const s = m.h === w.userClub ? 0 : 1;
    w.board.conf = clamp(w.board.conf + (winner === s ? 2.5 : -2.5), 0, 100);
  }
}

export function simMatch(w: World, m: Match, opts: SimOptions = {}): Sim {
  const sim = new Sim(w, m.h, m.a, { knockout: m.comp === 'CUP', neutral: !!m.neutral, ...opts });
  sim.runToEnd();
  applyResult(w, m, sim.result());
  return sim;
}

/** Simula todos os jogos pendentes da semana (inclusive o do usuário, se houver). */
export function simulateWeek(w: World): void {
  const wk = currentWeek(w);
  if (!wk) return;
  for (const m of wk.matches) if (!m.played) simMatch(w, m);
}

// ---------- Evolução ----------
function develop(p: Player, club: Club | undefined): void {
  const trainLvl = club ? club.training : 2;
  const intensity = club ? TRAINING[club.trainingInt].dev : 1;
  let g = 0;
  if (p.ovr < p.pot) {
    const gap = p.pot - p.ovr;
    const rate = p.age <= 18 ? 0.0085 : p.age <= 21 ? 0.007 : p.age <= 24 ? 0.0048 : p.age <= 27 ? 0.002 : 0.0005;
    g = gap * rate * (0.75 + 0.1 * trainLvl) * intensity * (p.played ? 1.3 : p.youth ? 1.1 : 0.85) * rand(0.5, 1.5);
  }
  if (p.age >= 31) g -= (p.age - 30) * 0.03 * rand(0.5, 1.5);
  p.ovr = clamp(p.ovr + g, 25, 99);
}

export function endWeek(w: World): WeekReport {
  const wk = currentWeek(w);
  const u = user(w);
  const report: WeekReport = { news: [] };

  if (wk && wk.type === 'cup') {
    const winners = wk.matches.map((m) => {
      const hs = m.hs as number, as = m.as as number;
      const win = hs > as ? 0 : hs < as ? 1 : m.pens && m.pens[0] > m.pens[1] ? 0 : 1;
      return win === 0 ? m.h : m.a;
    });
    const userOut = w.cup.alive.includes(w.userClub) && !winners.includes(w.userClub);
    w.cup.alive = winners;
    if (userOut) pushMessage(w, { kind: 'info', title: 'Eliminados da Copa', body: `O ${u.name} caiu na ${CUP_ROUNDS[wk.round].toLowerCase()} da Copa.` });
    if (wk.round === 4) {
      w.cup.champion = winners[0];
      const champ = w.clubs[winners[0]];
      champ.trophies.push({ season: w.season, comp: 'Copa' });
      pushMessage(w, { kind: champ.id === u.id ? 'trophy' : 'info', title: `${champ.name} é campeão da Copa!`, body: champ.id === u.id ? 'Título! A torcida está em festa e a diretoria, radiante.' : `O ${champ.name} levantou a taça da Copa.` });
      if (champ.id === u.id) w.board.conf = clamp(w.board.conf + 15, 0, 100);
    }
  }

  // Jogadores
  const ownerOf: Record<string, Club> = {};
  for (const c of Object.values(w.clubs)) for (const id of c.squad.concat(c.youth)) ownerOf[id] = c;
  for (const p of Object.values(w.players)) {
    const club: Club | undefined = ownerOf[p.id];
    if (p.inj > 0) {
      if (p.injNew) p.injNew = false;
      else {
        p.inj--;
        if (p.inj === 0 && club === u) pushMessage(w, { kind: 'medical', title: `${p.name} recuperado`, body: `${p.name} está liberado pelo departamento médico.` });
      }
    }
    const tr = club ? TRAINING[club.trainingInt] : TRAINING.mid;
    p.fitness = clamp(p.fitness + tr.recover, 0, 100);
    develop(p, club);
    if (club && !p.youth) {
      if (!p.played && !p.inj) p.morale = clamp(p.morale - 1.2, 10, 100);
      p.morale += (65 - p.morale) * 0.04;
      if (!p.inj && chance(0.0035 * tr.injury)) {
        p.inj = randi(1, 3);
        if (club === u) pushMessage(w, { kind: 'medical', title: `${p.name} machucado no treino`, body: `${p.name} sofreu uma lesão no treino e fica fora por ${p.inj} semana(s).` });
      }
    }
    p.played = false;
  }

  // Finanças semanais
  for (const c of Object.values(w.clubs)) {
    const wages = sum(c.squad.concat(c.youth), (id) => w.players[id].wage);
    addMoney(w, c.id, -wages, 'wages');
    addMoney(w, c.id, Math.round(c.rep * 3000), 'sponsor');
    addMoney(w, c.id, TV[c.div], 'tv');
  }
  w.finance.push({ season: w.season, week: w.week, balance: u.money, ...w.finWeek });
  if (w.finance.length > 60) w.finance.shift();
  w.finWeek = {};

  if (windowOpen(w)) {
    aiTransfers(w);
    aiOffersToUser(w);
  }
  // Propostas expiradas
  for (const m of w.inbox) {
    if (m.offer && !m.offer.done && (m.offer.expires < w.week || m.season !== w.season)) {
      m.offer.done = true; m.offer.expired = true;
    }
  }
  if (u.money < 0) {
    w.board.conf = clamp(w.board.conf - 2, 0, 100);
    if (w.week % 4 === 0) pushMessage(w, { kind: 'board', title: 'Caixa no vermelho', body: 'A diretoria está preocupada com as finanças negativas. Venda jogadores ou reduza a folha salarial.' });
  }
  if (w.week === WINDOWS[1][0] - 1) pushMessage(w, { kind: 'info', title: 'Janela do meio do ano', body: `A janela de transferências abre na próxima semana e vai até a semana ${WINDOWS[1][1]}.` });

  if (w.week >= 8 && w.board.conf <= 4) {
    w.fired = { reason: 'A sequência de maus resultados custou o seu emprego.' };
  }

  w.week++;
  if (w.week > TOTAL_WEEKS) {
    report.seasonEnd = seasonEnd(w);
  } else {
    const next = currentWeek(w);
    if (next && next.type === 'cup' && !next.matches.length) drawCup(w, next);
    for (const c of Object.values(w.clubs)) if (c.id !== w.userClub) autoLineup(w, c);
  }
  return report;
}

// ---------- Fim de temporada ----------
export function seasonEnd(w: World): SeasonSummary {
  const u = user(w);
  const tA = table(w, 'A'), tB = table(w, 'B');
  const userDiv = u.div;
  const userPos = (userDiv === 'A' ? tA : tB).findIndex((r) => r.id === u.id) + 1;
  tA.forEach((r, i) => addMoney(w, r.id, (17 - (i + 1)) * 0.8e6, 'prize'));
  tB.forEach((r, i) => addMoney(w, r.id, (17 - (i + 1)) * 0.25e6, 'prize'));
  const champA = w.clubs[tA[0].id], champB = w.clubs[tB[0].id];
  champA.trophies.push({ season: w.season, comp: 'Série A' });
  champB.trophies.push({ season: w.season, comp: 'Série B' });
  const relegated = tA.slice(-3).map((r) => r.id);
  const promoted = tB.slice(0, 3).map((r) => r.id);
  relegated.forEach((id) => { w.clubs[id].rep = clamp(w.clubs[id].rep - 4, 30, 95); });
  promoted.forEach((id) => { w.clubs[id].rep = clamp(w.clubs[id].rep + 3, 30, 95); });
  tA.forEach((r, i) => { const c = w.clubs[r.id]; c.rep = clamp(c.rep + (8.5 - (i + 1)) * 0.35, 30, 95); });
  tB.forEach((r, i) => { const c = w.clubs[r.id]; c.rep = clamp(c.rep + (8.5 - (i + 1)) * 0.25, 30, 95); });

  const scA = topScorers(w, 'A', 1)[0] ?? null, scB = topScorers(w, 'B', 1)[0] ?? null;
  const best = Object.values(w.players)
    .filter((p) => p.clubId && p.s.apps >= 15)
    .sort((a, b) => b.s.rsum / b.s.apps - a.s.rsum / a.s.apps)[0] ?? null;

  const success = userPos <= w.board.target;
  const delta = success ? 20 + (w.board.target - userPos) * 2 : -(userPos - w.board.target) * 7;
  w.board.conf = clamp(w.board.conf + delta, 0, 100);
  const fired = w.board.conf < 20;

  const entry: HistoryEntry = {
    season: w.season,
    champA: champA.id, champB: champB.id, cup: w.cup.champion,
    user: { club: u.id, div: userDiv, pos: userPos, objective: w.board.label, success },
    scorerA: scA ? { name: scA.name, club: scA.clubId, goals: scA.s.goals } : null,
    best: best ? { name: best.name, club: best.clubId, avg: best.s.rsum / best.s.apps } : null,
  };
  w.history.push(entry);

  const summary: SeasonSummary = { entry, tA, tB, relegated, promoted, userPos, success, fired, scA, scB, best };
  if (fired) w.fired = { reason: `Objetivo não cumprido: a meta era ${w.board.label}, e o time terminou em ${userPos}º.` };
  else if (userPos <= Math.max(1, w.board.target - 3) || (userDiv === 'B' && userPos <= 3)) {
    const bigger = Object.values(w.clubs).filter((c) => c.rep > u.rep + 4 && c.id !== u.id);
    if (bigger.length && chance(0.6)) summary.offer = pick(bigger).id;
  }
  w.pendingSeason = summary;
  return summary;
}

export function newSeason(w: World): void {
  const u = user(w);
  const news: string[] = [];
  const ps = w.pendingSeason;
  if (ps) {
    ps.relegated.forEach((id) => (w.clubs[id].div = 'B'));
    ps.promoted.forEach((id) => (w.clubs[id].div = 'A'));
  }
  w.pendingSeason = null;
  // Envelhecimento e aposentadoria
  for (const p of Object.values(w.players)) {
    p.age++;
    if (p.age >= 25) p.pot = Math.max(Math.round(p.ovr), Math.min(p.pot, Math.round(p.ovr) + 2));
    const retireP = p.age >= 38 ? 1 : p.age >= 34 ? (p.age - 33) * 0.22 : 0;
    if (!p.youth && chance(retireP)) {
      if (p.clubId === u.id) news.push(`${p.name} (${p.age} anos) se aposentou.`);
      removePlayer(w, p);
    }
  }
  // Contratos
  for (const c of Object.values(w.clubs)) {
    for (const id of c.squad.slice()) {
      const p = w.players[id];
      p.contract--;
      p.renewAsk = null;
      if (p.contract > 0) continue;
      if (c.id === u.id) {
        news.push(`${p.name} encerrou o contrato e deixou o clube.`);
        toFree(w, p);
      } else if (chance(0.75)) {
        p.contract = randi(1, 3);
        p.wage = wageFor(p.ovr);
      } else toFree(w, p);
    }
  }
  // Base: 19+ anos sobe ou sai
  for (const c of Object.values(w.clubs)) {
    for (const id of c.youth.slice()) {
      const p = w.players[id];
      if (p.age < 19) continue;
      const keep = c.id === u.id ? c.squad.length < 32 : p.pot >= 50 + c.rep * 0.3 && c.squad.length < 30;
      if (keep) {
        promoteYouth(w, id, true);
        if (c.id === u.id) news.push(`${p.name} completou 19 anos e subiu para o profissional.`);
      } else {
        if (c.id === u.id) news.push(`${p.name} completou 19 anos e foi dispensado da base.`);
        removePlayer(w, p);
      }
    }
  }
  // Clubes da CPU completam o elenco
  for (const c of Object.values(w.clubs)) if (c.id !== u.id) aiMaintain(w, c);
  // Nova safra da base
  const intake: Player[] = [];
  for (const c of Object.values(w.clubs)) {
    const n = randi(2, 2 + c.academy);
    for (let k = 0; k < n; k++) {
      const y = makeYouth(w, c, randi(15, 16));
      if (c.id === u.id) intake.push(y);
    }
  }
  // Agentes livres
  w.free = w.free.filter((id) => w.players[id]);
  while (w.free.length > 70) {
    const worst = w.free.map((id) => w.players[id]).sort((a, b) => a.ovr - b.ovr)[0];
    removePlayer(w, worst);
  }
  while (w.free.length < 40) makeFreeAgent(w);

  w.season++;
  w.week = 0;
  w.board.conf = 50 + (w.board.conf - 50) * 0.5;
  startSeason(w);
  for (const c of Object.values(w.clubs)) ensureLineup(w, c);
  if (news.length) pushMessage(w, { kind: 'info', title: 'Movimentações de fim de temporada', body: news.join('\n') });
  if (intake.length) {
    const best = intake.slice().sort((a, b) => b.pot - a.pot)[0];
    pushMessage(w, { kind: 'youth', title: `Nova safra da base: ${intake.length} garotos`, body: `Chegaram à base: ${intake.map((p) => `${p.name} (${p.pos}, ${p.age})`).join(', ')}. Destaque para ${best.name}, que os olheiros acham promissor.` });
  }
}

/** Mantém o elenco de um clube da CPU entre 23 e 30 jogadores. */
export function aiMaintain(w: World, c: Club): void {
  while (c.squad.length > 30) {
    const worst = clubPlayers(w, c).sort((a, b) => a.ovr - b.ovr)[0];
    toFree(w, worst);
  }
  while (c.squad.length < 23) {
    const need = neededPos(w, c);
    const fa = w.free.map((id) => w.players[id]).filter((p) => p.pos === need).sort((a, b) => b.ovr - a.ovr)[0];
    if (fa && fa.ovr > 45 + c.rep * 0.25) transfer(w, fa.id, c.id, 0, true);
    else {
      const base = 48 + c.rep * 0.32;
      const age = randi(19, 30);
      const p = newPlayer(w, { pos: need, age, ovr: clamp(base - 3 + gauss() * 4, 40, 90), pot: base + rand(0, 8), clubId: c.id, contract: randi(1, 4) });
      c.squad.push(p.id);
    }
  }
  assignNumbers(w, c);
}

const NEED_TEMPLATE: Record<Position, number> = { GOL: 3, ZAG: 4, LAT: 4, VOL: 3, MEI: 4, ATA: 4 };

/** Posição mais carente do elenco em relação ao modelo. */
export function neededPos(w: World, c: Club): Position {
  const count: Partial<Record<Position, number>> = {};
  for (const p of clubPlayers(w, c)) count[p.pos] = (count[p.pos] || 0) + 1;
  let best: Position = 'MEI', gap = -99;
  for (const pos of Object.keys(NEED_TEMPLATE) as Position[]) { const g = NEED_TEMPLATE[pos] - (count[pos] || 0); if (g > gap) { gap = g; best = pos; } }
  return best;
}

/** Tira o jogador do clube (elenco, base, escalação, banco) e da lista de livres. */
export function detach(w: World, p: Player): void {
  if (p.clubId && w.clubs[p.clubId]) {
    const c = w.clubs[p.clubId];
    c.squad = c.squad.filter((id) => id !== p.id);
    c.youth = c.youth.filter((id) => id !== p.id);
    c.lineup = c.lineup.map((id) => (id === p.id ? null : id));
    c.bench = c.bench.filter((id) => id !== p.id);
  }
  w.free = w.free.filter((id) => id !== p.id);
}

export function toFree(w: World, p: Player): void {
  detach(w, p);
  p.clubId = null;
  p.contract = 0;
  p.listed = false;
  p.num = 0;
  p.youth = false;
  w.free.push(p.id);
}

export function removePlayer(w: World, p: Player): void {
  detach(w, p);
  delete w.players[p.id];
}

/** Demissão: propostas de clubes menores. */
export function jobOffers(w: World): string[] {
  const u = user(w);
  const pool = Object.values(w.clubs).filter((c) => c.id !== u.id && c.rep < u.rep - 3);
  return shuffle(pool.length >= 3 ? pool : Object.values(w.clubs).filter((c) => c.id !== u.id)).slice(0, 3).map((c) => c.id);
}

export function switchClub(w: World, clubId: string): void {
  const old = w.clubs[w.userClub];
  w.userClub = clubId;
  aiMaintain(w, old);
  autoLineup(w, old);
  w.fired = null;
  w.board.conf = 55;
  setObjective(w);
  ensureLineup(w, w.clubs[clubId]);
  const c = w.clubs[clubId];
  pushMessage(w, { kind: 'board', title: `Bem-vindo ao ${c.name}!`, body: `A diretoria do ${c.name} confia no seu trabalho. Objetivo: ${w.board.label}.` });
}

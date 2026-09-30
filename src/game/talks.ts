// Moral e conversas (v6): jogadores do usuário cobram espaço, pedem aumento ou querem sair,
// e o treinador escolhe a conversa no vestiário antes de cada jogo.
import { wageVeto } from './finance';
import { clubWage } from './gen';
import { teamRating } from './squad';
import { isKnockout } from './leagues';
import type { Match, Message, Player, TalkKind, TalkOption, TeamTalk, TeamTalkKey, World } from './types';
import { chance, clamp, formatMoney, pick } from './util';
import { clubPlayers, isDerby, pushMessage, user } from './world';

/** Semanas até o jogador desistir de esperar resposta. */
const TALK_WAIT = 2;
/** Semanas mínimas entre duas conversas com o mesmo jogador. */
const TALK_COOLDOWN = 8;
/** Semanas depois da promessa de mais chances para cobrar. */
const CHANCE_CHECK = 8;
/** Conversas abertas ao mesmo tempo, no máximo. */
const MAX_OPEN = 2;

const stamp = (w: World): number => w.season * 100 + w.week;
const round100 = (v: number): number => Math.round(v / 100) * 100;

/** Jogos do time do usuário já disputados na temporada. */
export function teamGames(w: World, sinceWeek = 0): number {
  let n = 0;
  for (let i = sinceWeek + 1; i <= w.week && i < w.weeks.length; i++) {
    const wk = w.weeks[i];
    if (wk && wk.matches.some((m) => m.played && (m.h === w.userClub || m.a === w.userClub))) n++;
  }
  return n;
}

const avgRating = (p: Player): number => (p.s.apps ? p.s.rsum / p.s.apps : 0);
const openTalks = (w: World): Message[] => w.inbox.filter((m) => m.talk && !m.talk.answer && m.season === w.season);
const coolingDown = (w: World, p: Player): boolean => !!p.talkedAt && stamp(w) - p.talkedAt < TALK_COOLDOWN;

const OPTIONS: Record<TalkKind, TalkOption[]> = {
  bench: [
    { key: 'prometer', label: 'Prometer mais chances', hint: 'Moral +12; ele cobra em 8 semanas' },
    { key: 'treinar', label: 'Pedir que mostre mais nos treinos', hint: 'Moral −4 (mais, se ele for titular de verdade)' },
    { key: 'vender', label: 'Colocar na lista de transferências', hint: 'Ele aceita sair; moral +5' },
  ],
  raise: [
    { key: 'dar', label: 'Dar o aumento', hint: 'Moral +12; respeita o teto salarial' },
    { key: 'esperar', label: 'Prometer renovar no fim da temporada', hint: 'Moral +3' },
    { key: 'recusar', label: 'Recusar', hint: 'Moral −12; pode pedir para sair' },
  ],
  leave: [
    { key: 'convencer', label: 'Tentar convencer a ficar', hint: 'Depende do tamanho do clube e do moral' },
    { key: 'liberar', label: 'Colocar à venda', hint: 'Moral +8; propostas nas janelas' },
    { key: 'negar', label: 'Negar a saída', hint: 'Moral −15' },
  ],
};

function openTalk(w: World, p: Player, kind: TalkKind, title: string, body: string, extra: { amount?: number; club?: string } = {}): void {
  p.talkedAt = stamp(w);
  pushMessage(w, { kind: 'board', pid: p.id, title, body, talk: { kind, pid: p.id, options: OPTIONS[kind], expires: w.week + TALK_WAIT, ...extra } });
}

/** Gera no máximo uma conversa nova por semana (chamado no endWeek, com o jogo da semana já disputado). */
export function generateTalks(w: World): void {
  const u = user(w);
  if (w.week < 3 || openTalks(w).length >= MAX_OPEN) return;
  const squad = clubPlayers(w, u).filter((p) => p && !p.youth && !p.loan && !p.inj);
  const byOvr = squad.slice().sort((a, b) => b.ovr - a.ovr);
  const games = teamGames(w);
  const rank = (p: Player) => byOvr.indexOf(p);

  // 1. Quer sair: moral muito baixo, ou craque cobiçado por um clube bem maior.
  for (const p of squad) {
    if (coolingDown(w, p) || p.listed) continue;
    const bigger = Object.values(w.clubs).filter((c) => c.id !== u.id && c.rep >= u.rep + 10);
    const coveted = rank(p) < 5 && bigger.length > 0 && chance(0.012);
    if (p.morale < 28 || coveted) {
      const club = bigger.length ? pick(bigger) : null;
      const why = coveted && club ? `O ${club.name} está interessado e ${p.name} quer ouvir a proposta.` : `${p.name} está infeliz no clube (moral ${Math.round(p.morale)}).`;
      openTalk(w, p, 'leave', `${p.name} quer sair`, `${why} Ele pede uma conversa sobre o futuro.`, { club: club?.id });
      return;
    }
  }
  // 2. Pedido de aumento: joga bem e ganha abaixo do mercado.
  for (const p of squad) {
    if (coolingDown(w, p) || p.s.apps < 8 || avgRating(p) < 7 || p.contract < 1) continue;
    const market = clubWage(w, u.id, p.ovr);
    if (p.wage >= market * 0.9 || !chance(0.25)) continue;
    const amount = Math.max(1000, round100(market * 1.05 - p.wage));
    openTalk(w, p, 'raise', `${p.name} pede aumento`, `Com nota média ${avgRating(p).toFixed(2).replace('.', ',')} na temporada, ${p.name} quer ganhar mais ${formatMoney(amount)}/sem (hoje ${formatMoney(p.wage)}/sem).`, { amount });
    return;
  }
  // 3. Reserva insatisfeito: está entre os 14 melhores e quase não joga.
  if (games >= 6) {
    for (const p of squad) {
      if (coolingDown(w, p) || p.chance || rank(p) > 13 || p.age < 20 || p.morale >= 55) continue;
      if (p.s.apps / games >= 0.35 || !chance(0.3)) continue;
      openTalk(w, p, 'bench', `${p.name} reclama da reserva`, `${p.name} jogou ${p.s.apps} de ${games} partidas e quer mais oportunidades. Como você responde?`);
      return;
    }
  }
}

/** Promessas de mais chances vencidas: satisfeito ou decepcionado (chamado no endWeek). */
export function checkChancePromises(w: World): void {
  for (const p of clubPlayers(w, user(w))) {
    const c = p?.chance;
    if (!c) continue;
    if (c.season !== w.season) { p.chance = null; continue; }
    if (w.week - c.week < CHANCE_CHECK) continue;
    const games = teamGames(w, c.week);
    const apps = p.s.apps - c.apps;
    p.chance = null;
    if (games && apps / games >= 0.4) {
      p.morale = clamp(p.morale + 6, 10, 100);
      pushMessage(w, { kind: 'info', pid: p.id, title: `${p.name} está satisfeito`, body: `Você cumpriu a promessa: ${p.name} jogou ${apps} de ${games} partidas (moral +6).` });
    } else {
      p.morale = clamp(p.morale - 15, 10, 100);
      pushMessage(w, { kind: 'board', pid: p.id, title: `${p.name} se sente enganado`, body: `Você prometeu mais chances, mas ${p.name} jogou só ${apps} de ${games} partidas (moral −15). Ele pode pedir para sair.` });
    }
  }
}

/** Conversas sem resposta expiram: o jogador se sente ignorado. */
export function expireTalks(w: World): void {
  for (const m of w.inbox) {
    const t = m.talk;
    if (!t || t.answer || (m.season === w.season && t.expires >= w.week)) continue;
    const p = w.players[t.pid];
    t.answer = 'ignored';
    t.result = 'Sem resposta: o jogador se sentiu ignorado (moral −8).';
    if (p && p.clubId === w.userClub) p.morale = clamp(p.morale - 8, 10, 100);
  }
}

export interface TalkAnswer {
  ok: boolean;
  text: string;
}

/** Responde uma conversa. */
export function answerTalk(w: World, msgId: number, key: string): TalkAnswer {
  const m = w.inbox.find((x) => x.id === msgId);
  const t = m?.talk;
  if (!m || !t) return { ok: false, text: 'Conversa não encontrada.' };
  if (t.answer) return { ok: false, text: 'Você já respondeu.' };
  const p = w.players[t.pid];
  const u = user(w);
  if (!p || p.clubId !== u.id) {
    t.answer = 'gone';
    t.result = 'O jogador não está mais no clube.';
    return { ok: false, text: t.result };
  }
  const mor = (d: number) => { p.morale = clamp(p.morale + d, 10, 100); };
  let text: string;
  if (t.kind === 'bench') {
    if (key === 'prometer') {
      mor(12);
      p.chance = { season: w.season, week: w.week, apps: p.s.apps, games: teamGames(w) };
      text = `${p.name} gostou da conversa (moral +12). Ele espera jogar pelo menos 40% das partidas nas próximas ${CHANCE_CHECK} semanas.`;
    } else if (key === 'treinar') {
      const unfair = clubPlayers(w, u).filter((x) => x && x.ovr > p.ovr).length < 11;
      mor(unfair ? -10 : -4);
      text = unfair ? `${p.name} achou injusto: ele sabe que está entre os melhores do elenco (moral −10).` : `${p.name} aceitou o recado e promete trabalhar mais (moral −4).`;
    } else if (key === 'vender') {
      p.listed = true;
      mor(5);
      text = `${p.name} foi para a lista de transferências e agradece a franqueza (moral +5).`;
    } else return { ok: false, text: 'Opção inválida.' };
  } else if (t.kind === 'raise') {
    const amount = t.amount ?? 0;
    if (key === 'dar') {
      const veto = wageVeto(w, u, amount, 1.1);
      if (veto) return { ok: false, text: veto };
      p.wage += amount;
      mor(12);
      text = `${p.name} agora ganha ${formatMoney(p.wage)}/sem e está motivado (moral +12).`;
    } else if (key === 'esperar') {
      mor(3);
      text = `${p.name} aceita esperar a renovação no fim da temporada (moral +3).`;
    } else if (key === 'recusar') {
      mor(-12);
      text = `${p.name} ficou chateado com a recusa (moral −12).`;
    } else return { ok: false, text: 'Opção inválida.' };
  } else {
    if (key === 'convencer') {
      const rival = t.club ? w.clubs[t.club] : null;
      const odds = clamp(0.5 + (u.rep - (rival?.rep ?? u.rep)) / 40 + (p.morale - 40) / 100 + (w.board.conf - 50) / 200, 0.1, 0.9);
      if (Math.random() < odds) {
        mor(10);
        text = `Deu certo: ${p.name} decidiu ficar e está motivado (moral +10).`;
      } else {
        mor(-10);
        text = `${p.name} não se convenceu e continua querendo sair (moral −10).`;
      }
    } else if (key === 'liberar') {
      p.listed = true;
      mor(8);
      text = `${p.name} está à venda e agradece (moral +8). As propostas chegam nas janelas.`;
    } else if (key === 'negar') {
      mor(-15);
      text = `${p.name} ficou revoltado com a decisão (moral −15).`;
    } else return { ok: false, text: 'Opção inválida.' };
  }
  t.answer = key;
  t.result = text;
  m.read = true;
  return { ok: true, text };
}

// ---------- Conversa no vestiário ----------
export const TEAM_TALKS: Record<TeamTalkKey, { name: string; desc: string }> = {
  motivar: { name: 'Motivar', desc: 'Empolga o grupo. Funciona melhor quando o time é zebra ou em clássicos.' },
  tranquilizar: { name: 'Tranquilizar', desc: 'Tira a pressão. Funciona melhor em jogos grandes e mata-matas.' },
  cobrar: { name: 'Cobrar', desc: 'Exige resultado. Funciona com o time favorito e moral alto; com moral baixo, piora.' },
};

/** Contexto do jogo para a conversa no vestiário. */
export function talkContext(w: World, m: Match): { favorite: boolean; underdog: boolean; big: boolean; morale: number } {
  const u = user(w);
  const opp = w.clubs[m.h === u.id ? m.a : m.h];
  const diff = teamRating(w, u) - teamRating(w, opp) + (m.neutral ? 0 : m.h === u.id ? 2 : -2);
  const lineup = u.lineup.map((id) => (id ? w.players[id] : null)).filter((p): p is Player => !!p);
  const morale = lineup.length ? lineup.reduce((s, p) => s + p.morale, 0) / lineup.length : 60;
  return { favorite: diff >= 3, underdog: diff <= -3, big: isDerby(w, m) || isKnockout(m.comp), morale };
}

/** Escolhe a conversa no vestiário para o jogo da semana (uma vez por jogo). Devolve o efeito. */
export function giveTeamTalk(w: World, m: Match, key: TeamTalkKey): TeamTalk {
  const cx = talkContext(w, m);
  let mult = 1, text = '';
  if (key === 'motivar') {
    mult = cx.underdog || cx.big ? 1.035 : 1.01;
    text = cx.underdog || cx.big ? 'O grupo entrou pilhado: o time vai render mais.' : 'O time ouviu, mas sem grande efeito.';
  } else if (key === 'tranquilizar') {
    mult = cx.big ? 1.03 : cx.favorite ? 1.01 : 1;
    text = cx.big ? 'Sem ansiedade: o time vai jogar solto no jogo grande.' : 'Os jogadores entraram calmos.';
  } else {
    if (cx.morale < 50) { mult = 0.975; text = 'Com o moral baixo, a cobrança pesou: o time entrou tenso.'; }
    else if (cx.favorite && cx.morale >= 65) { mult = 1.035; text = 'O time respondeu à cobrança e entrou ligado.'; }
    else { mult = 1.005; text = 'A cobrança foi ouvida.'; }
  }
  const talk: TeamTalk = { season: w.season, week: w.week, key, mult, text };
  w.teamTalk = talk;
  // A conversa também mexe no moral dos titulares.
  const d = mult >= 1.03 ? 3 : mult < 1 ? -4 : 0;
  if (d) for (const id of user(w).lineup) { const p = id ? w.players[id] : null; if (p) p.morale = clamp(p.morale + d, 10, 100); }
  return talk;
}

/** Multiplicador da conversa no vestiário para o time do usuário nesta semana (1 sem conversa). */
export function teamTalkMult(w: World): number {
  const t = w.teamTalk;
  return t && t.season === w.season && t.week === w.week ? t.mult : 1;
}

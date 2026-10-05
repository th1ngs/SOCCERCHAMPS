// Coletiva de imprensa (v12): antes e depois dos jogos grandes (clássicos, mata-mata da fase final, continentais e
// confrontos diretos pelo topo) o treinador escolhe o tom da resposta. O tom mexe no moral do elenco, na torcida, na
// diretoria e no rendimento do jogo; a resposta de antes ainda é cobrada (ou celebrada) depois, conforme o resultado.
import { isDerbyClubs } from './engine';
import { compWith, competitionName, isContinental, isKnockout, LEAGUES, matchStage } from './leagues';
import type { Match, PressConf, PressEffects, PressPostTone, PressTone, World } from './types';
import { clamp, formatMoney } from './util';
import { addMoney, clubPlayers, pushMessage, table, user } from './world';

export const PRESS_TONES: Record<PressTone, { name: string; desc: string }> = {
  confiante: { name: 'Confiante', desc: 'Elenco e torcida gostam; perder depois pesa.' },
  humilde: { name: 'Humilde', desc: 'Agrada a diretoria e não cria risco.' },
  provocador: { name: 'Provocador', desc: 'Inflama todo mundo, o rival também. Vitória vira festa; derrota, crise.' },
  evasivo: { name: 'Evasivo', desc: 'Sem manchete e sem risco; a torcida queria mais.' },
};

export const PRESS_POST: Record<PressPostTone, { name: string; desc: string }> = {
  elogiar: { name: 'Elogiar o elenco', desc: 'Moral sobe; depois de derrota, a torcida acha pouco.' },
  assumir: { name: 'Assumir a responsabilidade', desc: 'Protege o grupo e agrada a diretoria.' },
  arbitragem: { name: 'Reclamar da arbitragem', desc: 'A torcida apoia; a diretoria não gosta e pode vir multa.' },
  cobrar: { name: 'Cobrar o elenco', desc: 'Diretoria e torcida aprovam; o moral cai.' },
};

const ZERO: PressEffects = { morale: 0, fans: 0, board: 0 };

/** Escolha estável (não muda a cada render) a partir do id do jogo. */
function stable<T>(id: string, list: T[]): T {
  const h = [...id].reduce((n, ch) => (n * 33 + ch.charCodeAt(0)) >>> 0, 5381);
  return list[h % list.length];
}

/** Motivo de o jogo ser "grande" para o usuário, ou null. */
export function pressReason(w: World, m: Match): string | null {
  const u = user(w);
  if (w.playerCareer || (m.h !== u.id && m.a !== u.id)) return null;
  const opp = m.h === u.id ? m.a : m.h;
  if (isDerbyClubs(w, m.h, m.a)) return `Clássico contra o ${w.clubs[opp].name}`;
  const wk = w.weeks.find((x) => x?.matches.some((y) => y.id === m.id));
  if (isKnockout(m.comp)) {
    const stage = matchStage(m, wk?.round ?? 0);
    const late = m.size ? m.size <= 4 : /^(semifinal|final)$/i.test(stage);
    if (late || isContinental(m.comp)) return `${stage} ${compWith('de', competitionName(m.comp))}`;
    return null;
  }
  if (m.comp === u.div && w.week >= 6) {
    const t = table(w, u.div);
    const pu = t.findIndex((r) => r.id === u.id), po = t.findIndex((r) => r.id === opp);
    if (pu >= 0 && po >= 0 && pu < 4 && po < 4) return `Confronto direto pelo topo (${pu + 1}º x ${po + 1}º)`;
  }
  return null;
}

/** Coletiva já registrada para o jogo. */
export const pressFor = (w: World, matchId: string): PressConf | undefined => w.press?.find((p) => p.matchId === matchId);

/** Abre (ou devolve) a coletiva de antes de um jogo grande; null se o jogo não for grande. */
export function pressConf(w: World, m: Match): PressConf | null {
  const have = pressFor(w, m.id);
  if (have) return have;
  const reason = pressReason(w, m);
  if (!reason) return null;
  const u = user(w);
  const opp = w.clubs[m.h === u.id ? m.a : m.h];
  const question = stable(m.id, [
    `O ${opp.name} disse que vocês chegam pressionados. O ${u.name} é favorito?`,
    `${reason}: o que o torcedor do ${u.name} pode esperar?`,
    `A imprensa aponta o ${opp.name} como favorito. Como você vê o jogo?`,
    `Vale a temporada? Qual o recado para o vestiário do ${opp.name}?`,
  ]);
  return { season: w.season, week: w.week, matchId: m.id, opp: opp.id, reason, question };
}

function apply(w: World, fx: PressEffects): void {
  const u = user(w);
  if (fx.board) w.board.conf = clamp(w.board.conf + fx.board, 0, 100);
  if (fx.fans) u.fans = clamp((u.fans ?? 60) + fx.fans, 0, 100);
  if (fx.morale) for (const p of clubPlayers(w, u)) if (p) p.morale = clamp(p.morale + fx.morale, 10, 100);
}

const fxText = (fx: PressEffects): string => [
  fx.morale ? `moral ${fx.morale > 0 ? '+' : ''}${fx.morale}` : '',
  fx.fans ? `torcida ${fx.fans > 0 ? '+' : ''}${fx.fans}` : '',
  fx.board ? `diretoria ${fx.board > 0 ? '+' : ''}${fx.board}` : '',
].filter(Boolean).join(', ') || 'sem efeito';
export const pressFxText = fxText;

function store(w: World, pc: PressConf): void {
  const list = (w.press ??= []);
  if (!list.includes(pc)) list.push(pc);
  if (list.length > 12) list.splice(0, list.length - 12);
}

/** Responde a coletiva de antes do jogo. */
export function pressBefore(w: World, m: Match, tone: PressTone): PressConf | null {
  const pc = pressConf(w, m);
  if (!pc || pc.tone || m.played) return pc;
  const u = user(w);
  const opp = w.clubs[pc.opp];
  const morale = clubPlayers(w, u).filter(Boolean).reduce((s, p, _, a) => s + p.morale / a.length, 0);
  let fx: PressEffects, headline: string, mult = 1, oppMult = 1;
  if (tone === 'confiante') {
    fx = { morale: morale >= 55 ? 3 : 1, fans: 2, board: 0 };
    mult = 1.015;
    headline = `“Viemos para ganhar”: técnico do ${u.name} confia na vitória`;
  } else if (tone === 'humilde') {
    fx = { morale: 1, fans: 0, board: 2 };
    mult = 1.005;
    headline = `Técnico do ${u.name} respeita o ${opp.name}: “jogo de detalhes”`;
  } else if (tone === 'provocador') {
    fx = { morale: 2, fans: 4, board: -2 };
    mult = morale >= 60 ? 1.03 : 1.01;
    oppMult = 1.02;
    headline = `Polêmica! Técnico do ${u.name} provoca o ${opp.name}`;
  } else {
    fx = { morale: 0, fans: -1, board: 0 };
    headline = `Técnico do ${u.name} evita polêmica antes do jogo`;
  }
  apply(w, fx);
  Object.assign(pc, { tone, fx, headline, mult, oppMult });
  store(w, pc);
  pushMessage(w, { kind: 'news', title: headline, body: `Coletiva — ${pc.reason}.\nPergunta: ${pc.question}\nTom: ${PRESS_TONES[tone].name}. Efeito: ${fxText(fx)}.` });
  return pc;
}

/** Resultado do usuário no jogo: 1 vitória, 0 empate, −1 derrota (pênaltis decidem). */
function outcome(w: World, m: Match): number {
  const s = m.h === w.userClub ? 0 : 1;
  const gf = (s ? m.as : m.hs) ?? 0, ga = (s ? m.hs : m.as) ?? 0;
  if (gf !== ga) return gf > ga ? 1 : -1;
  if (m.pens) return (s ? m.pens[1] > m.pens[0] : m.pens[0] > m.pens[1]) ? 1 : -1;
  return 0;
}

/** Pergunta da coletiva de depois do jogo (só jogos grandes já disputados). */
export function pressAfterQuestion(w: World, m: Match): string | null {
  if (!m.played) return null;
  const pc = pressConf(w, m);
  if (!pc) return null;
  const r = outcome(w, m);
  const opp = w.clubs[pc.opp];
  return r > 0 ? `Vitória sobre o ${opp.name}. A quem você dedica o resultado?` : r < 0 ? `Derrota para o ${opp.name}. O que faltou?` : `Empate com o ${opp.name}. Ficou satisfeito?`;
}

/** Responde a coletiva de depois do jogo. */
export function pressAfter(w: World, m: Match, tone: PressPostTone): PressConf | null {
  const pc = pressConf(w, m);
  if (!pc || pc.post || !m.played) return pc;
  const u = user(w);
  const r = outcome(w, m);
  let fx: PressEffects, headline: string;
  if (tone === 'elogiar') {
    fx = r > 0 ? { morale: 4, fans: 1, board: 0 } : r === 0 ? { morale: 2, fans: 0, board: 0 } : { morale: 1, fans: -2, board: 0 };
    headline = r < 0 ? `Mesmo na derrota, técnico do ${u.name} elogia o elenco` : `Técnico do ${u.name} exalta o grupo: “mérito deles”`;
  } else if (tone === 'assumir') {
    fx = r < 0 ? { morale: 3, fans: 0, board: 2 } : { morale: 1, fans: 0, board: 1 };
    headline = r < 0 ? `“A culpa é minha”: técnico do ${u.name} protege os jogadores` : `Técnico do ${u.name} divide os méritos com a comissão`;
  } else if (tone === 'arbitragem') {
    const fine = Math.random() < 0.35;
    fx = r < 0 ? { morale: 1, fans: 3, board: fine ? -4 : -2 } : { morale: 0, fans: 1, board: -2 };
    headline = `Técnico do ${u.name} detona a arbitragem`;
    if (fine) {
      const amount = Math.round((20e3 + u.rep * 1e3) * (LEAGUES[u.league].wealth ?? 1) / 1000) * 1000;
      addMoney(w, u.id, -amount, 'other');
      headline += ` e é multado em ${formatMoney(amount)}`;
    }
  } else {
    fx = r < 0 ? { morale: -4, fans: 2, board: 2 } : { morale: -2, fans: 0, board: 1 };
    headline = `Técnico do ${u.name} cobra o elenco em público`;
  }
  apply(w, fx);
  Object.assign(pc, { postQuestion: pressAfterQuestion(w, m) ?? '', post: tone, postFx: fx, postHeadline: headline });
  store(w, pc);
  pushMessage(w, { kind: 'news', title: headline, body: `Coletiva pós-jogo — ${pc.reason}.\nTom: ${PRESS_POST[tone].name}. Efeito: ${fxText(fx)}.` });
  return pc;
}

/**
 * Fim da semana: a resposta de antes do jogo é cobrada pelo resultado (chamado no endWeek). Confiança vira festa
 * na vitória e cobrança na derrota; a provocação amplifica os dois lados.
 */
export function settlePress(w: World): void {
  for (const pc of w.press ?? []) {
    if (!pc.tone || pc.settled || pc.season !== w.season) continue;
    const m = w.weeks[pc.week]?.matches.find((x) => x.id === pc.matchId);
    if (!m?.played) continue;
    const r = outcome(w, m);
    const opp = w.clubs[pc.opp]?.name ?? 'rival';
    let fx = ZERO, text = '';
    if (pc.tone === 'confiante') {
      if (r > 0) { fx = { morale: 1, fans: 2, board: 1 }; text = `Prometeu e cumpriu: a confiança antes do jogo com o ${opp} virou moral.`; }
      else if (r < 0) { fx = { morale: -1, fans: -3, board: -3 }; text = `A confiança antes do jogo virou cobrança depois da derrota para o ${opp}.`; }
    } else if (pc.tone === 'provocador') {
      if (r > 0) { fx = { morale: 3, fans: 4, board: 1 }; text = `A provocação ao ${opp} virou festa: a torcida canta o nome do técnico.`; }
      else if (r < 0) { fx = { morale: -3, fans: -6, board: -4 }; text = `A provocação ao ${opp} saiu pela culatra: zoação geral e crise no clube.`; }
    } else if (pc.tone === 'evasivo' && r < 0) { fx = { morale: 0, fans: -1, board: 0 }; text = `Sem respostas antes e sem resultado depois.`; }
    pc.settled = text || 'Sem repercussão.';
    pc.settledFx = fx;
    if (text) {
      apply(w, fx);
      pushMessage(w, { kind: r > 0 ? 'news' : 'board', title: r > 0 ? 'A coletiva deu certo' : 'A coletiva virou cobrança', body: `${text}\nEfeito: ${fxText(fx)}.` });
    }
  }
}

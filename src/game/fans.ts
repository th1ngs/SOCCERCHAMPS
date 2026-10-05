// Torcida organizada (v12): sócios (receita semanal), humor (Club.fans) e eventos com faixas — protestos e
// cobranças nas sequências ruins, festa nas boas, carreata nos títulos. Só para o clube do usuário.
import { compWeight, isKnockout, LEAGUES } from './leagues';
import type { Club, FanEvent, FanEventKind, Torcida, World } from './types';
import { clamp, pick } from './util';
import { isDerbyClubs } from './engine';
import { addMoney, clubPlayers, pushMessage, user, userForm } from './world';

/** Contribuição semanal de cada sócio (R$, antes do fator da liga). */
export const MEMBER_FEE = 3.2;
/** Semanas mínimas entre dois eventos da torcida (títulos furam a fila). */
const COOLDOWN = 3;

const PREFIX = ['Mancha', 'Força Jovem', 'Fúria', 'Garra', 'Raça', 'Torcida Jovem', 'Independente', 'Dragões', 'Leões', 'Esquadrão'];

/** Nome da organizada a partir do apelido do clube ("Mancha Alvianil"). */
export function groupName(c: Club): string {
  const word = (c.nickname || c.name).split(/\s+/)[0];
  const hash = [...c.id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const prefix = PREFIX[hash % PREFIX.length];
  return `${prefix} ${word}`;
}

/** Sócios de partida: capacidade do estádio e reputação. */
export const baseMembers = (c: Club): number => Math.round(c.cap * (0.25 + c.rep / 180) / 100) * 100;

/** Torcida do clube do usuário (criada na primeira vez). */
export function torcida(w: World): Torcida {
  const u = user(w);
  if (!w.torcida || w.torcida.club !== u.id) {
    w.torcida = { club: u.id, group: groupName(u), members: baseMembers(u), events: [], lastWeek: -99 };
  }
  return w.torcida;
}

const abs = (w: World): number => w.season * 100 + w.week;
const last = (w: World): FanEvent | undefined => w.torcida?.events[w.torcida.events.length - 1];

function event(w: World, kind: FanEventKind, title: string, banners: string[], effects: { board?: number; morale?: number; fans?: number; members?: number }): FanEvent {
  const t = torcida(w);
  const u = user(w);
  if (effects.board) w.board.conf = clamp(w.board.conf + effects.board, 0, 100);
  if (effects.fans) u.fans = clamp((u.fans ?? 60) + effects.fans, 0, 100);
  if (effects.morale) for (const p of clubPlayers(w, u)) p.morale = clamp(p.morale + effects.morale, 10, 100);
  const delta = effects.members ? Math.round(t.members * effects.members) : 0;
  t.members = Math.max(500, t.members + delta);
  const ev: FanEvent = { id: `${w.season}-${w.week}-${kind}`, season: w.season, week: w.week, kind, title, banners, board: effects.board ?? 0, morale: effects.morale ?? 0, members: delta };
  t.events.push(ev);
  if (t.events.length > 20) t.events.shift();
  t.lastWeek = abs(w);
  (w.ceremonies ??= []).push({ kind: 'fans', id: ev.id });
  if (w.ceremonies.length > 8) w.ceremonies.splice(0, w.ceremonies.length - 8);
  const fx = [
    ev.board ? `diretoria ${ev.board > 0 ? '+' : ''}${ev.board}` : '',
    ev.morale ? `moral do elenco ${ev.morale > 0 ? '+' : ''}${ev.morale}` : '',
    ev.members ? `${ev.members > 0 ? '+' : ''}${ev.members.toLocaleString('pt-BR')} sócios` : '',
  ].filter(Boolean).join(', ');
  pushMessage(w, { kind: kind === 'festa' || kind === 'carreata' || kind === 'mosaico' ? 'news' : 'board', title: `${t.group}: ${title}`, body: `Faixas: ${banners.map((b) => `“${b}”`).join(' • ')}.${fx ? `\nEfeito: ${fx}.` : ''}` });
  return ev;
}

/**
 * Semana do usuário (chamado no endWeek): receita dos sócios, sócios acompanhando o humor e os eventos da
 * organizada pela sequência de resultados.
 */
export function fansWeek(w: World): void {
  if (w.playerCareer) return;
  const t = torcida(w);
  const u = user(w);
  // Receita e oscilação dos sócios (o humor puxa para cima ou para baixo, devagar).
  addMoney(w, u.id, Math.round(t.members * MEMBER_FEE * LEAGUES[u.league].wealth), 'commercial');
  const target = baseMembers(u) * (0.55 + (u.fans ?? 60) / 110);
  t.members = Math.max(500, Math.round(t.members + (target - t.members) * 0.02));
  if (abs(w) - t.lastWeek < COOLDOWN || w.week < 3) return;

  const form = userForm(w, 6);
  if (form.length < 3) return;
  const recent = form.slice().reverse();
  let winless = 0, losses = 0, wins = 0;
  for (const r of recent) { if (r === 'V') break; winless++; }
  for (const r of recent) { if (r !== 'D') break; losses++; }
  for (const r of recent) { if (r !== 'V') break; wins++; }
  const name = w.manager.name;
  const fans = u.fans ?? 60;
  const prev = last(w);
  if (winless >= 5 && fans < 35 && w.board.conf < 40) {
    event(w, 'cobranca', 'cobrança na sede do clube', [`Diretoria omissa!`, `${u.short}: honre a camisa`, `Queremos explicações`], { board: -6, morale: -2, members: -0.03 });
  } else if (winless >= 5 || (losses >= 3 && fans < 40)) {
    event(w, 'protesto', 'protesto no CT', [`Fora, ${name}!`, `Time sem raça`, `Respeita a camisa`, `${u.name}: acorda!`], { board: -5, morale: -3, members: -0.02 });
  } else if (losses >= 3 || (winless >= 4 && prev?.kind !== 'faixas')) {
    event(w, 'faixas', 'faixas de cobrança no estádio', [`Acorda, ${u.name}!`, `Queremos raça`, `Ninguém é maior que o clube`], { board: -2, morale: -1, members: -0.01 });
  } else if (wins >= 4) {
    event(w, 'festa', 'festa nas arquibancadas', [`Time de guerreiros!`, `${name}, eu acredito!`, `${u.short} até o fim`], { fans: 3, morale: 2, members: 0.02 });
  }
}

/** Vitória em clássico: mosaico e provocação ao rival. */
export function fansDerby(w: World, rival: string, won: boolean): void {
  if (w.playerCareer || !won) return;
  const u = user(w);
  const r = w.clubs[rival];
  if (!r || !isDerbyClubs(w, u.id, rival)) return;
  event(w, 'mosaico', `mosaico depois da vitória no clássico`, [`${u.city || u.name} é ${u.short}!`, `Freguês: ${r.short}`, pick(['Clássico é clássico', 'Aqui é a nossa casa', 'O rival chora'])], { fans: 4, morale: 2, members: 0.015 });
}

/** Título: carreata e onda de novos sócios (proporcional à importância da taça). */
export function fansTitle(w: World, comp: string, name: string): void {
  if (w.playerCareer) return;
  const weight = isKnockout(comp) ? compWeight(comp) : 1;
  event(w, 'carreata', `carreata pelo título ${name.startsWith('Campeonato') ? 'do' : 'da'} ${name}`, [`É campeão!`, `${name} ${w.season}`, `Obrigado, ${w.manager.name}!`], { fans: Math.round(6 + 8 * weight), morale: 3, members: 0.03 + 0.07 * weight, board: 2 });
}

/** Evento da torcida por id (para a tela). */
export const fanEvent = (w: World, id: string): FanEvent | undefined => w.torcida?.events.find((e) => e.id === id);

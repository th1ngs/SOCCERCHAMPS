// Atualização de saves antigos para o formato atual do World (idempotente).
import { CLUBS, TICKET_PRICES, injuryLabel } from './data';
import { WORLD_VERSION, rollStar, rollTraits } from './gen';
import { pickCaptain, pickPenTaker } from './squad';
import type { Club, Player, World } from './types';

/** Visão "talvez incompleta" de um objeto salvo por uma versão antiga. */
type Loose<T> = { [K in keyof T]?: T[K] };

function migrateClub(w: World, c: Club): void {
  const lc = c as Loose<Club>;
  const stat = CLUBS.find((x) => x.id === c.id);
  if (typeof lc.nickname !== 'string') c.nickname = stat ? stat.nickname : c.name;
  if (typeof lc.mascot !== 'string') c.mascot = stat ? stat.mascot : '';
  if (typeof lc.stadium !== 'string') c.stadium = stat ? stat.stadium : `Estádio de ${c.city}`;
  if (typeof lc.rival !== 'string') c.rival = stat ? stat.rival : '';
  if (typeof lc.fans !== 'number' || !Number.isFinite(lc.fans)) c.fans = 60;
  if (!lc.ticketPrice || !(lc.ticketPrice in TICKET_PRICES)) c.ticketPrice = 'normal';
  if (lc.loan === undefined) c.loan = null;
  if (lc.captain === undefined || (c.captain && !c.squad.includes(c.captain))) c.captain = null;
  if (lc.penTaker === undefined || (c.penTaker && !c.squad.includes(c.penTaker))) c.penTaker = null;
  if (!lc.lineup) c.lineup = [];
  if (!lc.bench) c.bench = [];
  if (!lc.trophies) c.trophies = [];
  if (!c.captain && c.squad.length) pickCaptain(w, c);
  if (!c.penTaker && c.squad.length) pickPenTaker(w, c);
}

function migratePlayer(p: Player): void {
  const lp = p as Loose<Player>;
  if (!Array.isArray(lp.traits)) p.traits = rollTraits(p.pos);
  if (typeof lp.star !== 'boolean') p.star = rollStar();
  if (lp.injType === undefined) p.injType = p.inj > 0 ? injuryLabel(p.inj) : null;
}

/**
 * Completa campos que faltam em saves antigos e marca o World como versão atual.
 * Seguro para rodar várias vezes: só preenche o que está ausente ou inválido.
 * Muta e devolve o próprio objeto.
 */
export function migrateWorld(w: World): World {
  const lw = w as Loose<World>;
  if (!lw.finWeek) w.finWeek = {};
  if (!lw.finSeason) w.finSeason = {};
  if (!lw.finance) w.finance = [];
  if (!lw.history) w.history = [];
  if (!lw.inbox) w.inbox = [];
  if (!lw.free) w.free = [];
  const board = (lw.board || {}) as Loose<World['board']>;
  w.board = { conf: typeof board.conf === 'number' ? board.conf : 60, target: board.target ?? 0, label: board.label ?? '' };
  const cup = (lw.cup || {}) as Loose<World['cup']>;
  w.cup = { alive: Array.isArray(cup.alive) ? cup.alive : [], champion: cup.champion ?? null };
  for (const p of Object.values(w.players)) migratePlayer(p);
  for (const c of Object.values(w.clubs)) migrateClub(w, c);
  if (!(typeof lw.version === 'number' && lw.version >= WORLD_VERSION)) w.version = WORLD_VERSION;
  return w;
}

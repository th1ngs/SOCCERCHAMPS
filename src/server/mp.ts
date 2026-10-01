import "server-only";
import { randomInt } from "node:crypto";
import { CLUBS } from "@/game/data";
import { AuthError } from "./auth";
import { ensureSchema, pool } from "./db";
import { NotFoundError } from "./careers";

/** Lances por partida (somando os dois jogadores): 3, 5 ou 7 para cada um. */
export const MP_TURNS = [6, 10, 14] as const;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Sem jogadas por este tempo, o outro jogador pode reivindicar a vitória. */
const CLAIM_AFTER_S = 120;
/** Salas esperando adversário somem da lista depois disso. */
const OPEN_FOR_MIN = 20;

export type MpStatus = "waiting" | "playing" | "done" | "abandoned";

/** Lance de um jogador no duelo (o anfitrião ataca nos lances pares, o visitante nos ímpares). */
export interface MpMove {
  by: 0 | 1;
  kind: "chance";
  goal: boolean;
  /** Narração curta do lance ("Defesaça de Fulano!"). */
  text: string;
}

export interface MpResult {
  score: [number, number];
  /** 0 = anfitrião, 1 = visitante, -1 = empate. */
  winner: number;
  reason: "fim" | "abandono" | "ausencia";
}

export interface MpRoomView {
  code: string;
  side: 0 | 1 | null;
  status: MpStatus;
  turns: number;
  host: { name: string; team: string };
  guest: { name: string; team: string } | null;
  moves: MpMove[];
  total: number;
  result: MpResult | null;
  /** Segundos desde a última atividade. */
  idle: number;
}

interface Row {
  code: string; host_id: string; host_name: string; host_team: string; guest_id: string | null; guest_name: string | null; guest_team: string | null;
  turns: number; status: MpStatus; moves: MpMove[]; result: MpResult | null; idle: number;
}

export class MpError extends AuthError {}

const validTeam = (t: unknown): t is string => typeof t === "string" && CLUBS.some((c) => c.id === t);

function view(r: Row, accountId: string, since = 0): MpRoomView {
  const side = r.host_id === accountId ? 0 : r.guest_id === accountId ? 1 : null;
  return {
    code: r.code, side, status: r.status, turns: r.turns,
    host: { name: r.host_name, team: r.host_team },
    guest: r.guest_id ? { name: r.guest_name ?? "?", team: r.guest_team ?? "" } : null,
    moves: r.moves.slice(Math.max(0, since)), total: r.moves.length, result: r.result, idle: Math.round(r.idle),
  };
}

const SELECT = "select code, host_id, host_name, host_team, guest_id, guest_name, guest_team, turns, status, moves, result, extract(epoch from now() - updated_at) as idle from mp_rooms";

async function load(code: string): Promise<Row> {
  const r = await pool().query<Row>(`${SELECT} where code = $1`, [code.toUpperCase()]);
  if (!r.rows[0]) throw new NotFoundError("Sala não encontrada.");
  return r.rows[0];
}

function newCode(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

export async function listOpen(accountId: string) {
  await ensureSchema();
  const open = await pool().query<{ code: string; host_name: string; host_team: string; turns: number }>(
    `select code, host_name, host_team, turns from mp_rooms where status = 'waiting' and host_id <> $1 and updated_at > now() - interval '${OPEN_FOR_MIN} minutes' order by created_at desc limit 20`,
    [accountId],
  );
  const mine = await pool().query<{ code: string; status: MpStatus }>(
    "select code, status from mp_rooms where (host_id = $1 or guest_id = $1) and status in ('waiting','playing') order by updated_at desc limit 1",
    [accountId],
  );
  return { open: open.rows.map((r) => ({ code: r.code, host: r.host_name, team: r.host_team, turns: r.turns })), mine: mine.rows[0] ?? null };
}

export async function createRoom(account: { id: string; nickname: string }, team: unknown, turns: unknown) {
  if (!validTeam(team)) throw new MpError("Escolha um time válido.");
  const t = MP_TURNS.includes(turns as (typeof MP_TURNS)[number]) ? (turns as number) : 10;
  await ensureSchema();
  // Uma sala aberta por conta: as antigas esperando adversário são canceladas.
  await pool().query("update mp_rooms set status = 'abandoned', updated_at = now() where host_id = $1 and status = 'waiting'", [account.id]);
  for (let k = 0; k < 5; k++) {
    const code = newCode();
    const r = await pool().query(
      "insert into mp_rooms (code, host_id, host_name, host_team, turns) values ($1,$2,$3,$4,$5) on conflict (code) do nothing",
      [code, account.id, account.nickname, team, t],
    );
    if (r.rowCount) return view(await load(code), account.id);
  }
  throw new MpError("Não foi possível criar a sala. Tente de novo.");
}

export async function joinRoom(account: { id: string; nickname: string }, code: unknown, team: unknown) {
  if (typeof code !== "string" || !/^[A-Z0-9]{5}$/i.test(code)) throw new MpError("Código inválido.");
  if (!validTeam(team)) throw new MpError("Escolha um time válido.");
  await ensureSchema();
  const r = await pool().query(
    "update mp_rooms set guest_id = $2, guest_name = $3, guest_team = $4, status = 'playing', updated_at = now() where code = $1 and status = 'waiting' and guest_id is null and host_id <> $2",
    [code.toUpperCase(), account.id, account.nickname, team],
  );
  const room = await load(code);
  if (!r.rowCount && room.guest_id !== account.id) {
    if (room.host_id === account.id) throw new MpError("Esta sala é sua: espere um adversário.");
    throw new MpError("A sala não está mais disponível.");
  }
  return view(room, account.id);
}

export async function getRoom(accountId: string, code: string, since: number) {
  await ensureSchema();
  const room = await load(code);
  if (room.host_id !== accountId && room.guest_id !== accountId) throw new MpError("Você não está nesta sala.", 403);
  return view(room, accountId, since);
}

function parseMove(m: unknown, side: 0 | 1): MpMove {
  const o = (m ?? {}) as Record<string, unknown>;
  if (o.by !== side) throw new MpError("Não é a sua vez.");
  if (o.kind !== "chance" || typeof o.goal !== "boolean") throw new MpError("Lance inválido.");
  const text = typeof o.text === "string" ? o.text.slice(0, 140) : "";
  return { by: side, kind: "chance", goal: o.goal, text };
}

/** Placar do duelo a partir dos lances gravados. */
export function duelScore(moves: MpMove[]): [number, number] {
  const s: [number, number] = [0, 0];
  for (const m of moves) if (m.goal) s[m.by]++;
  return s;
}

/** Grava a jogada `seq` (a próxima da sala). Conflito de sequência devolve 409 para o cliente se ressincronizar. */
export async function postMove(accountId: string, code: string, seq: unknown, move: unknown) {
  await ensureSchema();
  const room = await load(code);
  const side = room.host_id === accountId ? 0 : room.guest_id === accountId ? 1 : null;
  if (side === null) throw new MpError("Você não está nesta sala.", 403);
  if (room.status !== "playing") throw new MpError("A partida não está em andamento.", 409);
  if (!Number.isInteger(seq)) throw new MpError("Sequência inválida.");
  if ((seq as number) % 2 !== side) throw new MpError("Não é a sua vez.", 409);
  if ((seq as number) >= room.turns) throw new MpError("A partida já terminou.", 409);
  const m = parseMove(move, side);
  const r = await pool().query(
    "update mp_rooms set moves = moves || $3::jsonb, updated_at = now() where code = $1 and status = 'playing' and jsonb_array_length(moves) = $2",
    [room.code, seq, JSON.stringify([m])],
  );
  if (!r.rowCount) throw new MpError("Jogada fora de sequência.", 409);
  return { ok: true, seq };
}

/** Encerra a partida: o placar sai dos lances gravados no servidor. */
export async function finishRoom(accountId: string, code: string) {
  await ensureSchema();
  const room = await load(code);
  if (room.host_id !== accountId && room.guest_id !== accountId) throw new MpError("Você não está nesta sala.", 403);
  if (room.moves.length < room.turns) throw new MpError("A partida ainda não terminou.", 409);
  const score = duelScore(room.moves);
  const winner = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
  const result: MpResult = { score: [score[0], score[1]], winner, reason: "fim" };
  await pool().query("update mp_rooms set status = 'done', result = $2, updated_at = now() where code = $1 and status = 'playing'", [room.code, JSON.stringify(result)]);
  return view(await load(code), accountId);
}

/** Sai da sala: esperando, a sala é cancelada; em jogo, conta como abandono (vitória do outro). */
export async function leaveRoom(accountId: string, code: string) {
  await ensureSchema();
  const room = await load(code);
  const side = room.host_id === accountId ? 0 : room.guest_id === accountId ? 1 : null;
  if (side === null) throw new MpError("Você não está nesta sala.", 403);
  if (room.status === "waiting") await pool().query("update mp_rooms set status = 'abandoned', updated_at = now() where code = $1", [room.code]);
  else if (room.status === "playing") {
    const result: MpResult = { score: duelScore(room.moves), winner: 1 - side, reason: "abandono" };
    await pool().query("update mp_rooms set status = 'done', result = $2, updated_at = now() where code = $1 and status = 'playing'", [room.code, JSON.stringify(result)]);
  }
  return { ok: true };
}

/** Adversário sumido há mais de CLAIM_AFTER_S: quem reivindica vence. */
export async function claimRoom(accountId: string, code: string) {
  await ensureSchema();
  const room = await load(code);
  const side = room.host_id === accountId ? 0 : room.guest_id === accountId ? 1 : null;
  if (side === null) throw new MpError("Você não está nesta sala.", 403);
  if (room.status !== "playing") throw new MpError("A partida não está em andamento.", 409);
  if (room.idle < CLAIM_AFTER_S) throw new MpError(`Aguarde: o adversário ainda tem ${Math.ceil(CLAIM_AFTER_S - room.idle)} s.`, 409);
  // Só reivindica quem está esperando: os lances se alternam (anfitrião nos pares, visitante nos ímpares).
  if (room.moves.length % 2 === side) throw new MpError("A vez é sua: jogue para continuar.", 409);
  const result: MpResult = { score: duelScore(room.moves), winner: side, reason: "ausencia" };
  await pool().query("update mp_rooms set status = 'done', result = $2, updated_at = now() where code = $1 and status = 'playing'", [room.code, JSON.stringify(result)]);
  return view(await load(code), accountId);
}

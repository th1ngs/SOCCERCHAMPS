import "server-only";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { ensureSchema, pool } from "./db";

const scrypt = promisify(scryptCallback);
const COOKIE = "scm.session";
const SESSION_AGE = 60 * 60 * 24 * 30;
const NICKNAME = /^[\p{L}\p{N}_]{3,24}$/u;

export class AuthError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function validate(nickname: unknown, password: unknown) {
  if (typeof nickname !== "string" || !NICKNAME.test(nickname.trim())) throw new AuthError("Nickname: use 3 a 24 letras, números ou _.");
  if (typeof password !== "string" || password.length < 8 || password.length > 128) throw new AuthError("A senha deve ter entre 8 e 128 caracteres.");
  return { nickname: nickname.trim(), key: nickname.trim().toLocaleLowerCase("pt-BR"), password };
}

async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex || hex.length !== 128) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hex, "hex"));
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

async function setSession(accountId: string) {
  const token = randomBytes(32).toString("base64url");
  await pool().query("insert into account_sessions (token_hash, account_id, expires_at) values ($1, $2, now() + interval '30 days')", [tokenHash(token), accountId]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_AGE });
}

export async function register(nickname: unknown, password: unknown) {
  const input = validate(nickname, password);
  await ensureSchema();
  const hash = await hashPassword(input.password);
  const result = await pool().query<{ id: string }>(
    "insert into accounts (nickname, nickname_key, password_hash) values ($1, $2, $3) on conflict (nickname_key) do nothing returning id",
    [input.nickname, input.key, hash],
  );
  if (!result.rowCount) throw new AuthError("Este nickname já está em uso.", 409);
  await setSession(result.rows[0].id);
  return { id: result.rows[0].id, nickname: input.nickname };
}

export async function login(nickname: unknown, password: unknown) {
  const input = validate(nickname, password);
  await ensureSchema();
  const attempt = await pool().query<{ blocked: boolean }>(
    "select blocked_until > now() as blocked from login_attempts where nickname_key = $1", [input.key],
  );
  if (attempt.rows[0]?.blocked) throw new AuthError("Muitas tentativas. Tente novamente em 15 minutos.", 429);
  const result = await pool().query<{ id: string; nickname: string; password_hash: string }>("select id, nickname, password_hash from accounts where nickname_key = $1", [input.key]);
  const matches = await verifyPassword(input.password, result.rows[0]?.password_hash ?? `${"0".repeat(32)}:${"0".repeat(128)}`);
  if (!result.rowCount || !matches) {
    await pool().query(
      `insert into login_attempts (nickname_key, failures, updated_at) values ($1, 1, now())
       on conflict (nickname_key) do update set
       failures = case when login_attempts.updated_at < now() - interval '15 minutes' then 1 else login_attempts.failures + 1 end,
       blocked_until = case when login_attempts.updated_at >= now() - interval '15 minutes' and login_attempts.failures >= 4
         then now() + interval '15 minutes' else null end,
       updated_at = now()`, [input.key],
    );
    throw new AuthError("Nickname ou senha incorretos.", 401);
  }
  await pool().query("delete from login_attempts where nickname_key = $1", [input.key]);
  await setSession(result.rows[0].id);
  return { id: result.rows[0].id, nickname: result.rows[0].nickname };
}

export async function currentAccount() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await ensureSchema();
  const result = await pool().query<{ id: string; nickname: string }>(
    "select a.id, a.nickname from account_sessions s join accounts a on a.id = s.account_id where s.token_hash = $1 and s.expires_at > now()",
    [tokenHash(token)],
  );
  return result.rows[0] ?? null;
}

export async function requireAccount() {
  const account = await currentAccount();
  if (!account) throw new AuthError("Entre na sua conta para acessar os saves.", 401);
  return account;
}

export async function logout() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) {
    await ensureSchema();
    await pool().query("delete from account_sessions where token_hash = $1", [tokenHash(token)]);
  }
  (await cookies()).delete(COOKIE);
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) throw new AuthError("Origem inválida.", 403);
}

import "server-only";
import { Pool, type PoolClient } from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";

declare global {
  // Reaproveita o pool entre recargas do servidor de desenvolvimento.
  var __scmPool: Pool | undefined;
  var __scmSchema: Promise<void> | undefined;
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL não configurada.");
  }
}

function makePool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes("host=/");
  return new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 8_000,
    ssl: local ? false : { rejectUnauthorized: true },
  });
}

export function pool(): Pool {
  globalThis.__scmPool ??= makePool();
  return globalThis.__scmPool;
}

/** Garante que as tabelas existem (uma vez por processo). */
export function ensureSchema(): Promise<void> {
  globalThis.__scmSchema ??= (async () => {
    const sql = await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
    await pool().query(sql);
  })().catch((e) => {
    globalThis.__scmSchema = undefined;
    throw e;
  });
  return globalThis.__scmSchema;
}

export async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

import "server-only";
import { DatabaseNotConfiguredError } from "./db";
import { MAX_SAVE_BYTES, NotFoundError, SaveError } from "./careers";

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Lê o corpo JSON respeitando o limite de tamanho. */
export async function readJson(req: Request): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_SAVE_BYTES) throw new SaveError("Save grande demais.");
  const text = await req.text();
  if (text.length > MAX_SAVE_BYTES) throw new SaveError("Save grande demais.");
  try {
    return JSON.parse(text);
  } catch {
    throw new SaveError("JSON inválido.");
  }
}

export function handleError(e: unknown) {
  if (e instanceof SaveError) return jsonError(400, e.message);
  if (e instanceof NotFoundError) return jsonError(404, e.message);
  if (e instanceof DatabaseNotConfiguredError) return jsonError(503, "Banco de dados não configurado no servidor.");
  console.error("[api]", e);
  return jsonError(503, "Banco de dados indisponível no momento.");
}

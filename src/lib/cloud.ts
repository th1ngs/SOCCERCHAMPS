// Cliente da API de carreiras na nuvem (Postgres via rotas /api).
import type { World } from "@/game/types";
import { canCompress, gzip } from "./compress";

export interface CloudSaved { code: string; updatedAt: string }

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Erro ${res.status}`);
  return body as T;
}

/** Corpo da requisição com o save; compactado com gzip quando o navegador permite. */
async function saveBody(data: World): Promise<RequestInit> {
  const json = JSON.stringify({ data });
  if (!canCompress()) return { body: json, headers: { "Content-Type": "application/json" } };
  return { body: (await gzip(json)) as BodyInit, headers: { "Content-Type": "application/octet-stream", "X-Save-Encoding": "gzip" } };
}

export const cloud = {
  create: async (data: World) => call<CloudSaved>("/api/careers", { method: "POST", ...(await saveBody(data)) }),
  update: async (code: string, data: World) => call<CloudSaved>(`/api/careers/${encodeURIComponent(code)}`, { method: "PUT", ...(await saveBody(data)) }),
  load: (code: string) => call<{ data: unknown; updatedAt: string }>(`/api/careers/${encodeURIComponent(code.trim().toUpperCase())}`),
};

export const CODE_PATTERN = /^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/;

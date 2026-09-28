// Cliente da API de carreiras na nuvem (Postgres via rotas /api).
import type { World } from "@/game/types";

export interface CloudSaved { code: string; updatedAt: string }

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Erro ${res.status}`);
  return body as T;
}

export const cloud = {
  create: (data: World) => call<CloudSaved>("/api/careers", { method: "POST", body: JSON.stringify({ data }) }),
  update: (code: string, data: World) => call<CloudSaved>(`/api/careers/${encodeURIComponent(code)}`, { method: "PUT", body: JSON.stringify({ data }) }),
  load: (code: string) => call<{ data: World; updatedAt: string }>(`/api/careers/${encodeURIComponent(code.trim().toUpperCase())}`),
};

export const CODE_PATTERN = /^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/;

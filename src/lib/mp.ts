// Cliente da API do multiplayer 1x1 (duelo de lances: salas por código, lances alternados).
export interface MpMove {
  by: 0 | 1;
  kind: "chance";
  goal: boolean;
  text: string;
}

export interface MpResult {
  score: [number, number];
  winner: number;
  reason: "fim" | "abandono" | "ausencia";
}

export interface MpRoom {
  code: string;
  side: 0 | 1 | null;
  status: "waiting" | "playing" | "done" | "abandoned";
  turns: number;
  host: { name: string; team: string };
  guest: { name: string; team: string } | null;
  moves: MpMove[];
  total: number;
  result: MpResult | null;
  idle: number;
}

export interface MpOpenRoom { code: string; host: string; team: string; turns: number }

export class MpHttpError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new MpHttpError((data as { error?: string }).error ?? `Erro ${res.status}`, res.status);
  return data as T;
}

export const mpApi = {
  list: () => call<{ open: MpOpenRoom[]; mine: { code: string; status: string } | null }>("/api/mp"),
  create: (team: string, turns: number) => call<{ room: MpRoom }>("/api/mp", { action: "create", team, turns }),
  join: (code: string, team: string) => call<{ room: MpRoom }>("/api/mp", { action: "join", code: code.trim().toUpperCase(), team }),
  room: (code: string, since = 0) => call<{ room: MpRoom }>(`/api/mp/${code}?since=${since}`),
  move: (code: string, seq: number, move: MpMove) => call<{ ok: true }>(`/api/mp/${code}`, { action: "move", seq, move }),
  finish: (code: string) => call<{ room: MpRoom }>(`/api/mp/${code}`, { action: "finish" }),
  leave: (code: string) => call<{ ok: true }>(`/api/mp/${code}`, { action: "leave" }),
  claim: (code: string) => call<{ room: MpRoom }>(`/api/mp/${code}`, { action: "claim" }),
};

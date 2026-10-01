import { assertSameOrigin, requireAccount } from "@/server/auth";
import { handleError, jsonError } from "@/server/http";
import { claimRoom, finishRoom, getRoom, leaveRoom, postMove } from "@/server/mp";

const NO_STORE = { "Cache-Control": "no-store" };
const validCode = (c: string) => /^[A-Z0-9]{5}$/i.test(c);

/** Estado da sala e as jogadas a partir de `since`. */
export async function GET(req: Request, ctx: RouteContext<"/api/mp/[code]">) {
  const code = (await ctx.params).code;
  if (!validCode(code)) return jsonError(400, "Código inválido.");
  try {
    const account = await requireAccount();
    const since = Math.max(0, Number(new URL(req.url).searchParams.get("since")) || 0);
    return Response.json({ room: await getRoom(account.id, code, since) }, { headers: NO_STORE });
  } catch (e) { return handleError(e); }
}

/** { action: "move", seq, move } | { action: "finish", score } | { action: "leave" } | { action: "claim" } */
export async function POST(req: Request, ctx: RouteContext<"/api/mp/[code]">) {
  const code = (await ctx.params).code;
  if (!validCode(code)) return jsonError(400, "Código inválido.");
  try {
    assertSameOrigin(req);
    const raw = await req.text();
    if (raw.length > 4096) return jsonError(413, "Requisição grande demais.");
    let body: { action?: string; seq?: unknown; move?: unknown; score?: unknown };
    try { body = JSON.parse(raw); } catch { return jsonError(400, "JSON inválido."); }
    const account = await requireAccount();
    switch (body.action) {
      case "move": return Response.json(await postMove(account.id, code, body.seq, body.move), { headers: NO_STORE });
      case "finish": return Response.json({ room: await finishRoom(account.id, code, body.score) }, { headers: NO_STORE });
      case "leave": return Response.json(await leaveRoom(account.id, code), { headers: NO_STORE });
      case "claim": return Response.json({ room: await claimRoom(account.id, code) }, { headers: NO_STORE });
      default: return jsonError(400, "Ação inválida.");
    }
  } catch (e) { return handleError(e); }
}

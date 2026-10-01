import { assertSameOrigin, requireAccount } from "@/server/auth";
import { handleError, jsonError } from "@/server/http";
import { createRoom, joinRoom, listOpen } from "@/server/mp";

const NO_STORE = { "Cache-Control": "no-store" };

/** Salas abertas para entrar e a sala ativa da conta. */
export async function GET() {
  try {
    const account = await requireAccount();
    return Response.json(await listOpen(account.id), { headers: NO_STORE });
  } catch (e) { return handleError(e); }
}

/** Cria uma sala ({ action: "create", team, turns }) ou entra numa ({ action: "join", code, team }). */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const raw = await req.text();
    if (raw.length > 2048) return jsonError(413, "Requisição grande demais.");
    let body: { action?: string; team?: unknown; turns?: unknown; code?: unknown };
    try { body = JSON.parse(raw); } catch { return jsonError(400, "JSON inválido."); }
    const account = await requireAccount();
    if (body.action === "create") return Response.json({ room: await createRoom(account, body.team, body.turns) }, { headers: NO_STORE });
    if (body.action === "join") return Response.json({ room: await joinRoom(account, body.code, body.team) }, { headers: NO_STORE });
    return jsonError(400, "Ação inválida.");
  } catch (e) { return handleError(e); }
}

import { assertSameOrigin, currentAccount, login, logout, register } from "@/server/auth";
import { handleError, jsonError } from "@/server/http";

export async function GET() {
  try { return Response.json({ account: await currentAccount() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return handleError(e); }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (Number(req.headers.get("content-length") ?? 0) > 4096) return jsonError(413, "Requisição grande demais.");
    const raw = await req.text();
    if (raw.length > 4096) return jsonError(413, "Requisição grande demais.");
    let body: { action?: string; nickname?: unknown; password?: unknown };
    try { body = JSON.parse(raw); } catch { return jsonError(400, "JSON inválido."); }
    if (!body || typeof body !== "object") return jsonError(400, "Dados inválidos.");
    const account = body.action === "register" ? await register(body.nickname, body.password)
      : body.action === "login" ? await login(body.nickname, body.password) : null;
    if (!account) return jsonError(400, "Ação inválida.");
    return Response.json({ account }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    await logout();
    return Response.json({ ok: true });
  } catch (e) { return handleError(e); }
}

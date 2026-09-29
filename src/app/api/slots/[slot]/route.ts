import { assertSameOrigin, requireAccount } from "@/server/auth";
import { handleError, jsonError, readJson } from "@/server/http";
import { loadSlot, saveSlot, validSlot } from "@/server/slots";

export async function GET(_req: Request, ctx: RouteContext<"/api/slots/[slot]">) {
  const slot = validSlot((await ctx.params).slot);
  if (!slot) return jsonError(400, "Slot inválido.");
  try {
    const account = await requireAccount();
    const data = await loadSlot(account.id, slot);
    return data ? Response.json({ data }, { headers: { "Cache-Control": "no-store" } }) : jsonError(404, "Save vazio.");
  } catch (e) { return handleError(e); }
}

export async function PUT(req: Request, ctx: RouteContext<"/api/slots/[slot]">) {
  const slot = validSlot((await ctx.params).slot);
  if (!slot) return jsonError(400, "Slot inválido.");
  try {
    assertSameOrigin(req);
    const account = await requireAccount();
    const body = await readJson(req) as { data?: unknown };
    return Response.json(await saveSlot(account.id, slot, body?.data));
  } catch (e) { return handleError(e); }
}

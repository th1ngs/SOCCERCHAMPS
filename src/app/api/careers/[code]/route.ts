import type { NextRequest } from "next/server";
import { CODE_RE, getCareer, updateCareer } from "@/server/careers";
import { handleError, jsonError, readJson } from "@/server/http";

const norm = (code: string) => code.trim().toUpperCase();

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/careers/[code]">) {
  const code = norm((await ctx.params).code);
  if (!CODE_RE.test(code)) return jsonError(400, "Código inválido.");
  try {
    return Response.json(await getCareer(code), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/careers/[code]">) {
  const code = norm((await ctx.params).code);
  if (!CODE_RE.test(code)) return jsonError(400, "Código inválido.");
  try {
    const body = (await readJson(req)) as { data?: unknown };
    return Response.json(await updateCareer(code, body?.data));
  } catch (e) {
    return handleError(e);
  }
}

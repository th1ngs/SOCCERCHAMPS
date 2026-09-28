import { createCareer } from "@/server/careers";
import { handleError, readJson } from "@/server/http";

/** Cria uma carreira na nuvem e devolve o código de acesso. */
export async function POST(req: Request) {
  try {
    const body = (await readJson(req)) as { data?: unknown };
    const saved = await createCareer(body?.data);
    return Response.json(saved, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

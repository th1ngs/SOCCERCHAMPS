import { hallOfFame } from "@/server/careers";
import { handleError } from "@/server/http";

export const dynamic = "force-dynamic";

/** Ranking global de treinadores e títulos recentes. */
export async function GET() {
  try {
    return Response.json(await hallOfFame(), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    return handleError(e);
  }
}

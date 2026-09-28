import { hallOfFame } from "@/server/careers";
import { handleError } from "@/server/http";

export const revalidate = 60;

/** Ranking global de treinadores e títulos recentes. */
export async function GET() {
  try {
    return Response.json(await hallOfFame());
  } catch (e) {
    return handleError(e);
  }
}

import { requireAccount } from "@/server/auth";
import { handleError } from "@/server/http";
import { listSlots } from "@/server/slots";

export async function GET() {
  try {
    const account = await requireAccount();
    return Response.json({ slots: await listSlots(account.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return handleError(e); }
}

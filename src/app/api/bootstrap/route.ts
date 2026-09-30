import { currentAccount } from "@/server/auth";
import { handleError } from "@/server/http";
import { listSlots, loadSlot, validSlot } from "@/server/slots";

/** Uma única viagem ao servidor para abrir a conta, listar os saves e carregar o ativo. */
export async function GET(req: Request) {
  try {
    const account = await currentAccount();
    if (!account) return Response.json({ account: null, slots: [], slot: null, data: null }, { headers: { "Cache-Control": "no-store" } });
    const slot = validSlot(new URL(req.url).searchParams.get("slot") ?? "");
    const [slots, data] = await Promise.all([
      listSlots(account.id),
      slot ? loadSlot(account.id, slot) : Promise.resolve(null),
    ]);
    return Response.json({ account, slots, slot: data ? slot : null, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return handleError(e); }
}

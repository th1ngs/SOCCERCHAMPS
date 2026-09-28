// Estado de uma proposta recebida por um jogador do usuário.
import { windowOpen } from "@/game";
import type { Message, World } from "@/game/types";

export type OfferState = "pending" | "windowClosed" | "accepted" | "expired" | "declined" | "gone";

export function offerState(w: World, m: Message): OfferState | null {
  const o = m.offer;
  if (!o) return null;
  if (o.accepted) return "accepted";
  if (o.expired) return "expired";
  if (o.done) return "declined";
  const p = w.players[o.pid];
  if (!p || p.clubId !== w.userClub) return "gone";
  return windowOpen(w) ? "pending" : "windowClosed";
}

export const OFFER_TEXT: Record<Exclude<OfferState, "pending">, string> = {
  windowClosed: "A janela de transferências fechou antes da resposta.",
  accepted: "Proposta aceita.",
  expired: "Proposta expirada.",
  declined: "Proposta recusada.",
  gone: "O jogador não está mais no elenco.",
};

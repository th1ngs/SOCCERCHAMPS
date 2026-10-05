// Ordem das telas depois de uma semana: cerimônias (prêmio do mês, títulos) → Noite de Gala → fim de temporada.
import { galaSeen, nextCeremony } from "@/game";
import type { World } from "@/game/types";
import type { Overlay } from "./GameProvider";

/** Próxima tela do fluxo, ou null para voltar ao jogo. */
export function nextFlowOverlay(w: World): Overlay {
  if (nextCeremony(w)) return { kind: "ceremony" };
  if (w.pendingSeason) return galaSeen(w) ? { kind: "seasonEnd" } : { kind: "gala" };
  if (w.fired) return { kind: "fired" };
  return null;
}

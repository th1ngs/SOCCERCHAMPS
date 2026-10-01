import type { Metadata } from "next";
import { MpLobby } from "@/components/mp/MpLobby";

export const metadata: Metadata = {
  title: "Multiplayer 1x1 • Soccer Champs",
  description: "Duelo de lances em 3D online: cada um ataca na sua vez contra a defesa do outro time.",
};

export default function MultiplayerPage() {
  return <MpLobby />;
}

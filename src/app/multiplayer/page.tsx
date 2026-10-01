import type { Metadata } from "next";
import { MpLobby } from "@/components/mp/MpLobby";

export const metadata: Metadata = {
  title: "Multiplayer 1x1 • Soccer Champs",
  description: "Futebol de botão online, 11 contra 11, por turnos: crie uma sala e jogue contra um amigo.",
};

export default function MultiplayerPage() {
  return <MpLobby />;
}

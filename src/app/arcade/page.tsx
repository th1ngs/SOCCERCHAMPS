import type { Metadata } from "next";
import { ArcadeApp } from "@/components/arcade/ArcadeApp";

export const metadata: Metadata = {
  title: "Modo arcade • Soccer Champs",
  description: "Futebol de botão: amistoso contra a CPU, 2 jogadores no mesmo aparelho e Copa arcade com 16 clubes.",
};

export default function ArcadePage() {
  return <ArcadeApp />;
}

import type { Metadata } from "next";
import { ArcadeApp } from "@/components/arcade/ArcadeApp";

export const metadata: Metadata = {
  title: "Modo arcade • Soccer Champs",
  description: "Lances de ataque em 3D: amistoso e Copa arcade contra o bot, do fácil ao lendário.",
};

export default function ArcadePage() {
  return <ArcadeApp />;
}

import type { Metadata } from "next";
import { StartScreen } from "@/components/start/StartScreen";

export const metadata: Metadata = { title: "Nova carreira • Soccer Champs Manager" };

export default function NewCareerPage() {
  return <StartScreen />;
}

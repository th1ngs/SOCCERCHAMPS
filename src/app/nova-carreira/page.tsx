import type { Metadata } from "next";
import { StartScreen } from "@/components/start/StartScreen";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Nova carreira • Soccer Champs Manager" };

export default function NewCareerPage() {
  return <Suspense><StartScreen /></Suspense>;
}

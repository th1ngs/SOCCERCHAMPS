"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useGame } from "@/components/game/GameProvider";
import { AppShell } from "@/components/shell/AppShell";

export default function GameLayout({ children }: LayoutProps<"/jogo">) {
  const { ready, world } = useGame();
  const router = useRouter();

  useEffect(() => {
    if (ready && !world) router.replace("/");
  }, [ready, world, router]);

  if (!ready || !world) {
    return (
      <div className="grid min-h-dvh place-items-center text-mist">
        <LoaderCircle className="size-6 animate-spin" aria-label="Carregando" />
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useGame } from "@/components/game/GameProvider";
import { AppShell } from "@/components/shell/AppShell";

export default function GameLayout({ children }: LayoutProps<"/jogo">) {
  const { ready, world, account } = useGame();
  const router = useRouter();

  const playerMode = !!world?.playerCareer;

  useEffect(() => {
    if (ready && (!world || !account)) router.replace("/");
    // Carreira de jogador tem as próprias telas.
    else if (ready && playerMode) router.replace("/jogador");
  }, [ready, world, account, playerMode, router]);

  if (!ready || !world || !account || playerMode) {
    return (
      <div className="grid min-h-dvh place-items-center text-mist">
        <LoaderCircle className="size-6 animate-spin" aria-label="Carregando" />
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useGame } from "@/components/game/GameProvider";
import { PlayerShell } from "@/components/playercareer/PlayerShell";

export default function PlayerLayout({ children }: LayoutProps<"/jogador">) {
  const { ready, world, account } = useGame();
  const router = useRouter();
  const career = !!world?.playerCareer;

  useEffect(() => {
    if (!ready) return;
    if (!world || !account) router.replace("/");
    else if (!career) router.replace("/jogo");
  }, [ready, world, account, career, router]);

  if (!ready || !world || !account || !career) {
    return (
      <div className="grid min-h-dvh place-items-center text-mist">
        <LoaderCircle className="size-6 animate-spin" aria-label="Carregando" />
      </div>
    );
  }
  return <PlayerShell>{children}</PlayerShell>;
}

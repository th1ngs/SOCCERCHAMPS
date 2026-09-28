"use client";
import { useEffect, useState } from "react";
import { CLUBS, newWorld, user } from "@/game";
import { useGame } from "@/components/game/GameProvider";
import { PlayerModal } from "@/components/player/PlayerModal";
import ElencoPage from "../jogo/elenco/page";
import EscalacaoPage from "../jogo/escalacao/page";
import BasePage from "../jogo/base/page";
import MercadoPage from "../jogo/mercado/page";

export default function P() {
  const g = useGame();
  const [s, setS] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setS(q.get("s"));
    if (g.ready && !g.world) {
      const w = newWorld("Teste", CLUBS[0].id);
      g.setWorld(w);
    }
  }, [g.ready]);
  useEffect(() => {
    if (!g.world || !s) return;
    const q = new URLSearchParams(location.search);
    const pk = q.get("p");
    const u = user(g.world);
    if (pk === "own") g.setOverlay({ kind: "player", pid: u.squad[0] });
    if (pk === "youth") g.setOverlay({ kind: "player", pid: u.youth[0] });
    if (pk === "other") { const p = Object.values(g.world.players).find((x) => x.clubId && x.clubId !== u.id && !x.youth && x.star) ?? Object.values(g.world.players).find((x) => x.clubId && x.clubId !== u.id)!; g.setOverlay({ kind: "player", pid: p.id }); }
    if (pk === "free") g.setOverlay({ kind: "player", pid: g.world.free[0] });
  }, [!!g.world, s]);
  if (!g.world) return null;
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5">
      {s === "elenco" && <ElencoPage />}
      {s === "escalacao" && <EscalacaoPage />}
      {s === "base" && <BasePage />}
      {s === "mercado" && <MercadoPage />}
      {g.overlay?.kind === "player" && <PlayerModal pid={g.overlay.pid} onClose={() => g.setOverlay(null)} />}
    </main>
  );
}

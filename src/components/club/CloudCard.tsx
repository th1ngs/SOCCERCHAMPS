"use client";

import Link from "next/link";
import { Cloud, CloudAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { useWorld } from "@/components/game/GameProvider";

export function CloudCard() {
  const { account, activeSlot, cloudStatus, cloudError, syncCloud } = useWorld();
  return <Card id="nuvem" title="Saves da conta" className="scroll-mt-32">
    <p className="text-sm text-mist">Conta: <b className="text-snow">{account?.nickname}</b> · Save {activeSlot}</p>
    <p role="status" className="mt-3 flex items-center gap-2 text-sm">
      {cloudStatus === "saving" ? <LoaderCircle className="size-4 animate-spin" /> : cloudStatus === "error" ? <CloudAlert className="size-4 text-danger-400" /> : <Cloud className="size-4 text-pitch-400" />}
      {cloudStatus === "error" ? cloudError : cloudStatus === "saving" ? "Salvando…" : "Carreira salva na conta."}
    </p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => void syncCloud()} loading={cloudStatus === "saving"}>Sincronizar agora</Button>
      <Link href="/" className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-bold text-gold-400 hover:bg-white/6">Trocar de save</Link>
    </div>
  </Card>;
}

"use client";

import { UserMinus } from "lucide-react";
import type { Player } from "@/game/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/** Confirmação para dispensar um garoto (ação destrutiva e definitiva). */
export function DismissDialog({ player, onConfirm, onCancel }: { player: Player | null; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal
      open={!!player}
      onClose={onCancel}
      title={`Dispensar ${player?.name ?? ""}?`}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} data-autofocus>
            Cancelar
          </Button>
          <Button variant="danger" icon={<UserMinus />} onClick={onConfirm}>
            Dispensar da base
          </Button>
        </>
      }
    >
      <p className="text-sm text-mist">O garoto deixa o clube na hora e não pode voltar. Se ele tem valor, considere emprestar ou esperar uma proposta.</p>
    </Modal>
  );
}

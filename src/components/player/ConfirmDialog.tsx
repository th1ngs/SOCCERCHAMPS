"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/** Confirmação de ação destrutiva: diz a consequência e usa o verbo no botão. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  confirmIcon,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  confirmLabel: string;
  confirmIcon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} data-autofocus>
            Cancelar
          </Button>
          <Button variant="danger" icon={confirmIcon} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-mist">{children}</div>
    </Modal>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./Button";

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  /** Quando false, não há botão de fechar nem fechamento por Esc/fundo. */
  dismissible?: boolean;
  size?: "md" | "lg" | "xl";
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

const widths = { md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" };

export function Modal({ open, onClose, title, dismissible = true, size = "md", footer, children, className }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  // Guarda o onClose mais recente sem reexecutar o efeito (evita roubar o foco a cada render).
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) closeRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("[data-autofocus], button:not([disabled]), input, select");
    first?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, [open, dismissible]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/75 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose?.();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-ink-850 shadow-2xl ring-1 ring-white/10 animate-pop sm:rounded-2xl",
          widths[size],
          className,
        )}
      >
        {(title || dismissible) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
            <div className="min-w-0 font-display text-2xl font-extrabold uppercase italic leading-tight">{title}</div>
            {dismissible && <IconButton label="Fechar" size="icon-sm" variant="ghost" icon={<X />} onClick={onClose} />}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-white/8 bg-ink-900/60 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-3 max-sm:[&>*]:flex-1">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

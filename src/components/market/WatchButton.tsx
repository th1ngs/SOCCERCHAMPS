"use client";

import { Star } from "lucide-react";
import { toggleWatch } from "@/game";
import { useWorld } from "@/components/game/GameProvider";
import { IconButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

/** Estrela de observação (liga/desliga) numa linha de lista; não abre a ficha. */
export function WatchButton({ pid, name, watched, className }: { pid: string; name: string; watched: boolean; className?: string }) {
  const { mutate } = useWorld();
  const toast = useToast();
  return (
    <IconButton
      label={watched ? `Deixar de observar ${name}` : `Observar ${name}`}
      variant="ghost"
      aria-pressed={watched}
      icon={<Star className={cn(watched ? "fill-current text-gold-400" : "text-mist")} />}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        let on = false;
        mutate((w) => {
          on = toggleWatch(w, pid);
        });
        toast(on ? `${name} entrou na lista de observação.` : `${name} saiu da lista de observação.`);
      }}
    />
  );
}

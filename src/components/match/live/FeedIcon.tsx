import { ArrowLeftRight, Bandage, Goal, Hand, Megaphone, MoveUpRight, Target } from "lucide-react";
import type { SimEventType } from "@/game/types";
import { cn } from "@/lib/cn";

/** Cartão amarelo/vermelho desenhado (sem emoji). */
export function CardGlyph({ color, label }: { color: "yellow" | "red"; label?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] shadow-sm", color === "yellow" ? "bg-[#ffd23f]" : "bg-danger-500")}
    />
  );
}

/** Ícone da narração por tipo de evento. */
export function FeedIcon({ type }: { type: SimEventType }) {
  const cls = "size-4 shrink-0";
  switch (type) {
    case "goal":
      return <Goal className={cn(cls, "text-gold-400")} aria-hidden />;
    case "yellow":
      return <CardGlyph color="yellow" />;
    case "red":
      return <CardGlyph color="red" />;
    case "sub":
      return <ArrowLeftRight className={cn(cls, "text-info-400")} aria-hidden />;
    case "injury":
      return <Bandage className={cn(cls, "text-danger-400")} aria-hidden />;
    case "save":
      return <Hand className={cn(cls, "text-snow")} aria-hidden />;
    case "miss":
      return <MoveUpRight className={cn(cls, "text-mist")} aria-hidden />;
    case "pens":
      return <Target className={cn(cls, "text-gold-400")} aria-hidden />;
    case "build":
      return <span className="grid size-4 shrink-0 place-items-center" aria-hidden><span className="size-1 rounded-full bg-mist" /></span>;
    default:
      return <Megaphone className={cn(cls, "text-mist")} aria-hidden />;
  }
}

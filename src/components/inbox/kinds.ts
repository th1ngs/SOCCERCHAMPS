// Aparência de cada tipo de mensagem.
import { ArrowLeftRight, HandCoins, Info, Landmark, Newspaper, Sprout, Stethoscope, Trophy, type LucideIcon } from "lucide-react";
import type { MessageKind } from "@/game/types";

export interface KindStyle {
  label: string;
  icon: LucideIcon;
  /** Cor do ícone/acento. */
  text: string;
  /** Faixa lateral. */
  bar: string;
}

export const KIND: Record<MessageKind, KindStyle> = {
  info: { label: "Aviso", icon: Info, text: "text-info-400", bar: "bg-info-400" },
  board: { label: "Diretoria", icon: Landmark, text: "text-gold-400", bar: "bg-gold-400" },
  medical: { label: "Departamento médico", icon: Stethoscope, text: "text-danger-400", bar: "bg-danger-400" },
  trophy: { label: "Título", icon: Trophy, text: "text-gold-300", bar: "bg-gold-300" },
  transfer: { label: "Transferência", icon: ArrowLeftRight, text: "text-pitch-400", bar: "bg-pitch-400" },
  news: { label: "Notícia", icon: Newspaper, text: "text-mist", bar: "bg-mist" },
  offer: { label: "Proposta", icon: HandCoins, text: "text-warn-400", bar: "bg-warn-400" },
  youth: { label: "Categorias de base", icon: Sprout, text: "text-pitch-400", bar: "bg-pitch-400" },
};

export const kindStyle = (k: MessageKind): KindStyle => KIND[k] ?? KIND.info;

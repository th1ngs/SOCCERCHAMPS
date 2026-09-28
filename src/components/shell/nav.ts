import { ArrowLeftRight, ClipboardList, House, Landmark, Mail, Shirt, Sprout, Trophy, type LucideIcon } from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon }

/** Seções do jogo (rotas em /jogo). */
export const NAV: NavItem[] = [
  { href: "/jogo", label: "Início", icon: House },
  { href: "/jogo/elenco", label: "Elenco", icon: Shirt },
  { href: "/jogo/escalacao", label: "Escalação", icon: ClipboardList },
  { href: "/jogo/base", label: "Base", icon: Sprout },
  { href: "/jogo/mercado", label: "Mercado", icon: ArrowLeftRight },
  { href: "/jogo/competicoes", label: "Competições", icon: Trophy },
  { href: "/jogo/clube", label: "Clube", icon: Landmark },
  { href: "/jogo/mensagens", label: "Mensagens", icon: Mail },
];

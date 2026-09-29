import { ArrowLeftRight, ClipboardList, House, Landmark, Mail, Shirt, Sprout, Trophy, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Rótulo curto para a barra inferior do celular. */
  short?: string;
  /** Descrição curta, usada no menu "Mais" do celular. */
  hint: string;
  /** Fica na barra inferior do celular; os demais vão para "Mais". */
  dock?: boolean;
}

/** Seções do jogo (rotas em /jogo). */
export const NAV: NavItem[] = [
  { href: "/jogo", label: "Início", icon: House, hint: "Resumo da semana", dock: true },
  { href: "/jogo/elenco", label: "Elenco", icon: Shirt, hint: "Jogadores e contratos", dock: true },
  { href: "/jogo/escalacao", label: "Escalação", icon: ClipboardList, hint: "Time titular e tática", dock: true },
  { href: "/jogo/base", label: "Base", icon: Sprout, hint: "Garotos, peneira e olheiros" },
  { href: "/jogo/mercado", label: "Mercado", icon: ArrowLeftRight, hint: "Compras, vendas e empréstimos", dock: true },
  { href: "/jogo/competicoes", label: "Competições", short: "Tabelas", icon: Trophy, hint: "Tabelas, copas e artilharia" },
  { href: "/jogo/clube", label: "Clube", icon: Landmark, hint: "Finanças, estrutura e nuvem" },
  { href: "/jogo/mensagens", label: "Mensagens", icon: Mail, hint: "Propostas e notícias" },
];

export const isActive = (href: string, path: string) => (href === "/jogo" ? path === href : path.startsWith(href));

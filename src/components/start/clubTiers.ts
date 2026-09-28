// Classificação dos clubes na escolha de carreira (a ordem de CLUBS é o prestígio).
import type { BadgeTone } from "@/components/ui/primitives";

export interface Tier {
  label: string;
  tone: BadgeTone;
}

/** Rótulo pela posição do clube na tabela CLUBS (16 primeiros = Série A). */
export function tierOf(index: number): Tier {
  if (index < 3) return { label: "Favorito ao título", tone: "gold" };
  if (index < 8) return { label: "Candidato ao G8", tone: "blue" };
  if (index < 16) return { label: "Meio de tabela", tone: "neutral" };
  if (index < 21) return { label: "Briga pelo acesso", tone: "green" };
  return { label: "Desafio difícil", tone: "red" };
}

/** Prestígio em estrelas (1 a 5, meia estrela) a partir da reputação 0-100. */
export function prestigeStars(rep: number): number {
  const v = (rep - 40) / 10;
  return Math.max(1, Math.min(5, Math.round(v * 2) / 2));
}

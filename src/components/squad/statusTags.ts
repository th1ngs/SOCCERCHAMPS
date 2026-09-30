// Etiquetas de situação de um jogador do elenco (pura).
import { weeksText } from "@/game";
import type { Club, Player } from "@/game/types";
import type { BadgeTone } from "@/components/ui/primitives";
import { gamesText } from "@/components/player/playerInfo";

export interface StatusTag {
  key: string;
  label: string;
  tone: BadgeTone;
  title: string;
}

export function statusTags(club: Club, p: Player): StatusTag[] {
  const t: StatusTag[] = [];
  if (club.lineup.includes(p.id)) t.push({ key: "tit", label: "TIT", tone: "green", title: "Titular" });
  else if (club.bench.includes(p.id)) t.push({ key: "res", label: "RES", tone: "neutral", title: "Reserva (banco)" });
  if (club.captain === p.id) t.push({ key: "c", label: "C", tone: "gold", title: "Capitão" });
  if (club.penTaker === p.id) t.push({ key: "p", label: "P", tone: "blue", title: "Batedor de pênaltis" });
  if (p.star) t.push({ key: "star", label: "★", tone: "gold", title: "Craque" });
  if (p.inj > 0) t.push({ key: "dm", label: `DM ${p.inj}`, tone: "red", title: `Departamento médico: ${p.injType ?? "lesão"} — ${weeksText(p.inj)}` });
  if (p.susp > 0) t.push({ key: "susp", label: "Suspenso", tone: "red", title: `Suspenso por ${gamesText(p.susp)}` });
  else if (p.yc === 2) t.push({ key: "pend", label: "Pendurado", tone: "orange", title: "Pendurado: o próximo amarelo suspende" });
  if (p.listed) t.push({ key: "sale", label: "À venda", tone: "orange", title: "Na lista de transferências" });
  if (p.contract <= 1) t.push({ key: "ctr", label: "Contrato", tone: "orange", title: "Contrato acabando" });
  if (p.morale < 40) t.push({ key: "mor", label: "Insatisfeito", tone: "red", title: `Moral ${Math.round(p.morale)}: rende menos e pode pedir para sair` });
  else if (p.morale >= 85) t.push({ key: "mor", label: "Motivado", tone: "green", title: `Moral ${Math.round(p.morale)}: rende mais em campo` });
  return t;
}

import { competitionName, WINDOWS, windowOpen } from "@/game";
import type { Message, World } from "@/game/types";

export type CalendarEventTone = "gold" | "green" | "blue" | "red";
export interface CalendarEvent {
  id: string;
  title: string;
  body: string;
  tone: CalendarEventTone;
}

const toneFor = (kind: Message["kind"]): CalendarEventTone =>
  kind === "award" || kind === "trophy" ? "gold" : kind === "medical" ? "red" : kind === "transfer" || kind === "offer" ? "green" : "blue";

export const messageEvent = (message: Message): CalendarEvent => ({
  id: `message-${message.id}`,
  title: message.kind === "award" ? "Bola de Ouro e prêmios do ano" : message.title,
  body: message.body,
  tone: toneFor(message.kind),
});

/** Fatos recentes da carreira para a passagem de dias; o restante permanece em Mensagens. */
export function calendarHighlights(w: World): { events: CalendarEvent[]; latestMessageId: number } {
  const latestMessageId = Math.max(0, ...w.inbox.map((message) => message.id));
  const priority: Record<Message["kind"], number> = {
    award: 10, trophy: 9, offer: 8, transfer: 7, medical: 6, news: 5, youth: 4, board: 3, info: 2,
  };
  const messages = w.inbox
    .filter((message) => message.id > (w.calendarSeenMessageId ?? 0)
      && ((message.season === w.season && message.week >= w.week - 1)
        || (w.week === 1 && message.kind === "award" && message.season === w.season - 1)))
    .sort((a, b) => priority[b.kind] - priority[a.kind] || b.id - a.id)
    .slice(0, 4)
    .map(messageEvent);

  const events: CalendarEvent[] = [];
  const currentWindow = WINDOWS.find(([start, end]) => w.week >= start && w.week <= end);
  if (currentWindow && (w.week === currentWindow[0] || (w.week === 1 && currentWindow[0] === 0))) events.push({
    id: `window-open-${w.season}-${w.week}`, title: "Janela de transferências aberta",
    body: `Clubes podem negociar até a semana ${currentWindow[1]}. Confira propostas e oportunidades no mercado.`, tone: "green",
  });
  else if (!windowOpen(w) && WINDOWS.some(([, end]) => w.week === end + 1)) events.push({
    id: `window-close-${w.season}-${w.week}`, title: "Janela de transferências encerrada",
    body: "As negociações ficam suspensas até a próxima janela.", tone: "blue",
  });

  events.unshift(...messages);
  if (windowOpen(w)) {
    const deals = w.transfers.filter((transfer) => transfer.season === w.season && transfer.week >= w.week - 1 && transfer.week <= w.week && transfer.fee > 0)
      .sort((a, b) => b.fee - a.fee).slice(0, 2);
    for (const deal of deals) events.push({
      id: `deal-${deal.season}-${deal.week}-${deal.pid}-${deal.to}`,
      title: `Mercado: ${deal.name}`,
      body: `${deal.from ? w.clubs[deal.from]?.name ?? "Sem clube" : "Sem clube"} → ${deal.to ? w.clubs[deal.to]?.name ?? "Novo clube" : "Sem clube"} por ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(deal.fee)}.`,
      tone: "green",
    });
  }
  const match = w.weeks[w.week]?.matches.find((fixture) => fixture.h === w.userClub || fixture.a === w.userClub);
  if (match && match.comp !== w.clubs[w.userClub].div) events.push({
    id: `competition-${match.id}`, title: "Semana de decisão",
    body: `${competitionName(match.comp)} contra ${w.clubs[match.h === w.userClub ? match.a : match.h]?.name ?? "o adversário"}.`, tone: "gold",
  });
  return { events: events.slice(0, 7), latestMessageId };
}

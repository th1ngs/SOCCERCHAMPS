import { Siren } from "lucide-react";

/** Aviso da última semana da janela. */
export function DeadlineBanner() {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl bg-linear-to-r from-gold-500/25 via-gold-400/10 to-transparent px-4 py-3 ring-1 ring-inset ring-gold-400/50">
      <Siren className="mt-0.5 size-5 shrink-0 text-gold-300" aria-hidden />
      <p className="text-sm">
        <b className="font-display text-base font-extrabold uppercase italic tracking-wide text-gold-300">Dia do fechamento</b>
        <span className="block text-snow/90">Última semana da janela: os clubes correm atrás de reforços e as propostas pelos seus jogadores dobram. Depois, só na próxima janela.</span>
      </p>
    </div>
  );
}

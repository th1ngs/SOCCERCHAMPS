import { BookOpen, ChevronDown } from "lucide-react";

const ITEMS: [string, string][] = [
  ["Safra", "Toda pré-temporada chegam novos garotos de 15–16 anos. Quanto maior o nível da base, mais garotos e mais potencial. O foco define as posições mais comuns."],
  ["Potencial", "Você vê uma faixa, não o número exato. Base melhor e um olheiro-chefe de nível alto estreitam a faixa inicial; ela fecha 40% por temporada e fica exata com o relatório completo do olheiro."],
  ["Olheiros", "Contrate até 6 olheiros (nível 1 a 5, cada um especialista num país). Cada olheiro faz um relatório por vez; o especialista entrega em 1 semana e barateia a peneira no país dele. O mercado de olheiros muda a cada temporada."],
  ["Joias", "O selo aparece quando o mínimo da faixa conhecida é 78 ou mais — aí não tem erro."],
  ["Peneira", "Três por temporada (quatro com um olheiro nível 4+). Escolha a região (no exterior custa ×1,8, ou ×1,2 com especialista) e, se quiser, a posição."],
  ["Salário", "Garotos da base recebem conforme o overall e a liga do clube; o salário é reajustado a cada temporada."],
  ["Evolução", "Garotos evoluem com o CT e o treino; os do setor em foco, 15% mais rápido. Emprestado como titular, o garoto evolui ainda mais."],
  ["19 anos", "Na virada da temporada, quem completa 19 anos sobe ao profissional se houver vaga no elenco; senão é dispensado. Decida antes: promova, empreste ou negocie."],
  ["Propostas", "Clubes podem fazer propostas pelos seus garotos mais promissores. Elas chegam na caixa de entrada."],
];

/** Explicação curta e recolhível de como funciona a base. */
export function HowItWorks() {
  return (
    <details className="group mt-8 rounded-(--radius-card) bg-ink-800 ring-1 ring-inset ring-white/8">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-(--radius-card) px-4 py-3 font-display text-sm font-bold uppercase tracking-wide text-gold-400 focus-visible:outline-2 focus-visible:outline-gold-400 sm:px-5 [&::-webkit-details-marker]:hidden">
        <BookOpen className="size-4" aria-hidden />
        Como funciona a base
        <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="grid gap-x-6 gap-y-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5">
        {ITEMS.map(([t, d]) => (
          <div key={t} className="min-w-0">
            <dt className="text-sm font-semibold">{t}</dt>
            <dd className="text-sm text-mist">{d}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

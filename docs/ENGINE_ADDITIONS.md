# Novas funções do motor (contrato para a UI)

Tudo em `src/game/*`, exportado pelo barrel `@/game`. `World.version` passa a ser `2`; `migrateWorld(w)` completa campos faltantes em saves antigos.

## 1. Clássicos
- `isDerby(w, m): boolean` — verdadeiro se um clube tem o outro como `rival` (em qualquer direção).
- Efeitos: público = 100% da capacidade e renda × 1,4; moral ±8 para quem jogou (em vez de ±5); torcida ±8; confiança da diretoria ±3 extra; narração especial no início.

## 2. Capitão e batedor
- `club.captain: string | null`, `club.penTaker: string | null` (ids de jogadores do elenco).
- `pickCaptain(w, club)`, `pickPenTaker(w, club)` escolhem automaticamente (usados pela CPU e quando o escolhido do usuário estiver indisponível).
- `setCaptain(w, pid)`, `setPenTaker(w, pid)` para o clube do usuário.
- Efeito: capitão em campo dá +1,5% em todos os setores (+3% com a característica `lideranca`); batedor cobra pênaltis no jogo e é o primeiro na disputa.

## 3. Torcida e ingresso
- `club.fans: number` (0–100, começa em 60) e `club.ticketPrice: 'popular' | 'normal' | 'premium'`.
- `TICKET_PRICES` = `{ popular: { name: 'Popular', mult: 0.7, occ: +0.12 }, normal: {…1, 0}, premium: { name: 'Premium', mult: 1.45, occ: -0.15 } }`.
- `setTicketPrice(w, price)`.
- `expectedGate(w, m): { attendance: number; income: number; derby: boolean }` — previsão para o pré-jogo (o mandante é quem recebe).
- Torcida sobe/desce com resultados (+4/−4; ×2 em clássico) e influencia a ocupação.

## 4. Características e Craque
- `player.traits: TraitKey[]` (1–2, sorteadas conforme a posição) e `player.star: boolean` (~3% dos jogadores).
- `TRAITS: Record<TraitKey, { name: string; short: string; desc: string }>` com as chaves:
  `finalizacao`, `cabeceio`, `drible`, `passe`, `velocidade`, `marcacao`, `desarme`, `reflexo`, `lideranca`, `resistencia`.
- Efeitos no motor: finalização (xG × 1,12), cabeceio (gols após escanteio), drible e velocidade (ataque), passe (assistências e meio-campo), marcação e desarme (defesa), reflexo (goleiro: xG sofrido × 0,9), liderança (capitão em dobro), resistência (cansaço × 0,8).
- Craque: +3 de overall efetivo em partidas e valor de mercado × 1,3.

## 5. Departamento médico
- `player.injType: string | null` — "Pancada" (1 sem.), "Estiramento" (2–3), "Distensão" (4–6), "Fratura" (8+).
- O nível do CT reduz o tempo de recuperação.
- `injuryLabel(weeks): string`.

## 6. Empréstimo bancário
- `club.loan: { principal: number; weekly: number; weeksLeft: number } | null`.
- `LOAN_OPTIONS = [5e6, 10e6, 20e6]`, juros totais de 12%, pagos em 30 semanas.
- `takeLoan(w, amount): boolean` (falha se já houver empréstimo ativo) e `repayLoan(w): boolean` (quita o saldo restante).
- A parcela é descontada em `endWeek` (categoria de finanças `loan`).

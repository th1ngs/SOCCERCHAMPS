# Base e transferências — contrato (World v4)

Tudo em `src/game/*`, exportado pelo barrel `@/game`.
- `World.version = 4`. `migrateWorld` leva saves v3 para v4, completando os campos novos.
- Todo campo novo precisa ser serializável em JSON.
- Valores em R$.

## 1. Olheiros e potencial escondido
- **Conhecimento do usuário sobre cada jogador:** `w.scouting: Record<pid, { level: 0 | 1 | 2; season: number }>`.
  - 0 = só o básico
  - 1 = observado
  - 2 = relatório completo
- **Nível do departamento:** `club.scouting: number` (1–5), com `UPGRADES.scouting` ("Departamento de olheiros"), custo `3e6 * nível`.
- **`potentialRange(w, p): { min: number; max: number; exact: boolean }`**
  - Jogadores do elenco principal do usuário: exato depois de 10 semanas no clube.
  - Garotos da base do usuário: largura inicial `24 - 3*academy - 2*scouting` (mínimo 4). A faixa estreita 40% a cada temporada e vira exata quando `level = 2`.
  - Jogadores de outros clubes: `level 0` → largura 22; `level 1` → 12; `level 2` → exato.
  - A faixa sempre contém o potencial real, com posição aleatória porém estável: use um hash do id, sem `Math.random` na leitura.
- **`knownTraits(w, p): TraitKey[] | null`:** `null` quando não se conhece o jogador (outro clube, `level < 2`); o selo de craque é sempre visível.
- **`scoutCost(w): number`** e **`scoutSlots(w): number`** (= nível do departamento).
- **`requestScoutReport(w, pid): { ok: boolean; reason?: string; readyWeek?: number }`**
  - O relatório fica pronto em 1–2 semanas: `w.scoutQueue: { pid; readyWeek; season }[]`.
  - No `endWeek`, o relatório pronto grava `level 2` e manda a mensagem "Relatório do olheiro: Fulano", com o potencial exato, as características e um veredito ("Pode ser titular", "Promessa", "Não vale o preço").
- **`observe(w, pid)`:** marca `level 1` de graça; é chamado ao abrir a ficha de um jogador de outro clube.

## 2. Categorias de base
- **Foco da base:** `club.academyFocus: 'balanced' | 'attack' | 'midfield' | 'defense' | 'goalkeepers'`, com `ACADEMY_FOCUS` (nome, descrição) e `setAcademyFocus(w, focus)`.
  - O foco muda os pesos de posição da safra.
  - Garotos do setor em foco evoluem 15% mais rápido.
- **Evolução acompanhada:** `player.start: { season: number; ovr: number }` é gravado na chegada (safra, peneira, contratação); o crescimento é o ovr atual menos `start.ovr`.
- **`isGem(p): boolean`:** potencial real ≥ 80 e idade ≤ 17. A UI só mostra o selo "Joia" quando a faixa conhecida tem `min ≥ 78`.
- **Peneira:** `runTrial(w, opts?: { region?: LeagueId; pos?: Position })`.
  - Região estrangeira custa ×1,8, e os garotos vêm dessa nacionalidade.
  - Com posição definida, todos os garotos são dessa posição.
  - Continua valendo uma peneira por temporada; o nível de olheiros dá +1 garoto a partir do nível 4.
  - `trialCost(w, opts?)`.
- **Safra:** mensagem com o destaque da safra mostrando só a faixa de potencial.
- **Cobiça por garotos:** clubes da CPU fazem propostas pelos garotos do usuário com faixa alta. A mensagem é do tipo `offer` com `offer.youth = true`, e aceitar faz o garoto sair.

## 3. Empréstimos
- **`player.loan: { from: string; to: string; until: number; wageShare: number; buyOption: number | null } | null`**
  - `until` = temporada em que volta.
  - `wageShare` = fração do salário paga pelo clube que recebe o jogador.
  - Durante o empréstimo, `clubId` é o clube que recebeu. Para o dono, ele aparece em `loanedOut(w)` e não conta no limite do elenco.
- **Emprestar jogadores do usuário:**
  - `loanOutOffers(w, pid): { club: string; wageShare: number; role: 'titular' | 'rotacao' }[]` lista até 3 clubes da CPU de reputação menor.
  - Garotos da base com 17 anos ou mais também podem ser emprestados.
  - `loanOut(w, pid, clubId): boolean`.
  - Jogador emprestado que atua como titular recebe bônus de evolução (conta como `played`).
- **Pedir jogadores emprestados à CPU:**
  - `loanInTerms(w, pid): { ok: boolean; reason?: string; wageShare: number; buyOption: number }`: aceito se o jogador não estiver entre os 13 melhores do clube.
  - `loanIn(w, pid, withOption: boolean): boolean`: a opção de compra aumenta a parte do salário paga pelo usuário.
  - `exerciseBuyOption(w, pid): boolean`.
- **`recallLoan(w, pid)`:** encerra o empréstimo, só com a janela aberta.
- **Fim dos empréstimos:** acabam no `newSeason`, com mensagem de retorno e resumo (jogos e gols no empréstimo).
- **Listas:** `loanedOut(w)` e `loanedIn(w)` retornam `Player[]`.

## 4. Negociação
- **Multa rescisória:** `player.releaseClause: number`, de 2 a 3× o valor (×1,5 para agentes livres = 0). Pode ser renovada no contrato.
- **Clube:** `negotiateTransfer(w, pid, bid: { fee: number; installments: 1 | 2 | 3 }): ClubResponse`, onde `ClubResponse = { status: 'accepted' | 'counter' | 'rejected' | 'walkout' | 'closed' | 'full' | 'money' | 'refused'; counterFee?: number; patience: number; text: string }`.
  - Guarda `w.negotiations[pid] = { patience, lastFee, week, season }`.
  - Propostas baixas consomem paciência (3 no início). Com paciência 0 vem `walkout`, e o clube fica 4 semanas sem negociar.
  - Parcelar reduz um pouco a chance: exige 5% a mais.
- **Multa:** `payReleaseClause(w, pid)` pula o clube e vai direto para os termos pessoais.
- **Jogador:** `contractAsk(w, pid): { wage: number; years: number; bonus: number; role: Role }`, com `Role = 'titular' | 'rotacao' | 'reserva'`.
  - `contractChance(w, pid, terms): number` (0–1), para o medidor em tempo real.
  - `negotiateContract(w, pid, terms): { status: 'accepted' | 'counter' | 'rejected'; counter?: Terms; text: string }`.
  - O papel prometido altera o salário pedido: titular é a exigência base, rotação +10% e reserva +25% (e jogadores bons recusam ser reserva).
- **Fechar a contratação:** `completeTransfer(w, pid, deal: { fee; installments; wage; years; bonus; role })`.
  - Paga a 1ª parcela e as luvas; as outras parcelas entram em `w.payables: { season; week; amount; desc }[]` e são pagas no `endWeek` (categoria `transfers`).
  - Grava `player.promise = role`.
  - Promessa de titular não cumprida (menos de 40% dos jogos até a semana 20) → moral −15 e mensagem "Fulano cobra a promessa".
- **Renovação** usa o mesmo motor: `renewAsk(w, pid)` e `negotiateRenewal(w, pid, terms)`.
- **Contraproposta às ofertas da CPU:** `counterOffer(w, msgId, fee): { status: 'accepted' | 'walkout' | 'improved'; fee?: number; text }`. A CPU tem um teto escondido de ~1,2–1,5× o valor.

## 5. Lista de observação, histórico e notícias
- **Lista de observação:** `w.watchlist: string[]` e `toggleWatch(w, pid)`.
  - Avisa quando o jogador observado entra na lista de venda, entra no último ano de contrato, muda de clube ou tem a multa ao alcance do caixa.
- **Histórico de transferências:** `w.transfers: TransferRecord[] = { season; week; pid; name; from: string | null; to: string | null; fee; kind: 'transfer' | 'loan' | 'free' | 'release' | 'clause' }`.
  - Registra todos os movimentos da CPU e do usuário. Guarde os últimos 400 da CPU; os do usuário nunca são apagados.
  - Consultas: `transferHistory(w, filter?: { season?; clubId? })`, `netSpend(w, clubId, season)` e `biggestDeals(w, season, n)`.
- **Dia do fechamento:** última semana de cada janela, com atividade da CPU e ofertas ao usuário ×2 e a notícia "Dia do fechamento da janela".
- **Notícias do mercado:** `marketNews(w, n)` devolve as transferências mais caras recentes, para o feed da Central.

## Balanceamento
- A simulação de temporada não pode ficar mais lenta que 5 s.
- A quantidade de transferências da CPU deve ficar na mesma ordem de hoje.

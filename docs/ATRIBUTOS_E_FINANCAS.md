# Atributos, habilidades e finanças por clube (World v5)

Tudo em `src/game/*`, exportado pelo barrel `@/game`.
- `WORLD_VERSION = 5`. `migrateWorld` leva saves v4 para a v5:
  - gera os atributos;
  - escolhe o batedor de faltas;
  - cria o patrocínio e o teto salarial;
  - mantém o caixa e as habilidades antigas.
- Todo campo novo é serializável em JSON.

## Atributos
- **Formato:** `Player.at: number[]` guarda o desvio de cada atributo em relação ao overall, na ordem de `ATTR_KEYS`.
  - Valor: `attr(p, k) = clamp(overall + desvio, 1, 99)`. Os atributos acompanham a evolução do jogador sem precisar ser recalculados.
  - `attrs(p)` devolve todos os atributos de uma vez.

| Chave | Nome | Onde pesa no motor |
|---|---|---|
| `vel` | Velocidade | ataque e defesa (desvio), contra-ataques |
| `fol` | Fôlego | desgaste em campo (50 → 1×, 85 → ~0,79×) e recuperação entre jogos |
| `fin` | Finalização | quem chuta (peso²), qualidade do chute, chutes de longe |
| `pas` | Passe | meio-campo (desvio) e quem dá a assistência |
| `dri` | Drible | ataque (desvio) |
| `mar` | Marcação | defesa (desvio), freia contra-ataques |
| `cab` | Cabeceio | alvo e perigo das cabeçadas após escanteio |
| `bp` | Bola parada | faltas diretas e pênaltis (e escolha dos batedores) |
| `ref`/`col` | Reflexos/Colocação | goleiros (exibição e relatório) |

- **Geração:** `rollAttrs(pos, traits)` usa o perfil da posição (`ATTR_PROFILE`), mais uma variação individual (σ = 5), mais +9–14 no atributo ligado a cada habilidade (`TRAIT_ATTR`).
- **Setores:** no motor conta só o que é individual, isto é, o desvio em relação ao perfil da posição. Cada ponto vale 0,4% no setor, e o equilíbrio entre posições não muda.
- **O que o usuário vê:** `knownAttrs(w, p)` (exibido na ordem de `ATTRS_FOR[pos]`):
  - próprio elenco ou com relatório do olheiro: valores exatos;
  - jogador observado: faixa de ±4, estável por jogador;
  - jogador sem observação: `null`.

## Habilidades especiais
- **Quantidade:** 0 a 3 por jogador (`traitCap`), conforme o overall; Craques ganham uma a mais.
- **Visibilidade:** são públicas, como a fama do jogador. `knownTraits` sempre as devolve. Os olheiros revelam o potencial e os atributos exatos.
- **Evolução:** na virada da temporada, quem está abaixo do limite pode aprender uma habilidade nova. A chance é de 35% até 23 anos, 20% até 28 e 6% depois disso. O usuário recebe a mensagem "Novas habilidades no elenco".

| Chave | Nome | Efeito |
|---|---|---|
| `finalizacao` | Matador | xG × 1,12 |
| `cabeceio` | Cabeceador | alvo preferido nos escanteios (peso × 2), xG × 1,2 |
| `drible` | Driblador | +4% no ataque; +3 p.p. de faltas perigosas (até 2 por time) |
| `passe` | Garçom | +5% no meio; assistências × 1,5 |
| `velocidade` | Velocista | +4% no ataque; puxa contra-ataques |
| `marcacao` / `desarme` | Xerife / Ladrão de bolas | +4% na defesa |
| `reflexo` | Paredão | xG adversário × 0,9 |
| `lideranca` | Líder | como capitão, bônus de 3% em vez de 1,5% |
| `resistencia` | Pulmão | desgaste × 0,8 |
| `faltas` | Batedor de falta | cobrança direta 70% mais perigosa |
| `motorzinho` | Motorzinho | LAT/VOL/MEI: +3% na defesa e no ataque, desgaste × 0,9, recupera +8% entre jogos |
| `chuteLonge` | Chute de longe | mais chutes de fora da área, xG × 1,8 |
| `penalti` | Cobrador de pênalti | +10 p.p. de conversão |
| `pegaPenalti` | Pegador de pênalti | goleiro: −10 p.p. na conversão do adversário |
| `lancamento` | Lançador | assistências × 1,3; puxa contra-ataques |
| `garra` | Raçudo | +6% de rendimento com o time atrás no placar |
| `coringa` | Coringa | fora da posição rende no mínimo 90% (exceto no gol), via `playerFit` |

## Lances novos no motor
- **Falta perigosa:** 9% das faltas, mais 3 p.p. por driblador. O batedor é `club.fkTaker` (ou quem tem a melhor bola parada).
  - O xG sai da bola parada ao cubo; o bônus de Batedor de falta é de 1,7×.
  - Gol de falta direta não tem assistência.
- **Pênalti:** `0,70 + (BP − 65)/300 − (goleiro − 70)/400`, com as habilidades de cobrador e de pegador. Vale também na disputa de pênaltis.
- **Chute de longe:** mais frequente com quem tem Chute de longe.
- **Contra-ataque:** depende da velocidade de quem contra-ataca contra a marcação e a velocidade da defesa. As chances saem com ataque × 1,25.
- **Média geral:** cerca de 2,4 a 2,5 gols por jogo. Por partida: faltas diretas ~0,09 gol, contra-ataques ~0,09 e chutes de longe ~0,07.
- **Desempenho:** os atributos ficam em cache no `OnField` (`av`), sem recálculo a cada minuto.

## Batedor de faltas
- **Escolha automática:** `club.fkTaker`, via `pickFkTaker`, pela bola parada, com +15 para Batedor de falta.
- **Escolha do usuário:** `setFkTaker(w, pid)`.
- **Substituição automática:** acontece quando o batedor sai do clube ou fica indisponível.
- **Na interface:** cartão "Liderança e bola parada" da escalação e "Funções em campo" na ficha.

## Finanças por clube (`src/game/finance.ts`)
- **Economia da liga:** `LeagueInfo` ganhou os campos abaixo, todos relativos ao Brasil = 1.

| Liga | TV | Divisão da TV (`tvSplit`) | Comercial | Ingresso | Salários | Chance de dívida |
|---|---|---|---|---|---|---|
| Inglaterra | 2,3 | 0,25 (igualitária) | 1,6 | 1,9 | 1,6 | 15% |
| Espanha | 1,45 | 0,45 | 1,4 | 1,45 | 1,3 | 30% |
| Itália | 1,25 | 0,45 | 1,2 | 1,2 | 1,15 | 40% |
| Brasil | 1,0 | 0,55 | 1,0 | 1,0 | 1,0 | 40% |
| Portugal | 0,6 | 0,75 (concentrada) | 0,8 | 0,85 | 0,75 | 30% |
| Argentina | 0,55 | 0,5 | 0,65 | 0,6 | 0,65 | 45% |

- **Receitas semanais:**
  - `tvShare`: parte igual para todos e parte pelo peso do clube (reputação dividida pela média da divisão).
  - `club.sponsor`: patrocínio master, reajustado por `renewClubFinances` no fim da temporada. Acompanha a reputação e a divisão, com +12% para campeões. Varia entre −30% e +45% por temporada.
  - `commercialWeekly`: sócios e produtos, conforme a reputação e o humor da torcida.
  - Bilheteria: `ticketBase` × liga × política de preços.
  - Premiações.
- **Despesas semanais:**
  - folha salarial;
  - `upkeepWeekly`: manutenção do estádio (por lugar) e da estrutura (nível^1,5);
  - parcela da dívida.
- **Salários:** `wageFor(ovr, liga)` ficou mais íngreme (1.500 × 1,155^(ovr−50)) e é multiplicado pelo nível salarial da liga. `clubWage` também desconta o índice salarial `w.econ.drift`, para a folha não disparar com a evolução geral dos elencos.
- **Teto salarial:** `club.wageCap` é 95% da receita livre (receita − manutenção − metade da parcela da dívida).
  - `wageVeto` barra contratações e empréstimos acima do teto. Renovações têm 10% de tolerância.
  - Folha mais de 10% acima do teto tira confiança da diretoria.
- **Início da carreira:** `initClubFinances` gera o patrocínio, a dívida inicial (conforme a liga e o tamanho do clube) e o caixa, que equivale a 7–18 semanas de receita.
- **CPU:**
  - respeita o teto nas compras;
  - clubes com mais caixa vão mais ao mercado;
  - clubes no vermelho ou muito acima do teto vendem (`distressedSales`), gerando a notícia "Crise no …";
  - clubes com caixa sobrando investem na estrutura (`aiInvest`), o que aumenta a manutenção.
- **Calibragem:** `npx tsx scripts/finance-report.ts --seasons 3`. Com a calibragem atual, a folha média fica em ~0,9× a receita livre e o caixa médio sobe devagar. Alguns clubes entram no vermelho a cada temporada.

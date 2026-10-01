# Carreira de jogador e multiplayer 1x1

## Carreira de jogador (`src/game/playercareer.ts`, telas em `/jogador`)
- **Como começar:** Nova carreira → **Jogador** (ou `/nova-carreira?modo=jogador`).
  - Escolha nome, posição e nacionalidade.
  - Escolha um entre três clubes das divisões de baixo do seu país (`startingClubs`).
- **Perfil inicial:** o protagonista começa aos 17 anos, com overall ≈ nível do clube − 6 e potencial de 78 a 90.
- **Mesmo mundo do modo treinador:** ligas, copas, mercado da CPU, Copa das Nações e prêmios.
  - O save fica no mesmo sistema de slots: `World.playerCareer` indica o modo.
  - `/jogo` redireciona para `/jogador`, e vice-versa.
- **Clube do protagonista:**
  - é dirigido pela CPU: `managesClub(w, id)` é falso para ele;
  - a CPU escala, compra, vende e investe por ele.
  - A CPU não vende, não dispensa, não contrata da lista de livres nem aposenta o protagonista (`isProtagonist`).
- **Desligado neste modo:**
  - diretoria (demissão, propostas de emprego);
  - conversas com o elenco;
  - propostas da CPU por jogadores "do usuário".

### A semana (`playCareerWeek`)
1. **Treino:**
   - foco em um dos 4 atributos principais da posição, ou geral (+25% de evolução);
   - intensidade:

     | Intensidade | Efeito |
     |---|---|
     | Leve | Recupera o físico, mas o técnico nota |
     | Normal | Evolução e condição física equilibradas |
     | Forte | Evolui mais e impressiona o técnico, mas cansa e tem 2,5% de lesão |

2. **Jogo do clube:** simulado com o relatório do protagonista.
   - situação: titular, entrou, banco, não relacionado, lesionado ou suspenso;
   - nota, gols, assistências e lances narrados com o nome dele.
3. **Confiança do técnico (0-100):**
   - sobe com boas notas, gols e assistências, e cai com notas baixas;
   - pesa ±6 pontos de overall na escalação e nas substituições;
   - o protagonista apto sempre fica entre os relacionados.
4. **Resto da semana:** o motor fecha a semana normalmente. Além disso:
   - o salário entra no patrimônio;
   - chegam propostas;
   - são conferidos os marcos (estreia, primeiro gol, 100 jogos, overall 80, seleção…).

### Propostas e contrato
- **Transferência:** só na janela.
  - Chance maior com boas notas, overall acima do nível do clube ou pedido para ser negociado (o pedido custa 5 de confiança).
  - Os clubes só chamam quem vai jogar (titular ou rotação), com prestígio no máximo 6 abaixo do clube atual.
  - Aceitar paga a taxa ao clube atual e dá 4 salários de luvas.
- **Renovação:** a partir da semana 18 do último ano de contrato.
  - O clube renova se a confiança for ≥ 35 ou o overall estiver perto do nível do elenco. Senão, avisa que não renova.
- **Sem clube:** propostas de agente livre toda semana; elas podem ser aceitas a qualquer momento.
- **Fim de temporada:**
  - resumo com números, posição do time, títulos e prêmios (Bola de Ouro, melhor jovem, Chuteira de Ouro, seleção do ano);
  - a temporada fica guardada sem limite em `playerCareer.seasons`.
- **Aposentadoria:** a partir dos 33 anos, ou obrigatória aos 40. A tela final mostra a carreira inteira.

### Telas
| Tela | Conteúdo |
|---|---|
| Semana | Próximo jogo, situação no elenco, confiança, condição, treino, último jogo e linha do tempo |
| Carreira | Atributos, habilidades, contrato, patrimônio, seleção, temporada a temporada, marcos e botão de aposentadoria |
| Propostas | Aceitar ou recusar, renovação e pedido de transferência |
| Tabela | Classificação da divisão e artilharia, com o jogador em destaque |

## Multiplayer 1x1 (`/multiplayer`)
- **O jogo:** futebol de botão online, 11 contra 11, por turnos, entre duas contas.
- **Como jogar:**
  - O anfitrião cria a sala (time, 20/30/40 jogadas) e passa o código de 5 letras.
  - O adversário entra pelo código ou pela lista de salas abertas.
- **Tempo da vez:** 25 s por jogada. Esgotado, a vez passa.
- **Sair** conta como abandono: a vitória fica com o outro.
- **Ausência:** se o adversário ficar 90 s sem jogar na vez dele, é possível reivindicar a vitória.

### Sincronização
- **Física determinística:**
  - só `+ − × ÷` e `Math.sqrt` (o `Math.hypot` saiu do passo da física);
  - passo fixo de 1/120 s.
  - Os dois aparelhos reproduzem o mesmo chute e chegam às mesmas posições, mesmo com taxas de quadros diferentes (teste em `scripts/arcade-gameplay-test.ts`).
- **Cada jogada leva:**
  - disco, direção e força;
  - as posições de antes (snapshot) e o placar, que corrigem qualquer diferença.
- **Servidor (`src/server/mp.ts`, tabela `mp_rooms`):**
  - grava as jogadas em sequência (`jsonb_array_length(moves) = seq`: uma jogada fora de ordem recebe 409);
  - os clientes consultam a sala a cada 0,9 s (`GET /api/mp/[código]?since=n`).
- **Fim:** a partida acaba quando as jogadas chegam ao total; o anfitrião registra o placar final.

### API
| Rota | Ação |
|---|---|
| `GET /api/mp` | Salas abertas e a sala ativa da conta |
| `POST /api/mp` | `{action:"create", team, turns}` ou `{action:"join", code, team}` |
| `GET /api/mp/[código]?since=n` | Estado da sala e as jogadas a partir de n |
| `POST /api/mp/[código]` | `move` (seq + jogada), `finish` (placar), `leave` (abandono) ou `claim` (ausência) |

Todas as rotas exigem conta; as de escrita conferem a origem.

## Checagens
- `sim-test --checks` → `runPlayerCareerChecks`:
  - criação da carreira;
  - temporada completa com relatórios;
  - a CPU não vende o protagonista;
  - aceitar proposta;
  - treino em foco melhora o atributo;
  - fim de contrato → agente livre;
  - aposentadoria;
  - migração idempotente.
- `arcade-gameplay-test`: 60 jogadas online sincronizadas a 60 Hz × 144 Hz, com gols.

# Profundidade de jogo (World v6)

Tudo em `src/game/*`, exportado pelo barrel `@/game`.
- `WORLD_VERSION = 6`. `migrateWorld` completa `club.instr` com as instruções padrão.
- Os demais campos novos são opcionais e nascem vazios em saves antigos.

## Instruções táticas (`tactics.ts`)
`club.instr: Instructions` tem quatro escolhas. Cada uma tem um custo e rende mais quando o elenco tem o perfil certo:

| Instrução | Opções | Efeito |
|---|---|---|
| Por onde atacar (`width`) | meio / variado / pontas | **Meio:** meio-campo +2% e ataque pelo passe dos meias. **Pontas:** ataque pela velocidade e drible dos pontas, meio −2,5% e cruzamentos para a área, que viram cabeçadas. |
| Passes (`pass`) | curto / variado / longo | **Curto:** meio +2–5% e 30% menos contra-ataques. **Longo:** contra-ataques ×1,45 (mais com atacantes rápidos) e meio −5%. |
| Linha defensiva (`line`) | baixa / média / alta | **Baixa:** defesa +5%, ataque −4% e sofre 35% menos contra-ataques. **Alta:** meio +3%, mas sofre mais contra-ataques (pior com zagueiros lentos). |
| Marcação (`mark`) | zona / individual | **Individual:** defesa +2–5% com bons marcadores e 25% mais faltas, o que traz cartões e faltas perigosas para o adversário. |

- **Perfil do time:** `squadProfile` mede o desvio individual dos atributos em relação ao perfil da posição: pontas, passe dos meias, velocidade dos atacantes, marcação e velocidade dos defensores, e bola aérea.
- **Efeito no motor:** `instructionMods` transforma o perfil nos multiplicadores usados pelo Sim. O cache é refeito quando há substituição, expulsão, troca de formação ou de instrução.
- **CPU:** `aiInstructions` escolhe conforme o perfil do elenco e o tamanho do clube.
- **Usuário:** `setInstructions` define as instruções; `instructionAdvice` gera as dicas do cartão "Instruções táticas".
- **Durante a partida:** as instruções também podem ser trocadas na partida ao vivo (`LiveController.setInstructions`).
- **Média de gols:** a média geral continua em ~2,4 por jogo.

## Moral e conversas (`talks.ts`)
- **Peso do moral:** `0,93 + 0,14 × moral/100`. Moral 30 vale −2,8%; moral 90 vale +5,6%.
- **Conversas:** `generateTalks` cria no máximo uma por semana, com até duas abertas. Cada jogador tem 8 semanas de intervalo entre conversas.

| Conversa | Quando aparece | Respostas |
|---|---|---|
| Reclama da reserva | Está entre os 14 melhores, jogou menos de 35% dos jogos e tem moral abaixo de 55 | **Prometer mais chances:** moral +12; ele cobra em 8 semanas e espera jogar 40%. **Pedir que mostre mais:** moral −4, ou −10 se for injusto. **Colocar à venda:** moral +5. |
| Pede aumento | Nota ≥ 7, 8+ jogos e salário abaixo de 90% do mercado | **Dar o aumento:** respeita o teto com 10% de tolerância; moral +12. **Prometer renovar:** moral +3. **Recusar:** moral −12. |
| Quer sair | Moral abaixo de 28, ou craque cobiçado por um clube bem maior | **Convencer:** a chance depende da reputação, do moral e da diretoria. **Colocar à venda:** moral +8. **Negar:** moral −15. |

- **Sem resposta:** a conversa expira em 2 semanas e o jogador perde 8 de moral.
- **Conversa no vestiário** (`giveTeamTalk`, uma por jogo): Motivar, Tranquilizar ou Cobrar.
  - O multiplicador de rendimento (`w.teamTalk`) depende do contexto: zebra, favorito, clássico ou mata-mata, e o moral médio.
  - Vale só para o Sim da semana.

## Histórico dos jogadores (`career.ts`)
- **Formato:** `player.hist` guarda linhas `[temporada, clube, jogos, gols, assistências, nota×100, títulos?]`, no máximo 12.
- **Gravação:** no fim da temporada, para quem entrou em campo. Os títulos vão para quem fez 3 jogos ou mais pelo campeão.
- **Seleção:** `player.intl = [jogos, gols]`.
- **Na tela:** `playerCareer` mostra as temporadas passadas e a atual no painel "Carreira" da ficha.
- **Tamanho do save:** cresce cerca de 40 KB comprimidos por temporada.

## Recordes, conquistas e lendas
- **Recordes:** `w.records` guarda jogos (V/E/D, gols), maior vitória, pior derrota, maiores sequências de vitórias e de invencibilidade, maior venda e compra, artilheiro numa temporada e títulos.
- **Conquistas:** `w.achievements` tem 19 conquistas (`ACHIEVEMENTS`). Cada desbloqueio manda uma mensagem.
- **Lendas:** `w.legends` guarda aposentados com 60+ jogos ou 25+ gols pelo clube do usuário.
- **Ídolos:** `clubIdols` junta essas lendas com os jogadores de hoje que têm mais jogos pelo clube.
- **Na tela:** página `/jogo/carreira` (no celular, no menu "Mais").

## Copa das Nações (`nations.ts`)
- **Quando:** a cada 4 anos (2026, 2030, …), no início de `newSeason`, com os elencos do fim da temporada.
- **Convocação:** automática, os 23 melhores de cada nacionalidade, disponíveis, com 3 goleiros e posições equilibradas.
- **Formato:** todos contra todos em campo neutro (15 jogos) e final entre os dois primeiros, com pênaltis se empatar.
- **Seleções:** entram em `w.clubs` só durante o torneio (`nat:<liga>`). Os jogos não contam para os clubes.
- **Resultado:** a edição fica em `w.nations`.
  - Os campeões que entraram em campo ganham o título no histórico e +8 de moral.
  - Se um jogador do usuário for campeão, desbloqueia a conquista "Orgulho nacional".
- **Na tela:** Competições → Copa das Nações mostra campeão, tabela, jogos, artilharia e convocados. Antes da primeira edição, mostra a convocação provável do país do usuário.

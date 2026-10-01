# Animações, botão com 11 e telas mais enxutas

## Gols ao vivo (`src/components/match/live/controller.ts`, `GoalCelebration.tsx`)
- **Fila de comemorações:** cada gol entra numa fila (`GoalFlash`). Antes, só o último gol do minuto piscava, e gols perto do intervalo ou do fim sumiam atrás da tela de intervalo.
- **Relógio:** fica parado enquanto a comemoração está na tela.
- **Intervalo e fim de jogo:** só aparecem quando a fila esvazia (`settleBreaks`).
- **Conteúdo:**
  - escudo, raios e confete nas cores do clube;
  - rótulo pelo lance (golaço, de falta, de cabeça, de pênalti);
  - autor, assistência, minuto e placar atualizado.
- **Duração:**

  | Situação | Duração |
  |---|---|
  | 1x e 2x | 2,6 s |
  | 4x | 1,7 s |
  | Movimento reduzido | 0,9 s |

- **"Até o fim":** os gols que faltavam passam num resumo rápido (1,3 s cada) antes do apito final.
- **Pular:** tocar na comemoração pula as que estão na fila.

## Apresentação de reforço (`src/components/player/SigningShowcase.tsx`)
- **Abertura:** nova sobreposição global `{ kind: "signing" }`, aberta ao fechar:
  - uma contratação (proposta ou multa);
  - um agente livre;
  - um empréstimo;
  - a opção de compra.
- **Conteúdo:**
  - carimbo ("Novo reforço!", "Chegou emprestado!", "É nosso em definitivo!");
  - camisa nas cores e no padrão do clube, com sobrenome e número;
  - avatar, posição, idade, overall e potencial;
  - origem → destino;
  - valor, salário e contrato;
  - confete.
- **Botões:** "Ver ficha" e "Continuar". Esc fecha.

## Jogo de botão com 11 (`src/arcade/*`, `src/components/match/buttonResult.ts`)
- **No Manager:**
  - cada time entra com os 11 titulares, nas posições da formação escolhida (`formationLayout`);
  - os discos levam o número da camisa, e o goleiro tem aro verde.
- **Autor do gol:** o último disco do time que marcou a tocar na bola desde a saída. Desvio do adversário não tira o gol.
- **Assistência:** o toque anterior do mesmo time.
- **Gol contra:** só quando o time que marcou não tocou na bola.
- **Súmula:** autor, garçom e minuto (proporcional ao relógio) entram nela.
- **Modo arcade avulso:** ganhou a opção **Formato 11 x 11 / 5 x 5**, com padrão 11.
- **Discos:** no formato de 11, o raio é 21 (no de 5, continua 27).
- **IA:**
  - considera os 5 discos mais perto da bola;
  - simula no máximo ~7 ms por quadro.
- **Testes (`scripts/arcade-gameplay-test.ts`):**
  - todas as formações cabem no campo, sem discos colados nem dentro do círculo central;
  - nenhuma saída curta vira gol direto;
  - a IA termina de planejar dentro do orçamento;
  - autor e garçom são creditados corretamente.
- **Medição:** com 11, a CPU contra a CPU faz ~2,8 gols por jogo (com 5, ~5,3).

## Escalação
- **Painel lateral:** virou um painel só, com abas (Banco, Tática, Instruções, Bola parada).
- **No computador:** o painel acompanha a rolagem, e a página termina junto com o campo.
- **Força por setor:** virou uma faixa compacta embaixo do campo.
- **Escalar o melhor:** foi para o cabeçalho.
- **Arrastar:** ao arrastar um titular, a aba Banco abre sozinha para receber o jogador.

## Início
- **Foco principal:** o próximo jogo, com o botão de avançar.
- **Ao lado:**
  - "Antes de avançar", só com as pendências (até 4);
  - a semana em formato compacto.
- **Faixa de números:** liga, forma, diretoria e caixa.
- **Abaixo:** classificação e mensagens.
- **Painel completo (recolhido):** diretoria, elenco, finanças e competições.

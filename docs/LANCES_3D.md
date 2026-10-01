# Lances 3D

O jogo de botão saiu. No lugar dele entram as **chances de ataque em 3D**, no estilo Soccer Champs: você conduz o ataque, toca para um companheiro e finaliza deslizando o dedo. A defesa e o goleiro são de um bot com dificuldade ajustável.

## Como jogar
| Gesto | Ação |
|---|---|
| **Deslizar para cima** | Chute. A direção escolhe o canto, o comprimento escolhe a altura e a velocidade dá a força. |
| **Curvar o gesto** | Efeito. Um arco para a esquerda curva a bola para a direita, e vice-versa. |
| **Tocar num companheiro** | Passe (anel branco pulsando = quem pode receber). |
| **Tocar no gramado** | Conduzir a bola até o ponto. |
| **Tocar depois do resultado** | Pula a comemoração. |

- **Altura do chute:** deslize curto → rasteiro; médio → meia altura; longo (~40% da altura da tela) → no ângulo; mais que isso → por cima.
- **Tempo:** cada lance tem 9,5 s (11 s no contra-ataque) para finalizar. Tempo esgotado = lance perdido.
- **Durante o deslize:** um anel dourado mostra no gol onde a bola vai.

## Dificuldade do bot (`src/lances/difficulty.ts`)
| Nível | Defesa | Goleiro | Robô quase perfeito marca |
|---|---|---|---|
| Fácil | 2 defensores, lentos, pouco desarme | reação 0,38 s | ~96% |
| Médio | 3 defensores | reação 0,30 s | ~72% |
| Difícil | 3 defensores, rápidos, cortam passes | reação 0,22 s | ~50% |
| Lendário | 4 defensores, pressão alta | reação 0,16 s, mergulho rápido | ~28% |
| **Automático** | Começa conforme a força do adversário. Cada gol sobe o nível (+0,4) e cada lance perdido alivia (−0,22). | | |

- Os parâmetros (`BotParams`) são interpolados entre os níveis, então o automático tem valores contínuos.
- A escolha fica salva no aparelho (`scm.lances.bot`).

## Motor do lance (`src/lances/engine.ts`)
- **Coordenadas:** metros. O ataque vai para +z, e o gol fica em z = 52,5 (3,66 m de meia largura, travessão a 2,44 m).
- **Passo fixo:** 1/120 s.
- **Cenários:** jogada pelo meio, ataque pela ponta, contra-ataque e entrada da área. Cada um pode vir espelhado.
- **Defesa:**
  - um defensor pressiona entre a bola e o gol;
  - os outros fecham as linhas de passe;
  - o que sobrar cobre a área.
- **Desarme:** quando um defensor encosta (até 1,15 m), há uma chance por segundo de tomar a bola. Ela cresce com o nível do bot e cai com o drible de quem conduz.
- **Corte de passe:** a bola é cortada se passar perto de um defensor. O raio cresce com o nível e diminui com o passe de quem tocou.
- **Bloqueio:** chute rasteiro perto de um defensor tem 60% de chance de bater nele.
- **Chute:** gravidade e efeito (aceleração lateral, com mira compensada). A finalização do atacante espalha menos a bola.
- **Goleiro:**
  - fica na linha entre a bola e o gol e mergulha;
  - a defesa é decidida no momento do chute, pela reação, pela velocidade do mergulho e pelo alcance contra a distância até a bola.
- **Resultados:** gol, defesa, para fora, trave, bloqueio, desarme, passe cortado e tempo esgotado. Cada um tem a sua frase.

## Render 3D (`src/lances/render3d.ts`, three.js)
- **Estádio:**
  - gramado com faixas de corte e linhas;
  - arquibancadas com torcida e placas de LED;
  - torres de refletores com brilho;
  - céu noturno e sombras suaves.
- **Jogadores:** low-poly, com camisa nas cores e no padrão do clube, número e nome. Têm animação de corrida, desarme, queda, comemoração e mergulho do goleiro.
- **Uniformes:** quando as cores se confundem (inclusive time contra ele mesmo no online), a defesa veste o reserva (`contrastKit`).
- **Câmera:**
  - acompanha o ataque por trás;
  - aproxima no chute;
  - gira ao redor do gol na comemoração, com confete e rede estufando;
  - treme na defesa.
- **Celular em pé:** campo de visão mais aberto.

## Onde aparece
- **Manager** (pré-jogo → **Jogar os lances**):
  - a partida é simulada para os gols do adversário, cartões e notas;
  - o seu time joga de 3 a 7 lances, conforme o xG que teria na simulação, um em cada trecho do jogo;
  - quem conduz é um titular de verdade, com os atributos dele;
  - os gols dos lances entram na súmula com autor e garçom;
  - **Simular os lances restantes** decide o resto pela chance do nível;
  - **mata-mata empatado:** lances decisivos (um de cada lado até alguém fazer e o outro não), que viram os pênaltis da súmula.
- **Arcade (`/arcade`):**
  - amistoso e Copa (16 clubes, mata-mata);
  - escolha de 5, 7 ou 9 lances por partida;
  - os gols do adversário são sorteados pela dificuldade e pela força relativa dos times.
- **Online (`/multiplayer`):** duelo de lances, descrito em `CARREIRA_JOGADOR_E_MULTIPLAYER.md`.

## Testes
- `npm run test:lances` (`scripts/lances-test.ts`):
  - taxa de gol de um robô quase perfeito em cada nível (precisa cair a cada nível e ficar nas faixas);
  - todos os cenários terminam;
  - dificuldade automática;
  - gesto de chute: lado, altura, força e efeito;
  - uniformes sem confusão;
  - minutos dos lances;
  - súmula do Manager: placar, ordem dos gols, autores em campo e vencedor.

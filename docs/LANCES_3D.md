# Lances 3D

O jogo de botão saiu. No lugar dele entram as **chances de ataque em 3D**, no estilo Soccer Champs: você conduz o ataque, toca para um companheiro e finaliza deslizando o dedo. A defesa e o goleiro são de um bot com dificuldade ajustável.

## Como jogar
| Gesto | Ação |
|---|---|
| **Deslizar para cima** | Chute. A direção escolhe o canto, o comprimento escolhe a altura e a velocidade dá a força. |
| **Curvar o gesto** | Efeito. Um arco para a esquerda curva a bola para a direita, e vice-versa. |
| **Deslizar devagar e comprido** | **Cavadinha:** arco alto (3 a 4,5 m) que cai no gol. Mortal com o goleiro adiantado. |
| **Tocar num companheiro** | Passe rasteiro, na frente dele se estiver correndo (lançamento em profundidade). |
| **Segurar num companheiro** (0,32 s) | **Passe por cima** da marcação. Um anel enche em volta dele e fica azul ("POR CIMA"). |
| **Deslizar durante um passe** | **De primeira:** o chute sai quando a bola chegar. Se ela chegar alta, vira **cabeçada**. |
| **Joystick** (canto de baixo, à esquerda) | Conduz quem tem a bola na direção em que você arrasta (convertida pela câmera para o gramado). Pouco inclinado anda devagar; no fim do curso (anel dourado) arranca. Soltou, ele desacelera e para com a bola. Funciona junto com os outros gestos: um dedo conduz e o outro chuta ou passa. |
| **Tocar no gramado** | Conduz a bola até o ponto. |
| **Segurar e arrastar** (0,19 s parado) | Conduz **em velocidade seguindo o dedo**. Terminar com um puxão rápido para cima chuta no mesmo gesto. |
| **Tocar em quem tem a bola** | Para e protege a bola. **Dois toques:** drible. |
| **Botão Drible** | Finta e arrancada. Pode deixar o marcador no chão (recarga de 1,4 s). |
| **Setas de borda** | Companheiros fora da tela aparecem como setas com o número; tocar ou segurar nelas também passa. |
| **Tocar depois do resultado** | Pula a comemoração. |
| **Teclado** | WASD ou setas conduzem, Shift arranca, Espaço dribla. |
| **Botão ?** | Mostra todos os controles e pausa o lance. |

- **Altura do chute:** deslize curto → rasteiro; médio → meia altura; longo (~40% da altura da tela) → no ângulo; mais que isso → por cima.
- **Tempo:** cada lance tem 11 s (12,5 s no contra-ataque) para finalizar. Tempo esgotado = lance perdido.
- **Durante o deslize:** um anel dourado mostra no gol onde a bola vai.

## Qualidades no lance
As qualidades do jogador (as mesmas do Manager) mudam o lance. As de quem conduz aparecem embaixo do tempo (VEL, FIN, PAS, DRI, CAB).

| Qualidade | Efeito |
|---|---|
| **Velocidade** | Velocidade máxima (de ~6,6 m/s com 50 a ~8,1 m/s com 90) e aceleração. Na defesa, a velocidade do marcador. |
| **Fôlego** | Barra acima do joystick. Arrancar com a bola gasta (mais rápido com pouco fôlego); sem fôlego não arranca, e recupera devagar. |
| **Finalização** | Precisão e força do chute (até +5 m/s); de primeira, a precisão. |
| **Bola parada** | Efeito: quanto o chute curva e quanto erra ao curvar. |
| **Cabeceio** | Força e precisão da cabeçada; na defesa, o corte de cabeça. |
| **Passe** | Velocidade e precisão do passe (rasteiro e por cima). |
| **Drible** | Proteção contra o desarme, sucesso do drible e domínio de bola na corrida. |
| **Marcação** | Desarme, corte de passe e resistência ao drible (defensores). |
| **Reflexo e colocação** | Goleiro: reação ao chute, alcance e encaixe. |

## Goleiro
- **Previsão:** no chute, o motor simula a trajetória real (curva, gravidade e quique) até o plano do goleiro e até a linha do gol.
- **Defesa ou não:** decidida pela distância da bola ao corpo contra o alcance (braços + mergulho, com limite de extensão), e a chance cai suave conforme a bola fica longe.
- **No tempo certo:** reage, dá passadas de lado rumo à bola e só se atira no fim (o mergulho dura de 0,3 a 0,55 s antes da bola chegar). Num chute de longe ele não cai antes da hora.
- **Coerência:** a defesa acontece no ponto em que a bola passa pelas mãos dele; se ele não alcança, a bola passa e entra (nunca "defesa" com a bola longe). Bola claramente para fora: ele acompanha e não se atira.
- **Encaixe:** chute não muito forte, perto do corpo e na altura das mãos, ele segura (a bola fica nas mãos). Senão espalma para o lado.
- **Visual:** um pouco maior que os de linha, camisa própria (degradê e faixas diagonais), luvas grandes coloridas com punho, base agachada com as mãos à frente, passadas laterais, defesa em pé com as mãos na altura da bola, mergulho deitado no ar e queda de lado.

## Celular deitado
- O botão de girar (ao lado da câmera, só em tela de toque) coloca o jogo em tela cheia e deitado, quando o aparelho deixa (Android). Senão (iPhone), aparece o aviso para girar o celular com a rotação automática ligada.
- Em tela baixa (deitada), a dica vai para baixo, entre o joystick e o drible, e o joystick fica menor.

## Impedimento
- **Regra:** quem estiver à frente do penúltimo adversário (normalmente o zagueiro mais recuado; o goleiro é o último) e da bola **no momento do passe** está impedido. Na mesma linha (até 25 cm) está em condição. Ao receber, o lance termina em "Impedimento!".
- **Defesa:** segura uma linha alguns metros à frente da bola (`lineGap`), com a sobra um pouco atrás (`cover`). Nos níveis difícil e lendário, a linha às vezes **sobe em bloco** (`trap`) para deixar atacantes impedidos.
- **Seus companheiros sabem da regra:** correm colados na linha, meio metro antes, mudando de ritmo e de faixa. Se ficarem impedidos (por exemplo, quando a linha sobe), voltam. Quem passa a bola parte para a **tabela**.
- **Na tela:** anel **vermelho** em quem está impedido (e o nome fica avermelhado). Nos níveis fácil e médio, a linha de impedimento aparece no gramado (azul; laranja quando a defesa sobe).
- **Depois do passe:** a defesa corre atrás do lançamento. O goleiro sai para pegar bola lançada na pequena área.

## Dificuldade do bot (`src/lances/difficulty.ts`)
| Nível | Defesa | Goleiro | Robô quase perfeito marca |
|---|---|---|---|
| Fácil | 2 defensores, lentos, linha recuada, sem linha em bloco | reação 0,38 s | ~85% |
| Médio | 3 defensores, linha a 8 m da bola | reação 0,27 s | ~76% |
| Difícil | 3 defensores, rápidos, linha a 7 m, sobe em bloco às vezes | reação 0,18 s | ~47% |
| Lendário | 4 defensores, linha a 6 m em bloco, pressão alta | reação 0,12 s, mergulho rápido | ~36% |
| **Automático** | Começa conforme a força do adversário. Cada gol sobe o nível (+0,4) e cada lance perdido alivia (−0,22). | | |

- Os parâmetros (`BotParams`) são interpolados entre os níveis, então o automático tem valores contínuos.
- O "robô quase perfeito" (`scripts/lances-bot.ts`) conduz desviando, dribla quando está colado, lança quem está em condição (por cima se a linha de passe estiver fechada), chuta no canto e dá cavadinha quando o goleiro sai.
- A escolha fica salva no aparelho (`scm.lances.bot`).

## Motor do lance (`src/lances/engine.ts`)
- **Coordenadas:** metros. O ataque vai para +z, e o gol fica em z = 52,5 (3,66 m de meia largura, travessão a 2,44 m).
- **Passo fixo:** 1/120 s.
- **Cenários:** jogada pelo meio, ataque pela ponta, contra-ataque e entrada da área. Cada um pode vir espelhado.
- **Defesa:**
  - um defensor pressiona entre a bola e o gol;
  - os outros fecham as linhas de passe;
  - o que sobrar cobre a área.
- **Desarme:** quando um defensor encosta (até 1,15 m), há uma chance por segundo de tomar a bola. Ela cresce com o nível do bot e cai com o drible de quem conduz. Logo depois de um drible que falhou, ela dobra.
- **Drible:** dá certo conforme o drible de quem conduz contra o nível (de 12% a 88%). Se der certo, o marcador cai (0,9 a 1,4 s) e não pode desarmar, cortar ou bloquear.
- **Corte de passe:** cada defensor tem **uma** tentativa por passe, quando a bola passa perto dele (o raio cresce com o nível e diminui com o passe de quem tocou). A chance cresce com o nível e com a marcação dele. Nos primeiros 2 m (saída do pé) ninguém corta. Bola acima de 2 m passa por cima; cortar de cabeça é mais difícil.
- **Movimento:** em velocidade ninguém vira em cima da linha. A direção gira aos poucos (mais devagar quanto mais rápido) e, numa virada brusca, o jogador freia antes de mudar o rumo. A arrancada do drible vira mais rápido.
- **Defesa suave:** a leitura da defesa define um alvo, e o alvo de corrida segue suave até ele (sem trancos a cada leitura). Marcador perto da bola fica de frente para ela e anda de lado ou de costas.
- **Bote:** ao chegar perto, o marcador estica a perna de vez em quando (animação; o desarme continua sendo a chance por segundo).
- **Condução em toques:** a bola vai um pouco mais à frente a cada duas passadas e o jogador a alcança. Na finta do drible, ela sai para o lado da arrancada.
- **Goleiro:** passadas curtas de lado, com aceleração; vira aos poucos para a bola.
- **Passe por cima:** parábola de 3 a 5 m de altura (o tempo de voo vem da altura). É mais lento que o rasteiro, e a defesa tem tempo de voltar.
- **Bloqueio:** chute rasteiro perto de um defensor tem 60% de chance de bater nele.
- **Chute:** gravidade e efeito (aceleração lateral, com mira compensada). A finalização do atacante espalha menos a bola. De primeira espalha 25% mais e de cabeça 50% mais (sem efeito e com força limitada).
- **Cavadinha:** se a bola passa acima de 2,55 m sobre o goleiro, ele só defende voltando para a linha (de costas, ~3,6 m/s, e ainda precisa saltar). A chance depende da folga de tempo que ele tem.
- **Goleiro:**
  - fica na linha entre a bola e o gol e mergulha;
  - a defesa é decidida no momento do chute, pela reação, pela velocidade do mergulho e pelo alcance contra a distância até a bola.
- **Resultados:** gol (normal, de primeira, de cabeça ou de cavadinha), defesa, para fora, trave, bloqueio, desarme, passe cortado, impedimento e tempo esgotado. Cada um tem a sua frase.

## Render 3D (`src/lances/render3d.ts`, three.js)
- **Estádio:**
  - gramado em faixas de corte (uma malha por faixa) com textura fina de grama repetida em metros;
  - linhas do campo em geometria (retas, arcos e marcas), nítidas a qualquer distância;
  - arquibancadas com torcida e placas de LED (texto só na face voltada para o campo);
  - torres de refletores com brilho, céu noturno e sombras suaves.
- **Jogadores** (`src/lances/players3d.ts`):
  - **visual:** estilizado de jogo de celular (1,2x para ler bem de cima), com sombreamento em faixas (toon) e contorno de espessura constante;
  - **corpo:** cabeça grande com olhos e seis estilos de cabelo (curto, máquina, black power, moicano, coque, faixa); tronco moldado; gola na cor secundária; camisa com padrão e número grande nas costas; chuteiras coloridas; goleiro com luvas e manga longa;
  - **articulações:** joelhos e cotovelos, com geometrias e materiais compartilhados entre os jogadores;
  - **poses misturadas:** a cada quadro sai uma pose alvo e cada articulação vai suavemente até ela, então nada muda de uma vez (troca de estado, queda, levantar);
  - **marcha conforme a direção:** passada para a frente, de costas (mais curta) ou de lado (pernas abrindo e fechando); o corpo inclina para dentro das curvas e para o lado do movimento; a cabeça (e um pouco do tronco) acompanha a bola;
  - **animações:** corrida (joelho dobra na passada, braços opostos, tronco gira), respiração parado, chute e passe (perna vai atrás e chicoteia), carrinho, comemorações;
  - **drible:** pedalada (a perna contorna a bola), ginga para o lado falso e arrancada para o outro; o marcador driblado cai sentado para o lado em que mordeu a finta e levanta;
  - **zagueiro:** marcação agachada de frente para a bola, braços abertos, bote com a perna esticada;
  - **goleiro:** base quicando nas pontas dos pés, passadas laterais, agacha mais na reação ao chute; mergulho com impulso, corpo deitado no ar e braços esticados para a bola, caindo de lado; salto para trás na cavadinha;
  - **comemorações:** pulo, aviãozinho ou de joelhos. Quem erra põe as mãos na cabeça.
- **Bola:** desenhada 1,6x maior que o tamanho real (só no visual; a física usa o tamanho real).
- **Uniformes:** quando as cores se confundem (inclusive time contra ele mesmo no online), a defesa veste o reserva (`contrastKit`).
- **Câmera** (botão no canto do placar; a escolha fica salva em `scm.lances.cam`):
  - **Alta (padrão):** de cima e um pouco atrás da bola, como no Soccer Champs, com o gol no alto da tela. No celular em pé fica mais alta e com campo de visão mais aberto.
  - **Atrás:** atrás do jogador, mais perto e mais baixa.
  - Nas duas: aproxima do gol no chute, gira ao redor do gol na comemoração (confete e rede estufando) e treme na defesa.
- **Qualidade de imagem:**
  - antialiasing e anisotropia máxima da placa nas texturas;
  - densidade de pixels até 2,5x no celular e 2x em telas grandes;
  - **resolução adaptativa:** se a média ficar abaixo de ~40 quadros por segundo, a densidade baixa 0,25 por vez (até 1x) e volta a subir quando sobra folga;
  - textos (nomes e números) em texturas de alta resolução.

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
  - impedimento (passe para quem está à frente da linha) e passe em condição;
  - companheiros evitando o impedimento (menos de 3% do tempo impedidos no fácil);
  - passe por cima passando sobre um defensor no caminho (o rasteiro é cortado bem mais);
  - de primeira e cabeçada, cavadinha (sobe acima de 2,8 m), drible (às vezes derruba, tem recarga) e arrancada mais rápida que conduzir normal;
  - todos os cenários terminam;
  - dificuldade automática;
  - gesto de chute: lado, altura, força e efeito;
  - uniformes sem confusão;
  - minutos dos lances;
  - súmula do Manager: placar, ordem dos gols, autores em campo e vencedor.

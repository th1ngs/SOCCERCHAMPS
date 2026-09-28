# ⚽ Soccer Champs

Jogo de futebol de botão por turnos, no estilo *Soccer Champs* / *Soccer Stars*, feito com HTML5 Canvas e JavaScript puro. Não tem dependências nem etapa de build.

## Como rodar

Abra o `index.html` no navegador. Também dá para servir a pasta:

```bash
python3 -m http.server 8080
# depois acesse http://localhost:8080
```

Funciona no computador (mouse) e no celular (toque). Com o celular em pé, o campo gira automaticamente.

## Como jogar

1. Toque em um dos seus jogadores (os que estão piscando).
2. Arraste para trás, como um estilingue. A seta mostra a direção e a força do chute.
3. Solte para chutar. Cada time tem um chute por turno e **12 segundos** para decidir.
4. Faça mais gols que o adversário até o fim do tempo.

## Modos

- **Copa do Mundo**: mata-mata com 16 seleções (oitavas → final). A dificuldade sobe a cada fase, empates vão para a **morte súbita** e o progresso fica salvo no navegador.
- **Amistoso vs CPU**: escolha os dois times, a dificuldade (Fácil / Médio / Difícil) e a duração (2, 3 ou 5 min).
- **2 Jogadores**: duas pessoas no mesmo aparelho, alternando os turnos.

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `js/teams.js` | 26 seleções com bandeira e força (rating) |
| `js/physics.js` | Física: colisões elásticas, atrito, paredes, traves e detecção de gol |
| `js/ai.js` | IA da CPU: gera chutes candidatos, simula cada um com a física real e avalia ataque/defesa |
| `js/game.js` | Partida: turnos, relógio, gols, morte súbita e entrada do jogador |
| `js/render.js` | Desenho do campo, bandeiras, discos, bola, mira e efeitos |
| `js/audio.js` | Sons sintetizados via WebAudio (sem arquivos de áudio) |
| `js/cup.js` | Chaveamento e simulação da Copa |
| `js/main.js` | Telas, HUD, loop principal e controles |

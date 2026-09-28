# ⚽ Soccer Champs

Dois jogos de futebol em HTML5 e JavaScript puro, sem dependências nem etapa de build:

- **Soccer Champs Manager** (`index.html`): jogo de gestão de clube, com temporadas, base, mercado e partidas ao vivo.
- **Modo arcade** (`botao.html`): futebol de botão por turnos. Também é usado dentro do Manager na opção "Jogar no botão".

## Como rodar

```bash
python3 -m http.server 8080
# acesse http://localhost:8080
```

Abrir o `index.html` direto no navegador também funciona. A carreira é salva automaticamente no navegador (localStorage).

## Soccer Champs Manager

Escolha um dos 32 clubes fictícios e comande o time temporada após temporada.

**Competições**
- Série A e Série B, com 16 clubes cada, turno e returno (30 rodadas). Os 3 últimos da A caem e os 3 primeiros da B sobem.
- Copa com os 32 clubes: mata-mata em jogo único, com pênaltis em caso de empate.
- Tabela, artilharia, calendário e histórico de campeões.

**Dia de jogo**
- **Ao vivo:** campo animado, narração lance a lance, posse, finalizações, xG, velocidade 1x/2x/4x e intervalo.
- **Substituições e tática durante o jogo:** até 5 trocas, mudança de formação e de estilo, e aviso de lesão.
- **Resultado rápido** ou **Jogar no botão**, em que você decide a partida no futebol de botão.
- Resumo com gols, estatísticas, notas dos jogadores e resultados da rodada.

**Gestão**
- **Elenco:** overall, potencial, idade, condição física, moral, contrato, salário e valor de mercado. Os jogadores evoluem com a idade, o treino e os minutos jogados, e declinam depois dos 30.
- **Tática:** 6 formações, 4 estilos de jogo (defensivo, equilibrado, ofensivo, pressão alta) e escalação no campo. Jogar fora de posição rende menos.
- **Base:** uma nova safra de garotos a cada temporada, peneira extra paga, promoção ao profissional e dispensa. Aos 19 anos, o garoto sobe ou sai.
- **Mercado:** janelas na pré-temporada e no meio do ano, filtros, propostas com contraproposta, agentes livres, lista de venda e ofertas da CPU pelos seus jogadores. A CPU também negocia entre si.
- **Clube:** finanças (bilheteria, TV, patrocínio, premiações, salários), melhorias da base, do CT e do estádio, e intensidade de treino.
- **Diretoria:** meta por temporada e confiança semana a semana. Resultados ruins levam à demissão, com propostas de outros clubes; campanhas fortes atraem clubes maiores.

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `js/manager/data.js` | Clubes, nomes, posições, formações, táticas e narração |
| `js/manager/gen.js` | Geração do mundo, jogadores, base, salários e valores |
| `js/manager/squad.js` | Escalação automática e validação de disponibilidade |
| `js/manager/engine.js` | Motor de partida minuto a minuto (ao vivo e simulação) |
| `js/manager/world.js` | Calendário, tabela, Copa, semana, finanças, diretoria e virada de temporada |
| `js/manager/market.js` | Transferências, propostas, renovações, base e estrutura |
| `js/manager/ui.js` | Casca da interface, salvamento, modais e fluxo da semana |
| `js/manager/views.js` | Telas das abas |
| `js/manager/live.js` | Pré-jogo, partida ao vivo e resumo |
| `js/manager/bridge.js` | Integração com o futebol de botão |
| `js/*.js` | Motor do futebol de botão (física, IA, som, renderização) |

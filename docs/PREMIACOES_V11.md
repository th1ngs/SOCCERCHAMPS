# Premiações e cerimônias (World v11)

## Jogador e Técnico do Mês (ceremonies.ts)
- Contagem por mês do calendário, **só na divisão do clube do usuário**: fotografia das estatísticas (`w.month.snap`)
  no começo do mês; na virada (`closeMonth`, no `endWeek`) escolhe:
  - Jogador do mês: nota média do mês, gols, assistências e jogos (mínimo 2 jogos), com os 3 indicados;
  - Revelação do mês (até 21 anos) e Técnico do mês (mais pontos de liga no mês).
- O último mês da temporada fecha no fim dela. Prêmios em `w.monthAwards` (últimos 60) e mensagem na caixa de entrada.

## Comemoração de título
`celebrateTitle` em cada taça do usuário (copas e liga): tela "Campeão!" com a taça subindo nas cores do clube e fogos.

## Noite de Gala (fim de temporada)
`buildGala` monta `SeasonSummary.gala`:
- do campeonato do usuário: campeão, artilheiro (gols só na liga), rei das assistências, craque, revelação, goleiro e técnico;
- mundiais: Chuteira de Ouro, melhor jovem, goleiro do ano, técnico do ano e, fechando a noite, a **Bola de Ouro**.
Cada categoria tem até 3 indicados (o primeiro vence). Tela: cortina abrindo → indicados → envelope "E o vencedor é…" →
revelação com troféu, raios e confete (destaque dourado quando o prêmio é do clube do usuário) → quadro de vencedores.
As galas ficam em `w.galas` (últimas 5) e podem ser revistas em Competições → Prêmios.

## Fluxo das telas
`ceremonyFlow.nextFlowOverlay`: cerimônias da fila (`w.ceremonies`, no máximo 8) → Noite de Gala (`galaSeen`) →
fim de temporada (ou demissão). Usado no fim de cada semana e no botão principal.

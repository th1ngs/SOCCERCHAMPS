# Competições, patrocínio, teto salarial, metas e vagas (World v10)

## Calendário (55 semanas)
| Semanas | O quê |
|---|---|
| 1 | **Supercopas**: campeão da liga x campeão da copa nacional da temporada anterior (todas as ligas menos a Escócia) |
| 2, 4, 6, 8, 10 | **Estaduais** (Brasil, um por UF com 2+ clubes) e **Copas da Liga** (Inglaterra, Portugal, Escócia, Argentina) |
| 13, 21, 29, 37, 45 | **Copas nacionais** (Copa do Brasil, Copa Argentina, Taça de Portugal, Copa do Rei, Copa da Inglaterra…) |
| 16, 24, 32, 40, 48 | **Continentais**: Liga dos Campeões e Liga Europa (Europa), Libertadores e Sul-Americana (Brasil e Argentina), **Copa do Nordeste** |
| 55 | **Copa Intercontinental**: campeão da Liga dos Campeões x campeão da Libertadores |
| demais (38) | rodadas de liga |

- Cada copa ocupa as **últimas** semanas do seu grupo (uma copa de 16 joga 4 das 5), então todas as finais fecham juntas.
- Uma semana pode ter várias copas (`Week.comps`), sem clube repetido: estaduais (Brasil) e copas da liga (outras ligas)
  não se cruzam, e a Copa do Nordeste exclui quem está na Libertadores ou na Sul-Americana.
- `Match.size` guarda o tamanho da fase (32 … 2 = final): nome da fase (`matchStage`) e prêmio (`knockoutPrizeBySize`).
- Saves antigos terminam a temporada no calendário antigo (`weekComps` deduz as copas pelo tipo da semana).

## Vagas continentais (pela tabela da 1ª divisão)
- Liga dos Campeões (32): Inglaterra, Espanha, Itália e Alemanha 4; França e Portugal 3; demais europeias 2 (`CONT_SLOTS`).
- Liga Europa (32): os seguintes (`EUR2_SLOTS`).
- Libertadores (16): 8 primeiros do Brasil e 8 da Argentina; Sul-Americana (16): do 9º ao 16º.
- `continentalQualifiers` (fim da temporada) → `w.qualified`; sem classificados (1ª temporada), a reputação decide.

## Seleções (entre temporadas)
Copa do Mundo (2026, 2030…), Eurocopa (2028, 2032…, só seleções europeias) e Liga das Nações (anos ímpares). `NationsEdition.kind`.

## Teto salarial fixo por liga
`LEAGUE_WAGE_CAPS` (finance.ts): um valor por liga e divisão, igual para todos os clubes da divisão; muda só com acesso/queda.
O usuário usa exatamente esse teto (`capFor`); a CPU usa o próprio orçamento, limitado pelo teto da divisão.

## Patrocínio escolhido (sponsors.ts)
No início da carreira, ao trocar de clube e quando o contrato acaba, chegam três propostas:
- **Valor fixo**: maior valor semanal, 1 temporada, sem bônus.
- **Por desempenho**: base ~70%, bônus por vitória, por título e pela meta da diretoria.
- **Longo prazo**: 3 temporadas com valor estável (não cai com rebaixamento) e bônus pela meta.
Sem escolha até o fim da janela, a diretoria assina a de valor fixo.

## Metas da diretoria (goals.ts)
Liga (peso 3) + copa nacional, continental, estadual (fase-alvo pelo peso do clube na copa), caixa no azul, folha dentro do teto,
15 jogos para jogadores de até 21 anos e não perder clássicos. Progresso ao vivo (`goalProgress`) e avaliação no fim da
temporada (`evaluateGoals`: ±3 de confiança por ponto de peso). O cartão da diretoria tem uma ilustração da sala (`BoardArt`).

## Vagas de treinador (jobs.ts)
Quadro com até 8 vagas (clubes em crise demitem o técnico; outras saídas aleatórias), renovado a cada 5 semanas.
Reputação do treinador (`managerRep`): tamanho do clube, títulos pesados pela importância, metas cumpridas e confiança.
Candidatura (até 3 em análise) → resposta na semana seguinte → proposta válida por 3 semanas (Carreira → Vagas).

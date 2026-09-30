# Qualidade das ligas

As 13 ligas deixaram de ser equivalentes: Inglaterra e Espanha têm os melhores elencos, e Escócia e Grécia os mais fracos, como no futebol real.
Antes, os 11 titulares de um clube da 1ª divisão tinham 75–79 de overall em qualquer país.

## Parâmetros por liga (`LEAGUES` em `src/game/leagues.ts`)
| Campo | O que faz |
|---|---|
| `quality` | Pontos de overall acrescentados aos elencos da liga, além do que a reputação do clube sugere. Os valores somam ~zero para não mexer na média do mundo. |
| `talent` | Formação de talentos: mais joias na base (e, por isso, mais exportação de craques) e mais estrangeiros vindos desse país. |
| `domestic` | Fração de jogadores do próprio país nos elencos. |
| `wages` | Nível salarial, recalibrado para a folha ficar em ~90% da receita livre. |

| Liga | quality | talent | domestic |
|---|---|---|---|
| Inglaterra | +4 | 1,0 | 58% |
| Espanha | +3,5 | 1,1 | 72% |
| Alemanha | +3 | 1,05 | 62% |
| Itália | +2,5 | 1,0 | 65% |
| França | +1 | 1,3 | 72% |
| Brasil | −0,5 | 1,3 | 92% |
| Portugal | −0,5 | 1,1 | 55% |
| Holanda | −1 | 1,2 | 60% |
| Argentina | −1,5 | 1,25 | 93% |
| Bélgica | −2 | 1,15 | 52% |
| Turquia | −3 | 1,0 | 66% |
| Escócia | −4,5 | 0,9 | 60% |
| Grécia | −5 | 0,9 | 70% |

## Onde a qualidade entra
- **Elencos** (`clubBaseOvr`): `48 + reputação × 0,32 + qualityBonus`. O bônus vale 100% na 1ª divisão, 75% na 2ª e 60% na 3ª. Vale na criação do mundo e quando a CPU completa os elencos.
- **Base**: o potencial médio dos garotos acompanha 90% da qualidade da liga. Sem isso, a diferença sumia em poucas temporadas. Países de talento (`talent`) têm mais joias.
- **Evolução**: jogadores de ligas fortes evoluem um pouco mais rápido (1,5% por ponto de qualidade).
- **Nacionalidade** (`rollNat`): a parcela de locais vem de `domestic`. Os estrangeiros vêm, em maior número, dos países de talento.
- **Prestígio** (`prestigeOf`): reputação + 2 × qualidade. Decide:
  - quem a CPU compra de quem e quem aceita trocar de clube;
  - a recusa do jogador numa proposta sua ("liga de nível inferior");
  - clubes que aceitam empréstimos;
  - ofertas de emprego;
  - a chance de convencer um jogador a ficar;
  - as vagas extras na Copa dos Campeões, dadas por prestígio (ligas fortes ganham mais).
- **Vontade de trocar de liga** (`willingToMove`): jogadores de até 30 anos hesitam em ir para uma liga bem mais fraca (Premier League → Brasil), com chance caindo com a diferença. Veteranos aceitam.
- **Agentes livres** (`freeAgentFor`): um astro muito acima do nível do clube (overall esperado +5) não assina com ele. Na virada de temporada, os clubes mais prestigiados escolhem primeiro. Antes valia a ordem do cadastro e o Brasil ficava com os melhores livres do mundo.

## Ranking das ligas (`leagueRanking`)
- **Cálculo:** a média dos 11 melhores de cada clube da 1ª divisão, calculada ao vivo. Por isso muda conforme os craques trocam de país.
- **Tela:** Competições → Ranking das ligas.
- **Outros lugares:** estrelas e rótulo ("Elite mundial" a "Emergente") na escolha de carreira; nível e posição no cabeçalho de cada liga; nota sobre a liga no orçamento do clube.

## Resultados medidos
- **Amplitude:** cerca de 10 pontos do topo à base, estável em 5 temporadas simuladas (Inglaterra 82–83, Espanha 81, Itália e Alemanha ~80, França ~78, Brasil ~76, Turquia ~74, Grécia e Escócia ~72–73).
- **Diferença entre divisões:** é menor na 2ª divisão.
- **Finanças:** a folha continua entre 0,8 e 1,05 da receita livre em todas as ligas.
- **Transferências entre ligas:** ficam equilibradas entre "sobe" e "desce".

## Saves antigos
- Carreiras já iniciadas mantêm os jogadores que já existem.
- As regras de prestígio, transferências, agentes livres e formação de talentos valem de imediato.
- A qualidade dos elencos converge para o novo padrão com as temporadas, conforme os jogadores são renovados.

## Checagens
- `scripts/sim-test.ts --checks` tem `runLeagueQualityChecks`:
  - ordem e amplitude do ranking;
  - bônus por divisão;
  - prestígio;
  - vontade de trocar de liga;
  - agentes livres;
  - potencial da base;
  - parcela de locais por liga.

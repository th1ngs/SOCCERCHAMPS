# Torcida, base, imprensa e recordes (World v12)

## Torcida organizada (fans.ts)
- Uma organizada por clube do usuário (`w.torcida`): nome gerado a partir do apelido ("Dragões Alvianil"), sócios
  (pela capacidade do estádio e reputação) e os últimos 20 eventos.
- Toda semana os sócios pagam `MEMBER_FEE` × fator da liga (entra como receita comercial) e o número de sócios anda
  devagar na direção do alvo dado pelo humor (`Club.fans`).
- Eventos pela forma recente (com intervalo mínimo de 3 semanas):
  - `faixas` (3 derrotas), `protesto` (5 sem vencer, ou 3 derrotas com a torcida irritada) e `cobranca` (5 sem
    vencer com torcida e diretoria em baixa): pressão extra na diretoria, moral menor e sócios saindo;
  - `festa` (4 vitórias), `mosaico` (vitória no clássico) e `carreata` (qualquer título): moral, diretoria e novos sócios.
- Cada evento entra na fila de cerimônias (tela da arquibancada com faixas) e na caixa de entrada. Card "Torcida
  organizada" na tela do Clube, com as coletivas recentes.

## Campeonatos de base (youthcomp.ts)
- Sub-17 e Sub-20 entre os clubes da divisão do usuário: turno único (uma rodada a cada duas rodadas de liga) e final
  entre os dois primeiros na última rodada (campo neutro, pênaltis no empate).
- Modelo rápido: gols de Poisson pela força dos 11 melhores elegíveis (completados por garotos anônimos pelo nível da
  base). No Sub-20 os titulares do time principal ficam de fora. Quem joga marca `played` e evolui como quem joga.
- Artilharia com amortecimento (quem já marcou no jogo, e quem já tem muitos gols, perde peso).
- Título do usuário: troféu "(base)", diretoria +3 e cerimônia de campeão.
- Convocação das seleções Sub-17 e Sub-20 de todos os países no meio da temporada (`callupWeek`): os 20 melhores por
  idade e nacionalidade (overall + potencial/4). Os garotos do usuário ganham moral +6, `ycalls` e às vezes +1 de
  potencial; cerimônia "Convocados!".
- Tela: card "Campeonatos de base" na Base (tabela, artilharia, final e convocados).

## Coletiva de imprensa (press.ts)
- Jogos grandes (`pressReason`): clássicos, semifinais e finais de mata-mata, jogos continentais e confronto direto
  entre os 4 primeiros da liga (a partir da 6ª semana).
- Antes do jogo (no "Dia de jogo"): confiante, humilde, provocador ou evasivo. Efeitos imediatos em moral do elenco,
  humor da torcida e diretoria, mais um multiplicador de rendimento (`pressMult` no motor). Provocar inflama também o
  adversário.
- No fim da semana (`settlePress`) o resultado cobra a resposta: confiança vira moral na vitória e cobrança na
  derrota; a provocação amplifica os dois lados.
- Depois do jogo (no resumo): elogiar o elenco, assumir a responsabilidade, reclamar da arbitragem (pode vir multa) ou
  cobrar o elenco; o efeito depende do resultado.
- Cada resposta vira manchete na caixa de entrada; as últimas 12 coletivas ficam em `w.press`.

## Recordes do campeonato (champrecords.ts)
- Para cada divisão da liga do usuário (`w.champRecords`): artilheiros da história (gols de liga na divisão), mais
  gols numa temporada, maior goleada, mais pontos, mais gols de um time e maiores campeões.
- O passado é inventado na primeira vez (lendas da artilharia, marcas antigas e títulos pela reputação), para os
  recordes terem peso desde a primeira temporada.
- Depois de cada rodada de liga (`recordsWeek`) e no fim da temporada (`recordsSeasonEnd`): quando uma marca cai na
  divisão do usuário, sai mensagem e a cerimônia "Recorde!" (placa que racha, número antigo riscado, novo carimbado).
  Os recordes de temporada avisam uma vez e depois só sobem; a maior goleada avisa a cada nova marca (uma por rodada).
- Tela: Competições → liga do usuário → "Recordes".

## Ajustes desta versão
- Gols: chute redistribuído por posição e finalização, com amortecimento para quem já marcou no jogo; artilheiros
  voltaram a números reais (~30–40 gols de liga no topo).
- Simulação ~40% mais rápida: dias do calendário processados numa passada por jogador, motor das partidas da CPU em
  modo rápido e checagens caras espaçadas.
- Save compacto (`pack.ts`): jogadores gravados sem os campos no valor padrão; `unpackWorld` restaura antes da migração.
- Teste instável de mandos corrigido (`breakLongRuns` na migração do calendário).

## Migração (v11 → v12)
Cria a torcida, os recordes da liga e as listas de coletivas e convocações. Os campeonatos de base começam na hora se a
temporada estiver no primeiro terço; senão, na próxima temporada.

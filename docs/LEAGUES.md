# Ligas e divisões — contrato (World v3, expandido na v9)

## Expansão (World v9) — vale sobre o resto deste documento
> Calendário de 55 semanas, novas copas, teto salarial fixo, patrocínio, metas e vagas (v10): veja `docs/COMPETICOES_E_GESTAO_V10.md`.
- **20 clubes por divisão**, 38 rodadas (turno e returno) e **4 sobem / 4 caem** (`DIVISION_SIZE`, `LEAGUE_ROUNDS`, `PROMOTION_SPOTS`).
- **Divisões:** Brasil 4 (Série D nova); Argentina, Portugal, Espanha, Inglaterra, Itália, Alemanha e França 3
  (Primera B, Liga 3, Primera Federación, Second Division, Serie C, 3. Liga, National); as demais 2. São 35 divisões e 700 clubes.
- **Clubes novos:** `src/game/clubs/lower.ts` (ids `<liga>-nNN`), com reputação caindo a partir do último clube original;
  `CLUB_SEEDS` junta originais + novos e `toStatic` reparte em blocos de 20.
- **Calendário (47 semanas, `TOTAL_WEEKS`):** Copa Nacional nas semanas 5, 13, 21, 29 e 37; Copa dos Campeões em 9, 17, 25 e 33;
  janelas 0–5 e 19–24; promessas cobradas na semana 24. `seasonWeeks(w)`/`leagueRounds(w)` leem o calendário do save,
  então uma temporada antiga (39 semanas) termina no formato em que começou.
- **Copa Nacional:** 32 clubes — a primeira divisão inteira e os 12 de maior reputação da segunda.
- **Evolução dos jogadores:** o ganho por treino é escalado por `LEGACY_SEASON_WEEKS / seasonWeeks`, para a evolução por temporada continuar a mesma.
- **Força e estrelas:** a força de um time é a dos **titulares** (`teamRating`, com encaixe na posição), nunca a do banco.
  `strengthStars(xi)` vai de 0,5 a 5 estrelas (58 → 0,5; 86 → 5); `clubStars(w, c)` no jogo e `expectedXi(c)` sem mundo
  (escolha de clube, arcade, online). Ligas fracas e divisões de baixo ficam com poucas estrelas.
- **Migração v8 → v9:** na pré-temporada, `seedMissingClubs` + `rebalanceDivisions` + `startSeason` na hora; no meio da
  temporada, só um aviso — a expansão entra no `newSeason`. `rebalanceDivisions` ordena por divisão atual e reputação e
  reparte em blocos de 20 (os melhores de baixo sobem para completar as vagas).
- **Renovações (`src/game/renewals.ts`):** `renewalPlan` (recomendação por jogador), `bulkRenew` (renovação em lote com o
  pedido do jogador + acréscimo; aceita contraproposta até 10% acima), avisos nas semanas 2, n−12 e n−3 e a
  renovação automática opcional (`w.autoRenew`: `off` | `key` | `all`) na semana n−3. Renovar por N anos dá N temporadas
  depois da atual (`renewedContract`).

## Estrutura
Seis ligas nacionais. Cada divisão tem **16 clubes** e 30 rodadas (turno e returno).

| Liga (`LeagueId`) | País | Divisões (`DivisionId` → nome) | Força (`wealth`) |
|---|---|---|---|
| `bra` | Brasil | `bra1` Série A, `bra2` Série B, `bra3` Série C | 1.0 |
| `arg` | Argentina | `arg1` Primera División, `arg2` Primera Nacional | 0.75 |
| `por` | Portugal | `por1` Primeira Liga, `por2` Segunda Liga | 0.85 |
| `esp` | Espanha | `esp1` Primera División, `esp2` Segunda División | 1.35 |
| `eng` | Inglaterra | `eng1` Premier Division, `eng2` First Division | 1.6 |
| `ita` | Itália | `ita1` Serie A, `ita2` Serie B | 1.25 |

- **Acesso e rebaixamento:** 3 caem de cada divisão para a de baixo e 3 sobem. A última divisão de cada liga não tem rebaixamento.
- **Reputação típica (`rep`):**
  - Primeira divisão: eng1 72–95, esp1 70–94, ita1 68–92, bra1 65–90, por1 58–88, arg1 60–86.
  - Segunda divisão: 44–68.
  - bra3: 34–46.
  - O overall dos elencos deriva de `rep` (como hoje), então as ligas ricas têm elencos mais fortes.
- **Dinheiro:** tudo em R$. Cota de TV por semana = `TV_BASE[nível] × wealth`, com `TV_BASE = [380000, 120000, 45000]`. Patrocínio e bilheteria seguem a reputação, como hoje.

## Dados dos clubes
- Um arquivo por liga em `src/game/clubs/<liga>.ts`: `bra.ts` com 48 clubes (16 por divisão), e `arg.ts`, `por.ts`, `esp.ts`, `eng.ts`, `ita.ts` com 32 cada.
- Cada arquivo exporta um array ordenado por prestígio: os 16 primeiros vão para a divisão 1, os próximos 16 para a 2, e assim por diante.
- Formato de cada item (`ClubSeed`) — os mesmos campos de hoje:
  ```
  id (único GLOBAL; clubes estrangeiros com prefixo do país, ex.: "arg-rosario"),
  name (≤ 22 caracteres), short (3 letras, único dentro da liga), city,
  uf (código curto de estado/província/região, 2–3 letras),
  colors [primária, secundária], pattern ("v"|"h"|"sash"|"half"|"solid"),
  rep, cap, nickname, mascot, stadium,
  rival (id de um clube da MESMA liga)
  ```
- **Nomes de jogadores:** um arquivo por nacionalidade em `src/game/names/<nat>.ts`, exportando `{ FIRST: string[]; LAST: string[]; NICK: string[] }`.
  - Nacionalidades: `bra` (as listas atuais), `arg`, `por`, `esp`, `eng`, `ita`.
  - Os elencos têm cerca de 85% de jogadores do próprio país e 15% de outras nacionalidades.
  - O jogador ganha o campo `nat: LeagueId`.

## Competições e calendário (39 semanas)
- **Liga:** 30 rodadas, jogadas nas semanas que não são de copa.
- **Copa Nacional** de cada liga (`cup:<liga>`):
  - 32 clubes: as duas primeiras divisões; no Brasil, Série A e Série B.
  - Mata-mata em jogo único, com pênaltis em caso de empate.
  - Semanas 4, 10, 16, 22 e 28.
- **Copa dos Campeões** (`cont`):
  - 16 clubes: os 3 primeiros de cada primeira divisão na temporada anterior (18), cortando os 2 de menor reputação para fechar 16. Na 1ª temporada, os 3 de maior reputação de cada primeira divisão.
  - Mata-mata em jogo único.
  - Semanas 7, 13, 19 e 25: oitavas, quartas, semifinal e final (campo neutro).
- `Match.comp` pode ser: um `DivisionId`, `cup:<LeagueId>` ou `cont`.
- **Prêmios:** mantêm-se os de liga e copa, escalados por `wealth`. Copa dos Campeões: [4, 8, 15, 30] milhões por fase vencida.

## Carreira
- **Início:** o usuário escolhe liga, divisão e clube (qualquer um dos 208).
- **Objetivos da diretoria:** calculados pelo ranking de reputação dentro da divisão, como hoje, com rótulos genéricos ("brigar pelo título", "conquistar o acesso", "evitar o rebaixamento" — nunca "Série A" fixo).
- **Propostas de emprego** (demissão ou destaque) podem vir de clubes de qualquer liga.
- **Mercado:** abrange todas as ligas, com filtros por liga e por nacionalidade.
- **Histórico por temporada:**
  - campeão de cada divisão e de cada copa;
  - artilheiros das primeiras divisões;
  - melhor jogador;
  - posição, divisão, liga e objetivo do usuário.

## Migração
- `migrateWorld` leva saves v2 para v3.
- Mais simples e aceito: detectar um save v2 (sem `league` nos clubes) e marcá-lo como incompatível. A UI então pede uma nova carreira.

## Formato do histórico (usado pelo servidor para o Hall da Fama)
```ts
interface HistoryEntry {
  season: number;
  champions: Record<DivisionId, string>;       // campeão de cada divisão
  cups: Record<string, string | null>;         // "cup:bra" … e "cont" → id do campeão
  scorers: Record<DivisionId, { name: string; club: string; goals: number } | null>; // primeiras divisões
  best: { name: string; club: string; avg: number } | null;
  user: { club: string; league: LeagueId; div: DivisionId; pos: number; objective: string; success: boolean };
}
```
Exporte também `competitionName(comp: string): string`, que devolve "Série A", "Copa Nacional (Brasil)" ou "Copa dos Campeões".

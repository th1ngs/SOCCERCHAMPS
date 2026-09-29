# Ligas e divisões — contrato (World v3)

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

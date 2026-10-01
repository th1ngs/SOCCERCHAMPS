# Base: olheiros contratados, mais peneiras e salários (World v8)

## Olheiros (`src/game/scouts.ts`)
- **O que mudou:** a melhoria "Departamento de olheiros" (níveis 1-5 comprados no Clube) saiu do jogo. Agora você **contrata olheiros**, até 6 ao mesmo tempo.
- **Cada olheiro tem:**
  - nível de 1 a 5 (estrelas);
  - país de especialidade;
  - idade e salário semanal: `5.000 × nível^1,7 × salários da liga` (nível 1 ≈ R$ 5 mil; nível 5 ≈ R$ 77 mil no Brasil).
- **Contratar:** luvas de 6 semanas de salário.
- **Dispensar:** multa de 4 semanas. Um relatório que estava com ele passa para outro olheiro livre, se houver.
- **Mercado de olheiros:** 6 candidatos, renovados a cada temporada. Sempre há:
  - um olheiro nível 3+;
  - um especialista de outro país.
- **Efeitos:**

  | Quem | Efeito |
  |---|---|
  | Cada olheiro | Um relatório ao mesmo tempo (sem olheiros, não há relatórios) |
  | Especialista no país do jogador (ou da liga do clube dele) | Relatório em 1 semana |
  | Olheiro nível 3+ | Relatório em 1 semana |
  | Demais olheiros | Relatório em 2 semanas |
  | Olheiro-chefe (o de maior nível) | Define a faixa inicial de potencial da base: 24 − 3·base − 2·nível do chefe |
  | Olheiro-chefe nível 4+ | +1 peneira por temporada e +1 garoto em cada peneira |
  | Especialista num país estrangeiro | Peneira lá custa ×1,2 (em vez de ×1,8), traz +1 garoto e tem mais chance de um talento acima da média |

- **Folha:** o salário dos olheiros entra na folha semanal (categoria salários). O clube do usuário não paga mais a manutenção do antigo departamento.
- **Clubes da CPU:** continuam com o nível de departamento. Ele não sobe mais por investimento, porque a CPU agora só investe em CT, base e estádio.

## Peneiras (`runTrial`, `trialsLeft`, `trialKids` em `market.ts`)
- **Por temporada:** 3 peneiras, ou 4 com olheiro-chefe nível 4+ (antes era 1).
- **Garotos por peneira:** de 1 a 3.
  - +1 com olheiro-chefe nível 4+;
  - +1 com especialista na região estrangeira.
- **Talento acima da média** (potencial +4 a +10): 18% + 4% por nível do olheiro-chefe (+6% com especialista no exterior).
- **Interface:** o cartão mostra as peneiras restantes, a faixa de garotos e os países com especialista. O checklist do Início avisa quantas peneiras ainda há.

## Salários da base (`youthWage` em `gen.ts`)
- **Fórmula:** `(2.000 + 140 × (overall − 35)) × salários da liga`.
  - No Brasil: overall 45 ≈ R$ 3,4 mil/sem; overall 60 ≈ R$ 5,5 mil/sem. Antes era R$ 800 fixo.
  - A média medida na base ficou em ~R$ 4 mil/sem.
- **Reajuste:** os salários são recalculados a cada virada de temporada, conforme a evolução.

## Saves antigos (migração para a v8)
- **Olheiros:** o clube do usuário ganha uma equipe conforme o nível antigo do departamento.
  - 1 olheiro do próprio país, no mesmo nível;
  - mais 1 de outro país (um nível abaixo) quando o nível era 3+.
- **Peneira:** se ela já tinha sido feita na temporada, conta como 1 das 3.
- **Salários da base:** são reajustados para o novo valor.
- **Relatórios em andamento:** são distribuídos entre os olheiros.

## Checagens (`sim-test --checks`, `runV8Checks`)
- equipe inicial e mercado de olheiros;
- contratar e dispensar;
- especialista: relatório em 1 semana, peneira ×1,2 e +1 garoto;
- sem olheiros, sem relatório;
- várias peneiras por temporada;
- salários da base;
- migração de um save v7.

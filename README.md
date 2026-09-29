# ⚽ Soccer Champs Manager

Jogo de gestão de futebol brasileiro: comande um clube temporada após temporada, revele craques na base, negocie no mercado e acompanhe as partidas ao vivo. Traz também um **modo arcade** de futebol de botão.

Feito com **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **TypeScript** e **PostgreSQL** (Neon) para salvar as carreiras na nuvem.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha DATABASE_URL (necessária para login e saves)
npm run db:migrate           # cria as tabelas (idempotente)
npm run dev                  # http://localhost:3000
```

| Script | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolvimento, build e produção |
| `npm run db:migrate` | Aplica `db/schema.sql` no banco de `DATABASE_URL` |
| `npm run sim -- <clube> [--checks]` | Simula temporadas sem interface e verifica o balanceamento e a API do motor |
| `npx tsx scripts/api-smoke.ts` | Teste de fumaça da API de carreiras (`API=http://localhost:3000`) |
| `npm run typecheck` / `lint` | TypeScript e ESLint |

## O jogo

**Clubes e competições**
- 32 clubes fictícios com cara de Brasil, cada um com apelido, mascote, estádio e rival. Os nomes foram pesquisados para não copiar clubes reais.
- Série A e Série B com acesso e rebaixamento.
- Copa mata-mata com pênaltis.
- Clássicos: estádio lotado, renda maior, e moral e torcida valendo o dobro.

**Dia de jogo**
- **Ao vivo:** campo animado, narração lance a lance, estatísticas e xG.
- **Durante a partida:** substituições, mudança de formação e de estilo, e intervalo.
- **Resultado rápido** ou **Jogar no botão**, em que o futebol de botão decide o placar.

**Elenco**
- Cada jogador tem overall, potencial, idade, condição física, moral, contrato, salário e valor.
- **Características** (finalização, cabeceio, drible, passe, marcação, reflexo e outras) pesam no motor de partida.
- Cerca de 3% dos jogadores são **★ Craques**.
- **Escalação:** 6 formações, 4 estilos de jogo, capitão e batedor de pênaltis.
- **Departamento médico:** as lesões têm tipo (pancada, estiramento, distensão, fratura), e o CT reduz o tempo de recuperação.

**Base e mercado**
- **Categorias de base:** nova safra a cada temporada, peneira extra e promoção ao profissional.
- **Mercado:**
  - janelas de transferências, contraproposta e agentes livres;
  - ofertas da CPU pelos seus jogadores e transferências entre clubes da CPU;
  - renovação e rescisão de contratos.

**Clube**
- **Finanças:** bilheteria, TV, patrocínio, premiações e salários.
- **Estrutura:** base, CT e estádio.
- **Ingresso:** preço Popular, Normal ou Premium, e torcida que reage aos resultados.
- **Empréstimo bancário** com juros.
- **Diretoria:** meta por temporada e confiança no treinador. Resultados ruins levam à demissão, com propostas de outros clubes.

**Salvamento**
- Conta com nickname e senha (mínimo de 8 caracteres), sem e-mail.
- Três slots de carreira por conta, salvos automaticamente no PostgreSQL e acessíveis em outros aparelhos após o login.
- Carreiras antigas salvas neste navegador ou por código podem ser importadas para um slot vazio.
- **Hall da Fama** global com os títulos de todas as carreiras na nuvem (`/hall-da-fama`).

## Arquitetura

```
src/
  app/                 rotas (App Router)
    page.tsx           tela inicial
    jogo/*             telas do Manager (casca em jogo/layout.tsx)
    arcade/            modo arcade (futebol de botão)
    hall-da-fama/      ranking (server component, lê o Postgres)
    api/careers, api/hall   route handlers da nuvem
  game/                motor do Manager: TypeScript puro e serializável
  arcade/              motor do futebol de botão (física, IA, render, som)
  components/
    ui/                kit de interface (Button, Modal, Segmented, Toast, Crest…)
    game/              estado (GameProvider), fluxo semanal, host de diálogos
    shell/ start/ home/ squad/ lineup/ market/ youth/ comps/ club/ inbox/ player/ flow/ match/
  server/              acesso ao Postgres (pool, schema, carreiras, Hall da Fama)
db/schema.sql          tabelas careers e achievements
docs/ENGINE_ADDITIONS.md   contrato das funções v2 do motor
```

- **Estado:** o mundo do jogo é um objeto JSON mutado pelo motor.
  - O `GameProvider` re-renderiza com um contador de versão.
  - Sincroniza o slot ativo via `PUT /api/slots/:slot`.
- **Banco:** `careers` guarda o save completo em `jsonb` com metadados indexados; `achievements` registra os títulos para o Hall da Fama.
  - As contas usam senhas com scrypt e sessões por cookie HttpOnly; cada slot pertence a uma conta.
  - Os códigos de carreira antigos continuam disponíveis para importação.
  - A conexão vem só de `DATABASE_URL`, nunca do código.

## Deploy

Na Vercel ou em qualquer host Node:
1. defina `DATABASE_URL`;
2. rode `npm run db:migrate` uma vez;
3. faça o deploy.

As rotas de API também criam as tabelas sozinhas na primeira chamada.

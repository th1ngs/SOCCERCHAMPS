# Briefing para agentes de interface — Soccer Champs Manager (Next.js)

## Stack e regras
- Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript strict. **Leia `node_modules/next/dist/docs/` antes de usar APIs do Next** (esta versão tem mudanças).
- Componentes funcionais. Server Components quando possível; `"use client"` só onde há estado/efeitos/eventos (as telas do jogo usam o mundo no cliente, então são client components).
- Sem dependências novas. Ícones: `lucide-react` (já instalado). Nada de emojis como ícone de botão.
- Código limpo, componentes pequenos e reutilizáveis, lógica fora do JSX (hooks/funções puras em arquivos próprios quando crescer).
- Todo texto de interface em **português do Brasil**, com vocabulário de futebol: Escalação, Titulares, Reservas/Banco, Relacionados, Rodada, Classificação, Artilharia, Janela de transferências, Departamento médico (DM), Olheiros, Categorias de base, Peneira, Folha salarial, Diretoria, Bilheteria, Cota de TV, Mata-mata, Acesso, Rebaixamento, Pendurado, Súmula, Clássico.
- Responsivo de 360 px a desktop. Sem rolagem horizontal da página (tabelas largas dentro de `overflow-x-auto`).

## Motor do jogo (`@/game`)
- Lógica pura em `src/game/*` (barrel `@/game`). Tipos em `@/game/types`. **Não edite `src/game/*`** — é de outro agente. Se faltar algo, escreva um helper puro no seu próprio arquivo ou descreva a necessidade no relatório.
- O mundo (`World`) é um objeto grande **mutado no lugar** pelas funções do motor.
- Referência de comportamento: a versão anterior em JS puro, em `legacy/js/manager/*.js` (UI: `ui.js`, `views.js`, `live.js`, `bridge.js`). Reproduza todas as funções dela, com design melhor.
- Novas funções do motor (clássicos, capitão/batedor, torcida/ingresso, características/Craque, DM, empréstimo bancário): contrato em `docs/ENGINE_ADDITIONS.md`. Use esses nomes; a implementação chega em paralelo.

## Estado e fluxo (já prontos — não reescreva)
- `useGame()` / `useWorld()` em `@/components/game/GameProvider`:
  - `world` (World), `version` (muda a cada mutação; use em deps de `useMemo`)
  - `mutate(fn)` (muta, re-renderiza e salva), `commit()`
  - `setWorld(w)`
  - `overlay` / `setOverlay(o)` (diálogos globais: `player`, `weekResults`, `prematch`, `summary`, `seasonEnd`, `fired`)
  - `matchMode` / `setMatchMode` (`live` | `button`)
  - `scratch` (objeto livre para dados temporários fora do World)
  - Nuvem: `cloudCode`, `cloudStatus`, `enableCloud()`, `syncCloud()`, `loadFromCloud(code)`, `disconnectCloud()`
- `useFlow()` em `@/components/game/useFlow`: `{ label, advance, finishWeek }`. Após o resumo de uma partida, chame `finishWeek()`.
- `OverlayHost` (`@/components/game/OverlayHost`) já importa os diálogos pelos caminhos abaixo. **Crie exatamente esses arquivos e exports.**
- Casca (`AppShell`), nav e rotas `/jogo/*` já existem. Páginas: `src/app/jogo/<rota>/page.tsx` (`"use client"` quando precisar do mundo).

## Componentes base (use; não altere — crie variantes locais se precisar)
- `@/components/ui/Button`:
  - `Button` com `variant` = primary | secondary | outline | ghost | danger | success, `size` = sm | md | lg | icon | icon-sm, e props `loading`, `icon`, `iconRight`, `block`
  - `IconButton` (exige `label`), `buttonClasses()` para `<Link>`
- `@/components/ui/primitives`: `Card` (title, action, tone), `SectionTitle`, `PageHeader`, `Badge`, `PosBadge`, `OvrBadge`, `Stars`, `Meter`, `FormChips`, `KV`, `Alert`, `EmptyState`
- `@/components/ui/Modal`: `Modal` (open, onClose, title, dismissible, size md | lg | xl, footer)
- `@/components/ui/Segmented`: `Segmented` (grupo de opções/abas)
- `@/components/ui/Toast`: `useToast()(texto, 'info' | 'good' | 'bad')`
- `@/components/ui/Crest`: `Crest` (club, size)
- Tokens Tailwind em `src/app/globals.css`:
  - cores `ink-*`, `mist`, `snow`, `gold-*`, `pitch-*`, `danger-*`, `warn-400`, `info-*`
  - fontes `font-display` (Barlow Condensed) e `font-sans`
  - `shadow-card`, `shadow-gold`, `animate-pop`

## Padrões de botões (obrigatório)
- **Uma ação primária por tela ou diálogo.** Secundárias em `secondary`/`outline`, terciárias em `ghost`.
- Rótulos com verbo e específicos. O custo ou efeito vai no botão: "Ampliar estádio • R$ 4,2 mi", "Renovar por 3 anos".
- **Ações destrutivas** (dispensar, rescindir, vender):
  - `variant="danger"`, longe do primário
  - confirmação num `Modal` que diz a consequência
  - botão de confirmação com o verbo, nunca "Sim"
- Desabilitado sempre explica o porquê (texto ao lado ou `title`): "Janela fechada", "Elenco cheio (32/32)".
- Alvos de toque de pelo menos 40 px. Linhas de tabela inteiras clicáveis (abrem o jogador).
- Ícone + rótulo. Ícone sozinho só com `IconButton` e `label`.
- `loading` em ações assíncronas (nuvem).

## Entrega
- Rode `npx tsc --noEmit` e `npx eslint <seus arquivos>`: zero erros nos seus arquivos.
- Não faça commit nem push.
- Relate:
  - arquivos criados
  - o que ficou pendente
  - qualquer API do motor que faltou ou que você presumiu

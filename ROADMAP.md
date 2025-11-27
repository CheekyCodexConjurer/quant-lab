# The Lab – Roadmap Único (Agent-Oriented, Revenue-First)

> Atualizado em **27/11/2025**  
> Projeto base: **quant-lab** (frontend React/Vite, backend Express, Lean + Dukascopy)

Este arquivo é o **roadmap principal e completo** do The Lab.  
Ele serve tanto como visão de produto quanto como guia de implementação para você e para os agentes (ex.: GPT‑5.1‑Codex‑Max).

Cada bloco indica:

- **Contexto / objetivo**
- **Arquivos que o agente deve ler primeiro**
- **Tarefas de frontend**
- **Tarefas de backend**
- **Tarefas de desktop / infra (quando houver)**
- **Como o agente deve atuar** (seguindo `AGENTS.md`: investigar → relatar → planejar → só então codar)

Toda a arquitetura de referência está centralizada em **`architecture.md`** (frontend, backend, fluxos, Lean, Dukascopy).  
Antes de implementar qualquer coisa, o agente deve ler:

- `architecture.md` – visão consolidada de stack, fluxos e pastas.
- `AGENTS.md` – protocolo de trabalho para o agente (discutir antes de codar, plano faseado, etc).

---

## Visão Geral de Produto

**Objetivo geral:**  
Transformar o The Lab em um laboratório local de backtesting quantitativo, lucrativo e sustentável, com:

- Integração nativa com Lean e dados Dukascopy.
- Ambiente único para código, dados, gráficos e análises.
- Ferramentas avançadas de breakdown técnico, calendário econômico e otimização de parâmetros (grid search).
- Infra de contas, cobrança e licenciamento implementada **de forma incremental**, priorizando:
  - Entrar receita cedo (Paid Alpha).
  - Manter compute pesado na máquina do usuário.
  - Reinvestir receita em features mais caras (APIs, segurança, marketing).
- Estrutura de pastas e arquivos pode ser ajustada para ficar mais LLM-friendly e economizar contexto; arquivos grandes podem ser particionados para o Agent Coding funcionar melhor.

### Princípios

1. **Compute local primeiro**  
   Backtests rodam na máquina do usuário (Lean local). Você não vira provedor de CPU para o universo inteiro.

2. **Monetização cedo, backend depois**  
   - Fase 1: vender **licença única Early Access** totalmente local.  
   - Fase 2+: evoluir para conta online + plano Pro recorrente.

3. **Infra cara só depois de receita**  
   - APIs de Economic Data, hardening pesado de licença, campanhas de marketing: só depois de ter base paga.

---

## Linha do Tempo Resumida

| Fase | Nome                                                       | Período alvo                 | Foco principal                                      | Marco |
|------|------------------------------------------------------------|------------------------------|----------------------------------------------------|-------|
| 0    | Protótipo & Empacotamento Local                            | 27/11/2025 – 31/01/2026      | Fluxo Lean/Dukascopy redondo para uso interno      | –     |
| 1    | Paid Alpha · Desktop Local, Licença Única                  | 01/02/2026 – 31/03/2026      | Vender Early Access local (licença única)          | 15/02/2026 |
| 2    | Paid Beta · Contas Online, Breakdown & Experiments         | 01/04/2026 – 30/06/2026      | Login + plano Pro básico + análise avançada        | 01/06/2026 |
| 3    | v1.0 · Economic Data, News, Grid Search & Segurança Forte  | 01/07/2026 – 30/09/2026      | Calendário econômico, grid search, hardening       | 01/09/2026 |

Este mesmo arquivo funciona como:

- **Roadmap de produto** (o “o que” e “quando”).  
- **Guia técnico de implementação** (o “como” por módulo/arquivo).  
Não existe mais um `ROADMAP.md` separado; é tudo aqui.

---

## 0. Contexto técnico do projeto (estado atual)

### Resumo (derivado de `architecture.md`)

- **Frontend**
  - React 19 + Vite 6 + TypeScript, Tailwind via CDN, alias `@` para raiz.  
  - Entry: `index.html` → `index.tsx` → `App.tsx`.  
  - Estado global em `context/AppStateContext.tsx` (view ativa, símbolo/timeframe, timezone, datasets disponíveis, aparência do gráfico, timeframes disponíveis/pinados).  
  - Tipos em `types.ts` (`Candle`, `Trade`, `BacktestResult`, etc.).  
  - Hooks principais: `useIncrementalMarketData`, `useIndicators`, `useStrategies`, `useBacktest` (mock local), `useLeanBacktest` (Lean), `useDataImport`, `useNormalizationSettings`, `useAvailableFrames`.  
  - Views em `views/`: `ChartView`, `StrategyView`, `AnalysisView`, `DataSourcesView`, `DataNormalizationView`, `ApiDocsView`, `RepositoryView`, `RoadmapView` (renderiza este arquivo). `IndicatorView` está descontinuada.  
  - Componentes: layout (`Sidebar`, `MainHeader`, `MainContent`), `LightweightChart`, `ChartStyleMenu`, `ChartTimezoneSelector`, `StatsCard`, `DatePickerInput`, `SyncLogConsole`, `PythonEditor`, `FileTree`.  
  - Services: `services/api/client.ts` (REST), `services/backtestEngine.ts` (SMA mock). Utils: `utils/timeFormat.ts`, `utils/mockData.ts`, `utils/indicators.ts`, `utils/gapQuantization.ts`, etc.

- **Backend**
  - Node/Express ESM em `server/src/index.js`.  
  - Rotas em `server/src/routes/`: `/api/import`, `/api/data`, `/api/normalization`, `/api/indicators`, `/api/strategies`, `/health`.  
  - Serviços em `server/src/services/`: `dukascopyService` (download + agregação), `timeframeBuilder`, `dataCacheService`, `normalizationService`, `indicatorFileService`, `strategyFileService`, helpers Lean em `services/lean/*`.  
  - Constantes em `server/src/constants/`: `assets.js`, `paths.js`.  
  - Dados em `server/data/` e `server/data/raw/`.  
  - Testes em `server/test/`.

- **Fluxos principais**
  - Market data: `useIncrementalMarketData` → `/api/data`.  
  - Import Dukascopy: `DataSourcesView` → `/api/import/dukascopy` + polling.  
  - Normalização: `useNormalizationSettings` → `/api/normalization`.  
  - Indicadores/Estratégias: `useIndicators`, `useStrategies` → CRUD .py via API.  
  - Backtest mock: `useBacktest` + `backtestEngine`.  
  - Backtest Lean: `useLeanBacktest` chamando CLI Lean (workspace local).  
  - Roadmap: `RoadmapView` renderiza **este** arquivo.  
  - Docs/API: `ApiDocsView` explica estrutura de Python & Lean.

---

## Fase 0 · Protótipo & Empacotamento Local  
**Período alvo: 27/11/2025 – 31/01/2026**  
**Meta:** App funcional para uso interno/testers, rodando Lean + Dukascopy sem billing/auth.

---

### 0.1. Integração Lean CLI estável (`useLeanBacktest`)

**Objetivo**

Sair do estado experimental do `useLeanBacktest` e torná-lo um fluxo previsível: recebe parâmetros claros, roda Lean, devolve `BacktestResult` consistente e logs utilizáveis em `AnalysisView`.

**Arquivos que o agente deve ler primeiro**

- `architecture.md` – seções “Backtest Lean” e “Fluxos principais”.  
- Frontend:
  - `src/hooks/useLeanBacktest.ts`
  - `src/views/StrategyView.tsx`
  - `src/views/AnalysisView.tsx`
  - `src/services/api/client.ts`
- Backend:
  - `server/src/services/lean/*`
  - `server/src/routes/*.js` relacionados a Lean (se existirem).

**Tarefas de frontend**

1. **Padronizar interface do hook**

   - Garantir que `useLeanBacktest` exponha algo nessa linha:
     - `runLeanBacktest(params)`  
     - `status: 'idle' | 'running' | 'done' | 'error'`  
     - `logs: string[]` ou `LogEntry[]`  
     - `result: BacktestResult | null`
   - Comentar claramente no topo:
     - parâmetros esperados
     - limitações.

2. **Conectar StrategyView**

   - Em `StrategyView.tsx`:
     - Botão “Run Lean Backtest” usando `useLeanBacktest` com:
       - strategyId (arquivo .py ativo)
       - symbol/timeframe ativos (do contexto)
       - engineParams (cash, fee, slippage).
   - Manter `useBacktest` como modo “mock” separado.

3. **Adapter para `AnalysisView`**

   - Criar `utils/leanResultAdapter.ts`:
     - input: payload bruto do backend/Lean.
     - output: `BacktestResult` definido em `types.ts`.
   - `AnalysisView` consome apenas `BacktestResult`.

**Tarefas de backend**

1. **Serviço Lean consolidado**

   - Em `server/src/services/lean/leanService.js`:
     - função `runLeanBacktest({ strategyPath, symbol, timeframe, engineParams, dateRange })`:
       - monta comando CLI
       - define working dir (workspace Lean)
       - captura stdout/stderr
       - chama parser de resultado.

2. **Rota REST para Lean**

   - Nova rota em `server/src/routes/leanRoutes.js`:
     - `POST /api/lean/backtest`
       - Body: `{ strategyId, symbol, timeframe, engineParams, dateRange }`
       - Response: `{ result, logs }` (síncrono na Fase 0).

3. **Logs**

   - Padronizar logs:
     - array de strings com prefixo `[LEAN]` ou estrutura `{ level, source, message }`.

**Como o agente deve atuar**

- Investigar o código atual do hook + serviços Lean.  
- Gerar relatório curto do fluxo atual (sem alterar nada).  
- Propor plano faseado listando arquivos e mudanças.  
- Só então implementar, em blocos pequenos.

---

### 0.2. Esqueleto de shell desktop

**Objetivo**

Criar base para rodar o app em janela própria (Tauri/Electron), sem integração total ainda.

**Arquivos / estrutura**

- Criar pasta `desktop/` na raiz:
  - `desktop/README.md` explicando objetivo do shell.
  - `desktop/package.json` com deps mínimas e scripts placeholders.
- Atualizar `architecture.md`:
  - adicionar seção “Desktop shell (futuro)”.

**Tarefas agora**

- Apenas documentação + estrutura vazia.
- Nada de Tauri/Electron configurado ainda; isso é Fase 1/2.

**Como o agente deve atuar**

- Criar arquivos mínimos e atualizar docs sem tentar configurar todo o build.

---

## Fase 1 · Paid Alpha · Desktop Local, Licença Única  
**Período alvo: 01/02/2026 – 31/03/2026**  
**Lançamento alvo: 15/02/2026**  
**Meta:** Vender Early Access local (licença única), com Lean + Dukascopy + Analysis estáveis.

---

### 1.1. Multi-instrumento Alpha (CL1!, ES1!, BTC1!)

**Objetivo**

Permitir ao usuário escolher/importar dados para alguns instrumentos chave via Dukascopy.

**Arquivos que o agente deve ler primeiro**

- `architecture.md` – seções “Dados locais”, “Importação Dukascopy” e fluxos.  
- Backend:
  - `server/src/constants/assets.js`
  - `server/src/services/dukascopyService.js`
  - `server/src/routes/importRoutes.js`
  - `server/src/routes/dataRoutes.js`
- Frontend:
  - `src/constants/markets.ts`
  - `src/hooks/useDataImport.ts`
  - `src/views/DataSourcesView.tsx`
  - `src/hooks/useIncrementalMarketData.ts`

**Tarefas de backend**

1. **Mapeamento de ativos**

   - Configurar `assets.js` para CL1!, ES1!, BTC1! com:
     - símbolo lógico (para o app)
     - símbolo Dukascopy
     - tipo (futuro/spot).

2. **Import confiável**

   - Garantir que `POST /api/import/dukascopy` aceite esses ativos.
   - Melhorar status/erros para UI.

3. **Listagem de datasets**

   - `GET /api/data` retorna para cada asset:
     - timeframes disponíveis
     - range de datas.

**Tarefas de frontend**

1. **DataSourcesView v1**

   - Dropdown de CL1!/ES1!/BTC1!.
   - Range de datas.
   - Exibição de status de import (pendente, rodando, concluído, erro).

2. **Integração com Chart/Strategy**

   - `AppStateContext` mantém `symbol`/`timeframe`.
   - `ChartView` e `StrategyView` usam esse estado para carregar dados corretos.

---

### 1.2. Data Settings básicos por instrumento

**Arquivos**

- Backend:
  - `server/src/services/normalizationService.js`
  - `server/src/routes/normalizationRoutes.js`
- Frontend:
  - `src/hooks/useNormalizationSettings.ts`
  - `src/views/DataNormalizationView.tsx`
  - `src/utils/gapQuantization.ts`

**Tarefas de backend**

- Extender `normalizationService` para configs por asset:
  - `{ default: {...}, perAsset: { CL1!: {...}, ES1!: {...} } }`.

**Tarefas de frontend**

- `DataNormalizationView`:
  - dropdown de asset.
  - inputs de timezone, basis, tickSize, gap quantization.
- `useNormalizationSettings`:
  - incluir `asset` nos payloads.

---

### 1.3. Indicators “de gente grande” (imports entre arquivos)

**Arquivos**

- Backend:
  - `server/src/services/indicatorFileService.js`
  - `server/src/constants/paths.js`
- Frontend:
  - `src/hooks/useIndicators.ts`
  - `src/components/files/FileTree.tsx`
  - `src/components/editor/PythonEditor.tsx`
  - `src/views/StrategyView.tsx`
  - `src/views/ApiDocsView.tsx`

**Tarefas de backend**

- Suporte a subpastas em `indicators/` (e paths relativos corretos).

**Tarefas de frontend**

- FileTree:
  - mostrar subpastas e permitir criar pastas/arquivos.
- PythonEditor:
  - salvar com paths corretos.
- ApiDocsView:
  - explicar estrutura recomendada e imports internos.

---

### 1.4. Overview refinado (AnalysisView v1 estável)

**Arquivos**

- Frontend:
  - `src/views/AnalysisView.tsx`
  - `src/components/StatsCard.tsx`
  - `src/components/LightweightChart.tsx`
  - `src/types.ts`
- Backend:
  - `server/src/services/lean/parsers.js` (ou similar)

**Tarefas**

- Definir `BacktestResult` em `types.ts`.
- `AnalysisView`:
  - consumir apenas `BacktestResult`.
  - renderizar KPIs, equity curve e trade log.

---

### 1.5. Licença local simples (Alpha) – sem backend

**Arquivos sugeridos**

- Frontend:
  - `src/views/LicenseView.tsx`
  - `src/hooks/useLicense.ts`
  - `src/utils/storage/licenseStorage.ts`
- Desktop (futuro):
  - `desktop/license/localLicenseStore.ts`

**Tarefas**

- Formato de chave/licença.
- Tela para ativação.
- Validação local + storage.
- Gating de features se não houver licença válida.

---

## Fase 2 · Paid Beta · Contas Online, Breakdown & Experiments  
**Período alvo: 01/04/2026 – 30/06/2026**  
**Lançamento alvo: 01/06/2026**

---

### 2.1. Contas & Auth online

**Arquivos**

- Backend:
  - `server/src/routes/authRoutes.js`
  - `server/src/services/authService.js`
- Frontend:
  - `src/views/Auth/LoginView.tsx`
  - `src/views/Auth/RegisterView.tsx`
  - `src/context/AppStateContext.tsx`
  - `src/services/api/client.ts`

**Tarefas**

- Backend:
  - implementar register/login/reset/me com JWT.
  - guardar `plan` (Free/Pro).
- Frontend:
  - telas de login/registro.
  - guardar user/token no contexto.
  - proteger views.

---

### 2.2. Overview · Time Breakdown

**Arquivos**

- Frontend:
  - `src/views/AnalysisView.tsx`
  - `src/types.ts`
  - `src/utils/timeBreakdown.ts`
- Backend (se preferir cálculo lá):
  - `server/src/services/analysisService.js`

**Tarefas**

- Util `timeBreakdownFromTrades(trades)`:
  - `byWeekday`, `byMonth`, `byHour`.
- Seção “Time Analysis” em `AnalysisView`.

---

### 2.3. Overview · Market / Session Breakdown

**Arquivos**

- Frontend:
  - `src/views/AnalysisView.tsx`
  - `src/utils/sessionClassifier.ts`
  - `src/types.ts`
- Backend (opcional):
  - `server/src/services/analysisService.js`

**Tarefas**

- Classificar trades por asset/market e sessão.
- Mostrar tabelas em `AnalysisView`.

---

### 2.4. Experiments v1

**Arquivos**

- Backend:
  - `server/src/services/experimentsService.js`
  - `server/src/routes/experimentsRoutes.js`
- Frontend:
  - `src/views/ExperimentsView.tsx`
  - `src/hooks/useExperiments.ts`
  - `src/types.ts`

**Tarefas**

- Backend:
  - salvar experiments (disco).
  - rotas listar/detalhar.
- Frontend:
  - lista de experiments.
  - comparação de dois experiments.

---

### 2.5. Billing & Pro Plan (início)

**Arquivos**

- Backend:
  - `server/src/routes/billingRoutes.js`
  - `server/src/services/billingService.js`
- Frontend:
  - `src/views/Account/PlanView.tsx`
  - `src/services/api/client.ts`

**Tarefas**

- Integração com gateway.
- Webhook atualizando `user.plan`.
- UI de plano e botão “Upgrade to Pro”.
- Gating de features pelo plano.

---

## Fase 3 · v1.0 · Economic Data, News, Grid Search & Segurança Forte  
**Período alvo: 01/07/2026 – 30/09/2026**  
**Lançamento alvo: 01/09/2026**

---

### 3.1. Economic Data · Tela dedicada

**Arquivos**

- Backend:
  - `server/src/services/economicDataService.js`
  - `server/src/routes/economicDataRoutes.js`
- Frontend:
  - `src/views/EconomicDataView.tsx`
  - `src/hooks/useEconomicData.ts`
  - `src/types.ts`

**Tarefas**

- Backend:
  - integrar com provider de eventos.
  - rotas de config e consulta.
- Frontend:
  - UI para fonte/filtros.
  - tabela de eventos.

---

### 3.2. Overview · News Breakdown

**Arquivos**

- Backend:
  - `server/src/services/analysisService.js`
- Frontend:
  - `src/views/AnalysisView.tsx`
  - `src/types.ts`
  - `src/utils/newsBreakdown.ts`

**Tarefas**

- Associar trades a eventos (janela temporal).
- Calcular performance por tipo de evento/nome/país.
- Renderizar seção “News Analysis”.

---

### 3.3. Parameter Sweep (Grid Search)

**Arquivos**

- Backend:
  - `server/src/services/sweepService.js`
  - `server/src/routes/sweepRoutes.js`
- Frontend:
  - `src/views/SweepView.tsx` ou aba em `StrategyView`
  - `src/hooks/useSweep.ts`
  - `src/types.ts`

**Tarefas**

- Backend:
  - receber definição de sweep.
  - gerar combinações.
  - enfileirar execuções Lean.
  - salvar cada run como experiment.
- Frontend:
  - UI para ranges/listas de parâmetros.
  - tabela de resultados.
  - heatmap 2D para dois parâmetros.

---

### 3.4. Segurança & Anti-crack (hardening da licença)

**Arquivos**

- Backend:
  - `server/src/services/licenseService.js`
  - `server/src/routes/licenseRoutes.js`
- Desktop:
  - `desktop/license/localLicenseStore.ts`
- Frontend:
  - `src/views/LicenseView.tsx`
  - `src/hooks/useLicense.ts`

**Tarefas**

- Backend:
  - gerar licenças/tokens assinados.
  - endpoint para checagem/renovação.
- Desktop:
  - armazenar licença cifrada localmente.
  - validação com chave pública.
  - checagens redundantes em runtime.
- Frontend:
  - respeitar claims da licença/plano.
  - mensagens claras em caso de expiração/problema.

---

## Como usar este arquivo com agentes (Codex)

1. Ao pedir uma implementação, sempre referenciar **fase + item**, por exemplo:  
   > “Implemente o item 1.3 de Indicators no `ROADMAP-Extended`.”

2. O agente deve:
   - Ler `AGENTS.md` e `architecture.md` antes de qualquer alteração.
   - Ler os arquivos listados em “Arquivos que o agente deve ler primeiro”.
   - Produzir um **plano escrito** (sem mexer em código) com:
     - passos
     - arquivos impactados
     - riscos.
   - Só depois aplicar mudanças, em blocos pequenos e bem comentados.

3. Ao finalizar uma tarefa:
   - Listar arquivos alterados.
   - Explicar em 3–5 bullets o que foi feito e como isso avança o roadmap.

Este documento é suficiente por si só: não há dependência de outro `ROADMAP.md`.  
Se o agente entender este arquivo + `architecture.md`, ele tem contexto suficiente para evoluir o The Lab fase a fase sem você ter que ficar repetindo tudo manualmente.

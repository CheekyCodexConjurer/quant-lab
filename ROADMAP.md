# The Lab - Roadmap Único (Agent-Oriented, Revenue-First)

> Atualizado em **27/11/2025**  
> Projeto base: **quant-lab** (frontend React/Vite, backend Express, Lean + Dukascopy)

Este arquivo é o **roadmap principal e completo** do The Lab.  
Ele serve tanto como visão de produto quanto como guia de implementação para você e para os agentes (ex.: GPT-5.1-Codex-Max).

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

| Fase | Nome                                                       | Período alvo                 | Foco principal                                      | Marco       |
|------|------------------------------------------------------------|------------------------------|----------------------------------------------------|------------|
| 0    | Protótipo & Empacotamento Local                            | 27/11/2025 - 31/01/2026      | Fluxo Lean/Dukascopy redondo para uso interno      | -          |
| 1    | Paid Alpha – Desktop Local, Licença Única                  | 01/02/2026 - 31/03/2026      | Vender Early Access local (licença única)          | 15/02/2026 |
| 2    | Paid Beta – Contas Online, Breakdown & Experiments         | 01/04/2026 - 30/06/2026      | Login + plano Pro básico + análise avançada        | 01/06/2026 |
| 3    | v1.0 – Economic Data, News, Grid Search & Segurança Forte  | 01/07/2026 - 30/09/2026      | Calendário econômico, grid search, hardening       | 01/09/2026 |

Este mesmo arquivo funciona como:

- **Roadmap de produto** (o "o que" e "quando").  
- **Guia técnico de implementação** (o "como" por módulo/arquivo).  
Não existe mais um `ROADMAP-Extended.md` separado; é tudo aqui.

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
  - Services: `services/api/client.ts` (REST), `services/backtestEngine.ts` (SMA mock). Utils: `utils/timeFormat.ts`, `utils/mockData.ts`, `utils/indicators.ts`, `utils/gapQuantization.ts`, `utils/path.ts`, `utils/storage/indicatorStorage.ts`, `utils/leanResultAdapter.ts`.  

- **Backend**
  - Node/Express em `server/src/index.js`.  
  - Rotas em `server/src/routes/`: `/api/import`, `/api/data`, `/api/normalization`, `/api/indicators`, `/api/strategies`, `/api/lean`, `/health`.  
  - Serviços em `server/src/services/`: `dukascopyService` (download + agregação, com jobs persistidos), `timeframeBuilder`, `dataCacheService`, `normalizationService`, `indicatorFileService`, `strategyFileService`, helpers Lean em `services/lean/*`.  
  - Constantes em `server/src/constants/`: `assets.js`, `paths.js`.  
  - Dados em `server/data/` e `server/data/raw/`.  
  - Testes em `server/test/`.

- **Fluxos principais**
  - Market data: `useIncrementalMarketData` → `/api/data`.  
  - Import Dukascopy: `DataSourcesView` → `/api/import/dukascopy` + polling de jobs.  
  - Normalização: `useNormalizationSettings` → `/api/normalization`.  
  - Indicadores/Estratégias: `useIndicators`, `useStrategies` → CRUD `.py` via API.  
  - Backtest mock: `useBacktest` + `backtestEngine`.  
  - Backtest Lean: `useLeanBacktest` chamando CLI Lean (workspace local) via backend.  
  - Roadmap: `RoadmapView` renderiza **este** arquivo.  
  - Docs/API: `ApiDocsView` explica estrutura de Python & Lean.

---

## Fase 0 – Protótipo & Empacotamento Local  
**Período alvo: 27/11/2025 - 31/01/2026**  
**Meta:** App funcional para uso interno/testers, rodando Lean + Dukascopy sem billing/auth.

---

### 0.1. Integração Lean CLI estável (`useLeanBacktest`)

- [x] **Status:** concluído (hook padronizado, adapter criado, serviço Lean e rotas estabilizados).

**Objetivo**

Sair do estado experimental do `useLeanBacktest` e torná-lo um fluxo previsível: recebe parâmetros claros, roda Lean, devolve `BacktestResult` consistente e logs utilizáveis em `AnalysisView`.

**Arquivos que o agente deve ler primeiro**

- `architecture.md` – seções "Backtest Lean" e "Fluxos principais".  
- Frontend:
  - `src/hooks/useLeanBacktest.ts`
  - `src/views/StrategyView.tsx`
  - `src/views/AnalysisView.tsx`
  - `src/services/api/client.ts`
- Backend:
  - `server/src/services/lean/*`
  - `server/src/routes/leanRoutes.js`

**Tarefas de frontend**

- [x] Padronizar interface do hook `useLeanBacktest`  
  - Expor `runLeanBacktest(params)`, `status`, `logs`, `result`, `error`, `jobId` e parâmetros de engine.  
  - Documentar parâmetros esperados e limitações no topo do hook.
- [x] Conectar `StrategyView` ao hook  
  - Botão "Run Lean Backtest" chamando o hook com:
    - strategy code ativo
    - symbol/timeframe ativos (do contexto)
    - engineParams (cash, fee, slippage).
  - Manter `useBacktest` como modo "mock" separado.
- [x] Adapter para `AnalysisView`  
  - Criar `utils/leanResultAdapter.ts` para transformar o payload bruto de Lean em `BacktestResult`.  
  - `AnalysisView` consome apenas `BacktestResult`.

**Tarefas de backend**

- [x] Serviço Lean consolidado  
  - `server/src/services/leanService.js` com `startLeanBacktest` rodando CLI Lean, capturando logs e parseando resultados.  
  - `parseLeanResults` transformando resultados em estrutura compatível com `BacktestResult`.
- [x] Rotas REST para Lean  
  - `server/src/routes/leanRoutes.js`:
    - `POST /api/lean/run` – cria job e dispara CLI Lean.
    - `GET /api/lean/jobs/:id` – status/logs do job.
    - `GET /api/lean/results/:id` – resultado normalizado.
- [x] Logs  
  - Logs de jobs Lean em array de strings com prefixo informativo (`[lean]`, `[stderr]`), exibidos em `LeanLogPanel`.

---

### 0.2. Esqueleto de shell desktop

- [x] **Status:** concluído (pasta `desktop/` criada com README e package.json placeholders; `architecture.md` atualizado).

**Objetivo**

Criar base para rodar o app em janela própria (Tauri/Electron), sem integração total ainda.

**Arquivos / estrutura**

- `desktop/` na raiz:
  - `desktop/README.md` explicando objetivo do shell desktop.
  - `desktop/package.json` com deps mínimas e scripts placeholders.
- `architecture.md`:
  - seção "Desktop shell (futuro)" apontando para `desktop/`.

**Tarefas agora**

- [x] Apenas documentação + estrutura vazia.  
- [x] Nada de Tauri/Electron configurado ainda; isso é Fase 1/2.

**Como o agente deve atuar**

- Criar arquivos mínimos e atualizar docs sem tentar configurar todo o build.

---

## Fase 1 – Paid Alpha – Desktop Local, Licença Única  
**Período alvo: 01/02/2026 - 31/03/2026**  
**Lançamento alvo: 15/02/2026**  
**Meta:** Vender Early Access local (licença única), com Lean + Dukascopy + Analysis estáveis.

---

### 1.1. Multi-instrumento Alpha (CL1!, ES1!, BTC1!)

- [x] **Status:** concluído (ativos mapeados, import Dukascopy robusto, datasets listando timeframes e ranges, frontend alinhado).

**Objetivo**

Permitir ao usuário escolher/importar dados para alguns instrumentos chave via Dukascopy.

**Arquivos que o agente deve ler primeiro**

- `architecture.md` – seções "Dados locais", "Importação Dukascopy" e fluxos.  
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

- [x] Mapeamento de ativos  
  - Configurar `assets.js` para CL1!, ES1!, BTC1! com:
    - símbolo lógico (para o app)
    - símbolo Dukascopy
    - tipo (futuro/spot).
- [x] Import confiável  
  - `POST /api/import/dukascopy`:
    - valida `asset` contra `ASSET_SOURCES`.
    - responde erros claros para assets não suportados ou timeframe inválido (tick).  
  - `dukascopyService`:
    - jobs persistidos em disco (`jobs.json` + `serverBootId`).
    - merge incremental por timeframe, com logs detalhados de chunks.
- [x] Listagem de datasets  
  - `GET /api/data` retorna, para cada asset:
    - timeframes disponíveis
    - range de datas consolidado
    - contagem de candles por timeframe (via metadados).  
  - `dataCacheService`:
    - suporta novo formato segmentado por ano (`asset-tf-YYYY.json` + `asset-tf-meta.json`), com fallback para formato legado.

**Tarefas de frontend**

- [x] Configuração de mercados  
  - `constants/markets.ts` alinhado com `ASSET_SOURCES` (mesmos instrumentos Dukascopy).  
- [x] UX para import Dukascopy  
  - `DataSourcesView`:
    - seleção de categoria de mercado (Energy, Stock Indices, Crypto).
    - sugestão de CL1!, ES1!, BTC1! via `DUKASCOPY_MARKETS`.
    - botão de import que usa `useDataImport` com modo `continue`/`restart`.  
  - `useIncrementalMarketData`:
    - carrega datasets de `/api/data/:asset/:timeframe` e ingere incrementalmente no chart.

---

### 1.2. Licença local Early Access (Paid Alpha)

- [ ] **Status:** em progresso (licença local básica já implementada no frontend, sem backend ainda).

**Objetivo**

Permitir um licenciamento **100% local** para Early Access, usado para gating leve de features e sinalização de modo (Internal vs Early Access), sem depender de backend.

**Arquivos que o agente deve ler primeiro**

- Frontend:
  - `types.ts`
  - `context/AppStateContext.tsx`
  - `hooks/useLicense.ts`
  - `components/layout/MainHeader.tsx`
  - `components/layout/Sidebar.tsx`
  - `App.tsx`
- Backend (para fases futuras – ainda não implementadas):
  - `server/src/services/licenseService.js`
  - `server/src/routes/licenseRoutes.js`

**Tarefas de frontend**

1. **Estado de licença local**

   - [x] Adicionar `LicenseState` em `types.ts`:
     - `mode: 'internal' | 'early-access' | 'expired'`
     - `key?: string`
   - [x] Guardar estado da licença no contexto global (`AppStateContext`) e em `localStorage`:
     - `license`, `setLicense` expostos pelo contexto.

2. **Hook de licença**

   - [x] Criar `useLicense.ts`:
     - `license` – estado atual (derivado do contexto).
     - `applyKey(rawKey)` – normaliza e define o `mode` localmente:
       - chaves que começam com `TLAB-` → `early-access`
       - outras chaves preenchidas → `expired`
       - vazio → `internal`
     - `clearKey()` – volta para `internal`.
   - [x] Nenhuma chamada de backend nesta fase; validação puramente local.

3. **View de licença**

   - [x] Criar `LicenseView.tsx` minimalista:
     - campo para colar a chave de licença (textarea compacta).
     - botão pequeno “Apply License” + botão “Clear”.
     - mensagem de status discreta.
   - [x] Adicionar `ViewState.LICENSE` e entrada correspondente na `Sidebar`:
     - seção “Internal” → item “License” com ícone de chave.

4. **Badge de modo no header**

   - [x] Atualizar `MainHeader` para exibir um badge discreto indicando o modo:
     - `INTERNAL MODE` (cinza)
     - `EARLY ACCESS` (verde)
     - `LICENSE EXPIRED` (vermelho)
   - [x] Passar `license.mode` de `App.tsx` para `MainHeader`.

5. **Notas sobre o fluxo atual de licença**

   - [x] A tela dedicada de licença (`LicenseView` / `ViewState.LICENSE`) foi removida; o fluxo foi embutido como popover no bloco de perfil da `Sidebar`.
   - [x] O popover de licença segue a estética minimalista do The Lab (input single-line, tooltip informativo, botões compactos "Clear" / "Apply"), servindo apenas para gating local nesta fase.

**Tarefas de backend (futuras, ainda não implementadas)**

1. **Serviço de licença**

   - [x] `server/src/services/licenseService.js`:
     - validação opcional de chave (quando houver backend real).
     - possivelmente, verificação de assinatura.

2. **Rotas de licença**

   - [x] `server/src/routes/licenseRoutes.js`:
     - `POST /api/license/validate` – valida uma chave e retorna claims básicas.

3. **Integração frontend-backend (fase posterior)**

   - [ ] `useLicense` passa a, opcionalmente, chamar `/api/license/validate`:
     - mas sempre com fallback local para não quebrar ambientes offline.

---

## Fase 2 – Paid Beta – Contas Online, Breakdown & Experiments  
**Período alvo: 01/04/2026 - 30/06/2026**  
**Lançamento alvo: 01/06/2026**

> **Status geral:** ainda não iniciado. Seções abaixo são diretrizes de médio prazo.

### 2.2. Overview – Time Breakdown

**Arquivos**

- Frontend:
  - `src/views/AnalysisView.tsx`
  - `src/types.ts`
  - `src/utils/timeBreakdown.ts`
- Backend (opcional):
  - `server/src/services/analysisService.js`

**Tarefas**

- `timeBreakdownFromTrades(trades)`:
  - `byWeekday`, `byMonth`, `byHour`.
- Seção "Time Analysis" em `AnalysisView`.

---

### 2.3. Overview – Market / Session Breakdown

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
  - salvar experiments em disco.
  - rotas para listar/detalhar.
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
- UI de plano e botão "Upgrade to Pro".
- Gating de features pelo plano.

---

## Fase 3 – v1.0 – Economic Data, News, Grid Search & Segurança Forte  
**Período alvo: 01/07/2026 - 30/09/2026**  
**Lançamento alvo: 01/09/2026**

> **Status geral:** futuro; nada implementado ainda.

### 3.1. Economic Data – Tela dedicada

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

### 3.2. Overview – News Breakdown

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
- Renderizar seção "News Analysis".

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
   > "Implemente o item 1.3 de Indicators no roadmap."

2. O agente deve:
   - Ler `AGENTS.md` e `architecture.md` antes de qualquer alteração.
   - Ler os arquivos listados em "Arquivos que o agente deve ler primeiro".
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



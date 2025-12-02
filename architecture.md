# Architecture - quant-lab

Visao consolidada (LLM-friendly) do frontend, backend, fluxo de dados, Lean e shell desktop.

## Stack e entrypoints

- Frontend: React 19 + Vite 6 + TypeScript. Tailwind via CDN. Alias `@` aponta para a raiz. Entry `index.html` -> `index.tsx` -> `App.tsx`.
- Backend: Node/Express em `server/src/index.js`, servindo o bundle Vite de `dist/` em `/` e expondo rotas em `/api/...` e `/health`.
- Dados locais: JSONs segmentados em `server/data/` (datasets de CL Futures gerados a partir de CSVs locais) + engine SQLite em `server/db/market.db` (tabela `bars`), acessados via `dataCacheService`/`marketStoreSqlite`.
- CSVs brutos: arquivos como `cl-1m.csv`, `cl-1d.csv`, `cl-1w.csv`, `cl-1mo.csv` vivem em `server/data/cl-futures/` e **nao sao versionados**; devem ser obtidos externamente e colocados localmente antes de rodar os scripts de import (`server/scripts/importClFuturesFromCsv.js`, `server/scripts/ingestClFuturesToDb.js`).
- Documentacao de referencia: `ROADMAP.md`, `architecture.md` (este doc), `AGENTS.md` (protocolo do agente), `docs/indicators/indicator-api.md` (API de indicadores).

---

## Frontend

### Estado global e tipos

- Estado global: `context/AppStateContext.tsx`
  - `activeView: ViewState` (DASHBOARD, CHART, STRATEGY, DATA_NORMALIZATION, API_DOCS, REPOSITORY, ANALYSIS, DEBUG).
  - `activeSymbol`, `activeTimeframe`.
  - `availableTimeframes` por ativo + `selectedTimeframes` (timeframes pinados).
  - `chartTimezone`, `downloadedAssets`, `chartAppearance`.
  - `license: LicenseState` (ex.: `internal`) e `user: UserProfile | null`.
  - `debugMode` e `datasetRanges`.
- Tipos centrais: `types.ts`
  - `Candle`, `Trade`, `BacktestResult`, `IndicatorOverlay`, `IndicatorMarker`.
  - `ViewState`, `LicenseState`, `UserProfile`, tipos de payload de Lean/backtest.

### Shell de aplicacao (Lumina)

- Shell atual: `components/lumina/LuminaShell.tsx`
  - Encapsula o layout “Lumina-style” (sidebar + top bar + conteudo).
  - Conecta `ViewState` (app) com `LuminaView` (enum do pacote `lumina-edition`):
    - DASHBOARD <-> `LuminaView.DASHBOARD`
    - CHART <-> `LuminaView.CHART_VIEW`
    - STRATEGY <-> `LuminaView.STRATEGY_LAB`
    - DATA_NORMALIZATION <-> `LuminaView.DATA_CONFIG`
    - API_DOCS <-> `LuminaView.DOCUMENTATION`
    - REPOSITORY <-> `LuminaView.REPOSITORIES`
  - Usa `lumina-edition/components/Sidebar.tsx` como sidebar visual.
  - Top bar interno exibe:
    - breadcrumb/badge de view atual,
    - status de repo (`repoStatus`),
    - modo de licenca,
    - `Debug On/Off` + botao `Toggle Debug`.

- Entry principal: `App.tsx`
  - Envolve tudo em `AppStateProvider` + `ToastProvider`.
  - Consulta hooks de dominio (dados, estrategias, indicadores, Lean, normalizacao).
  - Define `renderView()` em cima de `ViewState` e injeta o componente de view dentro de `LuminaShell`.

### Views principais

- Dashboard:
  - `features/dashboard/LuminaDashboardView.tsx`
  - Wrapper fino sobre `lumina-edition/components/Dashboard.tsx`.
  - Usado quando `activeView === ViewState.DASHBOARD`.

- Chart:
  - `features/chart/TradingChartView.tsx`
  - Encapsula `lumina-edition/components/TradingChart.tsx`.
  - Recebe:
    - candles normalizados (`gapAdjustedData` via `applyGapQuantization`),
    - `BacktestResult` (mock/Lean),
    - indicadores e overlays de `useIndicators`,
    - timeframes disponiveis/pinados,
    - timezone e lista de assets baixados.
  - É a view ativa para `ViewState.CHART`.

- Strategy Lab:
  - `features/strategy-lab/LuminaStrategyEditorView.tsx`
  - Usa `lumina-edition/components/StrategyEditor.tsx` como editor unificado de codigo Python para:
    - estrategias (`strategies/`), integradas com `useStrategies` (lista/salva/renomeia/importe .py) e `useLeanBacktest` (dispara backtests Lean, resultados exibidos em `AnalysisView`);
    - indicadores (`indicators/`), integrados com `useIndicators` (lista/salva/renomeia/deleta/ativa indicadores Python consumidos pelo Chart).
  - A view monta uma arvore de workspace com roots `strategies` e `indicators`, permitindo trocar de arquivo, salvar e (no caso de indicadores) ativar/desativar overlays no chart principal.

- Data Config:
  - `features/data-config/DataConfigView.tsx`
  - UI moderna para `useNormalizationSettings`:
    - timezone de normalizacao (`normTimezone`),
    - gap quantization (`gapQuantEnabled`),
    - botao de persistencia (`persistSettings`).
  - Ativa quando `activeView === ViewState.DATA_NORMALIZATION`.

- Docs / Repos:
  - `features/docs/LuminaDocumentationView.tsx` -> `lumina-edition/components/Documentation.tsx`.
  - `features/docs/LuminaRepositoriesView.tsx` -> `lumina-edition/components/Repositories.tsx`.
  - Views para `ViewState.API_DOCS` e `ViewState.REPOSITORY`.

- Analysis:
  - `views/AnalysisView.tsx`
  - UI de analise de `BacktestResult` (mock local + Lean):
    - cards de performance (`StatsCard`),
    - curva de equity via `recharts`,
    - tabela de trades compacta.
  - Ativada via `ViewState.ANALYSIS` (por exemplo, apos Lean terminar).

- Debug:
  - `views/DebugView.tsx`
  - Console interno de debug sobre `/api/debug/*`:
    - usa `components/debug/DebugTerminal.tsx`,
    - mostra “quick commands” e resumo de `debugHealth`.
  - Ativa quando `ViewState.DEBUG`; `LuminaShell` fornece o layout externo.

- Roadmap:
  - `views/RoadmapView.tsx`
  - Renderiza `ROADMAP.md` diretamente dentro da UI (parser markdown proprio).
  - Hoje nao tem item dedicado no menu Lumina; é usado como ferramenta interna.

- API docs:
  - `views/ApiDocsView.tsx`
  - Documentacao detalhada da Indicator API, alinhada a `docs/indicators/indicator-api.md`.
  - Navegacao interna (tabs/anchors) e blocos de exemplo Python.

- Repos:
  - `views/RepositoryView.tsx`
  - Lista repositorios canonicos do projeto (quant-lab, QuantConnect Lean).

### Hooks principais / dominio

- `useIncrementalMarketData`:
  - Orquestra fetch incremental de candles via `apiClient.fetchData`.
  - Suporta janelas com `limit` e `to` (timestamp) para evitar downloads massivos.
  - Integra com `useAvailableFrames` para saber timeframes suportados por ativo.

- `useIndicators`:
  - Gerencia:
    - lista de indicadores (`CustomIndicator[]`),
    - ordem, nomes, settings, appliedVersion,
    - indicadores ativos/visiveis.
  - Persistencia em localStorage via `utils/storage/indicatorStorage.ts`.
  - Execucao delegada a `useIndicatorExecution` (`hooks/indicators/useIndicatorExecution.ts`), que chama o backend `/api/indicator-exec` com janelas limitadas de candles.

- `useStrategies`:
  - Lista/salva/apaga/renomeia estrategias Python via `apiClient`.
  - Mantem `selectedId`, `appliedVersion` e ordem de arquivos.
  - Integrado ao Strategy Editor Lumina (via props adaptados dentro de `LuminaStrategyEditorView` futuramente).

- `useBacktest`:
  - Backtest local mock (SMA) usando `services/backtestEngine.ts`.
  - Usado para simulacoes rapidas e para alimentar `AnalysisView`.

- `useLeanBacktest`:
  - Orquestra jobs Lean no backend (`/api/lean/run`, `/api/lean/jobs/:id`, `/api/lean/results/:id`).
  - Mantem `status`, `logs`, `jobId`, `error`, `errorMeta`, `result`.
  - Ao concluir, chama callback que tipicamente navega para `ViewState.ANALYSIS`.

- `useNormalizationSettings`:
  - GET/POST `/api/normalization`.
  - Exposto em `App.tsx` e editado em `DataConfigView`.
  - `applyGapQuantization` usa estes settings para ajustar candles antes do chart.

### Componentes compartilhados

- Chart baixo nivel:
  - `components/LightweightChart.tsx` (wrapper sobre `lightweight-charts`):
    - metodos imperativos: `resetView`, `resetToLatest`, `focusTime`, `getVisibleRange`, `setVisibleRange`.
    - suporta candles, trades, series adicionais (indicadores) e markers.
  - Hoje a UI principal usa `TradingChart` (Lumina), mas `LightweightChart` continua disponivel para ferramentas internas.

- Controles de chart:
  - `components/chart/ChartStyleMenu.tsx`,
  - `components/chart/ChartContextMenu.tsx`,
  - `components/chart/IndicatorSettingsModal.tsx`.

- Debug:
  - `components/debug/DebugTerminal.tsx` (terminal de comandos HTTP sobre `/api/debug/terminal`).

- Strategy lab:
  - `components/strategy/StrategyLogPanel.tsx` (painel compacto de logs Lean/indicadores),
  - `components/strategy/StrategyWorkspacePanel.tsx`, `components/strategy/StrategyEditorPanel.tsx`, `components/strategy/LeanEnginePanel.tsx` (infra legada reutilizavel),
  - `components/strategy/strategyTree.ts` (helper para arvore de arquivos).

- Outros:
  - `components/editor/PythonEditor.tsx` (Monaco/CodeMirror-like para Python),
  - `components/files/FileTree.tsx`,
  - `components/panels/SyncLogConsole.tsx`,
  - `StatsCard.tsx`, `DatePickerInput.tsx`.

---

## Backend

- Entrypoint: `server/src/index.js`
  - Configura Express (CORS, JSON body, logging, health check).
  - Serve `dist/` em `/` em modo “desktop/prod”.
  - Monta rotas em:
    - `/api/data/*`
    - `/api/indicators/*`
    - `/api/strategies/*`
    - `/api/lean/*`
    - `/api/normalization`
    - `/api/debug/*`
    - `/api/import/*` (legacy Dukascopy/custom).

### Rotas e servicos principais

- Dados de mercado (`/api/data`):
  - Rotas em `server/src/routes/dataRoutes.js` (nome tradicional; ver pasta).
  - Usa `marketWindowService` + `marketStoreSqlite` para ler de `server/db/market.db`.
  - Suporta:
    - listagem de datasets/frames,
    - janelas com `limit`/`to`,
    - cobertura por ativo/timeframe (`getDatasetCoverage`).

- Importacao Dukascopy (`/api/import`):
  - Servico: `server/src/services/dukascopyService.js`.
  - Responsavel por:
    - baixar ticks via `dukascopy-node`,
    - converter para candles (M1/M5/etc),
    - persistir JSONs segmentados em `server/data/`.
  - Job store em `server/src/services/dukascopy/jobStore.js` (tracking de progresso, persistencia em disco).

- Indicadores (`/api/indicators` e `/api/indicator-exec`):
  - Arquivos Python em `indicators/` (workspace) e `server/indicators/` (runner/backend).
  - `server/src/services/indicatorFileService.js`:
    - lista indicadores, le/escreve arquivo, renomeia, remove.
  - `server/src/services/indicatorExecutionService.js`:
    - executa indicador via `indicator_runner/runner.py` (processo Python separado),
    - alinha valores, markers e levels com candles (`alignSeriesWithCandles`, `alignMarkerWithCandles`, `alignLevelWithCandles`),
    - retorna overlays prontos para o frontend (`IndicatorOverlay`).

- Estrategias (`/api/strategies`):
  - `server/src/services/strategyFileService.js`:
    - gerencia arquivos de estrategia Python (Workspace Lean),
    - exposto para o Strategy Editor Lumina.

- Lean (`/api/lean`):
  - `server/src/services/leanService.js`:
    - garante workspace Lean (`LEAN_WORKSPACE_DIR`, `LEAN_DATA_DIR`, `LEAN_RESULTS_DIR`, `LEAN_ALGORITHMS_DIR`),
    - escreve `Algorithm.py` com base no codigo vindo do frontend (`writeAlgorithm`),
    - monta `config.json` para Lean CLI (`buildConfig`),
    - exporta candles para formato Lean via `leanDataBridge`,
    - executa CLI Lean (`spawn`) e parseia resultados (equity, trades, drawdown) para `BacktestResult`.

- Normalizacao (`/api/normalization`):
  - `server/src/services/normalizationService.js`:
    - guarda configurações basicas de normalizacao (timezone, tick size, gap quantization),
    - usadas tanto no backend (ao montar datasets) quanto no frontend (via `applyGapQuantization`).

- Debug (`/api/debug`):
  - `server/src/routes/debugRoutes.js`:
    - `/api/debug/health` (resumo de datasets/indicadores),
    - `/api/debug/terminal` (execucao controlada de comandos internos para diagnostico local).

---

## Fluxos principais

- **Market data (frontend)**:
  - `useIncrementalMarketData` -> `apiClient.fetchData(asset, timeframe, { limit })`
  - Backend: `/api/data/:asset/:timeframe?limit=MAX_CANDLES`
  - `marketWindowService.getWindow` -> `marketStoreSqlite` -> janela de candles
  - `App.tsx` aplica `applyGapQuantization` -> `TradingChartView`/`TradingChart`.

- **Indicadores**:
  - `useIndicators` (frontend) lista e configura indicadores,
  - `useIndicatorExecution` chama `/api/indicator-exec` com candles recentes e `settings`,
  - backend usa `indicatorExecutionService` + runner Python para:
    - calcular series,
    - normalizar markers/levels para o tempo dos candles,
    - retornar overlays limitados (~200 desenhos por indicador).
  - `TradingChartView` consome `indicatorData` + `indicatorOverlays` para desenhar overlays limpos.

- **Estrategias**:
  - `useStrategies` lista/salva .py via API,
  - `LuminaStrategyEditorView` expõe UI de edicao/organizacao,
  - `useLeanBacktest` recebe codigo da estrategia ativa e parametros (cash, fees, slippage),
  - backend `leanService` executa a estrategia no Lean CLI e devolve resultados normalizados (`BacktestResult`).

- **Backtest local mock**:
  - `useBacktest` + `services/backtestEngine.ts`,
  - roda SMA simples sobre candles carregados, alimentando `AnalysisView`.

- **Backtest Lean**:
  - `useLeanBacktest` dispara `/api/lean/run`,
  - `App.tsx` registra callback para, ao concluir, setar `BacktestResult` externo e navegar para `ViewState.ANALYSIS`.

- **Normalizacao de dados**:
  - `useNormalizationSettings` GET/POST `/api/normalization`,
  - `App.tsx` sincroniza `chartTimezone` com `normTimezone`,
  - `applyGapQuantization` ajusta candles (reabre em previous close) quando habilitado.

- **Roadmap e docs internos**:
  - `RoadmapView` carrega `ROADMAP.md` diretamente do bundle,
  - `ApiDocsView` reflete `docs/indicators/indicator-api.md`,
  - `LuminaDocumentationView`/`LuminaRepositoriesView` servem como casca visual Lumina para docs/repos.

---

## Estrutura de pastas (top-level)

- Raiz:
  - `App.tsx`, `index.tsx`, `types.ts`,
  - `constants/`, `hooks/`, `services/`, `utils/`, `components/`, `views/`, `features/`, `context/`,
  - `indicators/` (workspace de indicadores), `strategies/` (workspace de estrategias).
- Backend:
  - `server/src/index.js`,
  - `server/src/routes/`, `server/src/services/`, `server/src/constants/`,
  - `server/test/` (testes backend),
  - `server/data/` (JSONs gerados), `server/db/` (SQLite).
- Desktop:
  - `desktop/` (shell Electron: `desktop/main.cjs`, `desktop/package.json`),
  - scripts de lancamento (`desktop-launcher.bat`, `run-desktop.vbs`).
- Docs/meta:
  - `architecture.md`, `ROADMAP.md`, `AGENTS.md`, `metadata.json`,
  - `docs/indicators/indicator-api.md`.
- Lumina edition:
  - `lumina-edition/` (mini-app de referencia com `components/` como Dashboard, TradingChart, StrategyEditor, Documentation, Repositories; usado como “design system” local).

---

## Desktop shell (Electron)

- Entrypoint: `desktop/main.cjs`
  - Cria `BrowserWindow` unica com icone `the-lab.ico`,
  - tamanho inicial ~80–85% da area util (limites 1280x800–1600x900),
  - sem barra de menu/URL (apenas titulo da janela).
- Backend local:
  - Tenta `http://127.0.0.1:4800/health`,
  - se nao estiver rodando, spawn `node server/src/index.js` com `SERVER_PORT=4800`.
- Frontend:
  - Backend Express serve `dist/` em `/`,
  - Electron navega para `http://127.0.0.1:4800`.
- Launchers:
  - `desktop-launcher.bat`: instala deps (raiz, `server/`, `desktop/`), roda `npm run build` e sobe `npm run dev --prefix desktop`.
  - `run-desktop.vbs`: chama o `.bat` com janela oculta, permitindo atalho “The Lab” limpo.

---

## Comandos uteis

- Frontend dev: `npm run dev` (porta `VITE_DEV_PORT` ou 3070).
- Backend dev: `npm --prefix server run dev`.
- Backend testes: `npm --prefix server run test`.
- Build Vite: `npm run build` (gera `dist/`, servido pelo backend e usado pelo shell desktop).
- Desktop shell dev (apos build): `npm --prefix desktop run dev`.
- Lean CLI: seguir orientacoes da `ApiDocsView`/`docs/indicators/indicator-api.md` para instalar/configurar Lean localmente.

---

## Conexoes externas

- Dukascopy: via `dukascopy-node` no backend (downloads de ticks).
- Lean: integrado localmente via CLI (executado pelo backend, controlado pelo frontend).
- Repositorios de referencia:
  - listados em `views/RepositoryView.tsx` e `lumina-edition/components/Repositories.tsx`.

# Architecture - quant-lab

Visao completa para LLMs do frontend, backend, fluxo de dados, Lean e Dukascopy.

## Stack e entrypoints
- Frontend: React 19 + Vite 6 + TypeScript. Tailwind via CDN. Alias `@` aponta para a raiz. Entry `index.html` (importmap) -> `index.tsx` -> `App.tsx`.
- Backend: Node/Express (ESM) em `server/src/index.js`, rotas montadas em `/api/...` e `/health`.
- Dados locais: JSONs em `server/data/` e `server/data/raw/` (gerados pelos jobs Dukascopy).
- Roadmap/documentacao: `ROADMAP.md`, `architecture.md` (este doc), `AGENTS.md` (instrucoes do agente).

## Frontend
- Estado global: `context/AppStateContext.tsx` (view ativa, simbolo/timeframe, timezone, datasets baixados, aparencia do grafico, timeframes disponiveis/pinados). `types.ts` define modelos (`Candle`, `Trade`, `BacktestResult`, etc.) e enum `ViewState`.
- Hooks principais: `useIncrementalMarketData` (carrega candles via API com fallback mock), `useIndicators`, `useStrategies`, `useBacktest` (mock local), `useLeanBacktest` (Lean), `useDataImport` (jobs Dukascopy/custom), `useNormalizationSettings`, `useAvailableFrames`.
- Views (`views/`): `ChartView`, `StrategyView`, `AnalysisView`, `DataSourcesView`, `DataNormalizationView`, `ApiDocsView`, `RepositoryView`, `RoadmapView` (renderiza `ROADMAP.md`). `IndicatorView` existe mas esta descontinuada (fluxo unificado em Strategy).
- Componentes/layout: `components/layout/Sidebar`, `MainHeader`, `MainContent`. Chart: `components/LightweightChart`. Controles: `ChartStyleMenu`, `ChartTimezoneSelector`. Comuns: `StatsCard`, `DatePickerInput`, `SyncLogConsole`, `components/editor/PythonEditor`, `components/files/FileTree`.
- Servicos e utils: `services/api/client.ts` (REST), `services/backtestEngine.ts` (SMA mock), `utils/timeFormat.ts`, `utils/mockData.ts`, `utils/indicators.ts`, `utils/gapQuantization.ts`, `utils/path.ts`, `utils/storage/indicatorStorage.ts`, `utils/leanResultAdapter.ts`. Constantes: `constants/markets.ts`, `constants/timeframes.ts`, `constants/timezones.ts`.
- Aparencia/persistencia: `ChartStyleMenu` ajusta `ChartAppearance` no contexto; configuracoes de aparencia, datasets baixados e versoes aplicadas de indicadores/estrategias sao salvos em localStorage.
- Config frontend: `vite.config.ts` (alias @, porta via `VITE_DEV_PORT` ou 3070), `tsconfig.json` (target ES2022, jsx react-jsx), `metadata.json`, `launcher.bat` (instala deps e inicia front/back).
- UI/UX: Tailwind via CDN, fonte Inter, light-mode. Est�tica minimalista, focada em layout limpo, sim�trico, com cantos levemente arredondados, poucos botoes aparentes e preferindo menus/a�oes contextuais discretos (en-US) por padr�o.
- Testes frontend: inexistentes (somente backend tem testes).

## Backend
- Entrypoint: `server/src/index.js` (Express, CORS, JSON, morgan).
- Rotas (`server/src/routes/`):
  - `/api/import`: jobs Dukascopy/custom, consulta job.
  - `/api/data`: lista datasets e retorna candles por asset/timeframe.
  - `/api/normalization`: GET/POST configuracao em memoria.
  - `/api/indicators` e `/api/strategies`: CRUD de arquivos .py (seed se vazio).
  - `/health`: status simples.
- Servicos (`server/src/services/`):
  - `dukascopyService`: baixa ticks via `dukascopy-node`, persiste `data/raw`, converte para candles e grava `data/{asset}-{tf}.json`; logs/status em Map. Submodulos em `services/dukascopy/`: `paths` (cleanup), `jobStore` (ids/status), `timeframes` (chunking), `dataUtils` (merge), `candleWriter` (persistencia).
  - `timeframeBuilder`: agrega ticks -> M1 -> timeframes maiores (M5/M15/H1/H4/D1); coberto por teste.
  - `dataCacheService`: garante pastas, lista assets/timeframes e le JSON de candles.
  - `normalizationService`: guarda timezone/basis/tickSize/gap em memoria.
  - `indicatorFileService` / `strategyFileService`: CRUD de .py com seeds.
  - Lean helpers em `services/lean/*` (defaultAlgorithm, parsers).
- Constantes: `server/src/constants/assets.js` (mapa instrumentos), `paths.js` (paths raiz/indicators/strategies).
- Dados/seeds: `server/indicators/ema_200.py`, `server/strategies/main.py`, `server/data/` (on demand), `server/data/raw/`.
- Tests: `server/test/timeframeBuilder.test.js`, `server/test/smoke.test.js` (`npm --prefix server run test`).
- Config backend: `SERVER_PORT` (porta), scripts `dev` (nodemon), `start`, `test` em `server/package.json`. Sem auth ou persistencia duravel (estado em memoria).

## Fluxos principais
- **Market data (frontend)**: `useIncrementalMarketData` -> `apiClient.fetchData` -> fallback `utils/mockData` -> `ChartView`/`LightweightChart`.
- **Indicadores**: `useIndicators` lista/salva via API, persiste selecao/appliedVersion; UI em `StrategyView`.
- **Estrategias**: `useStrategies` lista/salva .py via API; UI em `StrategyView`.
- **Backtest local mock**: `useBacktest` + `services/backtestEngine` sobre candles carregados.
- **Backtest Lean**: `useLeanBacktest` dispara CLI Lean (params de cash/fee/slippage), captura logs/jobId, ao concluir seta resultado externo e navega para Analysis.
- **Importacao Dukascopy**: `DataSourcesView` chama `useDataImport` -> backend `/api/import/dukascopy` cria job -> polling `/api/import/jobs/:id` -> backend baixa/gera JSON -> frontend recarrega dataset.
- **Normalizacao**: `useNormalizationSettings` GET/POST `/api/normalization`; `applyGapQuantization` ajusta candles no chart se habilitado.
- **Roadmap**: `RoadmapView` faz fetch de `ROADMAP.md`, parseia markdown (checklist/strike) e renderiza dinamicamente.
- **Docs/API**: `ApiDocsView` explica estrutura de indicadores/estrategias Python, paths de workspace Lean e libs disponiveis; serve de referencia LLM-friendly.

## Estrutura de pastas (top-level)
- Raiz: `App.tsx`, `index.tsx`, `types.ts`, `constants/`, `hooks/`, `services/`, `utils/`, `components/`, `views/`, `context/`, `indicators/`, `strategies/`.
- Backend: `server/src/index.js`, `server/src/routes/`, `server/src/services/`, `server/src/constants/`, `server/test/`.
- Dados gerados: `server/data/`, `server/data/raw/`.
- Desktop shell (futuro): `desktop/` contem apenas esqueleto (README e package.json placeholders) para integracao futura com Tauri/Electron.
- Docs/meta: `architecture.md` (principal), `ROADMAP.md`, `AGENTS.md`, `metadata.json`; `front-end-architecture.md` e `back-end-architecture.md` agora sao stubs que apontam para este doc.

## Comandos uteis
- Frontend dev: `npm run dev` (porta definida por `VITE_DEV_PORT` ou 3070).
- Backend dev: `npm --prefix server run dev`.
- Backend testes: `npm --prefix server run test`.
- Build Vite: `npm run build`.
- Lean CLI: seguir instrucoes em `ApiDocsView` (Lean instalado e workspace configurado).

## Conexoes externas
- Dukascopy: via `dukascopy-node` no backend (rede externa).
- Lean: integrado localmente pelo frontend chamando CLI (workspaces locais, sem backend proprio).
- Repositorios de referencia: listados em `views/RepositoryView.tsx`.



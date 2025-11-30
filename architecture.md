# Architecture - quant-lab

Visao completa para LLMs do frontend, backend, fluxo de dados, Lean e CL Futures.

## Stack e entrypoints
- Frontend: React 19 + Vite 6 + TypeScript. Tailwind via CDN. Alias `@` aponta para a raiz. Entry `index.html` (importmap) -> `index.tsx` -> `App.tsx`.
- Backend: Node/Express em `server/src/index.js`, servindo o bundle Vite de `dist/` em `/` e expondo rotas em `/api/...` e `/health`.
- Dados locais: JSONs segmentados em `server/data/` (datasets de futures CL gerados a partir de CSVs locais) + engine SQLite em `server/db/market.db` (tabela `bars`), ambos acessados via `dataCacheService`/`marketStoreSqlite`. `server/data/raw/` guarda restos legacy Dukascopy (nao usados na UI atual). Os CSVs brutos de vendor (`cl-1m.csv`, `cl-1d.csv`, `cl-1w.csv`, `cl-1mo.csv`) vivem em `server/data/cl-futures/` e **nunca sao versionados** (incluindo snapshots `.zip`); eles devem ser obtidos por fora (contrato com o vendor, link privado, etc.) e colocados localmente antes de rodar os scripts de import (`server/scripts/importClFuturesFromCsv.js`, `server/scripts/ingestClFuturesToDb.js`).
- Roadmap/documentacao: `ROADMAP.md`, `architecture.md` (este doc), `AGENTS.md` (instrucoes do agente).

## Frontend
- Estado global: `context/AppStateContext.tsx` (view ativa, simbolo/timeframe, timezone, datasets baixados, aparencia do grafico, timeframes disponiveis/pinados, licenca local, perfil de usuario e `debugMode`). `types.ts` define modelos (`Candle`, `Trade`, `BacktestResult`, etc.), enum `ViewState` (incluindo `DEBUG`) e tipos de licenca/perfil (`LicenseState`, `UserProfile`).
- Hooks principais: `useIncrementalMarketData` (carrega candles via API com fallback mock), `useIndicators` (agora apoiado em helpers LLM-friendly como `utils/indicators/indicatorPaths.ts`), `useStrategies`, `useBacktest` (mock local), `useLeanBacktest` (Lean), `useNormalizationSettings`, `useAvailableFrames`.
- Views (`views/`): `ChartView`, `StrategyView`, `AnalysisView`, `DataNormalizationView`, `ApiDocsView`, `RepositoryView`, `RoadmapView` (renderiza `ROADMAP.md`, hoje acessivel apenas via arquivo, sem entrada dedicada no menu) e `DebugView` (console de debug interno para diagnostico de backend/indicadores/datasets). `LoginView` existe mas o gating inicial esta desativado por enquanto (aplicacao entra direto no shell principal). `IndicatorView` existe mas esta descontinuada (fluxo unificado em Strategy). A antiga `DataSourcesView` (importacao Dukascopy) foi removida da UI; configuracoes de dados ficaram consolidadas em `DataNormalizationView`.
- Componentes/layout: `components/layout/Sidebar`, `MainHeader`, `MainContent`. Chart: `components/LightweightChart`. Debug: `components/debug/DebugTerminal`. Controles: `ChartStyleMenu`, `ChartTimezoneSelector`. Comuns: `StatsCard`, `DatePickerInput`, `SyncLogConsole`, `components/editor/PythonEditor`, `components/files/FileTree`, `components/strategy/StrategyLogPanel` (painel compacto de logs do Strategy Lab) e helpers do Strategy Lab como `components/strategy/strategyTree.ts`.
- Servicos e utils: `services/api/client.ts` (REST), `services/backtestEngine.ts` (SMA mock), `utils/timeFormat.ts`, `utils/mockData.ts`, `utils/indicators.ts`, `utils/gapQuantization.ts`, `utils/path.ts`, `utils/storage/indicatorStorage.ts`, `utils/leanResultAdapter.ts`. Constantes: `constants/markets.ts`, `constants/timeframes.ts`, `constants/timezones.ts`.
- Aparencia/persistencia: `ChartStyleMenu` ajusta `ChartAppearance` no contexto; configuracoes de aparencia, datasets baixados e versoes aplicadas de indicadores/estrategias sao salvos em localStorage.
- Config frontend: `vite.config.ts` (alias @, porta via `VITE_DEV_PORT` ou 3070), `tsconfig.json` (target ES2022, jsx react-jsx), `metadata.json`, `launcher.bat` (instala deps e inicia front/back).
- UI/UX: Tailwind via CDN, fonte Inter, light-mode. Est�tica minimalista, focada em layout limpo, sim�trico, com cantos levemente arredondados, poucos botoes aparentes e preferindo menus/a�oes contextuais discretos (en-US) por padr�o.
- Testes frontend: inexistentes (somente backend tem testes).

## Backend
- Entrypoint: `server/src/index.js` (Express, CORS, JSON, morgan, logger leve).
- Rotas (`server/src/routes/`):
  - `/api/import`: jobs Dukascopy/custom, consulta job (legacy; nao usado pelo frontend atual).
  - `/api/data`: lista datasets e retorna candles por asset/timeframe (com suporte a janelas via `limit`/`to` + endpoints de `summary`).
  - `/api/normalization`: GET/POST configuracao em memoria.
  - `/api/indicators` e `/api/strategies`: CRUD de arquivos .py (seed se vazio).
  - `/api/indicator-exec`: executa codigo Python de indicadores sob demanda via runner dedicado.
  - `/api/paths`: helpers de workspace (ex.: `POST /api/paths/open` para abrir a pasta de um arquivo no Explorer/Finder).
  - `/api/debug`: endpoints internos de debug (`/health`, `/logs`, `/terminal`) usados pela `DebugView` e por agentes para diagnosticar problemas em ambiente local.
  - `/health`: status simples.
- Servicos (`server/src/services/`):
  - `dukascopyService`: legacy para integracao Dukascopy (mantido apenas por compatibilidade, nao mais exposto na UI).
  - `timeframeBuilder`: agrega ticks -> M1 -> timeframes maiores (M5/M15/H1/H4/D1); usado tanto pelos jobs antigos de Dukascopy quanto pelo importador CL Futures.
  - `dataCacheService`: garante pastas, lista assets/timeframes e le JSON de candles (incluindo `CL1!` derivado de `server/data/cl-futures`).
  - `marketStoreSqlite`: encapsula acesso ao SQLite (`bars`), com funcoes `getWindowFromDb` / `getSummaryFromDb` para buscar janelas de dados de forma eficiente.
  - `marketWindowService`: camada que decide entre SQLite (`marketStoreSqlite`) e JSON (`dataCacheService`) e aplica logica de janela (`getWindow`, `getSummary`).
  - `normalizationService`: guarda timezone/basis/tickSize/gap em memoria.
  - `indicatorFileService` / `strategyFileService`: CRUD de .py com seeds e operacoes de rename/move.
  - `indicatorExecutionService`: integra o runner Python (`server/indicator_runner/runner.py`) com Express, chamando indicadores via processo separado.
  - Lean helpers em `services/lean/*` (defaultAlgorithm, parsers).
- Constantes: `server/src/constants/assets.js` (mapa instrumentos), `paths.js` (paths raiz/indicators/strategies/workspace).
- Dados/seeds: arquivos `.py` em `server/indicators/` (EMAs, indicadores de teste, `market-structure`), `server/strategies/main.py`, `server/data/` (on demand), `server/data/raw/`.
- Tests: `server/test/timeframeBuilder.test.js`, `server/test/smoke.test.js` (`npm --prefix server run test`).
- Config backend: `SERVER_PORT` (porta), scripts `dev` (nodemon), `start`, `test` em `server/package.json`. Sem auth ou persistencia duravel (estado em memoria).

## Fluxos principais
- **Market data (frontend)**: `useIncrementalMarketData` -> `apiClient.fetchData(asset, timeframe, { limit })` -> backend `/api/data/:asset/:timeframe?limit=MAX_CANDLES` -> `marketWindowService.getWindow` -> `marketStoreSqlite` (para CL) -> janela de candles -> `ChartView`/`LightweightChart`. Para CL, os dados vem dos CSVs (`cl-1m`, `cl-1d`, `cl-1w`, `cl-1mo`) importados por `server/scripts/importClFuturesFromCsv.js` e ingeridos em `server/db/market.db` via `server/scripts/ingestClFuturesToDb.js`.
- **Indicadores**: `useIndicators` lista/salva via API, persiste selecao/appliedVersion e um mapa de `settings` por indicador (valores atuais escolhidos na UI). A execucao dos indicadores ativos acontece no backend via `/api/indicator-exec`, sempre em janelas limitadas de candles (hoje ~1000 barras mais recentes) com debounce e cache em memoria no hook para evitar travamentos visiveis no grafico, mesmo com indicadores pesados como o de estrutura de mercado. No `ChartView`, cada indicador tem o overlay limitado a ~200 desenhos (niveis e marcadores) para manter o visual limpo no estilo TradingView; o painel centralizado **Indicator Settings** (inspirado no TradingView, mas mais limpo) permite configurar parametros como `length`, `source` e modos de visibilidade, enviando essas configuracoes para o runner Python via o campo `settings` do payload.
- **Estrategias**: `useStrategies` lista/salva .py via API; UI em `StrategyView`. Erros de estrategia Lean (principalmente erros de Python em `Algorithm.py`) sao expostos via `useLeanBacktest` como `errorMeta` e exibidos no `StrategyLogPanel` ao lado dos logs brutos do Lean.
- **Backtest local mock**: `useBacktest` + `services/backtestEngine` sobre candles carregados.
- **Backtest Lean**: `useLeanBacktest` dispara CLI Lean (params de cash/fee/slippage), captura logs/jobId, ao concluir seta resultado externo e navega para Analysis.
- **Normalizacao**: `useNormalizationSettings` GET/POST `/api/normalization`; `applyGapQuantization` ajusta candles no chart se habilitado.
- **Roadmap**: `RoadmapView` faz fetch de `ROADMAP.md`, parseia markdown (checklist/strike) e renderiza dinamicamente; a view continua no codigo para uso interno, mas o menu dedicado foi removido da UI principal.
- **Docs/API**: `ApiDocsView` explica estrutura de indicadores/estrategias Python, paths de workspace Lean e libs disponiveis; serve de referencia LLM-friendly.

## Estrutura de pastas (top-level)
- Raiz: `App.tsx`, `index.tsx`, `types.ts`, `constants/`, `hooks/`, `services/`, `utils/`, `components/`, `views/`, `context/`, `indicators/`, `strategies/`.
- Backend: `server/src/index.js`, `server/src/routes/`, `server/src/services/`, `server/src/constants/`, `server/test/`.
- Dados gerados: `server/data/`, `server/data/raw/`.
- Desktop shell (Electron): `desktop/` contem o shell Electron (`desktop/main.cjs`, `desktop/package.json`) que sobe (ou reutiliza) o backend local e abre uma janela unica carregando `http://127.0.0.1:4800` (frontend servido pelo Express). Scripts de lancamento em `desktop-launcher.bat` e `run-desktop.vbs` permitem abrir o app a partir de um atalho do Windows, sem janelas de console visiveis.
- Docs/meta: `architecture.md` (principal), `ROADMAP.md`, `AGENTS.md`, `metadata.json`; `docs/indicators/indicator-api.md` (API completa de indicadores); `front-end-architecture.md` e `back-end-architecture.md` agora sao stubs que apontam para este doc.

## Desktop shell (Electron)
- Entrypoint: `desktop/main.cjs` usa Electron para criar uma unica `BrowserWindow` com icone `the-lab.ico`, tamanho inicial ajustado a ~80–85% da area util do monitor (limitado entre 1280x800 e 1600x900), e sem barra de menu/URL (apenas titulo da janela).
- Backend local: ao iniciar, o shell chama `http://127.0.0.1:4800/health`; se o backend ja estiver rodando, ele eh reutilizado, caso contrario o shell spawna `node server/src/index.js` com `SERVER_PORT=4800` e log em console.
- Frontend: o backend Express serve o bundle Vite de `dist/` em `/`, portanto o Electron apenas navega para `http://127.0.0.1:4800`.
- Launcher Windows:
  - `desktop-launcher.bat` garante instalacao de dependencias (raiz, `server/`, `desktop/`), roda sempre `npm run build` para gerar `dist/` atualizado e inicia `npm run dev --prefix desktop` em background.
  - `run-desktop.vbs` executa `desktop-launcher.bat` com janela oculta, permitindo que o atalho `The Lab.lnk` abra apenas a janela do app (sem CMDs extras). 

## Comandos uteis
- Frontend dev: `npm run dev` (porta definida por `VITE_DEV_PORT` ou 3070).
- Backend dev: `npm --prefix server run dev`.
- Backend testes: `npm --prefix server run test`.
- Build Vite: `npm run build` (gera `dist/`, servido pelo backend em producao e usado pelo shell desktop).
- Desktop shell (dev apos build): `npm --prefix desktop run dev` (abre janela Electron, sobe o backend local em `SERVER_PORT` e carrega o frontend em `http://127.0.0.1:4800`).
- Lean CLI: seguir instrucoes em `ApiDocsView` (Lean instalado e workspace configurado).

## Conexoes externas
- Dukascopy: via `dukascopy-node` no backend (rede externa).
- Lean: integrado localmente pelo frontend chamando CLI (workspaces locais, sem backend proprio).
- Repositorios de referencia: listados em `views/RepositoryView.tsx`.



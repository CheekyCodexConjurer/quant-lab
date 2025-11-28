# Architecture - quant-lab

Visao completa para LLMs do frontend, backend, fluxo de dados, Lean e Dukascopy.

## Stack e entrypoints
- Frontend: React 19 + Vite 6 + TypeScript. Tailwind via CDN. Alias `@` aponta para a raiz. Entry `index.html` (importmap) -> `index.tsx` -> `App.tsx`.
- Backend: Node/Express em `server/src/index.js`, servindo o bundle Vite de `dist/` em `/` e expondo rotas em `/api/...` e `/health`.
- Dados locais: JSONs em `server/data/` e `server/data/raw/` (gerados pelos jobs Dukascopy).
- Roadmap/documentacao: `ROADMAP.md`, `architecture.md` (este doc), `AGENTS.md` (instrucoes do agente).

## Frontend
- Estado global: `context/AppStateContext.tsx` (view ativa, simbolo/timeframe, timezone, datasets baixados, aparencia do grafico, timeframes disponiveis/pinados, licenca local e perfil de usuario). `types.ts` define modelos (`Candle`, `Trade`, `BacktestResult`, etc.), enum `ViewState` e tipos de licenca/perfil (`LicenseState`, `UserProfile`).
- Hooks principais: `useIncrementalMarketData` (carrega candles via API com fallback mock), `useIndicators`, `useStrategies`, `useBacktest` (mock local), `useLeanBacktest` (Lean), `useDataImport` (jobs Dukascopy/custom), `useNormalizationSettings`, `useAvailableFrames`.
- Views (`views/`): `ChartView`, `StrategyView`, `AnalysisView`, `DataSourcesView`, `DataNormalizationView`, `ApiDocsView`, `RepositoryView`, `RoadmapView` (renderiza `ROADMAP.md`). `LoginView` existe mas o gating inicial esta desativado por enquanto (aplicacao entra direto no shell principal). `IndicatorView` existe mas esta descontinuada (fluxo unificado em Strategy).
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
- Desktop shell (Electron): `desktop/` contem o shell Electron (`desktop/main.cjs`, `desktop/package.json`) que sobe (ou reutiliza) o backend local e abre uma janela unica carregando `http://127.0.0.1:4800` (frontend servido pelo Express). Scripts de lancamento em `desktop-launcher.bat` e `run-desktop.vbs` permitem abrir o app a partir de um atalho do Windows, sem janelas de console visiveis.
- Docs/meta: `architecture.md` (principal), `ROADMAP.md`, `AGENTS.md`, `metadata.json`; `front-end-architecture.md` e `back-end-architecture.md` agora sao stubs que apontam para este doc.

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



# Front-end Architecture – quant-lab

Guia completo do frontend para agentes/LLMs: mapa de arquivos, fluxos, dependencias e pontos de extensao.

## Stack e entrada
- Stack: React 19 + Vite 6, TypeScript, Tailwind via CDN (estilos utilitarios).
- Entrada: `index.html` (importmap para libs CDN) -> `index.tsx` (monta `App` em `root`).
- Alias: `@` aponta para raiz (vite.config).

## Estado global e contexto
- `context/AppStateContext.tsx`: estado compartilhado
  - `activeView` (enum `ViewState` em `types.ts`).
  - Simbolo/timeframe ativos; timeframes disponiveis/pinados; timezone do grafico.
  - Assets baixados (datasets) persistidos em localStorage.
  - Aparencia do grafico (`ChartAppearance`): cores, grid, tamanhos, persistencia localStorage.
  - Setter helpers para normalizar valores (uppercase para timeframes, etc.).

## Tipos centrais (`types.ts`)
- Modelos: `Candle`, `Trade`, `BacktestResult`, `CustomIndicator`, `StrategyFile`.
- Enums/estados de view: `ViewState`.
- Aparencia: `ChartAppearance` (cores de candle, grid, fonte de escala).

## Fluxo de dados e hooks
- `hooks/useMarketData.ts`: busca candles via `apiClient.fetchData(asset,timeframe)`; fallback `utils/mockData.generateData`.
- `hooks/useIndicators.ts`: lista indicadores, carrega codigo, persiste versao aplicada em localStorage; seeds default se API vazia.
- `hooks/useStrategies.ts`: lista e carrega estrategias; controla versao aplicada em localStorage.
- `hooks/useBacktest.ts`: roda simulacao local (`services/backtestEngine.ts`) sobre candles carregados.
- `hooks/useDataImport.ts`: dispara import jobs (Dukascopy/custom), faz polling (`apiClient.getJob`), mantem status/logs/progresso.
- `hooks/useNormalizationSettings.ts`: busca/salva configuracao de normalizacao (timezone, basis, tick size, gap quant) via API.

## Services e integracoes
- `services/api/client.ts`: cliente REST para backend (BASE_URL via `VITE_BACKEND_URL`, default localhost:4800).
  - Import: `POST /api/import/dukascopy|custom`, jobs `GET /api/import/jobs/:id`.
  - Normalizacao: `GET/POST /api/normalization`.
  - Dados: `GET /api/data` (datasets), `GET /api/data/:asset/:timeframe`.
  - Indicadores: `GET/POST /api/indicators/:id`, lista.
  - Estrategias: `GET/POST /api/strategies/:id`, lista.
- `services/backtestEngine.ts`: motor mock (SMA cruzado) para gerar `BacktestResult`.

## Views (pontos de tela)
- `views/ChartView.tsx`: grafico principal; barra de ativos/timeframes; botao de estilo (pincel). Renderiza um `LightweightChart` com indicadores/backtest overlay. Usa `ChartStyleMenu` para aparencia.
- `views/IndicatorView.tsx`: CRUD de indicadores Python (upload, salvar, ativar/exibir, refresh do disco).
- `views/DataSourcesView.tsx`: importa dados (Dukascopy/custom), seleciona mercado/ativo/datas, mostra logs via `SyncLogConsole`.
- `views/DataNormalizationView.tsx`: ajustes de normalizacao (timezone, basis, tick size, gap quant).
- `views/StrategyView.tsx`: editor de estrategia Python; salvar/aplicar, rodar simulacao.
- `views/AnalysisView.tsx`: cards de performance + equity curve (Recharts) + trade log.
- `views/ApiDocsView.tsx`: instrucoes para indicadores/estrategias Python (LLM-friendly).
- `views/StrategyView.tsx`: (ja citado) conecta `useStrategies`.

## Componentes chave
- Layout: `components/layout/Sidebar.tsx`, `MainHeader.tsx`.
- Chart: `components/LightweightChart.tsx` (lightweight-charts v5, usa `addSeries` com `CandlestickSeries`/`LineSeries`, `ResizeObserver` para responsividade).
- Chart controls: `components/chart/ChartTimezoneSelector.tsx`, `components/chart/ChartStyleMenu.tsx` (cores/grid/fonte), botao de estilo via `ChartView`.
- Form/inputs: `components/common/DatePickerInput.tsx`.
- Painel de logs: `components/panels/SyncLogConsole.tsx`.
- Visual: `components/StatsCard.tsx`.

## Utils e constantes
- `constants/markets.ts`: assets, timeframes padrao, tick presets, mercados Dukascopy.
- `constants/timeframes.ts`: biblioteca de timeframes categorizada.
- `constants/timezones.ts`: opcoes e helper `getTimezoneById`.
- `utils/timeFormat.ts`: conversoes de timeframe, parse timezone, formatadores de tooltip/tick.
- `utils/mockData.ts`: geracao de candles sintéticos.
- `utils/indicators.ts`: calculo EMA local, templates de indicador Python.
- `utils/gapQuantization.ts`: ajusta candles removendo gaps.

## Configuracao
- `vite.config.ts`: plugin React, alias @, define vars de ambiente (GEMINI placeholders), porta preferida `VITE_DEV_PORT` (ou PORT, fallback 3070).
- `tsconfig.json`: target ES2022, module bundler, jsx react-jsx, paths `@/*`.
- `metadata.json`: nome/descricao do app.
- `launcher.bat`: instala deps (front/back) e inicia dev servers (porta 3070) + abre Chrome.

## Padrões de UI/UX
- Tailwind via CDN (index.html), fonte Inter, light-mode.
- Menu de estilo (pincel) ajusta background, grid, cores de candles, tamanho/cor de texto das escalas.
- Responsividade: chart usa `ResizeObserver`; `ChartView` envolve chart em contêiner flex.

## Fluxos principais (frontend)
- **Carregar dados**: `useMarketData` -> `apiClient.fetchData` -> fallback mock; `App` passa para `ChartView` e `LightweightChart`.
- **Indicadores**: `useIndicators` lista via API, carrega código, salva via `apiClient.saveIndicator`, ativa/visibilidade no chart.
- **Estrategias**: `useStrategies` lista/salva arquivos Python via API.
- **Backtest**: `useBacktest.runSimulation` roda `backtestEngine` local sobre candles presentes.
- **Importacao**: `useDataImport` dispara job Dukascopy/custom, polling, logs; `DataSourcesView` interface.
- **Normalizacao**: `useNormalizationSettings` carrega/salva configuracao; `applyGapQuantization` aplica no chart se habilitado.
- **Aparencia**: `ChartStyleMenu` ajusta `ChartAppearance` no contexto; `LightweightChart` aplica layout/grid/candle options dinamicamente.

## Testes
- Não há testes frontend. Testes existentes são backend (ver back-end-architecture.md).

## Gaps / notas
- Dados mock se backend indisponivel.
- Sync entre panes/layout múltiplo foi removido; apenas um chart ativo.
- Sem roteamento; views controladas por estado `ViewState`.

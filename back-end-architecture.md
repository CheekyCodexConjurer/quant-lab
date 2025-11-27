# Back-end Architecture – quant-lab

Mapa completo do backend (Express) para agentes/LLMs: rotas, serviços, persistência e testes.

## Stack e entrada
- Node.js/Express, CORS, JSON, morgan.
- Entrada: `server/src/index.js` (porta `SERVER_PORT` ou 4800).
- Rotas montadas: `/api/import`, `/api/normalization`, `/api/data`, `/api/indicators`, `/api/strategies`, e `/health`.

## Estrutura de pastas (backend)
- `server/src/index.js`: bootstrap do servidor.
- `server/src/routes/`: rotas Express
  - `importRoutes.js`: inicia jobs de import (Dukascopy/custom), consulta job.
  - `dataRoutes.js`: lista datasets (`data/`) e retorna candles por asset/timeframe.
  - `normalizationRoutes.js`: GET/POST configuracao de normalizacao (in-memory).
  - `indicatorRoutes.js`: CRUD de arquivos .py em `server/indicators` (seed se vazio).
  - `strategyRoutes.js`: CRUD de arquivos .py em `server/strategies` (seed se vazio).
- `server/src/services/`:
  - `dukascopyService.js`: orquestra job de import, baixa ticks via `dukascopy-node`, resolve range, converte para candles, grava em `data/` e `data/raw`, logs/progresso em Map.
    - Submodulos: `services/dukascopy/paths.js` (paths/cleanup), `jobStore.js` (persistencia/boot id), `timeframes.js` (chunking), `dataUtils.js` (merge JSON), `candleWriter.js` (persistir candles).
  - `timeframeBuilder.js`: converte ticks para candles M1 e agrega para timeframes maiores.
  - `dataCacheService.js`: garante `data/`, lista assets/timeframes de arquivos, lê JSON de candles.
  - `normalizationService.js`: guarda configuracao em memória (timezone, tickSize, basis, gapQuant placeholder).
  - `indicatorFileService.js`: CRUD de indicadores .py (seed `ema_200.py` se vazio).
  - `strategyFileService.js`: CRUD de estrategias .py (seed `main.py` se vazio).
  - Lean helpers: `services/lean/defaultAlgorithm.js` (fallback de algoritmo), `services/lean/parsers.js` (parse de equity/trades), usados por `leanService.js`.
- `server/src/constants/`:
  - `assets.js`: mapeia simbolo -> instrumento Dukascopy e label.
  - `paths.js`: paths raiz/indicators/strategies.
- Seeds e dados:
  - `server/indicators/ema_200.py`, `server/strategies/main.py` (pode ser recriado se vazio).
  - `server/data/` (gerado on-demand): caches de candles JSON; `server/data/raw` para ticks minimizados.
- Testes: `server/test/timeframeBuilder.test.js` (asserts de agregação), `server/test/smoke.test.js` (chamadas simples aos endpoints).

## Rotas e fluxos
- `/health` (GET): uptime/status.
- `/api/import`
  - `POST /dukascopy`: body {asset, timeframe, startDate?, endDate?}; cria job async, retorna job {id,status,progress,logs}. Interno: `dukascopyService.runDukascopyJob`.
  - `POST /custom`: body {filename}; job mock completo.
  - `GET /jobs/:id`: retorna snapshot do job.
- `/api/data`
  - `GET /`: lista datasets em `data/` (asset, timeframes).
  - `GET /:asset/:timeframe`: retorna conteúdo do arquivo `data/{asset}-{timeframe}.json` (ou 404).
- `/api/normalization`
  - `GET /`: retorna config atual (em memória).
  - `POST /`: atualiza config (merge em memória).
- `/api/indicators`
  - `GET /`: garante seed; lista metadados dos .py em `server/indicators`.
  - `GET /:id`: garante seed; lê código + meta.
  - `POST /:id`: garante seed; grava código informado e retorna meta+conteúdo.
- `/api/strategies`
  - `GET /`: garante seed; lista metadados dos .py em `server/strategies`.
  - `GET /:id`: garante seed; lê código + meta.
  - `POST /:id`: garante seed; grava código informado e retorna meta+conteúdo.

## Serviços em detalhe
- `dukascopyService.js`:
  - Mapeia asset -> instrumento (`constants/assets.js`).
  - `runDukascopyJob`: cria job (Map jobs), agenda `executeJob`.
  - `executeJob`: resolve range (datas), baixa ticks (`getHistoricalRates` de dukascopy-node), persiste ticks minimal em `data/raw`, converte para candles (`convertTicksToCandles`), grava em `data/{asset}-{timeframe}.json`, atualiza logs/progresso; trata erros.
  - `convertTicksToCandles`: agrega por timeframe (ms), calcula OHLC/volume.
  - Jobs: status/logs em memória (perdidos se restart).
- `timeframeBuilder.js`:
  - Converte ticks -> M1, agrega para M5/M15/H1/H4/D1; helpers de bucket e aggregate; usado em testes.
- `dataCacheService.js`:
  - `listAssets`: lê arquivos .json em `data/` e agrupa por asset -> timeframes.
  - `readCandles`: lê/parsa arquivo asset-timeframe (lowercase).
- `indicatorFileService.js` / `strategyFileService.js`:
  - Normaliza IDs (alfa-num, _,-), leitura/escrita de .py, meta com mtime/size, seed se vazio.
- `normalizationService.js`:
  - Config padrao `{ timezone:'UTC-3', tickSize:0.01, basis:'median' }`, guarda em memória; sem persistência em disco.

## Configuracao
- Variaveis: `SERVER_PORT` (porta), sem outras obrigatórias.
- `server/package.json`: scripts `dev` (nodemon), `start`, `test` (timeframeBuilder).

## Fluxos principais (backend)
- **Importacao Dukascopy**: rota -> job -> download ticks -> persist raw -> converter -> salvar candles -> atualizar cache/metadata.
- **Dados**: leitura direta de arquivos em `server/data`.
- **Normalizacao**: apenas estado em memória exposto via API.
- **Indicadores/Estrategias**: CRUD direto em disco de arquivos Python (seeds se vazio).

## Testes
- `npm --prefix server run test`: roda `server/test/timeframeBuilder.test.js` (asserts de agregacao).
- `server/test/smoke.test.js`: simples chamada a health, normalization, dukascopy POST (não mocka rede).

## Gaps / riscos
- Jobs e normalization são in-memory (perdidos em restart).
- Sem validação robusta de payloads; sem auth.
- `dukascopy-node` depende de rede externa.
- Sem testes de rotas (exceto smoke) e sem persistência durável para configuração.

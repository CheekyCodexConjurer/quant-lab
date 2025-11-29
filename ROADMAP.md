# The Lab - Roadmap Unico (Agent-Oriented, Revenue-First)

> Atualizado em **28/11/2025**  
> Projeto base: **quant-lab** (frontend React/Vite, backend Express, Lean + CL Futures)

Este arquivo eh o **roadmap principal e completo** do The Lab.  
Ele serve tanto como visao de produto quanto como guia de implementacao para voce e para os agentes.

Toda a arquitetura de referencia esta centralizada em **`architecture.md`** (frontend, backend, fluxos, Lean, dados locais de futures).  
Antes de implementar qualquer coisa, o agente deve ler:

- `architecture.md` - visao consolidada de stack, fluxos e pastas.  
- `AGENTS.md` - protocolo de trabalho para o agente (discutir antes de codar, plano faseado, etc).

---

## Visao geral de produto

**Objetivo geral**  
Transformar o The Lab em um laboratorio local de backtesting quantitativo, lucrativo e sustentavel, com:

- Integracao nativa com Lean e dados Dukascopy.  
- Ambiente unico para codigo, dados, graficos e analises.  
- Ferramentas avancadas de breakdown tecnico, calendario economico e otimizacao de parametros.  
- Infra de contas, cobranca e licenciamento implementada **de forma incremental**, priorizando:
  - Entrar receita cedo (Paid Alpha).
  - Manter compute pesado na maquina do usuario.
  - Reinvestir receita em features mais caras (APIs, seguranca, marketing).

**Linguagem da interface**  
Por padrao, **todos os textos de UI** (labels, tooltips, botoes, menus, mensagens) devem ser escritos em **ingles (en-US)**.

---

## Linha do tempo resumida

| Fase | Nome                                      | Periodo alvo            | Foco principal                               |
|------|-------------------------------------------|-------------------------|---------------------------------------------|
| 0    | Prototipo & Empacotamento Local          | 27/11/2025 - 31/01/2026 | Fluxo Lean / Dukascopy redondo para uso interno |
| 1    | Paid Alpha - Desktop Local, Licenca Unica| 01/02/2026 - 31/03/2026 | Vender Early Access local (licenca unica)   |
| 2    | Paid Beta - Contas Online, Breakdown     | 01/04/2026 - 30/06/2026 | Login + plano Pro basico + analise avancada |
| 3    | v1.0 - Economic Data, Grid Search, etc.  | 01/07/2026 - 30/09/2026 | Calendario economico, experimentos, hardening |

---

## 0. Contexto tecnico atual

Resumo rapido (detalhes em `architecture.md`):

- Frontend: React + Vite + TypeScript, estado global em `AppStateContext`, views em `views/`, hooks em `hooks/`, UI minimalista (poucos botoes visiveis, muitos menus/contextos discretos, linguagem en-US).  
- Backend: Express em `server/src/index.js`, rotas em `server/src/routes/`, servicos em `server/src/services/`, dados locais em `server/data/` + `server/db/market.db`.  
- Lean: integrado via CLI, orquestrado pelo frontend (`useLeanBacktest`).  
- Dados de mercado: CL futures locais (CSV vendor) importados via scripts para `server/data` (JSON segmentado) e ingeridos em SQLite (`server/db/market.db`), servidos em janelas por `/api/data/:asset/:timeframe?limit=&to=`.

---

## Fase 0 - Prototipo & Empacotamento Local

### 0.1. Fluxo Lean estavel (frontend + backend)

- [x] **Status:** concluido.

**Objetivo**  
Sair do estado experimental do `useLeanBacktest` e torna-lo um fluxo previsivel: recebe parametros claros, roda Lean, devolve `BacktestResult` consistente e logs utilizaveis.

**Arquivos principais**

- Frontend:
  - `hooks/useLeanBacktest.ts`
  - `views/StrategyView.tsx`
  - `views/AnalysisView.tsx`
  - `utils/leanResultAdapter.ts`
  - `services/api/client.ts`
- Backend:
  - `server/src/services/lean/*`
  - `server/src/routes/leanRoutes.js`

**Resumo do que esta feito**

- Hook `useLeanBacktest` padronizado, expondo `runLeanBacktest`, `status`, `logs`, `result`, `error`, `jobId` e parametros de engine.  
- `StrategyView` dispara backtests Lean com a estrategia ativa e contexto de simbolo/timeframe.  
- `leanService` encapsula a execucao da CLI Lean com captura de logs.  
- `leanRoutes` expoe `/api/lean/run`, `/api/lean/jobs/:id` e `/api/lean/results/:id`.  
- `leanResultAdapter` transforma resultados brutos em `BacktestResult`, consumido por `AnalysisView`.

---

### 0.2. Shell desktop Electron (MVP)

- [x] **Status:** concluido.

**Objetivo**  
Empacotar o frontend React/Vite e o backend Express em um shell desktop Electron simples, abrindo uma janela única sem barra de endereço, similar a TradingView Desktop / ChatGPT Desktop.

**Arquivos**

- `desktop/README.md`  
- `desktop/package.json`  
- `desktop/main.cjs`  
- `server/src/index.js` (serve `dist/` estaticamente em `/` e mantem as rotas `/api/...`)  
- Secao "Desktop shell (Electron)" em `architecture.md`.

### 0.3. Entrada local (login minimalista)

- [x] **Status:** concluido.

**Objetivo**  
Adicionar uma tela de entrada full-screen estilo app desktop (sem barra de navegador), baseada em um perfil local simples, mantendo toda a autenticacao 100% na maquina do usuario nesta fase.

**Arquivos**

- `types.ts` (`UserProfile`, ajustes em `LicenseState`)  
- `context/AppStateContext.tsx` (estado `user`, persistencia em `localStorage`)  
- `views/LoginView.tsx` (tela de entrada local, en-US)  
- `App.tsx` (gating atualmente desativado: a aplicacao entra direto no shell principal; `LoginView` fica disponivel para fases futuras em que quisermos reativar o fluxo de perfil/local login)  

### 0.4. Launcher desktop & UX da janela

- [x] **Status:** concluido.

**Objetivo**  
Polir o empacotamento desktop para uso diario: atalho unico no Windows, janelas de console ocultas e tamanho inicial da janela otimo para leitura do grafico, sem forcar tela cheia.

**Arquivos**

- `desktop/main.cjs` (icone `the-lab.ico`, detecao/reuso de backend existente, tamanho base da janela proporcional ao monitor, sem maximizar por padrao)  
- `desktop-launcher.bat` (instala dependencias se necessario, sempre roda `npm run build`, inicia o shell Electron em background)  
- `run-desktop.vbs` (executa o launcher sem abrir CMD, usado pelo atalho `The Lab.lnk` no Desktop)  
- Secao "Desktop shell (Electron)" em `architecture.md` (atualizada com detalhes de launcher, windowing e backend reuse)  

---

## Fase 1 - Paid Alpha - Desktop Local, Licenca Unica

### 1.1. Multi-instrumento Alpha (CL1!, ES1!, BTC1!) - Dukascopy (legacy, descontinuado na UI)

- [x] **Status:** concluido.

**Objetivo**  
Permitir ao usuario escolher/importar dados para alguns instrumentos chave via Dukascopy.

**Arquivos principais**

- Backend:
  - `server/src/constants/assets.js`
  - `server/src/services/dukascopyService.js`
  - `server/src/services/dukascopy/*`
  - `server/src/services/dataCacheService.js`
  - `server/src/routes/importRoutes.js`
  - `server/src/routes/dataRoutes.js`
- Frontend:
  - `constants/markets.ts`
  - `hooks/useIncrementalMarketData.ts` (atualizado: passa a consumir janelas de dados via `limit`/cache, nao mais full-series)

**Resumo (estado legacy)**  

- Dukascopy continua disponivel apenas como backend legacy (jobs, JSONs em `server/data/raw`), mas a UI principal migrou para dados locais de futures CL.  
- `DataSourcesView` e `useDataImport` foram removidos da navegacao; os datasets sao carregados diretamente de `server/data` via `dataCacheService`.

---

### 1.2. Licenca local Early Access (Paid Alpha)

- [x] **Status:** concluido (licenca local Early Access implementada end-to-end: estado global, UI minimalista na sidebar, backend local de validacao e integracao opcional pelo hook).

**Objetivo**  
Permitir um licenciamento **100% local** para Early Access, usado para gating leve de features e sinalizacao de modo (Internal vs Early Access), sem depender de backend externo.

**Arquivos principais**

- Frontend:
  - `types.ts`
  - `context/AppStateContext.tsx`
  - `hooks/useLicense.ts`
  - `components/layout/MainHeader.tsx`
  - `components/layout/Sidebar.tsx`
  - `App.tsx`
- Backend:
  - `server/src/services/licenseService.js`
  - `server/src/routes/licenseRoutes.js`

**Tarefas de frontend (concluidas)**

1. **Estado de licenca local**

   - `LicenseState` em `types.ts`:
     - `mode: 'internal' | 'early-access' | 'expired'`
     - `key?: string`
   - Estado `license` guardado no contexto global (`AppStateContext`) e persistido em `localStorage` (`thelab.licenseState`).

2. **Hook de licenca**

   - `useLicense` expõe:
     - `license` - estado atual (derivado do contexto).
     - `applyKey(rawKey)` - normaliza e define o `mode` localmente, com apoio **opcional** do backend:
       - localmente: `TLAB-...` → `early-access`, outras chaves preenchidas → `expired`, vazio → `internal`.
       - se o backend estiver disponivel: chama `POST /api/license/validate` e usa o `mode` retornado como sugestao, mantendo compatibilidade com o comportamento local.
     - `clearKey()` - volta para `internal`.
   - Nenhuma dependencia obrigatoria de backend: se a chamada falhar (offline, erro de rede), o hook usa apenas a logica local.

3. **Fluxo de licenca na UI (sidebar)**

   - Fluxo de licenca embutido no bloco de perfil no rodape da `Sidebar`:
     - botao icon-only de chave (`KeyRound`) ao lado do perfil.
     - ao clicar, abre um popover minimalista alinhado ao botao (sempre para dentro da viewport), com:
       - input single-line para a chave (placeholder `TLAB-...`).
       - icone "i" (`Info`) com tooltip em ingles:  
         `"At this stage the key is only used for local gating. The final format may change in future releases."`
       - botoes compactos `Clear` (ghost) e `Apply` (primario).
   - Nenhuma pagina/rota dedicada para licenca:
     - `LicenseView.tsx` removido.
     - `ViewState.LICENSE` removido.

4. **Badge de modo no header**

   - `MainHeader` exibe badge discreto indicando o modo:
     - `INTERNAL MODE` (cinza)
     - `EARLY ACCESS` (verde)
     - `LICENSE EXPIRED` (vermelho)
   - `App.tsx` passa `license.mode` do contexto para `MainHeader`.

**Tarefas de backend (concluidas para Fase 1.2)**

1. **Servico de licenca**

   - `server/src/services/licenseService.js`:
     - `validateLicenseKey(rawKey)`:
       - normaliza a chave (trim).  
       - `TLAB-...` → `mode: 'early-access', isValid: true`.  
       - vazio → `mode: 'internal', isValid: false`.  
       - qualquer outra chave preenchida → `mode: 'expired', isValid: false`.  
     - retorna `{ key, mode, isValid, source: 'local-only', reason }`.

2. **Rotas de licenca**

   - `server/src/routes/licenseRoutes.js`:
     - `POST /api/license/validate` - recebe `{ key }`, chama `licenseService.validateLicenseKey` e retorna o objeto de resultado.
   - Rotas registradas em `server/src/index.js` sob `/api/license`.

3. **Integracao frontend-backend**

   - `useLicense.applyKey` tenta chamar `/api/license/validate` ao aplicar uma chave:
     - se o backend responder, o `mode` retornado eh usado como sugestao (pode ser estendido no futuro para logica mais complexa).
     - se o backend nao responder (erro de rede/offline), o estado de licenca eh baseado apenas na logica local, preservando comportamento offline.

---

## 1.x - Market Data Engine v1 (CL Futures, SQLite & Janela)

- [x] **Status:** concluido.

**Objetivo**  
Sair do modelo de carregamento full-series em JSON e adotar um engine de dados local baseado em CL Futures, com janelas por timeframe, cache em memoria e pipeline reprodutivel de ingestao, aproximando a responsividade de plataformas como TradingView.

**Arquivos principais**

- Backend:
  - `server/scripts/importClFuturesFromCsv.js` (CSV -> JSONs segmentados em `server/data`)  
  - `server/scripts/ingestClFuturesToDb.js` (JSONs segmentados -> `server/db/market.db`)  
  - `server/src/services/marketStoreSqlite.js` (tabela `bars`, `getWindowFromDb`, `getSummaryFromDb`)  
  - `server/src/services/marketWindowService.js` (`getWindow`, `getSummary` com fallback para `dataCacheService`)  
  - `server/src/routes/dataRoutes.js` (`GET /api/data/:asset/:tf?limit=&to=`, `GET /summary`)  
- Frontend:
  - `services/api/client.ts` (`fetchData(asset, timeframe, { limit, to })`)  
  - `hooks/useIncrementalMarketData.ts` (usa `limit`, cacheia por `(asset,timeframe)` e so carrega full uma vez)

**Resumo do que esta feito**

- CL1! e timeframes (M1, M5, M15, M30, H1, H4) sao ingeridos em SQLite via scripts dedicados, mantendo tambem os JSONs segmentados como fonte secundaria.
- A API de dados passa a servir janelas limitadas (`limit=MAX_CANDLES`) ao inves de series completas, reduzindo bastante o payload e o tempo de parse.
- O hook `useIncrementalMarketData` consome apenas essas janelas, aplica um limite de ~12k candles e mantem cache por asset/timeframe, tornando trocas de timeframe praticamente instantaneas depois da primeira carga.

---

### 1.4. Indicator Execution Engine (TradingView-style)

- [ ] **Status:** em andamento (Fase 1 - runner + rota /api/indicator-exec implementados).

**Objetivo**  
Permitir que o usuario escreva **qualquer indicador/estrategia em Python** (seguindo uma API simples), salve em `indicators/` ou `strategies/`, e o The Lab execute esse codigo em cima dos candles e desenhe o resultado no grafico – em um fluxo fluido, similar ao TradingView + PineScript, mas 100% local.

**Visao geral de arquitetura**

- **Storage & editor (ja existente)**
  - Arquivos Python em `indicators/` e `strategies/` (raiz do projeto).
  - CRUD de arquivos via `server/src/services/indicatorFileService.js` e rotas `/api/indicators`.
  - UI de edicao com `PythonEditor` dentro de `StrategyView` / `IndicatorView`.

- **Novo nucleo: Indicator Execution Engine**
  - Componente backend responsavel por:
    - carregar o arquivo `.py` de um indicador/estrategia;
    - executar `calculate(inputs)` com os dados de mercado (arrays NumPy de open/high/low/close/volume, etc.);
    - devolver um payload JSON estruturado para o frontend, com:
      - series numericas (para linhas / overlays);
      - marcadores (setas, simbolos, flags);
      - niveis horizontais (linhas de suporte/resistencia, Protected High/Low, etc.).

- **Integracao com frontend**
  - `hooks/useIndicators.ts` passa a solicitar ao backend a execucao dos indicadores ativos, em vez de calcular tudo localmente em TypeScript.
  - `ChartView` / `LightweightChart` recebem um modelo de overlay mais rico (series, marcadores, niveis) e desenham a estrutura, mantendo o visual minimalista atual.

#### 1.4.1. Contrato de indicador (API Python)

**Arquivos principais**

- Docs:
  - `views/ApiDocsView.tsx` (secao "Indicator API")
  - `docs/indicators/indicator-api.md` (a criar, consolidando exemplos e assinatura)
- Indicadores Python:
  - `indicators/ema_200.py` (exemplo simples)
  - `indicators/market-structure.py` (indicador de Estrutura de Mercado, futuro)

**Assinatura minima**

Todo indicador deve expor uma funcao:

```py
def calculate(inputs):
    """
    Main entry point for indicator calculation.
    :param inputs: dict de np.ndarray com dados de mercado
    :return: array NumPy OU estrutura dict serializavel em JSON
    """
    ...
```

- `inputs` (primeira versao minima):
  - `inputs['open']`: `np.ndarray`
  - `inputs['high']`: `np.ndarray`
  - `inputs['low']`: `np.ndarray`
  - `inputs['close']`: `np.ndarray`
  - `inputs['volume']`: opcional
- Retorno aceito:
  - v1: `np.ndarray` (serie principal, mesmo comprimento dos closes ou menor).
  - v2 (engine avancada): `dict` com campos:
    - `series`: `{ <name>: np.ndarray, ... }`
    - `markers`: `[{ "index": int, "kind": str, "value": float | None }, ...]`
    - `levels`: `[{ "from": int, "to": int, "price": float, "kind": str }, ...]`

**Requisitos de execucao**

- Bibliotecas disponiveis por padrao:
  - `numpy as np`
  - `pandas as pd`
  - `talib`
  - `math`
- Execucao sempre em processo separado do backend Node (via `python`), com timeout configuravel e isolamento basico (sem acesso a rede por padrao).

#### 1.4.2. Runner Python e service de execucao (backend)

**Arquivos principais (novos)**

- `server/indicator_runner/runner.py`
  - Script Python responsavel por:
    - receber via argumentos o caminho do arquivo de indicador (`indicators/<name>.py`);
    - ler de `stdin` um JSON com os arrays de OHLC;
    - carregar dinamicamente o modulo;
    - executar `calculate(inputs)` com os dados convertidos para `np.ndarray`;
    - serializar o resultado (array ou dict) em JSON no `stdout`.
  - Deve tratar:
    - erros de import ou sintaxe (retornar JSON com `{"error": "SyntaxError", "message": "..."}`).
    - erros de execucao (stacktrace resumido).
    - validacao de tamanho maximo de saida.

- `server/src/services/indicatorExecutionService.js`
  - Funcoes principais:
    - `runIndicatorById(id, candles, options)`;
    - `runScript(absolutePath, inputs, options)`.
  - Responsabilidades:
    - resolver o caminho correto do arquivo Python via `indicatorFileService` / `INDICATORS_DIR`;
    - spawn do processo Python (`runner.py`) via `child_process.spawn`;
    - enviar `inputs` (OHLC) em JSON no `stdin`;
    - ler e parsear o JSON de retorno;
    - aplicar politicas de timeout e limites de memoria / tamanho da resposta;
    - mapear o resultado para um formato interno:
      - `IndicatorExecutionResult = { series, markers, levels, raw }`.

- `server/src/routes/indicatorExecutionRoutes.js`
  - Rotas planejadas:
    - `POST /api/indicator-exec/:id/run`
      - Body possivel:
        - v1 (mais simples): `{ candles: [{ time, open, high, low, close, volume? }], context?: {...} }`
        - v2: `{ asset, timeframe, from?, to?, limit? }` (backend busca candles via `marketWindowService`).
      - Resposta:
        ```json
        {
          "series": {
            "main": [{ "time": "...", "value": 123.45 }, ...],
            "signal": []
          },
          "markers": [
            { "time": "...", "value": 123.45, "kind": "buy" }
          ],
          "levels": [
            { "timeStart": "...", "timeEnd": "...", "price": 130.0, "kind": "protected-high" }
          ]
        }
        ```
    - `POST /api/indicator-exec/batch`
      - Opcional: executar varios indicadores de uma vez para a mesma janela de candles.

**Integracao com servicos existentes**

- Usa `INDICATORS_DIR` de `server/src/constants/paths.js` para localizar arquivos.
- Pode reutilizar `marketWindowService.getWindow` quando receber apenas `(asset, timeframe, from, to)`.
- Nao interfere nas rotas `/api/indicators` (CRUD de arquivos), apenas adiciona a dimensao "execucao".

#### 1.4.3. Modelo de dados de overlay (frontend)

**Arquivos principais**

- `types.ts`
  - Novos tipos para modelar overlays:
    - `IndicatorSeriesPoint = { time: string | number; value: number }`
    - `IndicatorMarker = { time: string | number; value?: number; kind: string }`
    - `IndicatorLevel = { timeStart: string | number; timeEnd: string | number; price: number; kind: string }`
    - `IndicatorOverlay = { series: Record<string, IndicatorSeriesPoint[]>; markers: IndicatorMarker[]; levels: IndicatorLevel[] }`

- `hooks/useIndicators.ts`
  - Hoje calcula somente EMA em TS, preenchendo `indicatorData: Record<string, { time, value }[]>`.
  - Passos planejados:
    1. Introduzir `indicatorOverlays: Record<string, IndicatorOverlay>` no estado do hook.
    2. Substituir a logica de `calculateEMA` por chamadas a `apiClient.runIndicator(id, candles)`:
       - Para cada indicador ativo:
         - Enviar a janela de candles atual.
         - Receber `series`, `markers`, `levels` do backend.
         - Preencher:
           - `indicatorData[id] = series['main'] ?? alguma serie default`;
           - `indicatorOverlays[id] = { series, markers, levels }`.
    3. Expor `indicatorOverlays` para `ChartView`.

- `services/api/client.ts`
  - Adicionar:
    - `runIndicator(id: string, payload: RunIndicatorPayload): Promise<IndicatorOverlayResponse>`.
  - Manter consistencia de base URL (`/api/indicator-exec/...`).

**Integracao com o chart**

- `views/ChartView.tsx`
  - Hoje:
    - monta `lines` para o `<LightweightChart />` usando apenas `indicatorData`.
  - Planejado:
    - continuar usando `indicatorData` para a serie principal (compatibilidade).
    - passar `indicatorOverlays` (agregado/transformado) como prop `structure` ou similar:
      - `structure.lines` → series adicionais (signal, baseline, niveis etc.).
      - `structure.markers` → setas de compra/venda, swings, etc.
      - `structure.levels` → linhas horizontais de suporte/resistencia, Protected High/Low.

- `components/LightweightChart.tsx`
  - Novos props (sem quebrar API atual):
    - `structureLines?: { id: string; data: IndicatorSeriesPoint[]; color?: string; style?: 'solid' | 'dashed' }[]`
    - `structureMarkers?: IndicatorMarker[]`
    - `structureLevels?: IndicatorLevel[]`
  - Implementacao:
    - Para `structureLines`: criar `LineSeries` adicionais com cores e estilos discretos (tracejado para niveis, continuo para sinais).
    - Para `structureMarkers`: reusar `setMarkers` da serie de candles, mapeando `kind` para formas/cores.
    - Para `structureLevels`: desenhar series horizontais (dois pontos com mesmo `price` entre `timeStart` e `timeEnd`) com estilo tracejado.

#### 1.4.4. UX estilo TradingView (edicao e testes)

**Objetivo**  
Deixar o fluxo de uso natural para o usuario: ler a API, escrever o script, salvar, aplicar no grafico e ver o resultado rapidamente.

**Arquivos principais**

- `views/StrategyView.tsx`
- `views/IndicatorView.tsx`
- `components/editor/PythonEditor.tsx`
- `views/ApiDocsView.tsx`

**Fluxo de usuario planejado**

1. **Descobrir a API**
   - Em `ApiDocsView`, adicionar uma subseçao "Indicator Execution Engine":
     - link para `docs/indicators/indicator-api.md`;
     - exemplos de `calculate(inputs)` que retornam:
       - apenas uma serie;
       - serie + markers;
       - serie + niveis.

2. **Criar / editar indicador**
   - Em `IndicatorView`:
     - criar indicador (botao "New Indicator" ja existe).
     - editar o Python no `PythonEditor`.

3. **Salvar e aplicar**
   - Botao "Save & Apply":
     - salva o arquivo via `/api/indicators/:id`;
     - marca o indicador como ativo (`/api/indicators/:id/active`);
     - dispara uma execucao via `/api/indicator-exec/:id/run` para a janela de candles atual.

4. **Testar sem aplicar**
   - Botao "Run test (preview)":
     - chama `runIndicator` com uma janela limitada (ex.: ultimos N candles);
     - mostra um preview em uma area reduzida ou log textual, sem mexer no grafico principal.

5. **Feedback de erros**
   - Exibir:
     - erros de sintaxe Python (linha/coluna, mensagem).
     - erros de execucao (stacktrace resumido).
     - avisos de timeout ou limite de memoria.

**Regras de UX**

- Manter a UI minimalista: nada de paineis gigantes extras.
- Painel de indicadores ativos no grafico continua pequeno e discreto (ja existente em `ChartView`).
- Logs de execucao / erros aparecem em painel colapsavel ou area do editor, nao sobrepostos ao grafico.

#### 1.4.5. Performance, isolamento e extensibilidade

**Performance e caching**

- Introduzir cache de resultados por chave:
  - `(indicatorId, asset, timeframe, codeHash, lastCandleTime)` → `IndicatorExecutionResult`.
- Evitar reexecucao completa quando:
  - apenas alguns candles novos foram adicionados (no futuro: execucao incremental).
- Permitir execucao em lote para multiplos indicadores sobre a mesma janela de dados (rota `/api/indicator-exec/batch`).

**Isolamento e seguranca**

- Sempre rodar codigo de usuario em processo Python separado com:
  - timeout (ex.: 2–5 segundos configuraveis).
  - sem acesso a rede por padrao (nao importar requests/httpx etc. automaticamente).
  - limite de tamanho de saida (para evitar arrays gigantes).
- Logar eventos relevantes para debug local:
  - tempo de execucao.
  - erros de import/execucao.
  - scripts que ultrapassam limite de tempo.

**Extensibilidade**

- Engine deve ser generica o suficiente para:
  - suportar, no futuro, estrategias (nao apenas indicadores) com retorno mais complexo (ordens simuladas, sinais, etc.).
  - ser reutilizada pelo fluxo de Lean (por exemplo, exportar resultados de estrategias para o The Lab em formato de overlay).
- Toda a logica especifica fica concentrada em:
  - `indicator_runner/runner.py` (lado Python).
  - `indicatorExecutionService` + `indicatorExecutionRoutes` (lado Node).
  - `useIndicators` + `ChartView` + `LightweightChart` (lado frontend).

---

## Fase 2 - Paid Beta - Contas Online, Breakdown & Experiments

> **Status geral:** ainda nao iniciado.  
> As secoes abaixo sao diretrizes de medio prazo e podem mudar.

### 2.1. Online Accounts & User Profile Shell

- [ ] **Status:** nao iniciado.

**Objetivo**  
Criar o esqueleto de contas online e de perfil de usuario, mantendo compatibilidade total com o modo 100% local (sem backend de contas obrigatorio) e preparando o terreno para planos pagos (Pro) e sincronizacao de preferencias.

**Arquivos principais**

- Frontend:
  - `types.ts`
  - `context/AppStateContext.tsx`
  - `hooks/useUserProfile.ts`
  - `components/layout/Sidebar.tsx`
  - `services/api/client.ts`
- Backend:
  - `server/src/services/userProfileService.js`
  - `server/src/routes/userProfileRoutes.js`
  - `server/src/index.js`

**Tarefas de frontend (perfil local + online-ready)**

1. **Modelo de perfil local**

   - Introduzir tipo `UserProfile` em `types.ts` com campos como:
     - `id: string`
     - `username: string`
     - `displayName: string`
     - `roleLabel?: string`
     - `avatarUrl?: string`
     - `timezonePreference?: string`
   - Estender `AppStateContext` para incluir:
     - `userProfile: UserProfile`
     - `setUserProfile(next: UserProfile)`
   - Persistir `userProfile` em `localStorage` sob a chave `thelab.userProfile`, com carregamento defensivo semelhante a `license` e `chartAppearance`.

2. **Hook de perfil**  

   - Criar `hooks/useUserProfile.ts` expondo:
     - `userProfile` (derivado do contexto global).
     - `updateProfile(partial: Partial<UserProfile>)` que:
       - mescla o `partial` no perfil atual.
       - atualiza o contexto e dispara a persistencia em `localStorage`.
   - Preparar o hook para, em Fase 2, integrar opcionalmente com API (GET/PUT), mantendo fallback local quando o backend nao responder.

3. **UI de perfil na Sidebar**

   - Atualizar o bloco de perfil em `components/layout/Sidebar.tsx` para:
     - exibir avatar circular:
       - se `avatarUrl` existir, usar imagem.
       - senao, usar iniciais do `username` ou fallback generico (ex.: `TL`).
     - exibir `displayName` (linha principal) e `roleLabel` (linha secundaria).
   - Substituir as strings fixas atuais (`trader.matthews`, `Lean Operator`) por valores vindos de `userProfile`.
   - Manter o botao de licenca (`KeyRound`) integrado ao bloco de perfil, preservando a estetica minimalista atual.

4. **Popover de edicao de perfil**

   - Ao clicar no bloco de perfil, abrir um popover discreto "Profile", semelhante ao popover de licenca, contendo:
     - campos single-line para `Username`, `Display name`, `Role`, `Avatar URL` (labels em en-US).
     - botoes compactos `Cancel` (ghost) e `Save` (primario).
   - No `Save`:
     - chamar `updateProfile` com os campos editados.
     - fechar o popover somente apos persistencia local concluida.
   - Garantir que o popover nao conflite visualmente com o de licenca (apenas um aberto por vez).

5. **Preparacao para contas online**

   - Estender `UserProfile` com campo opcional `remoteId?: string` para futura ligacao com usuario autenticado em backend.
   - Centralizar a logica de normalizacao do perfil (strings, URLs) dentro do hook, evitando espalhar regras pela UI.

**Tarefas de backend (perfil e API de usuario)**

1. **Servico de perfil do usuario**

   - Criar `server/src/services/userProfileService.js` com funcoes:
     - `getUserProfile()`:
       - le um arquivo JSON simples (ex.: `server/data/user-profile.json`); se nao existir, retorna um perfil default consistente com o frontend.
     - `updateUserProfile(partial)`:
       - faz merge defensivo com o perfil atual.
       - persiste o resultado em `server/data/user-profile.json`.
   - Manter o modelo de dados simples e local; sem dependencia de banco externo nesta fase.

2. **Rotas de perfil**

   - Criar `server/src/routes/userProfileRoutes.js` expondo:
     - `GET /api/user/profile` → retorna o perfil atual.
     - `PUT /api/user/profile` → recebe `partial` com campos permitidos (username, displayName, roleLabel, avatarUrl, timezonePreference) e delega a `userProfileService.updateUserProfile`.
   - Validar tipos de entrada de forma leve (strings, URLs) para evitar persistencia de dados claramente invalidos.

3. **Integracao com o servidor principal**

   - Registrar as rotas no `server/src/index.js` sob o prefixo `/api/user`:
     - `app.use('/api/user', userProfileRoutes);`
   - Garantir que a API de perfil seja opcional para o frontend:
     - se `GET /api/user/profile` falhar, o frontend continua operando apenas com o perfil local (`localStorage`).

### 2.2. Overview - Time Breakdown (exemplo de modulo futuro)

**Arquivos esperados (frontend)**  
- `views/AnalysisView.tsx`  
- `utils/timeBreakdown.ts`  
- `types.ts`

**Ideia geral**

- Calcular breakdown de desempenho por:
  - dia da semana,
  - mes,
  - hora/sessao.
- Renderizar secoes especificas em `AnalysisView`.

---

### 2.3. Quality, Tests & Observability (Paid Beta)

- [ ] **Status:** nao iniciado.

**Objetivo**  
Aumentar a confianca nos fluxos principais (Lean, importacao Dukascopy, estrategia Python) com testes direcionados e observabilidade local (logs estruturados e diagnosti cos simples), sem adicionar infraestrutura externa pesada.

**Arquivos principais**

- Backend:
  - `server/test/*.js`
  - `server/src/services/dukascopyService.js`
  - `server/src/services/lean/*`
  - `server/src/services/licenseService.js`
  - `server/src/routes/*.js`
  - `server/src/services/loggingService.js` (novo, se necessario)
- Frontend:
  - `hooks/useLeanBacktest.ts`
  - `hooks/useDataImport.ts`
  - `views/DataSourcesView.tsx`
  - `views/AnalysisView.tsx`
  - `services/api/client.ts`
  - (eventual pasta de testes E2E/smoke, a definir)

**Tarefas de backend (tests + logs)**

1. **Ampliar cobertura de testes existentes**

   - Estender `server/test/timeframeBuilder.test.js` para cobrir mais casos de borda (buracos de dados, timeframes longos, limites de memoria/tempo).
   - Adicionar testes de smoke especificos para:
     - `dukascopyService` (pipeline de importacao feliz, erro de rede, reexecucao de job).
     - `licenseService` (modos internal/early-access/expired com chaves validas/invalidas).
     - servicos Lean basicos (execucao de um algoritmo default com parametros simples).

2. **Logging estruturado local**

   - Introduzir um util em `server/src/services/loggingService.js` (ou similar) que padronize logs de:
     - jobs de importacao.
     - execucoes Lean.
     - erros HTTP relevantes.
   - Padronizar formato JSON-linha (timestamp, nivel, origem, mensagem, metadata) com escrita em arquivos sob `server/data/logs/`.

3. **Endpoints de diagnostico leve**

   - Adicionar endpoint opcional `GET /health/details` que:
     - retorna informacoes de versao, status basico de servicos chaves e ultimo erro conhecido (se houver).
   - Manter o endpoint `/health` atual simples, usando `/health/details` apenas para uso interno e suporte.

**Tarefas de frontend (UX de erros e diagn osticos)**

1. **Superficies de erro mais claras**

   - Melhorar mensagens de erro em `useLeanBacktest` e `useDataImport` para:
     - distinguir erros de rede, configuracao, dados e limites de tempo.
     - exibir mensagens amigaveis em ingles na UI (toasts ou blocos discretos).

2. **Visao rapida de logs locais (minimalista)**

   - Adicionar, em `AnalysisView` ou `DataSourcesView`, uma caixa colapsavel simples que:
     - exiba as ultimas linhas de logs de Lean/importacao obtidas via API (endpoint leve de log).
     - permita ao usuario copiar o log bruto para suporte.
   - Manter essa UI escondida por padrao (ex.: toggle "Show diagnostics"), para nao poluir a interface principal.

3. **Preparatorio para testes E2E/smoke**

   - Garantir que os fluxos principais tenham seletores estaveis (data-attributes) para futura automacao de testes (rodar Lean, importar dados, abrir Analysis).

---

### 2.4. Portfolio Analytics com QuantStats (camada acima do Lean)

- [ ] **Status:** nao iniciado.

**Repositorio de referencia**

- QuantStats (Apache-2.0): https://github.com/ranaroussi/quantstats  

**Objetivo**  
Adicionar uma camada de analytics de portfolio em cima dos resultados do Lean, usando o QuantStats apenas como motor numerico (stats/relatorios), mantendo toda a UI e experiencia visual proprietarias do The Lab.

**Arquivos principais**

  - Backend:
    - `server/src/services/analytics/quantstatsAdapter.js` (novo)
    - `server/src/routes/analyticsRoutes.js` (novo)
    - `server/src/services/lean/leanResultService.js` (novo, ao lado de `leanService.js`/`leanDataBridge.js`)
    - `server/python/quantstats_runner.py` (novo)
    - `server/test/quantstatsAdapter.test.js` (novo)
- Frontend:
  - `views/AnalysisView.tsx`
  - `services/api/analyticsClient.ts` (novo)
  - `types.ts`

**Tarefas de backend (adapter + endpoints)**

  1. **Dependencia e setup**

     - Instalar `quantstats` via `pip` no mesmo ambiente Python usado pelo Lean/estrategias (`requirements.txt` ou equivalente).
     - Criar um pequeno runner Python (`server/python/quantstats_runner.py`) responsavel por:
       - receber, via stdin/arquivo/CLI, uma serie de retornos em formato JSON.
       - chamar as funcoes do QuantStats para calcular metricas/series.
       - escrever o resultado em JSON para stdout/arquivo.
     - Documentar em `architecture.md` que o Lean continua como fonte de dados primaria; QuantStats entra apenas como camada de analytics, executada em Python e orquestrada pelo Node.

2. **Adapter de metrics**

     - Criar `server/src/services/analytics/quantstatsAdapter.js` com funcoes como:
       - `computeCoreMetrics(returns, benchmark?)`:
         - recebe `returns` como array/JSON de retornos derivados do resultado do Lean.
         - serializa os dados em JSON, chama o `quantstats_runner.py` via `child_process` e interpreta o JSON de resposta.
         - retorna um objeto plano (`{ sharpe, sortino, calmar, maxDrawdown, winRate, profitFactor, cagr, ... }`) pronto para serializacao via API.
       - `computeDrawdownSeries(returns)`:
         - delega ao runner a geracao da serie de drawdown e retorna uma lista de pontos (`{ timestamp, drawdown }`).
       - `computeMonthlyReturns(returns)`:
         - delega ao runner o calculo de retornos mensais e converte o resultado em estrutura JSON amigavel (ano, mes, valor).

   - Garantir que a interface Node ↔ Python seja baseada em JSON simples, para facilitar debug e futura substituicao de QuantStats, se necessario.

  3. **Integracao com resultados Lean**

     - Introduzir `server/src/services/lean/leanResultService.js` (ou estender `leanService.js`/`leanDataBridge.js`) para:
       - extrair a serie de retornos do backtest (`runId`) em formato adequado (array de retornos por periodo).
       - chamar o `quantstatsAdapter` e anexar `coreMetrics` ao objeto de resultado persistido, ou
       - disponibilizar funcoes que calculam analytics sob demanda, sem acoplar diretamente a UI.

4. **Rotas de analytics**

   - Criar `server/src/routes/analyticsRoutes.js` com endpoints:
     - `GET /api/analytics/:runId/core-metrics` → retorna o JSON de `coreMetrics` para o backtest.
     - `GET /api/analytics/:runId/drawdown` → retorna a serie de drawdown.
     - `GET /api/analytics/:runId/monthly-returns` → retorna matriz/objeto de retornos mensais.

   - Registrar as rotas em `server/src/index.js` sob o prefixo `/api/analytics`.

5. **Relatorio HTML opcional (tearsheet)**

   - Opcional para usuarios avancados:
     - endpoint `POST /api/analytics/:runId/quant-report` que:
       - usa `quantstats.reports.html(returns, benchmark, output=...)` para gerar um HTML completo em `server/data/results/<runId>/quant-report.html`.
       - devolve o caminho/URL relativo para o frontend abrir em nova aba.
   - Manter este relatorio como “Advanced report (beta)”, sem integrar seu HTML na UI principal.

**Tarefas de frontend (AnalysisView + cliente de analytics)**

1. **Cliente de API**

   - Criar `services/api/analyticsClient.ts` com funcoes:
     - `fetchCoreMetrics(runId)`
     - `fetchDrawdownSeries(runId)`
     - `fetchMonthlyReturns(runId)`
   - Tipar as respostas em `types.ts` (`CoreMetrics`, `DrawdownPoint`, `MonthlyReturnCell`, etc.).

2. **Bloco de metricas principais**

   - Em `views/AnalysisView.tsx`, adicionar uma secao “Core metrics” que:
     - consome `coreMetrics` via `analyticsClient`.
     - exibe as metricas em tabela/card minimalista (monospace, right-aligned para numeros).
   - Nao usar plots nativos do QuantStats; apenas os dados.

3. **Breakdown visual (integra com 2.2)**

   - Reutilizar `monthlyReturns` e `drawdownSeries` para:
     - heatmap de retornos mensais (Time Breakdown).
     - grafico leve de drawdown, usando o componente de chart ja existente no The Lab.

4. **Botao de relatorio avancado (opcional)**

   - Adicionar botao discreto em `AnalysisView`: `Open Quant Report (HTML)`.
   - Ao clicar:
     - chama o endpoint de relatorio.
     - abre o HTML em nova aba/iframe, mantendo UI principal intacta.

**Decisoes de design/arquitetura**

- QuantStats **nunca** dita a UI: ele fica restrito ao backend/adapters.
- Toda a experiencia visual de metrics e breakdown continua proprietaria do The Lab.
- Se no futuro for necessario trocar ou complementar a lib (ex.: formulas proprias), isso ocorre apenas dentro de `quantstatsAdapter`.

---

## Fase 3 - v1.0 - Economic Data, Grid Search, etc.

> **Status geral:** ainda nao iniciado.  
> Foco em dados economicos, experimentos mais pesados e hardening final do produto (desktop + seguranca minima).

### 3.1. Desktop Packaging & Update Flow

- [ ] **Status:** nao iniciado.

**Objetivo**  
Transformar o shell desktop em aplicativo instalavel (Tauri/Electron), definir uma historia simples de atualizacao (updates manuais ou semi-automaticos) e garantir que dados locais (estrategias, indicadores, datasets, licencas) sobrevivam a upgrades.

**Arquivos principais**

- Desktop:
  - `desktop/package.json`
  - `desktop/README.md`
  - arquivos de config do bundler (Tauri/Electron) a definir
- Raiz:
  - `launcher.bat`
  - `architecture.md`
  - `metadata.json`
- Backend/Frontend:
  - scripts de build existentes (`npm run build`, `npm --prefix server run start`)

**Tarefas principais**

1. **Empacotamento desktop**

   - Escolher e fixar o alvo (Tauri ou Electron) e documentar em `desktop/README.md`:
     - comandos para build e dev.
     - requisitos de sistema.
   - Configurar o shell para iniciar backend + frontend internamente, preservando a arquitetura atual (Express + Vite build).

2. **Diretorios de dados persistentes**

   - Definir onde ficam os dados do usuario no contexto desktop (ex.: pasta de dados de aplicacao por sistema operacional).
   - Atualizar `architecture.md` e `desktop/README.md` com a estrutura de pastas de dados (estrategias, indicadores, datasets, logs, licenca).

3. **Fluxo de atualizacao**

   - Documentar em `ROADMAP.md`/`README` o fluxo minimo de update para Paid Alpha/Beta:
     - backup das pastas de dados.
     - instalacao de nova versao.
     - verificacao de integridade (scripts de smoke).
   - Preparar o codigo para, no futuro, suportar verificacao automatica de nova versao (mesmo que nao implementado ainda nesta fase).

---

As demais fases (2.x, 3.x) devem ser detalhadas quando a Fase 1.2 estiver completamente consolidada em uso real.  
Para qualquer mudanca relevante de comportamento ou fluxo principal, **sempre atualizar este `ROADMAP.md` junto com `architecture.md`**.

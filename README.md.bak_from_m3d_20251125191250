<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# The Lab - Quantitative Research Workbench

The Lab e um aplicativo React + Vite que emula o workflow diario de pesquisa quantitativa usado no projeto **trader-matthews-lean-lab**. Ele oferece um dashboard unico para importar dados, normaliza-los, testar indicadores em tempo real e executar simulacoes de estrategia antes de levar o codigo para o Lean/QuantConnect.

---

## Visao Geral Rapida

| Area | O que entrega | Onde vive |
| --- | --- | --- |
| **Chart / Chart Indicator** | Visualiza candles simulados e overlays personalizados gerados a partir do editor Python. Inclui seletor ao vivo de timeframes e timezone. | `App.tsx` + `components/LightweightChart.tsx` |
| **Data Sources / Normalization** | Simula importacoes da pasta `trader-matthews-lean-lab/data/...`, gerencia timeframes locais (disponiveis + favoritos) e normaliza timezone/tick size/basis. | `App.tsx` (modulos de estado) |
| **Strategy / Analysis** | Executa `runBacktest` (SMA 9x21) em dados mock e exibe metricas, equity curve e trade log. | `services/backtestEngine.ts`, `components/StatsCard.tsx` |
| **Utils & Types** | Define contratos (`types.ts`) e gerador deterministico de dados (`utils/mockData.ts`). | `/utils`, `/types` |

---

## Arquitetura em Alto Nivel

```
src-root
|-- App.tsx                  # Shell principal, gerencia rotas de view e estado global
|-- components/
|   |-- LightweightChart.tsx # Wrapper de lightweight-charts (candles + markers)
|   |-- StatsCard.tsx        # Cards utilizados na aba Analysis
|-- services/
|   |-- backtestEngine.ts    # Simulador SMA (trades, drawdown, equity curve)
|-- utils/
|   |-- mockData.ts          # Fabricador de candles p/ multiplos ativos/timeframes
|-- types.ts                 # Contratos compartilhados (Candle, Trade, ViewState, etc.)
|-- vite.config.ts           # Porta padrao 3070 (configuravel via env), aliases e injecao de variaveis Vite (ex.: VITE_BACKEND_URL)
```

Principais conceitos:

- **Estado unico** controlado em `App.tsx` com hooks (simbolo, timeframe, indicadores, logs, normalizacao).
- **Dados sinteticos** criados via `generateData` para simular importacoes de M1 -> timeframe alvo.
- **Backtest local** calculado inteiramente no front-end (`runBacktest`) para permitir iteracoes instantaneas.
- **UI Tailwind** entregue via CDN dentro do `index.html`, sem build de CSS adicional.

---

## Pre-requisitos

- **Node.js 18 LTS ou superior** (recomendado 18.18+ para Vite 6).
- **npm 9+** (ou outro gerenciador compativel).
- Configure `VITE_BACKEND_URL` para apontar para o backend local (padrão `http://localhost:4800`).

---

## Como Rodar Localmente

1. **Instale as dependencias**
   ```bash
   npm install
   ```
2. **Configure variaveis de ambiente**
   - Crie `.env.local` e defina `VITE_BACKEND_URL=http://localhost:4800`.
   - O Vite injetara a URL do backend em `services/api/client.ts`.
3. **Suba o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   - O Vite tentara abrir em `http://localhost:3070`. Se a porta estiver ocupada ou se `VITE_DEV_PORT` estiver definido, ele ajusta automaticamente para uma porta livre.

### Backend local (Fase 1)

1. **Instale as dependencias do servidor**
   ```bash
   cd server
   npm install
   ```
2. **Rode em modo desenvolvimento**
   ```bash
   npm run backend:dev
   ```
   ou a partir da raiz:
   ```bash
   npm run backend:dev
   ```
   - O servidor Express tenta `http://localhost:4800`. Se `SERVER_PORT` for definido ele respeita o valor; caso contrario, procura a proxima porta livre (4801, 4802, ...).

### Scripts úteis / automação (Fase 6)

| Script | Comando | Uso |
| --- | --- | --- |
| `app` | `npm run app` | Inicia backend (nodemon) e frontend (Vite) em paralelo. |
| `backend:dev` | `npm run backend:dev` | Apenas backend com reload. |
| `backend:start` | `npm run backend:start` | Backend em modo produção (sem nodemon). |
| `test:backend` | `npm run test:backend` | Executa os testes do backend (`server/test/timeframeBuilder.test.js`). |

### API disponível (Fases 2-4 - mock)
- `POST /api/import/dukascopy` – recebe `{ asset, timeframe, startDate?, endDate? }` e retorna um job simulado com logs.
- `POST /api/import/custom` – recebe `{ filename }` e cria job de ingestão manual.
- `GET /api/import/jobs/:id` – consulta status/logs de um job.
- `GET /api/normalization` – retorna as regras atuais (timezone, tick size, basis).
- `POST /api/normalization` – atualiza regras de normalização (persistência em memória nesta fase).
- `GET /api/data` – lista datasets presentes no cache local.
- `GET /api/data/:asset/:timeframe` – retorna candles mockados para consumo pelo frontend.

### Scripts Disponiveis

| Script | Comando | Uso |
| --- | --- | --- |
| `dev` | `npm run dev` | Ambiente interativo com HMR. |
| `build` | `npm run build` | Gera os artefatos de producao (pasta `dist/`). |
| `preview` | `npm run preview` | Servidor estatico para validar o build localmente. |

---

## Fluxo de Trabalho no App

1. **Selecionar ativo, timeframe e timezone**  
   - Combo boxes no topo controlam o dataset, e o botão no canto inferior direito permite alternar o timezone do eixo/tooltip em tempo real.
2. **Sincronizar ou importar dados**  
   - Botoes em *Data Sources* simulam leitura do repositorio `trader-matthews-lean-lab` e atualizam os candles visiveis.
3. **Configurar normalizacao**  
   - Ajuste timezone, basis e tick size em *Data Normalization*; os valores alimentam o log e o preview de candles.
4. **Editar indicadores**  
   - Na aba *Chart Indicator* e possivel alterar o codigo Python (string) e alternar visibilidade/ativacao.
5. **Rodar estrategia e analisar resultados**  
   - Em *Strategy* clique em **Run Simulation**; a aba *Analysis* exibe metricas resumidas (`StatsCard`), equity curve e trade log detalhado.
6. **Consultar documentacao externa**  
   - A aba *API Docs* centraliza links de referencia, enquanto o item "Repository" abre o projeto original no GitHub.

---

## Pipeline de Dados e Backtesting

1. `utils/mockData.ts`  
   - Normaliza precos iniciais e volatilidade para simbolos futuros (CL1!, NG1!, GC1!, etc) e gera timestamps coerentes com o timeframe.
2. `App.tsx`  
   - Escuta alteracoes de simbolo/timeframe, chama `generateData` e mantem logs das operacoes (repo sync, Dukascopy, import custom).
3. `services/backtestEngine.ts`  
   - Executa cruzamento SMA (9 vs 21) sobre os candles carregados, calcula equity/drawdown e registra cada trade (incluindo markers para o grafico).
4. `components/LightweightChart.tsx`  
   - Renderiza candles + serie de indicador (EMA) e aplica markers de trades (WIN/LOSS) com lightweight-charts v5.
5. `components/StatsCard.tsx` e `recharts`  
   - Apresentam metricas resumidas, equity curve e tabela de trades para facilitar validacao visual.

> **Substituindo dados reais**:  
> - Troque `generateData` por um fetch/loader que leia os CSVs da pasta `trader-matthews-lean-lab/data/...`.  
> - Reescreva `runBacktest` para chamar o Lean/QuantConnect ou para executar sua estrategia Python/JS real.  
> - Ajuste o schema em `types.ts` caso adicione novos atributos (ex.: custos, slippage, etiquetas de regime).

---

## Extensoes e Proximos Passos

1. **Integrar loaders reais** - conectar o fluxo de importacao (hook `useRepoSync`/`handleDukascopyFetch`) as rotinas de ETL ja existentes e validar com dados historicos.  
2. **Adicionar multiplos indicadores** - expandir a lista `indicators` e renderizar multiplas series na LightweightChart.  
3. **Sincronizar com Lean** - usar `handleRunBacktest` como gatilho para uma API que empacota arquivos e dispara um job no Lean CLI.  
4. **Internacionalizacao** - mover strings hardcoded em `App.tsx` para um dicionario e suportar idiomas adicionais.  
5. **Testes automatizados** - adicionar testes de unidade (Vitest/React Testing Library) para garantir integridade do gerador de dados e do motor de backtest.

### Testes automatizados (backend)

```bash
npm run test:backend
```

- Executa `npm run test --prefix server`, que roda `node test/timeframeBuilder.test.js`.
- O script valida a agregacao de ticks -> M1/M5/H1, garantindo que a pipeline de importacao nao quebre quando o builder for alterado.

---

## Solucao de Problemas

- **Porta ja usada**: defina `VITE_DEV_PORT=XXXX` (frontend) ou `SERVER_PORT=XXXX` (backend). Se nao definir, ambos procuram portas livres automaticamente, evitando conflitos quando ha varias instancias rodando.  
- **Charts nao renderizam**: verifique se o container pai possui altura definida; o `LightweightChart` usa `clientHeight` para dimensionar.  
- **Sem dados na Analysis**: certifique-se de ter executado **Run Simulation** apos qualquer alteracao de simbolo/timeframe; o estado `backtestResult` e resetado sempre que novos candles sao carregados.

---

Documentacao adicional pode ser encontrada consultando os proprios modulos (`App.tsx`, `services/backtestEngine.ts`, `utils/mockData.ts`). Esses arquivos funcionam como referencia principal sobre o funcionamento interno do The Lab.

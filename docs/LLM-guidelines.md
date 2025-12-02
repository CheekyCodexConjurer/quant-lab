# LLM-friendly guidelines – quant-lab

Este arquivo complementa `AGENTS.md` e `architecture.md` com
recomendacoes praticas para manter o codigo amigavel para LLMs.

## Tamanho e fatiamento de arquivos

- Componentes React/TSX:
  - idealmente ate ~400–500 linhas;
  - quando crescerem demais, extrair:
    - subcomponentes de apresentacao (ex.: legends, toolbars, consoles);
    - hooks especificos de dominio (ex.: `useIndicatorActivation`).
- Hooks e servicos:
  - preferir ate ~300–400 linhas;
  - separar responsabilidade de estado vs. IO (API, filesystem).

## Organizacao por dominio

- Chart:
  - camada de engine (`components/LightweightChart.tsx` / futuros `ChartEngine`);
  - camada de UI (toolbars, legends, menus);
  - adaptadores de dados (`indicatorPlotAdapter.ts`).
- Strategy lab:
  - arvore de arquivos (`StrategyEditor` / futuros subcomponentes);
  - editor de codigo (`PythonEditor`);
  - console (`StrategyConsole`).
- Backend:
  - servicos focados por dominio (`dukascopyService`, `leanService`, `indicatorExecutionService`);
  - helpers puros em subpastas (ex.: `dukascopy/*`, `indicatorOverlay*`).

## Comentarios

- Focar em **por que** algo existe, nao em repetir o obvio.
- Usar comentarios curtos, proximos da logica de dominio,
  evitando textos longos que poluam o contexto.

Estas diretrizes servem como referencia para humanos e LLMs ao
evoluir o projeto, evitando novos "god files" e mantendo a
navegacao do codigo simples mesmo com muitos indicadores e fluxos.


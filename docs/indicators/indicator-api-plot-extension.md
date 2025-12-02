# Indicator API – Extensao Plot API v1

Este documento faz a ponte entre `docs/indicators/indicator-api.md` e
`docs/indicators/plot-api-v1.md`.

- O documento principal da engine de indicadores continua sendo
  `indicator-api.md`.
- A Plot API v1 define um campo opcional `plots` no resultado de
  `calculate(...)`, permitindo que o indicador descreva de forma declarativa
  tudo que deve ser desenhado no chart (linhas, niveis, marcadores, labels,
  zonas, etc.).

## Como os documentos se encaixam

- `indicator-api.md`:
  - descreve o fluxo completo frontend → backend → Python → overlay;
  - documenta a API legada baseada em `series`, `markers` e `levels`.
- `plot-api-v1.md`:
  - define o schema detalhado de `plots` (tipos, estilo, dados);
  - explica como escrever indicadores declarativos (similar a `plot()` /
    `plotshape()` / `hline()` do PineScript).
- Este arquivo:
  - deixa claro que, quando `plots` estiver presente, o backend/ frontend do
    The Lab **preferem** esse formato para renderizacao;
  - serve como referencia rapida para humanos e LLMs ao navegar pela
    arquitetura de indicadores.

## Pipeline resumido (Plot API v1)

1. O indicador Python retorna um dict contendo opcionalmente `plots`.
2. O backend (`indicatorExecutionService`) normaliza o resultado em um
   `IndicatorOverlay`:
   - converte dados puros em estruturas alinhadas com os candles;
   - garante que `overlay.plots` seja coerente com o schema da Plot API v1.
3. O frontend recebe `IndicatorOverlay` via `useIndicatorExecution`:
   - `indicatorPlotAdapter.ts` transforma `overlay.plots` em primitivas
     especificas do chart (linhas e marcadores);
   - `TradingChart`/camada de chart desenha tudo sem precisar conhecer a
     logica interna de cada indicador.

Na pratica, novos indicadores estruturados devem preferir `plots` como
formato de saida principal, mantendo `series`/`markers`/`levels` apenas
quando houver necessidade de compatibilidade.

## Diretriz de UI: chart agnóstico a indicadores

O wrapper de chart (LightweightChart/TradingChart) deve permanecer **agnóstico**
à lógica de cada indicador. Em particular:

- O frontend não deve ter branches específicos para o indicador de Market Structure
  (nada de `if kind === 'protected-high'` hardcoded no chart).
- Melhorias na UI do gráfico (novos tipos de plot, mais camadas, filtros de
  visibilidade, controle de densidade, etc.) devem ser sempre implementadas
  de forma genérica, baseadas em campos como `type`, `kind`, `id` e `style`.
- Indicadores em Python são livres para introduzir novos `kind` lógicos
  (por exemplo, `msc-bullish`, `msc-bearish`, `msc-leg`), desde que sigam o
  contrato da Plot API v1 ou da API legada; a UI apenas interpreta esses
  `kind` como tags, sem acoplamento a um indicador específico.

Em caso de limitações do gráfico (por exemplo, falta de um tipo de plot ou
estilo necessário para um novo indicador), a recomendação é:

- documentar a necessidade aqui (como “suportar múltiplas camadas de markers
  por barra”, ou “permitir estilos distintos por `kind` de nível”);
- evoluir a camada de chart de forma reutilizável para todos os indicadores,
  sem acoplar comportamentos exclusivos ao indicador de Market Structure.

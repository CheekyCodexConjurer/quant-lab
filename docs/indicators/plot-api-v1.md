# Plot API v1 – Indicadores declarativos no The Lab

Este documento complementa `docs/indicators/indicator-api.md` e define um
formato **declarativo** para que indicadores em Python descrevam tudo que
precisa ser desenhado no chart (linhas, nÃ­veis, marcadores, labels, zonas),
de forma similar aos comandos `plot()`/`plotshape()`/`hline()` do PineScript.

Ele nÃ£o altera a API legada (`series`, `markers`, `levels`); apenas adiciona
um campo opcional `plots` ao retorno estruturado de `calculate`.

---

## 1. VisÃ£o geral

- Indicadores podem continuar retornando:
  - um array simples (`np.ndarray` ou `list[float]`); ou
  - um objeto com `series` / `markers` / `levels`.
- **Opcionalmente**, o indicador tambÃ©m pode retornar:

  ```py
  return {
      "series": {...},   # opcional (legado)
      "markers": [...],  # opcional (legado)
      "levels": [...],   # opcional (legado)
      "plots": [...],    # Plot API v1
  }
  ```

- Quando `plots` estiver presente, ele passa a ser o formato **preferencial**
  para renderizaÃ§Ã£o; o frontend trata `series`/`markers`/`levels` como
  compatibilidade e/ou insumo para depuraÃ§Ã£o.

---

## 2. Estrutura bÃ¡sica de `plots`

Cada entrada em `plots` descreve um elemento grÃ¡fico de alto nÃ­vel:

```py
{
  "id": "main",
  "type": "line",              # ver tabela abaixo
  "kind": "ema-100",           # tag lÃ³gica, livre
  "paneId": "price",           # painel onde desenhar
  "scaleId": "price",          # opcional: agrupa sÃ©ries na mesma escala
  "style": {                   # opÃ§Ãµes visuais leves
    "color": "#3b82f6",
    "width": 2,
    "dashed": False,
    "opacity": 1.0,
    "shape": "circle",         # sÃ³ para markers/labels
    "zIndex": 10
  },
  "data": [...],               # formato depende de `type`
  "meta": {...}                # opcional, para debug/extensÃµes
}
```

### 2.1. Tipos suportados

- `line`      – sÃ©rie de pontos `{time, value}` conectados em linha.
- `area`      – igual a `line`, mas preenchida atÃ© o eixo.
- `histogram` – barras verticais discretas `{time, value}`.
- `hline`     – linha horizontal a um preÃ§o, normalmente entre dois tempos.
- `zone`      – faixa de preÃ§o/tempo (ex.: FVG, zona de oferta/demanda).
- `marker`    – marcador discreto (seta, ponto, etc.) acima/abaixo da barra.
- `label`     – texto anotado em um ponto do grÃ¡fico.

A UI trata `type` como primitiva grÃ¡fica genÃ©rica; o significado de
`kind` (`"protected-high"`, `"mss-bearish"`, `"fvg"`, etc.) fica no cÃ³digo
do indicador.

### 2.2. Campos comuns

- `id: str`  
  Identificador estÃ¡vel do plot **dentro do indicador** (ex.: `"main"`,
  `"signals"`, `"protected-highs"`). Ãštil para debug e futuros controles
  de visibilidade.

- `kind: str`  
  Tag lÃ³gica (**opaca** para a engine). Use nomes consistentes, por exemplo:
  - `"ema-100"`, `"ema-200"`;
  - `"protected-high"`, `"protected-low"`;
  - `"mss-bearish"`, `"msc-bullish"`;
  - `"fvg"`, `"order-block"`, etc.

- `paneId: str`  
  Painel onde o plot deve ser desenhado:
  - `"price"` → painel principal (padrÃ£o).
  - outros valores (ex.: `"rsi"`, `"volume"`) podem criar subpanels
    em versÃµes futuras.

- `scaleId: str` (opcional)  
  Identificador de escala de preÃ§o. SÃ©ries com o mesmo `scaleId` e `paneId`
  compartilham eixo.

- `style: dict` (opcional)  
  Pequeno dicionÃ¡rio de estilo:
  - `color: str`  â€“ cor em hex (ex.: `"#0f172a"`).
  - `width: int`  â€“ espessura da linha (1, 2, 3...).
  - `dashed: bool` â€“ se `True`, linha tracejada.
  - `opacity: float` â€“ 0.0 a 1.0.
  - `shape: str`  â€“ apenas para `marker`/`label`
    (`"circle"`, `"arrowUp"`, `"arrowDown"`, `"square"`, `"diamond"`).
  - `zIndex: int` â€“ prioridade de desenho (maior = por cima).

---

## 3. Formato de `data` por tipo

### 3.1. `line`, `area`, `histogram`

```py
{
  "id": "main",
  "type": "line",
  "paneId": "price",
  "data": [
    {"time": "2024-01-01T00:00:00Z", "value": 71.3},
    {"time": "2024-01-01T00:01:00Z", "value": 71.2},
    # ...
  ],
}
```

- `time`: mesmo formato usado em `Candle.time`.
- `value`: nÃºmero finito. Pontos com `NaN`/`inf` serÃ£o ignorados.

### 3.2. `marker`, `label`

```py
{
  "id": "mss",
  "type": "marker",
  "kind": "mss-bearish",
  "paneId": "price",
  "style": {"color": "#ef4444", "shape": "arrowDown"},
  "data": [
    {"time": "2024-01-01T10:15:00Z", "value": 70.5, "text": "MSS"},
  ],
}
```

- `value` pode ser omitido; se ausente, a engine pode usar o `close` da barra
  correspondente como ponto base.
- `text` Ã© opcional; usado apenas em `label` ou para debugar.

### 3.3. `hline`, `zone`

```py
{
  "id": "protected-highs",
  "type": "hline",
  "kind": "protected-high",
  "paneId": "price",
  "style": {"color": "#000000", "width": 1, "dashed": True},
  "data": [
    {
      "timeStart": "2024-01-01T09:00:00Z",
      "timeEnd":   "2024-01-01T12:00:00Z",
      "price": 75.0,
    },
  ],
}
```

- `timeStart` / `timeEnd` delimitam horizontalmente o nÃ­vel.
- `price` define o preÃ§o da linha ou zona.
- Para `zone`, futuramente poderemos estender `data` com `priceLow` /
  `priceHigh`; por enquanto, pode ser usado como uma linha simples.

---

## 4. Compatibilidade com `series` / `markers` / `levels`

A engine continuarÃ¡ aceitando o formato estruturado legado. Internamente, o
backend converte esses campos em `plots` antes de enviÃ¡-los para o chart:

- `series.main`         â†’ plot `type: "line"`, `id: "main"`.
- outras chaves de `series` â†’ plots `type: "line"` adicionais.
- `levels`              â†’ plot `type: "hline"` por nÃ­vel.
- `markers`             â†’ plot `type: "marker"`.

Indicadores novos sÃ£o encorajados a usar `plots` diretamente, mas nÃ£o Ã©
obrigatÃ³rio.

---

## 5. VersÃ£o da Plot API

- VersÃ£o atual: **Plot API v1**.
- Indicadores podem informar explicitamente a versÃ£o:

```py
return {
    "apiVersion": 1,
    "plotsVersion": 1,
    "plots": [...],
}
```

Futuros aprimoramentos (v2, v3, ...) serÃ£o adicionados de forma compatÃ­vel
sempre que possÃ­vel, com o devido registro em `docs/indicators/plot-api-v1.md`
e `architecture.md`.


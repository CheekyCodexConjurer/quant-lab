# Indicator Execution Engine – API completa

> Versão da API: **v1**  
> Arquivo canônico: `docs/indicators/indicator-api.md`

Este documento descreve como escrever indicadores em Python para o The Lab usando a **Indicator Execution Engine**.  
O objetivo é permitir que você escreva desde indicadores simples (SMA/EMA) até estruturas complexas (Market Structure, níveis protegidos, etc.) sem precisar olhar o código do app.

---

## 1. Visão geral

### 1.1. Fluxo de alto nível

1. O frontend carrega uma janela de candles (`Candle[]`).
2. Para cada indicador ativo, chama o backend em:
   - `POST /api/indicator-exec/:id/run`
3. O backend:
   - resolve o arquivo Python (`indicators/... .py`);
   - prepara `inputs` com arrays NumPy de OHLCV e um dicion�rio opcional `settings` com parametros enviados pelo frontend;
   - executa `calculate(inputs)` ou `calculate(inputs, settings)` via `server/indicator_runner/runner.py` em um processo Python separado (a assinatura depende do que o indicador expuser);
   - normaliza o resultado e retorna JSON.
4. O frontend converte a resposta em:
   - linhas (`series`) para o chart,
   - marcadores (`markers`) acima/abaixo das barras,
   - níveis horizontais (`levels`) desenhados como linhas tracejadas.

Tudo é feito **localmente**; nenhum código de indicador é enviado para servidores externos.

### 1.2. Layout de workspace (onde colocar os arquivos)

Para que o Strategy Lab e o Indicator Engine encontrem seus indicadores automaticamente, a organiza��o dos arquivos Python segue estas regras:

- **Workspace de indicadores (backend)**  
  - Todos os arquivos de indicador vivem em `server/indicators/`.  
  - Arquivos diretamente em `server/indicators/*.py` s�o considerados **indicadores principais** (mains) e aparecem no painel `indicators/` do Strategy Lab (com toggle `Active`).  
  - Pastas dentro de `server/indicators/` (por exemplo `server/indicators/my_indicator/`) s�o livres para conter m�dulos de suporte (`core.py`, `swings.py`, etc.). Esses arquivos aparecem na �rvore do Strategy Lab como parte do workspace, mas **n�o** s�o indicadores independentes.

- **Entrada principal do indicador**  
  - Cada indicador principal deve expor `calculate(inputs)` diretamente, ou importar de um m�dulo da pasta:
    ```py
    # server/indicators/my-indicator.py
    from my_indicator.core import calculate
    ```
  - O Strategy Lab trata este arquivo como o "descriptor" do indicador. Tudo que estiver na pasta `server/indicators/my_indicator/` � considerado infra interna que o usu�rio/agente pode editar ao vivo.

- **Visao para agentes de c�digo (LLMs)**  
  - Sempre que criar um novo indicador via agente, garantir que:
    - o `main` esteja em `server/indicators/<nome>.py` com `def calculate(inputs)` (ou um import como acima);  
    - qualquer "agente de c�digo" ou subm�dulo fique em `server/indicators/<nome>/**`.  
  - Assim a �rvore do Strategy Lab reflete automaticamente pastas e arquivos criados, e o app sabe quais s�o indicadores ativ�veis.

### 1.3. Entry point

Todo indicador precisa expor uma função:

```py
def calculate(inputs):
    """
    Main entry point for indicator calculation.
    :param inputs: dict de np.ndarray com dados de mercado
    :return: np.ndarray ou dict estruturado (ver seção 5)
    """
    ...
```

Não há necessidade de classes ou estado global; a engine chama `calculate` a cada atualização de janela.

---

## 2. Ambiente e dependências

### 2.1. Versão de Python

- A engine usa o interpretador configurado em:
  - `THELAB_PYTHON_PATH` (variável de ambiente), ou
  - o `python` padrão do sistema, se a variável não estiver definida.
- Recomendado: criar um venv dedicado para o The Lab e apontar `THELAB_PYTHON_PATH` para ele.

### 2.2. Bibliotecas disponíveis

As seguintes bibliotecas são suportadas de forma padrão (supondo que estejam instaladas no ambiente Python escolhido):

- `numpy as np`
- `pandas as pd`
- `talib`
- `math`

Você **pode** importar outras libs que existam no seu ambiente, mas:

- Elas não são garantidas pelo app; a responsabilidade é sua.
- Se a importação falhar, o runner retornará um `ImportError`.

### 2.3. Isolamento e segurança

- Cada execução roda em um **processo Python separado**.
- Há um timeout padrão (v1: 5 segundos). Indicadores muito pesados podem ser abortados.
- O runner não aplica sandbox rígido de rede/FS, mas a recomendação é:
  - não fazer chamadas HTTP dentro de `calculate`;
  - não gravar arquivos em disco a partir do indicador.
  - manter o código determinístico e puro, focado em processar OHLCV.

---

## 3. Estrutura de `inputs`

### 3.1. Formato

O parâmetro `inputs` é um dicionário Python mapeando `str` → `np.ndarray`:

```py
{
    "open":  np.ndarray,
    "high":  np.ndarray,
    "low":   np.ndarray,
    "close": np.ndarray,
    "volume": np.ndarray,  # opcional
}
```

Características:

- Todos os arrays têm tamanho **idêntico**.
- A ordem é sempre cronológica:
  - índice `0` → candle mais antigo da janela.
  - índice `len(close) - 1` → candle mais recente.
- `volume` pode ser preenchido com zeros se os dados não tiverem volume.

### 3.2. Garantias que você pode assumir

- `inputs` sempre terá pelo menos as chaves: `open`, `high`, `low`, `close`.
- Se algum campo não estiver disponível, será um array vazio (`np.array([])`).
- O engine não altera seus arrays: você pode ler à vontade; se quiser modificar, crie cópias.

---

## 4. Formato de saída – visão geral

O `calculate(inputs)` pode retornar dois formatos:

1. **Formato simples (v1)** – um único array numérico:

   ```py
   return np.ndarray  # ou list[float]
   ```

   - Interpretado como `series.main` (linha principal do indicador).

2. **Formato estruturado (overlay avançado)** – objeto `dict`:

   ```py
   return {
       "series": {
           "main": np.ndarray,
           "signal": np.ndarray,
           "baseline": np.ndarray,
           # ...
       },
       "markers": [
           {"index": 10, "kind": "buy", "value": 72.15},
           {"index": 25, "kind": "sell"},
       ],
       "levels": [
           {"from": 30, "to": 80, "price": 75.0, "kind": "protected-high"},
       ],
   }
   ```

   - Permite múltiplas linhas por indicador, marcadores e níveis horizontais.

O runner converte `np.ndarray`/tipos NumPy para listas nativas antes de enviar a resposta para o frontend.

---

## 5. Detalhamento do formato estruturado

### 5.1. `series`

Tipo:

```py
Dict[str, np.ndarray]
```

Convenções:

- `main`: série principal (equivalente ao retorno simples v1).
- chaves extras (`signal`, `baseline`, `band_upper`, etc.) representam séries adicionais, que serão desenhadas como linhas extras do mesmo indicador.

Regras:

- Arrays podem ser menores do que `len(inputs['close'])` – o engine alinha o **final** da série com o final da janela de candles.
- Valores não numéricos (`NaN`, `inf`) são ignorados na renderização.

### 5.2. `markers`

Tipo:

```py
List[Dict[str, Any]]
```

Campos suportados:

- `index: int` – índice do candle (mesma base de `inputs`).
- `kind: str` – rótulo lógico, como:
  - `"buy"`, `"sell"`, `"long"`, `"short"`, `"bull"`, `"bear"`;
  - `"swing-high"`, `"swing-low"`, `"bos"`, `"mss"`, `"msc"`, etc.
- `value: float | None` – opcional; hoje é ignorado na renderização, mas útil para debug ou futuras features.

Mapeamento padrão no frontend (pode mudar em versões futuras, mas a ideia geral é):

- `kind` contendo `buy|long|bull`:
  - marcador `arrowUp`, abaixo da barra, cor verde.
- `kind` contendo `sell|short|bear`:
  - marcador `arrowDown`, acima da barra, cor vermelha.
- outros `kind`:
  - marcador `circle`, acima da barra, cor neutra.

### 5.3. `levels`

Tipo:

```py
List[Dict[str, Any]]
```

Campos:

- `from: int` – índice inicial da faixa do nível.
- `to: int` – índice final.
- `price: float` – preço do nível.
- `kind: str` – tipo do nível (`"protected-high"`, `"protected-low"`, `"hsh"`, `"lsl"`, `"hsh-sweep"`, `"lsl-sweep"`, `"msc-leg"`, `"zone"`, etc.).

Comportamento:

- Cada `level` é desenhado como uma **linha horizontal tracejada** entre os candles `from` e `to` na altura `price`.
- Níveis do mesmo indicador usam a mesma cor base da série principal para manter a coerência visual.

---

## 6. Indexação, tempo e alinhamento

O engine trabalha em **índices de array**; a UI trabalha com `time`.

- A janela de candles no frontend tem `N` elementos.
- O engine monta `inputs` com esses `N` valores.
- Quando você usa `index` em `markers` ou `levels`, você está se referindo ao índice dentro desta janela:
  - `0` → `inputs['close'][0]` (candle mais antigo).
  - `N - 1` → candle mais recente.

Se você retornar uma série (`np.ndarray`) de tamanho `M`:

- O engine assume que ela corresponde aos **últimos `M` candles** da janela.
- Exemplo:
  - `len(close) = 100`
  - `len(series.main) = 20`
  - O ponto `series.main[0]` será alinhado ao candle de índice `80`.

---

## 7. Ciclo de vida de execução

### 7.1. Quando a engine roda

O indicador é recalculado quando:

- A janela de candles é atualizada (ex.: usuário muda timeframe, faz scroll para trás).
- O indicador é marcado como ativo ou desativado.
- O código Python do indicador ativo é salvo.

O fluxo é:

1. Frontend chama `apiClient.runIndicator(id, candles)`.
2. Backend chama `runIndicatorById(id, candles)` (Node).
3. Node spawna `python runner.py <scriptPath>` e envia o JSON via `stdin`.
4. `runner.py` chama `calculate(inputs)` e devolve JSON.
5. Frontend atualiza as linhas/overlays correspondentes.

### 7.2. Timeout e erros de execução

- Cada chamada tem um timeout configurado (v1: 5 segundos).
- Se o código travar (loop infinito, operação muito pesada), a engine mata o processo e retorna:

```json
{
  "error": {
    "type": "Timeout",
    "message": "indicator execution exceeded 5000ms"
  }
}
```

---

## 8. Erros e debug

### 8.1. Tipos de erro mais comuns

O runner padroniza erros em um campo `error` com subcampos:

- `type`: categoria (ex.: `ImportError`, `ExecutionError`).
- `message`: texto curto explicando o problema.
- `phase`: estágio em que ocorreu (`bootstrap`, `inputs`, `import`, `execute`, `serialize`).
- `traceback`: (opcional) stacktrace resumido.

Principais tipos:

- `InputError` – payload inválido (raro no uso normal).
- `ImportError` – erro em `import` do seu script.
- `MissingEntryPoint` – módulo não define `calculate`.
- `ExecutionError` – exceção dentro de `calculate`.
- `ResultError` / `SerializationError` – retorno não convertível para JSON.
- `Timeout` – execução demorou demais.

### 8.2. Como ver os erros

No frontend:

- A UI de edição (Strategy/Indicator view) deve exibir a mensagem de erro retornada pelo backend.
- Você também verá logs no console do navegador:
  - `[useIndicators] runIndicator failed <id> Error: ...`

Boas práticas de debug:

- Comece com um indicador trivial que apenas retorna `inputs['close']` para testar se o ambiente está OK.
- Adicione lógica aos poucos, testando sempre.
- Evite `print` excessivo – lembre que o runner usa stdout para o JSON; prints demais podem poluir a saída e causar erros de parse.

---

## 9. Exemplos

### 9.1. EMA simples (formato v1)

```py
import numpy as np

def calculate(inputs):
    closes = np.array(inputs['close'], dtype=float)
    period = 20
    if closes.size < period:
        return np.array([])

    k = 2 / (period + 1)
    ema_vals = np.zeros_like(closes)
    ema_vals[0] = closes[0]

    for i in range(1, closes.size):
        ema_vals[i] = closes[i] * k + ema_vals[i - 1] * (1 - k)

    # Opcional: descartar período inicial para série "mais limpa"
    return ema_vals[period - 1 :]
```

### 9.2. EMA + linha de sinal (formato estruturado)

```py
import numpy as np

def _ema(data, period):
    k = 2 / (period + 1)
    ema_vals = np.zeros_like(data)
    ema_vals[0] = data[0]
    for i in range(1, data.size):
        ema_vals[i] = data[i] * k + ema_vals[i - 1] * (1 - k)
    return ema_vals

def calculate(inputs):
    closes = np.array(inputs['close'], dtype=float)
    if closes.size < 10:
        return {
            "series": {"main": np.array([]), "signal": np.array([])},
            "markers": [],
            "levels": [],
        }

    fast = _ema(closes, 9)
    slow = _ema(closes, 21)

    return {
        "series": {
            "main": slow,
            "signal": fast,
        },
        "markers": [],
        "levels": [],
    }
```

### 9.3. Níveis horizontais simples (suporte/resistência)

```py
import numpy as np

def calculate(inputs):
    highs = np.array(inputs['high'], dtype=float)
    lows = np.array(inputs['low'], dtype=float)
    n = highs.size
    if n < 10:
        return {"series": {}, "markers": [], "levels": []}

    levels = []

    # exemplo simples: nível na máxima dos últimos 20 candles
    window = 20
    if n >= window:
        window_high = highs[-window:].max()
        from_idx = n - window
        to_idx = n - 1
        levels.append({
            "from": int(from_idx),
            "to": int(to_idx),
            "price": float(window_high),
            "kind": "resistance-window",
        })

    return {
        "series": {},
        "markers": [],
        "levels": levels,
    }
```

### 9.4. Marcadores de compra/venda

```py
import numpy as np

def calculate(inputs):
    closes = np.array(inputs['close'], dtype=float)
    if closes.size < 3:
        return closes

    markers = []

    # exemplo bobo: marca "buy" quando close cresce 3 vezes seguidas
    for i in range(2, closes.size):
        if closes[i] > closes[i-1] > closes[i-2]:
            markers.append({
                "index": int(i),
                "kind": "buy",
                "value": float(closes[i]),
            })

    return {
        "series": {"main": closes},
        "markers": markers,
        "levels": [],
    }
```

---

## 10. Boas práticas

- **Performance**
  - Prefira operações vetorizadas (`numpy`) a loops Python sempre que possível.
  - Evite recomputar coisas caras a cada candle se puder reaproveitar resultados (em versões futuras a engine poderá suportar estado incremental).
- **Legibilidade**
  - Separe a lógica em funções auxiliares (`detect_swings`, `build_levels`, etc.).
  - Use nomes de `kind` consistentes (`protected-high`, `bos-bullish`, `mss-bearish`), isso ajuda a manter a UI e futuros scripts coerentes.
- **Confiabilidade**
  - Trate casos de poucos candles (`if len(closes) < window: ...`).
  - Evite exceptions não tratadas – um `try/except` bem posicionado pode transformar um erro em um retorno vazio e uma mensagem amigável.

---

## 11. Roadmap da API (v1 → futuro)

- **v1 (atual)**
  - `inputs` com OHLCV.
  - retorno simples (array) ou estruturado (`series`, `markers`, `levels`).
  - execução stateless por janela.

- **Possíveis extensões**
  - `prev_state` / `next_state` para execução incremental.
  - maior controle de estilos (cores, espessuras, labels) direto pelo script.
  - integração nativa com estratégias (indicadores gerando sinais que podem alimentar backtests).

Use este documento como referência principal ao construir os seus indicadores no The Lab.  
Se algo nessa API mudar, esta página deve ser atualizada em conjunto com `architecture.md` e `ROADMAP.md`.

---

## A. Configura�ao do ambiente do Indicator Runner

Para garantir que os indicadores em Python funcionem de forma consistente, recomenda-se configurar um ambiente dedicado para o Indicator Execution Engine:

- Crie um ambiente virtual para o The Lab.
- Instale as depend�ncias listadas em `server/indicator_runner/requirements.txt`.
- Aponte a vari�vel `THELAB_PYTHON_PATH` para o interpretador desse ambiente.

Exemplo (Windows / PowerShell):

```pwsh
cd D:\quant-lab
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r server/indicator_runner/requirements.txt

# Opcional: definir o Python usado pelo app
$env:THELAB_PYTHON_PATH = "D:\quant-lab\.venv\Scripts\python.exe"
```

> Nota: bibliotecas como `numpy` s�o obrigat�rias para a engine; j� `talib` � opcional. Indicadores como `ema_100.py` tentam usar `talib` quando dispon�vel e fazem fallback autom�tico para uma implementa�ao baseada em NumPy quando a biblioteca nao estiver instalada, evitando erros de import.

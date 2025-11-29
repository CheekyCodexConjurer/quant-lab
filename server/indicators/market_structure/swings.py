def detect_swings(high, low):
    """
    Detect swing highs/lows using a 3-candle pattern.
    Permite plateaus de maximas/minimas compartilhadas.
    Retorna lista de dicts: { index, kind, price }.
    """
    swings = []
    n = len(high)
    if n < 3:
        return swings

    for i in range(1, n - 1):
        # Swing high: maxima local, com pelo menos um vizinho mais baixo.
        if high[i] >= high[i - 1] and high[i] >= high[i + 1] and (high[i] > high[i - 1] or high[i] > high[i + 1]):
            swings.append({"index": i, "kind": "swing-high", "price": float(high[i])})
        # Swing low: minima local, com pelo menos um vizinho mais alto.
        if low[i] <= low[i - 1] and low[i] <= low[i + 1] and (low[i] < low[i - 1] or low[i] < low[i + 1]):
            swings.append({"index": i, "kind": "swing-low", "price": float(low[i])})

    swings.sort(key=lambda s: s["index"])
    return swings


def extract_external_structure(swings):
    """
    Reduz a lista de swings para uma estrutura externa:
    - Mantem alternancia high/low.
    - Para sequencias do mesmo tipo, conserva apenas o extremo (mais alto/mais baixo).
    """
    if not swings:
        return []

    external = [swings[0]]
    for swing in swings[1:]:
        last = external[-1]
        if swing["kind"] == last["kind"]:
            if swing["kind"] == "swing-high":
                if swing["price"] >= last["price"]:
                    external[-1] = swing
            else:
                if swing["price"] <= last["price"]:
                    external[-1] = swing
        else:
            external.append(swing)

    return external


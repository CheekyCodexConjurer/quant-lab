import numpy as np


def _is_valid_high_break(open_price, close_price, high_price, level):
    if high_price < level:
        return False
    cmax = max(open_price, close_price)
    if cmax > level:
        return True
    if cmax == level and high_price > level:
        return True
    return False


def _is_valid_low_break(open_price, close_price, low_price, level):
    if low_price > level:
        return False
    cmin = min(open_price, close_price)
    if cmin < level:
        return True
    if cmin == level and low_price < level:
        return True
    return False


def _detect_swings(high, low):
    """
    Detect swing highs/lows using a 3-candle pattern.
    This version is a bit more permissive para lidar com maximas/minimas compartilhadas.
    Returns a list of dicts: { index, kind, price }.
    """
    swings = []
    n = len(high)
    if n < 3:
        return swings

    for i in range(1, n - 1):
        # Swing high: maxima local, permitindo plateaus desde que haja pelo menos um vizinho mais baixo.
        if high[i] >= high[i - 1] and high[i] >= high[i + 1] and (high[i] > high[i - 1] or high[i] > high[i + 1]):
            swings.append({"index": i, "kind": "swing-high", "price": float(high[i])})
        # Swing low: minima local, permitindo plateaus desde que haja pelo menos um vizinho mais alto.
        if low[i] <= low[i - 1] and low[i] <= low[i + 1] and (low[i] < low[i - 1] or low[i] < low[i + 1]):
            swings.append({"index": i, "kind": "swing-low", "price": float(low[i])})

    # Order by index just in case
    swings.sort(key=lambda s: s["index"])
    return swings


def _extract_external_structure(swings):
    """
    Reduce the raw swing list to an "external" structure:
    - Mantem alternancia high/low.
    - Se dois swings consecutivos forem do mesmo tipo, fica apenas o mais extremo
      (mais alto para highs, mais baixo para lows).
    Isso aproxima o comportamento visual do script do TradingView, removendo
    swings internos muito proximos.
    """
    if not swings:
        return []

    external = [swings[0]]
    for swing in swings[1:]:
        last = external[-1]
        if swing["kind"] == last["kind"]:
            if swing["kind"] == "swing-high":
                # Mantem apenas o high mais alto da sequencia.
                if swing["price"] >= last["price"]:
                    external[-1] = swing
            else:
                # Mantem apenas o low mais baixo da sequencia.
                if swing["price"] <= last["price"]:
                    external[-1] = swing
        else:
            external.append(swing)

    return external


def _build_levels_and_markers(open_, high, low, close, swings):
    """
    Build basic markers:
    - Marca swings (swing-high / swing-low).
    - Marca BOS (break of swing) quando o preco quebra validamente um swing.

    Os niveis horizontais principais (HSH/LSL/Protected) sao derivados em
    `_enrich_with_structure` para evitar poluicao visual com muitos niveis
    secundarios.
    """
    n = len(close)
    levels = []  # mantido para compatibilidade, mas nao usamos niveis aqui.
    markers = []

    for swing in swings:
        idx = swing["index"]
        price = swing["price"]
        kind = swing["kind"]
        if idx >= n:
            continue

        if kind == "swing-high":
            bos_kind = "bos-bullish"
            for j in range(idx + 1, n):
                if _is_valid_high_break(open_[j], close[j], high[j], price):
                    markers.append(
                        {
                            "index": int(j),
                            "kind": bos_kind,
                            "value": float(high[j]),
                        }
                    )
                    break
        else:
            bos_kind = "bos-bearish"
            for j in range(idx + 1, n):
                if _is_valid_low_break(open_[j], close[j], low[j], price):
                    markers.append(
                        {
                            "index": int(j),
                            "kind": bos_kind,
                            "value": float(low[j]),
                        }
                    )
                    break

    # Basic swing markers (for visual anchors)
    for swing in swings:
        markers.append(
            {
                "index": int(swing["index"]),
                "kind": swing["kind"],
                "value": float(swing["price"]),
            }
        )

    return levels, markers


def _enrich_with_structure(swings, levels, markers, open_, high, low, close):
    """
    Derive a simplified external structure with:
    - HSH (higher swing highs) / LSL (lower swing lows)
    - Protected Low / Protected High

    A tendencia e o nivel protegido sao derivados a partir do BOS estrutural mais
    recente:
    - Bullish: BOS valido acima de um swing-high externo promove o swing-low
      estrutural anterior a Protected Low.
    - Bearish: BOS valido abaixo de um swing-low externo promove o swing-high
      estrutural anterior a Protected High.
    """
    if not swings:
        return levels, markers

    n = len(close)
    if n == 0:
        return levels, markers

    structural_levels = []
    structural_markers = []

    last_hsh = None
    last_lsl = None
    last_bull_break = None  # {"protected": swing_low, "break_index": j}
    last_bear_break = None  # {"protected": swing_high, "break_index": j}

    for idx, swing in enumerate(swings):
        swing_index = swing["index"]
        price = swing["price"]
        kind = swing["kind"]

        if kind == "swing-high":
            # HSH: novo high estrutural mais alto que os anteriores.
            if last_hsh is None or price > last_hsh["price"]:
                last_hsh = {"index": swing_index, "price": price}
                structural_markers.append({"index": swing_index, "kind": "hsh", "value": price})
                structural_levels.append(
                    {"from": swing_index, "to": swings[-1]["index"], "price": price, "kind": "hsh-level"}
                )

            # BOS acima deste swing-high define possivel contexto bullish.
            break_index = None
            for j in range(swing_index + 1, n):
                if _is_valid_high_break(open_[j], close[j], high[j], price):
                    break_index = j
                    break
            if break_index is not None:
                # Encontra o swing-low estrutural imediatamente anterior.
                prev_low = None
                for k in range(idx - 1, -1, -1):
                    if swings[k]["kind"] == "swing-low":
                        prev_low = swings[k]
                        break
                if prev_low is not None:
                    if last_bull_break is None or break_index >= last_bull_break["break_index"]:
                        last_bull_break = {"protected": prev_low, "break_index": break_index}

        elif kind == "swing-low":
            # LSL: novo low estrutural mais baixo que os anteriores.
            if last_lsl is None or price < last_lsl["price"]:
                last_lsl = {"index": swing_index, "price": price}
                structural_markers.append({"index": swing_index, "kind": "lsl", "value": price})
                structural_levels.append(
                    {"from": swing_index, "to": swings[-1]["index"], "price": price, "kind": "lsl-level"}
                )

            # BOS abaixo deste swing-low define possivel contexto bearish.
            break_index = None
            for j in range(swing_index + 1, n):
                if _is_valid_low_break(open_[j], close[j], low[j], price):
                    break_index = j
                    break
            if break_index is not None:
                # Encontra o swing-high estrutural imediatamente anterior.
                prev_high = None
                for k in range(idx - 1, -1, -1):
                    if swings[k]["kind"] == "swing-high":
                        prev_high = swings[k]
                        break
                if prev_high is not None:
                    if last_bear_break is None or break_index >= last_bear_break["break_index"]:
                        last_bear_break = {"protected": prev_high, "break_index": break_index}

    protected_low = None
    protected_high = None

    if last_bull_break and last_bear_break:
        # Contexto definido pelo BOS estrutural mais recente.
        if last_bull_break["break_index"] >= last_bear_break["break_index"]:
            protected_low = last_bull_break["protected"]
        else:
            protected_high = last_bear_break["protected"]
    elif last_bull_break:
        protected_low = last_bull_break["protected"]
    elif last_bear_break:
        protected_high = last_bear_break["protected"]

    # Mark Protected Low / High do contexto atual.
    if protected_low is not None:
        structural_markers.append(
            {
                "index": int(protected_low["index"]),
                "kind": "protected-low",
                "value": float(protected_low["price"]),
            }
        )
        structural_levels.append(
            {
                "from": int(protected_low["index"]),
                "to": swings[-1]["index"],
                "price": float(protected_low["price"]),
                "kind": "protected-low",
            }
        )

    if protected_high is not None:
        structural_markers.append(
            {
                "index": int(protected_high["index"]),
                "kind": "protected-high",
                "value": float(protected_high["price"]),
            }
        )
        structural_levels.append(
            {
                "from": int(protected_high["index"]),
                "to": swings[-1]["index"],
                "price": float(protected_high["price"]),
                "kind": "protected-high",
            }
        )

    # MSS (Market Structure Shift): quebra valida do nivel protegido mais recente,
    # promovendo um novo Protected High/Low para o contexto oposto.
    mss_marker = None
    new_protected_from_mss = None

    if protected_low is not None and last_bull_break is not None:
        # Contexto bullish -> MSS bearish ao perder o Protected Low.
        level = float(protected_low["price"])
        start = max(int(protected_low["index"]) + 1, last_bull_break["break_index"] + 1)
        for j in range(start, n):
            if _is_valid_low_break(open_[j], close[j], low[j], level):
                mss_marker = {"index": j, "kind": "mss-bearish", "value": float(low[j])}
                # Novo contexto bearish: Protected High = ultimo swing-high estrutural antes do MSS.
                prev_high = None
                for swing in reversed(swings):
                    if swing["index"] <= j and swing["kind"] == "swing-high":
                        prev_high = swing
                        break
                if prev_high is not None:
                    new_protected_from_mss = ("high", prev_high)
                break

    if protected_high is not None and last_bear_break is not None and mss_marker is None:
        # Contexto bearish -> MSS bullish ao romper o Protected High.
        level = float(protected_high["price"])
        start = max(int(protected_high["index"]) + 1, last_bear_break["break_index"] + 1)
        for j in range(start, n):
            if _is_valid_high_break(open_[j], close[j], high[j], level):
                mss_marker = {"index": j, "kind": "mss-bullish", "value": float(high[j])}
                # Novo contexto bullish: Protected Low = ultimo swing-low estrutural antes do MSS.
                prev_low = None
                for swing in reversed(swings):
                    if swing["index"] <= j and swing["kind"] == "swing-low":
                        prev_low = swing
                        break
                if prev_low is not None:
                    new_protected_from_mss = ("low", prev_low)
                break

    if mss_marker is not None:
        structural_markers.append(mss_marker)

    if new_protected_from_mss is not None:
        side, swing = new_protected_from_mss
        if side == "high":
            structural_markers.append(
                {
                    "index": int(swing["index"]),
                    "kind": "protected-high",
                    "value": float(swing["price"]),
                }
            )
            structural_levels.append(
                {
                    "from": int(swing["index"]),
                    "to": swings[-1]["index"],
                    "price": float(swing["price"]),
                    "kind": "protected-high",
                }
            )
        else:
            structural_markers.append(
                {
                    "index": int(swing["index"]),
                    "kind": "protected-low",
                    "value": float(swing["price"]),
                }
            )
            structural_levels.append(
                {
                    "from": int(swing["index"]),
                    "to": swings[-1]["index"],
                    "price": float(swing["price"]),
                    "kind": "protected-low",
                }
            )

    return levels + structural_levels, markers + structural_markers


def calculate(inputs):
    """
    Market Structure indicator (Phase 1).

    - Detects swing highs and swing lows using a 3-candle pattern.
    - Draws horizontal levels from each swing until the level is broken (BOS).
    - Emits markers for swings and BOS events.

    This is a first structured version focused on visualization. It does not yet implement
    the full Protected High/Low, MSS/MSC logic from the spec, but it prepares the overlay
    format for future refinement.
    """
    close = np.asarray(inputs.get("close", []), dtype=float)
    high = np.asarray(inputs.get("high", []), dtype=float)
    low = np.asarray(inputs.get("low", []), dtype=float)
    open_ = np.asarray(inputs.get("open", []), dtype=float)

    n = close.size
    if n < 3:
        return {
            "series": {"main": close},
            "markers": [],
            "levels": [],
        }

    # Swings "brutos"
    swings = _detect_swings(high, low)
    # Estrutura externa (filtra swings internos para reduzir ruido visual)
    structural_swings = _extract_external_structure(swings)
    levels, markers = _build_levels_and_markers(open_, high, low, close, structural_swings)
    levels, markers = _enrich_with_structure(structural_swings, levels, markers, open_, high, low, close)

    return {
        "series": {
            "main": close,
        },
        "markers": markers,
        "levels": levels,
    }

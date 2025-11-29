from .breaks import is_valid_high_break, is_valid_low_break

MAX_LEVELS_PER_KIND = 2
MAX_PROTECTED_LEVELS = 1


def build_levels_and_markers(open_, high, low, close, swings):
    """
    Marca swings (swing-high / swing-low) e BOS (break of swing).
    Retorna tambem um mapa de break por swing:
      { swing_index -> break_index ou None }.
    """
    n = len(close)
    levels = []
    markers = []
    break_map = {}

    for swing in swings:
        idx = swing["index"]
        price = swing["price"]
        kind = swing["kind"]
        if idx >= n:
            break_map[idx] = None
            continue

        break_index = None

        if kind == "swing-high":
            bos_kind = "bos-bullish"
            for j in range(idx + 1, n):
                if is_valid_high_break(open_[j], close[j], high[j], price):
                    break_index = j
                    markers.append({"index": int(j), "kind": bos_kind, "value": float(high[j])})
                    break
        else:
            bos_kind = "bos-bearish"
            for j in range(idx + 1, n):
                if is_valid_low_break(open_[j], close[j], low[j], price):
                    break_index = j
                    markers.append({"index": int(j), "kind": bos_kind, "value": float(low[j])})
                    break

        break_map[idx] = break_index

    for swing in swings:
        markers.append(
            {
                "index": int(swing["index"]),
                "kind": swing["kind"],
                "value": float(swing["price"]),
            }
        )

    return levels, markers, break_map


def enrich_with_structure(swings, levels, markers, open_, high, low, close, break_map):
    """
    Estrutura externa simplificada:
    - HSH / LSL
    - Protected Low / Protected High

    A tendencia e o nivel protegido sao derivados do BOS estrutural mais recente.
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
    last_bull_break = None
    last_bear_break = None

    for idx, swing in enumerate(swings):
        swing_index = swing["index"]
        price = swing["price"]
        kind = swing["kind"]

        if kind == "swing-high":
            if last_hsh is None or price > last_hsh["price"]:
                last_hsh = {"index": swing_index, "price": price}
                structural_markers.append({"index": swing_index, "kind": "hsh", "value": price})
                structural_levels.append(
                    {
                        "from": swing_index,
                        "to": break_map.get(swing_index) if break_map.get(swing_index) is not None else swings[-1]["index"],
                        "price": price,
                        "kind": "hsh-level",
                    }
                )

            break_index = None
            for j in range(swing_index + 1, n):
                if is_valid_high_break(open_[j], close[j], high[j], price):
                    break_index = j
                    break
            if break_index is not None:
                prev_low = None
                for k in range(idx - 1, -1, -1):
                    if swings[k]["kind"] == "swing-low":
                        prev_low = swings[k]
                        break
                if prev_low is not None:
                    if last_bull_break is None or break_index >= last_bull_break["break_index"]:
                        last_bull_break = {"protected": prev_low, "break_index": break_index}

        elif kind == "swing-low":
            if last_lsl is None or price < last_lsl["price"]:
                last_lsl = {"index": swing_index, "price": price}
                structural_markers.append({"index": swing_index, "kind": "lsl", "value": price})
                structural_levels.append(
                    {
                        "from": swing_index,
                        "to": break_map.get(swing_index) if break_map.get(swing_index) is not None else swings[-1]["index"],
                        "price": price,
                        "kind": "lsl-level",
                    }
                )

            break_index = None
            for j in range(swing_index + 1, n):
                if is_valid_low_break(open_[j], close[j], low[j], price):
                    break_index = j
                    break
            if break_index is not None:
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
        if last_bull_break["break_index"] >= last_bear_break["break_index"]:
            protected_low = last_bull_break["protected"]
        else:
            protected_high = last_bear_break["protected"]
    elif last_bull_break:
        protected_low = last_bull_break["protected"]
    elif last_bear_break:
        protected_high = last_bear_break["protected"]

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

    # MSS (Market Structure Shift): quebra valida do nivel protegido vigente.
    mss_marker = None
    new_protected_from_mss = None  # ('high'|'low', swing dict)

    if protected_low is not None and last_bull_break is not None:
        # Contexto bullish -> MSS bearish ao perder o Protected Low.
        level = float(protected_low["price"])
        start_idx = max(int(protected_low["index"]) + 1, last_bull_break["break_index"] + 1)
        for j in range(start_idx, n):
            if is_valid_low_break(open_[j], close[j], low[j], level):
                mss_marker = {"index": j, "kind": "mss-bearish", "value": float(low[j])}
                # Novo Protected High passa a ser o ultimo swing-high estrutural antes do MSS.
                prev_high = None
                for swing in reversed(swings):
                    if swing["index"] <= j and swing["kind"] == "swing-high":
                        prev_high = swing
                        break
                if prev_high is not None:
                    new_protected_from_mss = ("high", prev_high)
                # Adiciona uma versao "truncada" do protected-low ate a vela do MSS.
                structural_levels.append(
                    {
                        "from": int(protected_low["index"]),
                        "to": j,
                        "price": float(protected_low["price"]),
                        "kind": "protected-low",
                    }
                )
                break

    if protected_high is not None and last_bear_break is not None and mss_marker is None:
        # Contexto bearish -> MSS bullish ao romper o Protected High.
        level = float(protected_high["price"])
        start_idx = max(int(protected_high["index"]) + 1, last_bear_break["break_index"] + 1)
        for j in range(start_idx, n):
            if is_valid_high_break(open_[j], close[j], high[j], level):
                mss_marker = {"index": j, "kind": "mss-bullish", "value": float(high[j])}
                # Novo Protected Low passa a ser o ultimo swing-low estrutural antes do MSS.
                prev_low = None
                for swing in reversed(swings):
                    if swing["index"] <= j and swing["kind"] == "swing-low":
                        prev_low = swing
                        break
                if prev_low is not None:
                    new_protected_from_mss = ("low", prev_low)
                structural_levels.append(
                    {
                        "from": int(protected_high["index"]),
                        "to": j,
                        "price": float(protected_high["price"]),
                        "kind": "protected-high",
                    }
                )
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

    all_levels = levels + structural_levels
    limited_levels = []
    per_kind_counts = {}

    for level in reversed(all_levels):
        kind = level.get("kind") or ""
        limit = MAX_LEVELS_PER_KIND
        if "protected" in kind:
            limit = MAX_PROTECTED_LEVELS
        count = per_kind_counts.get(kind, 0)
        if count >= limit:
            continue
        per_kind_counts[kind] = count + 1
        limited_levels.append(level)

    limited_levels.reverse()

    return limited_levels, markers + structural_markers

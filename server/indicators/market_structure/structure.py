from .breaks import is_valid_high_break, is_valid_low_break

# Limite apenas para niveis auxiliares (HSH/LSL, BOS etc.).
# Protected High/Low mantem historico completo.
MAX_LEVELS_PER_KIND = 24


def _refine_hsh_with_sweeps(last_hsh, open_, high, close):
    """
    Refina o HSH (Higher Swing High) com base em sweeps de estrutura:
    - high > HSH e corpo (max(open, close)) abaixo de HSH.
    Nao altera Protected Low; apenas ajusta o extremo de referencia.
    Retorna (novo_last_hsh, lista_de_sweeps).
    """
    if last_hsh is None:
        return last_hsh, []

    try:
        level = float(last_hsh["price"])
        start_idx = int(last_hsh["index"]) + 1
    except (KeyError, TypeError, ValueError):
        return last_hsh, []

    n = len(close)
    if n == 0 or start_idx >= n:
        return last_hsh, []

    best_sweep_price = None
    sweeps = []

    for j in range(start_idx, n):
        hi = float(high[j])
        op = float(open_[j])
        cl = float(close[j])
        cmax = op if op > cl else cl
        # Sweep de estrutura acima do HSH: pavio acima, corpo abaixo.
        if hi > level and cmax < level:
            sweeps.append({"index": int(j), "price": float(hi)})
            if best_sweep_price is None or hi > best_sweep_price:
                best_sweep_price = hi
        # BOS valido acima do HSH original: apos isso, nao consideramos mais sweeps.
        elif is_valid_high_break(op, cl, hi, level):
            break

    if best_sweep_price is None:
        return last_hsh, sweeps

    updated_hsh = {
        "index": int(last_hsh["index"]),
        "price": float(best_sweep_price),
    }
    return updated_hsh, sweeps


def _refine_lsl_with_sweeps(last_lsl, open_, low, close):
    """
    Refina o LSL (Lower Swing Low) com base em sweeps de estrutura:
    - low < LSL e corpo (min(open, close)) acima de LSL.
    Nao altera Protected High; apenas ajusta o extremo de referencia.
    Retorna (novo_last_lsl, lista_de_sweeps).
    """
    if last_lsl is None:
        return last_lsl, []

    try:
        level = float(last_lsl["price"])
        start_idx = int(last_lsl["index"]) + 1
    except (KeyError, TypeError, ValueError):
        return last_lsl, []

    n = len(close)
    if n == 0 or start_idx >= n:
        return last_lsl, []

    best_sweep_price = None
    sweeps = []

    for j in range(start_idx, n):
        lo = float(low[j])
        op = float(open_[j])
        cl = float(close[j])
        cmin = op if op < cl else cl
        # Sweep de estrutura abaixo do LSL: pavio abaixo, corpo acima.
        if lo < level and cmin > level:
            sweeps.append({"index": int(j), "price": float(lo)})
            if best_sweep_price is None or lo < best_sweep_price:
                best_sweep_price = lo
        # BOS valido abaixo do LSL original: apos isso, nao consideramos mais sweeps.
        elif is_valid_low_break(op, cl, lo, level):
            break

    if best_sweep_price is None:
        return last_lsl, sweeps

    updated_lsl = {
        "index": int(last_lsl["index"]),
        "price": float(best_sweep_price),
    }
    return updated_lsl, sweeps


def _refine_protected_low_with_sweeps(protected_low, last_bull_break, open_, low, close):
    """
    Refina o Protected Low com base em sweeps (pavio abaixo, corpo acima),
    conforme descrito na documentacao conceitual.
    """
    if protected_low is None or last_bull_break is None:
        return protected_low

    try:
        level = float(protected_low["price"])
        start_idx = int(protected_low["index"]) + 1
        end_idx = int(last_bull_break["break_index"]) + 1
    except (KeyError, TypeError, ValueError):
        return protected_low

    n = len(close)
    if n == 0 or start_idx >= n:
        return protected_low

    end_idx = min(max(start_idx, end_idx), n)

    best_sweep_index = None
    best_sweep_price = None

    for j in range(start_idx, end_idx):
        lo = float(low[j])
        op = float(open_[j])
        cl = float(close[j])
        cmin = op if op < cl else cl
        # Sweep de Protected Low: low < L e corpo acima de L.
        if lo < level and cmin > level:
            if best_sweep_price is None or lo < best_sweep_price:
                best_sweep_price = lo
                best_sweep_index = j

    if best_sweep_index is None:
        return protected_low

    return {
        "index": int(best_sweep_index),
        "price": float(best_sweep_price),
    }


def _refine_protected_high_with_sweeps(protected_high, last_bear_break, open_, high, close):
    """
    Refina o Protected High com base em sweeps (pavio acima, corpo abaixo).
    """
    if protected_high is None or last_bear_break is None:
        return protected_high

    try:
        level = float(protected_high["price"])
        start_idx = int(protected_high["index"]) + 1
        end_idx = int(last_bear_break["break_index"]) + 1
    except (KeyError, TypeError, ValueError):
        return protected_high

    n = len(close)
    if n == 0 or start_idx >= n:
        return protected_high

    end_idx = min(max(start_idx, end_idx), n)

    best_sweep_index = None
    best_sweep_price = None

    for j in range(start_idx, end_idx):
        hi = float(high[j])
        op = float(open_[j])
        cl = float(close[j])
        cmax = op if op > cl else cl
        # Sweep de Protected High: high > H e corpo abaixo de H.
        if hi > level and cmax < level:
            if best_sweep_price is None or hi > best_sweep_price:
                best_sweep_price = hi
                best_sweep_index = j

    if best_sweep_index is None:
        return protected_high

    return {
        "index": int(best_sweep_index),
        "price": float(best_sweep_price),
    }


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

    # Estrutura auxiliar para eventos de BOS estruturais.
    # Usada para identificar MSC (Market Structure Continuation)
    # e para derivar Protected Low/High conforme o doc conceitual.
    bull_break_events = []  # eventos de BOS bullish
    bear_break_events = []  # eventos de BOS bearish
    hsh_indices = set()  # indices de swing-high promovidos a HSH
    lsl_indices = set()  # indices de swing-low promovidos a LSL

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
                hsh_indices.add(swing_index)
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
                origin_low = None
                # Swing low de origem da perna impulsiva:
                # procura lows ENTRE o swing-high atual e a candle de break,
                # escolhendo o low mais baixo da perna.
                for k in range(idx + 1, len(swings)):
                    candidate = swings[k]
                    if candidate["index"] >= break_index:
                        break
                    if candidate["kind"] == "swing-low":
                        if origin_low is None or candidate["price"] <= origin_low["price"]:
                            origin_low = candidate
                # Fallback: se nao houver low interno entre o high e o break,
                # usa o ultimo swing-low anterior na estrutura.
                if origin_low is None:
                    for k in range(idx - 1, -1, -1):
                        candidate = swings[k]
                        if candidate["kind"] == "swing-low":
                            origin_low = candidate
                            break
                if origin_low is not None:
                    event = {
                        "swing_index": swing_index,
                        "swing_price": price,
                        "break_index": break_index,
                        "origin": {
                            "index": origin_low["index"],
                            "price": origin_low["price"],
                        },
                    }
                    bull_break_events.append(event)
                    if last_bull_break is None or break_index >= last_bull_break["break_index"]:
                        last_bull_break = {"protected": event["origin"], "break_index": break_index}

        elif kind == "swing-low":
            if last_lsl is None or price < last_lsl["price"]:
                last_lsl = {"index": swing_index, "price": price}
                lsl_indices.add(swing_index)
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
                origin_high = None
                # Swing high de origem da perna impulsiva de baixa:
                # procura highs ENTRE o swing-low atual e a candle de break,
                # escolhendo o high mais alto da perna.
                for k in range(idx + 1, len(swings)):
                    candidate = swings[k]
                    if candidate["index"] >= break_index:
                        break
                    if candidate["kind"] == "swing-high":
                        if origin_high is None or candidate["price"] >= origin_high["price"]:
                            origin_high = candidate
                # Fallback: se nao houver high interno entre o low e o break,
                # usa o ultimo swing-high anterior na estrutura.
                if origin_high is None:
                    for k in range(idx - 1, -1, -1):
                        candidate = swings[k]
                        if candidate["kind"] == "swing-high":
                            origin_high = candidate
                            break
                if origin_high is not None:
                    event = {
                        "swing_index": swing_index,
                        "swing_price": price,
                        "break_index": break_index,
                        "origin": {
                            "index": origin_high["index"],
                            "price": origin_high["price"],
                        },
                    }
                    bear_break_events.append(event)
                    if last_bear_break is None or break_index >= last_bear_break["break_index"]:
                        last_bear_break = {"protected": event["origin"], "break_index": break_index}

    protected_low = None
    protected_high = None

    # Tendencia principal derivada do BOS estrutural mais recente
    trend = None
    if last_bull_break and (not last_bear_break or last_bull_break["break_index"] >= last_bear_break["break_index"]):
        trend = "bullish"
    elif last_bear_break and (not last_bull_break or last_bear_break["break_index"] > last_bull_break["break_index"]):
        trend = "bearish"

    if trend == "bullish":
        # Considera apenas BOS bullish apos o ultimo BOS bearish (segmento atual)
        segment_start = last_bear_break["break_index"] + 1 if last_bear_break else 0
        bull_segment_events = [e for e in bull_break_events if e["break_index"] >= segment_start]
        if bull_segment_events:
            # Idealmente MSCs relevantes sao aqueles que rompem HSH; se nao houver,
            # caimos para todos os BOS bullish do segmento.
            hsh_events = [e for e in bull_segment_events if e["swing_index"] in hsh_indices]
            candidate_events = hsh_events or bull_segment_events
            best_origin = candidate_events[0]["origin"]
            for e in candidate_events[1:]:
                origin = e["origin"]
                if origin["price"] < best_origin["price"]:
                    best_origin = origin
            protected_low = {"index": int(best_origin["index"]), "price": float(best_origin["price"])}
    elif trend == "bearish":
        segment_start = last_bull_break["break_index"] + 1 if last_bull_break else 0
        bear_segment_events = [e for e in bear_break_events if e["break_index"] >= segment_start]
        if bear_segment_events:
            lsl_events = [e for e in bear_segment_events if e["swing_index"] in lsl_indices]
            candidate_events = lsl_events or bear_segment_events
            best_origin = candidate_events[0]["origin"]
            for e in candidate_events[1:]:
                origin = e["origin"]
                if origin["price"] > best_origin["price"]:
                    best_origin = origin
            protected_high = {"index": int(best_origin["index"]), "price": float(best_origin["price"])}

    # Fallback para casos em que nao conseguimos derivar Protected via eventos
    if protected_low is None and protected_high is None:
        if last_bull_break and (not last_bear_break or last_bull_break["break_index"] >= last_bear_break["break_index"]):
            protected_low = last_bull_break["protected"]
        elif last_bear_break:
            protected_high = last_bear_break["protected"]

    # Sweeps em niveis protegidos refinam o valor do Protected Low/High
    # sem, por si so, gerar MSS.
    protected_low = _refine_protected_low_with_sweeps(protected_low, last_bull_break, open_, low, close)
    protected_high = _refine_protected_high_with_sweeps(protected_high, last_bear_break, open_, high, close)

    # Sweeps de estrutura (HSH/LSL) refinam apenas os extremos estruturais,
    # mantendo o mesmo Protected Low/High.
    hsh_sweeps = []
    lsl_sweeps = []
    if trend == "bullish":
        last_hsh, hsh_sweeps = _refine_hsh_with_sweeps(last_hsh, open_, high, close)
    elif trend == "bearish":
        last_lsl, lsl_sweeps = _refine_lsl_with_sweeps(last_lsl, open_, low, close)

    # Ajusta HSH/LSL levels existentes para refletir eventuais sweeps de estrutura.
    if last_hsh is not None:
        try:
            hsh_idx = int(last_hsh["index"])
            hsh_price = float(last_hsh["price"])
        except (KeyError, TypeError, ValueError):
            hsh_idx = None
            hsh_price = None
        if hsh_idx is not None and hsh_price is not None:
            for level in structural_levels:
                if level.get("kind") == "hsh-level" and int(level.get("from") or -1) == hsh_idx:
                    level["price"] = hsh_price
    if last_lsl is not None:
        try:
            lsl_idx = int(last_lsl["index"])
            lsl_price = float(last_lsl["price"])
        except (KeyError, TypeError, ValueError):
            lsl_idx = None
            lsl_price = None
        if lsl_idx is not None and lsl_price is not None:
            for level in structural_levels:
                if level.get("kind") == "lsl-level" and int(level.get("from") or -1) == lsl_idx:
                    level["price"] = lsl_price

    # Niveis opcionais para sweeps de estrutura (HSH/LSL), com estilo leve.
    for sweep in hsh_sweeps:
        try:
            idx = int(sweep["index"])
            price = float(sweep["price"])
        except (KeyError, TypeError, ValueError):
            continue
        structural_levels.append(
            {
                "from": idx,
                "to": swings[-1]["index"],
                "price": price,
                "kind": "hsh-sweep",
            }
        )
    for sweep in lsl_sweeps:
        try:
            idx = int(sweep["index"])
            price = float(sweep["price"])
        except (KeyError, TypeError, ValueError):
            continue
        structural_levels.append(
            {
                "from": idx,
                "to": swings[-1]["index"],
                "price": price,
                "kind": "lsl-sweep",
            }
        )

    if protected_low is not None:
        structural_markers.append(
            {
                "index": int(protected_low["index"]),
                "kind": "protected-low",
                "value": float(protected_low["price"]),
                # instrucoes visuais para o chart (Plot API via markers legados)
                "shape": "arrowUp",
                "color": "#166534",
                "color": "#166534",
                "position": "belowBar",
                "size": 2,
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
                "shape": "arrowDown",
                "color": "#000000",
                "color": "#000000",
                "position": "aboveBar",
                "size": 2,
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

    # MSC (Market Structure Continuation): BOS estrutural a favor da tendencia
    # vigente, sem violar o nivel protegido oposto.
    # Aqui marcamos explicitamente todos os MSCs do segmento de tendencia atual.
    if trend == "bullish":
        segment_start = last_bear_break["break_index"] + 1 if last_bear_break else 0
        bull_segment_events = [e for e in bull_break_events if e["break_index"] >= segment_start]
        # Primeiro BOS do segmento estabelece a estrutura; MSCs sao continuacoes
        # subsequentes dentro da mesma tendencia.
        msc_events = bull_segment_events[1:]
        for e in msc_events:
            idx = e["break_index"]
            if not isinstance(idx, int) or idx < 0 or idx >= n:
                continue
            origin = e.get("origin") or {}
            structural_markers.append(
                {
                    "index": int(idx),
                    "kind": "msc-bullish",
                    "value": float(high[idx]),
                    "shape": "arrowUp",
                    "color": "#22c55e",
                    "position": "belowBar",
                }
            )
            if "index" in origin and "price" in origin:
                structural_levels.append(
                    {
                        "from": int(origin["index"]),
                        "to": int(idx),
                        "price": float(origin["price"]),
                        "kind": "msc-leg",
                    }
                )
    elif trend == "bearish":
        segment_start = last_bull_break["break_index"] + 1 if last_bull_break else 0
        bear_segment_events = [e for e in bear_break_events if e["break_index"] >= segment_start]
        msc_events = bear_segment_events[1:]
        for e in msc_events:
            idx = e["break_index"]
            if not isinstance(idx, int) or idx < 0 or idx >= n:
                continue
            origin = e.get("origin") or {}
            structural_markers.append(
                {
                    "index": int(idx),
                    "kind": "msc-bearish",
                    "value": float(low[idx]),
                    "shape": "arrowDown",
                    "color": "#ef4444",
                    "position": "aboveBar",
                }
            )
            if "index" in origin and "price" in origin:
                structural_levels.append(
                    {
                        "from": int(origin["index"]),
                        "to": int(idx),
                        "price": float(origin["price"]),
                        "kind": "msc-leg",
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
                    "shape": "arrowDown",
                    "color": "#000000",
                    "position": "aboveBar",
                    "size": 2,
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
                    "shape": "arrowUp",
                    "color": "#166534",
                    "position": "belowBar",
                    "size": 2,
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
        # Protected High/Low nao possuem limite: mantem todo historico.
        if "protected" in kind:
            limited_levels.append(level)
            continue
        limit = MAX_LEVELS_PER_KIND
        count = per_kind_counts.get(kind, 0)
        if count >= limit:
            continue
        per_kind_counts[kind] = count + 1
        limited_levels.append(level)

    limited_levels.reverse()

    return limited_levels, markers + structural_markers

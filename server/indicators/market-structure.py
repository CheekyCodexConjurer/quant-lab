from market_structure.core import calculate as _calculate


def calculate(inputs, settings=None):
    """
    Entry point used by The Lab.
    Delegates to market_structure.core.calculate but strips the main
    series so the indicator does not draw a line following price.
    """
    settings = settings or {}

    result = _calculate(inputs)
    if not isinstance(result, dict):
        return result

    series = result.get("series") or {}
    if isinstance(series, dict):
        filtered_series = {k: v for k, v in series.items() if k != "main"}
    else:
        filtered_series = {}

    markers = list(result.get("markers") or [])
    levels = list(result.get("levels") or [])

    visibility_mode = str(settings.get("visibilityMode") or "all").lower()

    if visibility_mode == "protected-only":
      markers = [
        m
        for m in markers
        if isinstance(m, dict)
        and "kind" in m
        and isinstance(m["kind"], str)
        and "protected" in m["kind"].lower()
      ]
      levels = [
        l
        for l in levels
        if isinstance(l, dict)
        and "kind" in l
        and isinstance(l["kind"], str)
        and "protected" in l["kind"].lower()
      ]
    elif visibility_mode == "levels-only":
      markers = []
    elif visibility_mode == "markers-only":
      levels = []

    return {
        "series": filtered_series,
        "markers": markers,
        "levels": levels,
        "debug_info": {
            "markers_count": len(markers),
            "first_marker": markers[0] if markers else None
        }
    }

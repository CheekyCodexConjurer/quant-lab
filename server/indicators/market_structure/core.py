import numpy as np

from .swings import detect_swings, extract_external_structure
from .structure import build_levels_and_markers, enrich_with_structure


def calculate(inputs):
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

    swings = detect_swings(high, low)
    structural_swings = extract_external_structure(swings)
    levels, markers, break_map = build_levels_and_markers(open_, high, low, close, structural_swings)
    levels, markers = enrich_with_structure(structural_swings, levels, markers, open_, high, low, close, break_map)

    return {
        "series": {
            "main": close,
        },
        "markers": markers,
        "levels": levels,
    }


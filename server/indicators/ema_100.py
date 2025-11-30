import numpy as np

try:
    import talib  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    talib = None


def _ema_numpy(values: np.ndarray, period: int) -> np.ndarray:
    if values.size == 0:
        return values
    alpha = 2.0 / (period + 1.0)
    ema = np.empty_like(values, dtype=float)
    ema[0] = float(values[0])
    for i in range(1, values.size):
        ema[i] = alpha * float(values[i]) + (1.0 - alpha) * ema[i - 1]
    return ema


def calculate(inputs, settings=None):
    """
    Calculate EMA 100 indicator using The Lab indicator API v1.

    This implementation prefers TA-Lib when available, but gracefully falls back
    to a NumPy-based EMA to avoid hard dependency issues.
    """
    settings = settings or {}

    raw_length = settings.get("length") if isinstance(settings, dict) else None
    try:
        length = int(raw_length)
    except (TypeError, ValueError):
        length = 100
    if length < 1:
        length = 1
    if length > 5000:
        length = 5000

    source_key = str(settings.get("source") or "close").lower()
    if source_key not in {"open", "high", "low", "close"}:
        source_key = "close"

    close = np.asarray(inputs.get(source_key, inputs.get("close", [])), dtype=float)

    if close.size == 0:
        return {"series": {"main": []}, "markers": [], "levels": []}

    if talib is not None:
        ema = talib.EMA(close, timeperiod=length)
    else:
        ema = _ema_numpy(close, period=length)

    return {"series": {"main": ema}, "markers": [], "levels": []}

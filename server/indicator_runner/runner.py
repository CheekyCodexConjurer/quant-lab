import json
import os
import sys
import time
import traceback
from typing import Any, Dict
import math


def _print_json(payload: Dict[str, Any]) -> None:
  """
  Write a single JSON object to stdout. Fallback to a minimal error if serialization fails.
  """
  try:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()
  except Exception as exc:  # pragma: no cover - extremely unlikely
    fallback = {
      "ok": False,
      "apiVersion": 1,
      "error": {
        "type": "SerializationError",
        "message": f"Failed to serialize JSON: {exc}",
        "phase": "serialize",
      },
    }
    sys.stdout.write(json.dumps(fallback, ensure_ascii=False))
    sys.stdout.flush()


def _to_serializable(obj: Any) -> Any:
  """
  Best-effort conversion of numpy/pandas structures to plain Python types.
  This keeps the runner generic and avoids importing heavy libs if not needed.
  """
  # Lazy imports to avoid mandatory dependency
  try:
    import numpy as np  # type: ignore
  except Exception:  # pragma: no cover - environments without numpy
    np = None

  # numpy scalars / arrays
  if np is not None:
    if isinstance(obj, np.generic):
      return _to_serializable(obj.item())
    if isinstance(obj, np.ndarray):
      # Convert to list and recurse so that NaN/inf are normalized
      return _to_serializable(obj.tolist())

  # Primitive numbers: coerce NaN/inf to None
  if isinstance(obj, (int, float)) and not isinstance(obj, bool):
    if isinstance(obj, float) and not math.isfinite(obj):
      return None
    return obj

  # Mapping
  if isinstance(obj, dict):
    return {str(k): _to_serializable(v) for k, v in obj.items()}

  # Sequence (but not string/bytes)
  if isinstance(obj, (list, tuple, set)):
    return [_to_serializable(v) for v in obj]

  # Fallback: let json handle (numbers, strings, None, bool)
  return obj


def _load_indicator_module(script_path: str):
  """
  Dynamically load a Python module from the given path and return it.
  """
  import importlib.util

  script_path = os.path.abspath(script_path)
  module_name = "__thelab_indicator__"

  spec = importlib.util.spec_from_file_location(module_name, script_path)
  if spec is None or spec.loader is None:
    raise ImportError(f"Cannot load spec for indicator: {script_path}")

  module = importlib.util.module_from_spec(spec)
  sys.modules[module_name] = module
  spec.loader.exec_module(module)
  return module


def _extract_location(exc: BaseException, script_path: str) -> Dict[str, Any]:
  """
  Try to extract file/line/column information for an exception related to the
  indicator script. This is best-effort and should never raise.
  """
  info: Dict[str, Any] = {}
  try:
    script_abs = os.path.abspath(script_path)
  except Exception:  # pragma: no cover - extremely defensive
    script_abs = script_path

  # SyntaxError / IndentationError: they carry precise location metadata.
  if isinstance(exc, SyntaxError):
    filename = getattr(exc, "filename", None) or script_abs
    try:
      info["file"] = os.path.abspath(str(filename))
    except Exception:  # pragma: no cover
      info["file"] = str(filename)
    lineno = getattr(exc, "lineno", None)
    offset = getattr(exc, "offset", None)
    if isinstance(lineno, int) and lineno > 0:
      info["line"] = lineno
    if isinstance(offset, int) and offset > 0:
      info["column"] = offset
    return info

  tb = getattr(exc, "__traceback__", None)
  if tb is None:
    return info

  try:
    frames = traceback.extract_tb(tb)
  except Exception:  # pragma: no cover
    return info

  candidate = None
  for frame in frames:
    try:
      frame_file = os.path.abspath(frame.filename)
    except Exception:  # pragma: no cover
      frame_file = frame.filename
    if frame_file == script_abs:
      candidate = frame

  if candidate is None and frames:
    candidate = frames[-1]

  if candidate is not None:
    try:
      info["file"] = os.path.abspath(candidate.filename)
    except Exception:  # pragma: no cover
      info["file"] = candidate.filename
    if isinstance(candidate.lineno, int) and candidate.lineno > 0:
      info["line"] = candidate.lineno

  return info


def main() -> None:
  start_ts = time.time()
  api_version = 1

  if len(sys.argv) < 2:
    _print_json(
      {
        "ok": False,
        "apiVersion": api_version,
        "error": {
          "type": "UsageError",
          "message": "Usage: runner.py <indicator_path>",
          "phase": "bootstrap",
        },
      }
    )
    return

  script_path = sys.argv[1]

  # Read payload from stdin
  try:
    stdin_data = sys.stdin.read()
    payload = json.loads(stdin_data) if stdin_data.strip() else {}
  except Exception as exc:
    _print_json(
      {
        "ok": False,
        "apiVersion": api_version,
        "error": {
          "type": "InputError",
          "message": f"Failed to parse JSON from stdin: {exc}",
          "phase": "inputs",
        },
      }
    )
    return

  # Support both {"inputs": {...}} and flat {"open": [...], ...}
  raw_inputs = payload.get("inputs") if isinstance(payload, dict) else None
  if not isinstance(raw_inputs, dict):
    if isinstance(payload, dict):
      raw_inputs = {k: v for k, v in payload.items() if isinstance(v, (list, tuple))}
    else:
      raw_inputs = {}

  # Convert lists to numpy arrays where possible
  inputs: Dict[str, Any] = {}
  try:
    try:
      import numpy as np  # type: ignore
    except Exception:  # pragma: no cover - allow running without numpy
      np = None

    for key, value in raw_inputs.items():
      if np is not None and isinstance(value, (list, tuple)):
        inputs[key] = np.array(value)
      else:
        inputs[key] = value
  except Exception as exc:
    _print_json(
      {
        "ok": False,
        "apiVersion": api_version,
        "error": {
          "type": "InputError",
          "message": f"Failed to prepare inputs: {exc}",
          "phase": "inputs",
        },
      }
    )
    return

  # Load indicator module
  try:
    module = _load_indicator_module(script_path)
  except Exception as exc:
    location = _extract_location(exc, script_path)
    error_payload: Dict[str, Any] = {
      "type": "ImportError",
      "message": f"Failed to import indicator: {exc}",
      "phase": "import",
      "traceback": traceback.format_exc(limit=5),
      "exceptionType": exc.__class__.__name__,
    }
    error_payload.update(location)
    _print_json(
      {
        "ok": False,
        "apiVersion": api_version,
        "error": error_payload,
      }
    )
    return

  calculate = getattr(module, "calculate", None)
  if not callable(calculate):
    _print_json(
      {
        "ok": False,
        "apiVersion": api_version,
        "error": {
          "type": "MissingEntryPoint",
          "message": "Indicator module must define a callable 'calculate(inputs)'",
          "phase": "import",
        },
      }
    )
    return

  # Execute user code
  try:
    exec_start = time.time()
    result = calculate(inputs)
    exec_ms = (time.time() - exec_start) * 1000.0
  except Exception as exc:
    location = _extract_location(exc, script_path)
    error_payload: Dict[str, Any] = {
      "type": "ExecutionError",
      "message": str(exc),
      "phase": "execute",
      "traceback": traceback.format_exc(limit=10),
      "exceptionType": exc.__class__.__name__,
    }
    error_payload.update(location)
    _print_json(
      {
        "ok": False,
        "apiVersion": api_version,
        "error": error_payload,
      }
    )
    return

  # Normalize result
  try:
    # Default shape: assume array-like -> main series
    if isinstance(result, dict):
      normalized = _to_serializable(result)
      series = normalized.get("series") or {}
      markers = normalized.get("markers") or []
      levels = normalized.get("levels") or []
    else:
      main = _to_serializable(result)
      series = {"main": main}
      markers = []
      levels = []

    total_ms = (time.time() - start_ts) * 1000.0

    output = {
      "ok": True,
      "apiVersion": api_version,
      "series": series,
      "markers": markers,
      "levels": levels,
      "meta": {
        "scriptPath": os.path.abspath(script_path),
        "executionMs": exec_ms,
        "totalMs": total_ms,
      },
    }
    _print_json(output)
  except Exception as exc:
    _print_json(
      {
        "ok": False,
        "apiVersion": api_version,
        "error": {
          "type": "ResultError",
          "message": f"Failed to normalize result: {exc}",
          "phase": "serialize",
          "traceback": traceback.format_exc(limit=5),
        },
      }
    )


if __name__ == "__main__":
  main()

const { clampIndex } = require('./indicatorOverlayUtils');

const alignSeriesWithCandles = (values, candles) => {
  if (!Array.isArray(values)) return [];
  if (!Array.isArray(candles) || candles.length === 0) {
    return values.map((value, index) => ({ time: index, value }));
  }
  const n = values.length;
  const offset = Math.max(0, candles.length - n);
  const result = [];
  for (let i = 0; i < n; i++) {
    const candle = candles[offset + i] || candles[i] || candles[candles.length - 1];
    if (!candle) continue;
    const value = values[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    result.push({ time: candle.time, value });
  }
  return result;
};

const alignMarkerWithCandles = (marker, candles) => {
  if (!marker || typeof marker !== 'object') return null;
  const kind = String(marker.kind || '').trim();
  if (!kind) return null;

  const shape =
    typeof marker.shape === 'string' && marker.shape
      ? marker.shape
      : undefined;
  const color =
    typeof marker.color === 'string' && marker.color
      ? marker.color
      : undefined;
  const position =
    marker.position === 'aboveBar' || marker.position === 'belowBar'
      ? marker.position
      : undefined;

  if (marker.time !== undefined) {
    return {
      time: marker.time,
      value:
        typeof marker.value === 'number' && Number.isFinite(marker.value) ? marker.value : undefined,
      kind,
      shape,
      color,
      position,
    };
  }

  const idx = clampIndex(marker.index, candles.length);
  if (idx === null) return null;
  const candle = candles[idx];
  if (!candle || candle.time === undefined) return null;

  const value =
    typeof marker.value === 'number' && Number.isFinite(marker.value)
      ? marker.value
      : typeof candle.close === 'number'
        ? candle.close
        : undefined;

  return {
    time: candle.time,
    value,
    kind,
    shape,
    color,
    position,
  };
};

const alignLevelWithCandles = (level, candles) => {
  if (!level || typeof level !== 'object') return null;
  const kind = String(level.kind || '').trim() || 'level';
  const price =
    typeof level.price === 'number' && Number.isFinite(level.price) ? level.price : null;
  if (price === null) return null;

  if (level.timeStart !== undefined && level.timeEnd !== undefined) {
    return {
      timeStart: level.timeStart,
      timeEnd: level.timeEnd,
      price,
      kind,
    };
  }

  const fromIdx = clampIndex(level.from, candles.length);
  const toIdx = clampIndex(level.to !== undefined ? level.to : level.index, candles.length);
  if (fromIdx === null || toIdx === null) return null;

  const fromCandle = candles[fromIdx];
  const toCandle = candles[toIdx];
  if (!fromCandle || fromCandle.time === undefined || !toCandle || toCandle.time === undefined) {
    return null;
  }

  return {
    timeStart: fromCandle.time,
    timeEnd: toCandle.time,
    price,
    kind,
  };
};

module.exports = {
  alignSeriesWithCandles,
  alignMarkerWithCandles,
  alignLevelWithCandles,
};

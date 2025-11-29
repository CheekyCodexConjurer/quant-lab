const MINUTE_IN_MS = 60 * 1000;

const TIMEFRAME_DEFS = {
  M1: { minutes: 1 },
  M5: { minutes: 5 },
  M15: { minutes: 15 },
  H1: { minutes: 60 },
  H4: { minutes: 240 },
  D1: { minutes: 1440 },
};

const DEFAULT_TIMEFRAMES = Object.keys(TIMEFRAME_DEFS);

const toBucketStart = (timestamp, bucketMinutes) =>
  Math.floor(timestamp / (bucketMinutes * MINUTE_IN_MS)) * bucketMinutes * MINUTE_IN_MS;

const convertTicksToMinuteCandles = (ticks, bucketMinutes = 1) => {
  if (!Array.isArray(ticks) || !ticks.length) return [];

  const ordered = [...ticks].sort((a, b) => a.timestamp - b.timestamp);
  const candles = [];
  let bucketTime = null;
  let open = null;
  let high = null;
  let low = null;
  let close = null;
  let volume = 0;

  const flush = () => {
    if (bucketTime === null || open === null || close === null) return;
    candles.push({
      time: new Date(bucketTime).toISOString(),
      open,
      high,
      low,
      close,
      volume: Number(volume.toFixed(6)),
    });
  };

  ordered.forEach((tick) => {
    if (typeof tick.timestamp !== 'number') {
      return;
    }

    const price =
      typeof tick.midPrice === 'number'
        ? tick.midPrice
        : typeof tick.askPrice === 'number' && typeof tick.bidPrice === 'number'
        ? (tick.askPrice + tick.bidPrice) / 2
        : typeof tick.askPrice === 'number'
        ? tick.askPrice
        : typeof tick.bidPrice === 'number'
        ? tick.bidPrice
        : null;

    if (price === null) {
      return;
    }

    const currentBucket = toBucketStart(tick.timestamp, bucketMinutes);

    if (bucketTime === null) {
      bucketTime = currentBucket;
      open = price;
      high = price;
      low = price;
      close = price;
    } else if (currentBucket !== bucketTime) {
      flush();
      bucketTime = currentBucket;
      open = price;
      high = price;
      low = price;
      close = price;
      volume = 0;
    }

    high = Math.max(high, price);
    low = Math.min(low, price);
    close = price;

    const tickVolume = Number(tick.askVolume || tick.bidVolume || 0);
    if (!Number.isNaN(tickVolume)) {
      volume += tickVolume;
    }
  });

  flush();
  return candles;
};

const aggregateCandles = (sourceCandles, factorMinutes) => {
  if (factorMinutes === 1) return sourceCandles;

  const aggregated = [];
  let bucketStart = null;
  let bucket = null;

  const flush = () => {
    if (!bucket) return;
    aggregated.push({
      time: new Date(bucketStart).toISOString(),
      open: bucket.open,
      high: bucket.high,
      low: bucket.low,
      close: bucket.close,
      volume: Number(bucket.volume.toFixed(6)),
    });
  };

  sourceCandles.forEach((candle) => {
    const timestamp = Date.parse(candle.time);
    if (Number.isNaN(timestamp)) return;
    const currentBucket = toBucketStart(timestamp, factorMinutes);

    if (bucketStart === null) {
      bucketStart = currentBucket;
      bucket = { ...candle };
    } else if (currentBucket !== bucketStart) {
      flush();
      bucketStart = currentBucket;
      bucket = { ...candle };
      return;
    } else {
      bucket.high = Math.max(bucket.high, candle.high);
      bucket.low = Math.min(bucket.low, candle.low);
      bucket.close = candle.close;
      bucket.volume += candle.volume || 0;
    }
  });

  flush();
  return aggregated;
};

const buildTimeframesFromTicks = (ticks, timeframeCodes = DEFAULT_TIMEFRAMES) => {
  const uniqueCodes = Array.from(new Set(timeframeCodes.map((code) => code.toUpperCase())));
  if (!uniqueCodes.includes('M1')) {
    uniqueCodes.unshift('M1');
  }

  const minuteCandles = convertTicksToMinuteCandles(ticks, 1);
  const result = new Map();
  result.set('M1', minuteCandles);

  uniqueCodes.forEach((code) => {
    if (code === 'M1') return;
    const def = TIMEFRAME_DEFS[code];
    if (!def) return;
    const factor = def.minutes;
    result.set(code, aggregateCandles(minuteCandles, factor));
  });

  return result;
};

module.exports = {
  TIMEFRAME_DEFS,
  DEFAULT_TIMEFRAMES,
  buildTimeframesFromTicks,
  aggregateCandles,
};

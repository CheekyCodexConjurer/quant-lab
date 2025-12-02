const { alignMarkerWithCandles, alignLevelWithCandles, alignSeriesWithCandles } = require('./indicatorOverlayAlign');

/**
 * Build plots from the legacy series/markers/levels fields returned by indicators.
 * This keeps compatibility with existing indicators while the Plot API v1 rolls out.
 */
const adaptLegacyToPlots = (rawSeries, rawMarkers, rawLevels, candles) => {
  const plots = [];

  const series = rawSeries && typeof rawSeries === 'object' ? rawSeries : {};
  const markers = Array.isArray(rawMarkers) ? rawMarkers : [];
  const levels = Array.isArray(rawLevels) ? rawLevels : [];

  // Series -> line plots
  Object.entries(series).forEach(([key, value]) => {
    if (!Array.isArray(value)) return;
    const data = alignSeriesWithCandles(value, candles);
    if (!data.length) return;
    plots.push({
      id: key || 'main',
      type: 'line',
      kind: key || 'main',
      paneId: 'price',
      scaleId: 'price',
      style: {},
      data,
    });
  });

  // Levels -> hline plots
  const levelPoints = levels
    .map((level) => alignLevelWithCandles(level, candles))
    .filter((l) => l && l.timeStart !== undefined && l.timeEnd !== undefined);

  if (levelPoints.length) {
    plots.push({
      id: 'levels',
      type: 'hline',
      kind: 'levels',
      paneId: 'price',
      scaleId: 'price',
      style: {},
      data: levelPoints,
    });
  }

  // Markers -> marker plots
  const markerPoints = markers
    .map((marker) => alignMarkerWithCandles(marker, candles))
    .filter((m) => m && m.time !== undefined);

  if (markerPoints.length) {
    plots.push({
      id: 'markers',
      type: 'marker',
      kind: 'markers',
      paneId: 'price',
      scaleId: 'price',
      style: {},
      data: markerPoints,
    });
  }

  return plots;
};

/**
 * Normalizes plots returned directly by indicators.
 * Ensures basic shape and drops obviously invalid entries, but stays permissive.
 */
const normalizePlots = (rawPlots, candles) => {
  if (!Array.isArray(rawPlots)) return [];

  const normalizePlot = (plot, index) => {
    if (!plot || typeof plot !== 'object') return null;
    const type = String(plot.type || '').toLowerCase();
    if (!type) return null;

    const id = String(plot.id || `plot-${index}`);
    const paneId = plot.paneId ? String(plot.paneId) : 'price';
    const scaleId = plot.scaleId ? String(plot.scaleId) : 'price';
    const kind = plot.kind ? String(plot.kind) : undefined;

    const style =
      plot.style && typeof plot.style === 'object'
        ? {
            color: plot.style.color,
            width: typeof plot.style.width === 'number' ? plot.style.width : undefined,
            dashed: Boolean(plot.style.dashed),
            opacity:
              typeof plot.style.opacity === 'number' && Number.isFinite(plot.style.opacity)
                ? plot.style.opacity
                : undefined,
            shape: plot.style.shape,
            zIndex:
              typeof plot.style.zIndex === 'number' && Number.isFinite(plot.style.zIndex)
                ? plot.style.zIndex
                : undefined,
          }
        : {};

    const data = Array.isArray(plot.data) ? plot.data : [];
    if (!data.length) return null;

    return {
      id,
      type,
      kind,
      paneId,
      scaleId,
      style,
      data,
      meta: plot.meta && typeof plot.meta === 'object' ? plot.meta : undefined,
    };
  };

  const result = [];
  rawPlots.forEach((plot, idx) => {
    const normalized = normalizePlot(plot, idx);
    if (!normalized) return;
    result.push(normalized);
  });

  return result;
};

module.exports = {
  adaptLegacyToPlots,
  normalizePlots,
};


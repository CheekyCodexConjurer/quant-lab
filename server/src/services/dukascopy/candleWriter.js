const path = require('path');
const { DATA_DIR } = require('./paths');
const { writeJson, readJsonIfExists, mergeByTime } = require('./dataUtils');

/**
 * Persiste candles incrementalmente em segmentos por ano, com um arquivo de metadados por asset/timeframe.
 *
 * Espera receber apenas o lote **novo** de candles (por exemplo, de um chunk do download),
 * e se encarrega de mesclar com o segmento correspondente (por ano) e atualizar o meta.
 *
 * Estrutura gerada:
 * - DATA_DIR/{asset}-{timeframe}-{year}.json
 *   { asset, timeframe, segment: year, range: {start,end}, candles: [...], lastUpdated }
 * - DATA_DIR/{asset}-{timeframe}-meta.json
 *   { asset, timeframe, range, totalCount, segments: [{segment,file,start,end,count}], lastUpdated }
 */
const writeCandlesToDisk = (asset, timeframe, candles) => {
  const safeCandles = Array.isArray(candles) ? candles : [];
  if (!safeCandles.length) return;

  const base = `${asset.toLowerCase()}-${timeframe.toLowerCase()}`;
  const metaPath = path.join(DATA_DIR, `${base}-meta.json`);
  const existingMeta = readJsonIfExists(metaPath) || {
    asset,
    timeframe,
    range: undefined,
    totalCount: 0,
    segments: [],
  };

  const segmentsMap = new Map();

  safeCandles.forEach((candle) => {
    if (!candle || !candle.time) return;
    const d = new Date(candle.time);
    if (Number.isNaN(d.getTime())) return;
    const year = d.getUTCFullYear();
    if (!segmentsMap.has(year)) {
      segmentsMap.set(year, []);
    }
    segmentsMap.get(year).push(candle);
  });

  let globalStart = existingMeta.range?.start || null;
  let globalEnd = existingMeta.range?.end || null;
  let totalCount = existingMeta.totalCount || 0;
  const segmentsMeta = Array.isArray(existingMeta.segments) ? [...existingMeta.segments] : [];

  const nowIso = new Date().toISOString();

  Array.from(segmentsMap.entries())
    .sort(([aYear], [bYear]) => aYear - bYear)
    .forEach(([year, yearCandles]) => {
      if (!Array.isArray(yearCandles) || !yearCandles.length) return;

      const filename = `${base}-${year}.json`;
      const filepath = path.join(DATA_DIR, filename);

      const existingSegment = readJsonIfExists(filepath);
      const existingCandles = Array.isArray(existingSegment?.candles) ? existingSegment.candles : [];

      const combined = mergeByTime(existingCandles, yearCandles, 'time');
      if (!combined.length) return;

      combined.sort((a, b) => {
        const ta = new Date(a.time).getTime();
        const tb = new Date(b.time).getTime();
        return ta - tb;
      });

      const segStart = combined[0].time;
      const segEnd = combined[combined.length - 1].time;

      const payload = {
        asset,
        timeframe,
        segment: String(year),
        range: { start: segStart, end: segEnd },
        candles: combined,
        lastUpdated: nowIso,
      };

      writeJson(filepath, payload);

      const idx = segmentsMeta.findIndex((s) => String(s.segment) === String(year));
      const segCount = combined.length;
      if (idx >= 0) {
        const prev = segmentsMeta[idx];
        totalCount -= prev.count || 0;
        segmentsMeta[idx] = {
          segment: String(year),
          file: filename,
          start: segStart,
          end: segEnd,
          count: segCount,
        };
      } else {
        segmentsMeta.push({
          segment: String(year),
          file: filename,
          start: segStart,
          end: segEnd,
          count: segCount,
        });
      }
      totalCount += segCount;

      if (!globalStart || segStart < globalStart) globalStart = segStart;
      if (!globalEnd || segEnd > globalEnd) globalEnd = segEnd;
    });

  // Garantia: se algo deu errado no cálculo incremental, recalc totalCount a partir dos segmentos.
  if (!Number.isFinite(totalCount) || totalCount < 0) {
    totalCount = segmentsMeta.reduce((sum, seg) => sum + (seg.count || 0), 0);
  }

  segmentsMeta.sort((a, b) => {
    const ta = new Date(a.start || 0).getTime();
    const tb = new Date(b.start || 0).getTime();
    return ta - tb;
  });

  const metaPayload = {
    asset,
    timeframe,
    range: globalStart && globalEnd ? { start: globalStart, end: globalEnd } : existingMeta.range,
    totalCount,
    segments: segmentsMeta,
    lastUpdated: nowIso,
  };

  writeJson(metaPath, metaPayload);
};

module.exports = { writeCandlesToDisk };

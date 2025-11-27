const fs = require('fs');
const path = require('path');
const { normalizeTime } = require('../leanDataBridge');

const fromOADate = (value) => {
  const millis = (value - 25569) * 86400 * 1000;
  return new Date(millis);
};

const parseNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim();
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
};

const parsePercent = (value) => {
  const num = parseNumber(value);
  if (num === null) return null;
  const hasPercent = typeof value === 'string' && value.includes('%');
  return hasPercent ? num / 100 : num;
};

const parseEquityFromCharts = (charts) => {
  if (!charts || typeof charts !== 'object') return [];
  const chartNames = Object.keys(charts);
  for (const chartName of chartNames) {
    const chart = charts[chartName];
    if (!chart?.Series) continue;
    const seriesNames = Object.keys(chart.Series);
    for (const seriesName of seriesNames) {
      const series = chart.Series[seriesName];
      if (!series?.Values || !Array.isArray(series.Values)) continue;
      return series.Values.map((point) => {
        const { x, y } = point || {};
        const time = typeof x === 'number' ? fromOADate(x).toISOString() : normalizeTime(x);
        return { time, value: Number(y || 0) };
      });
    }
  }
  return [];
};

const parseEquityCsv = (csvPath) => {
  if (!fs.existsSync(csvPath)) return [];
  const [header, ...rows] = fs.readFileSync(csvPath, 'utf-8').split(/\r?\n/).filter(Boolean);
  if (!header || !header.toLowerCase().includes('time')) return [];
  const headers = header.split(',');
  const timeIndex = headers.findIndex((h) => h.toLowerCase() === 'time');
  const valueIndex = headers.findIndex((h) => h.toLowerCase().includes('value') || h.toLowerCase().includes('equity'));
  if (timeIndex === -1 || valueIndex === -1) return [];
  return rows
    .map((row) => row.split(','))
    .filter((cols) => cols.length > Math.max(timeIndex, valueIndex))
    .map((cols) => ({
      time: cols[timeIndex],
      value: Number(cols[valueIndex]),
    }));
};

module.exports = {
  parseNumber,
  parsePercent,
  parseEquityFromCharts,
  parseEquityCsv,
};

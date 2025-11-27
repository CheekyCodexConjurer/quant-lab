const TIMEFRAME_TO_MS = {
  m1: 60 * 1000,
  m5: 5 * 60 * 1000,
  m15: 15 * 60 * 1000,
  m30: 30 * 60 * 1000,
  h1: 60 * 60 * 1000,
  h4: 4 * 60 * 60 * 1000,
  d1: 24 * 60 * 60 * 1000,
  mn1: 30 * 24 * 60 * 60 * 1000,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 14;
const CHUNK_DAYS = {
  m1: 30,
  m5: 60,
  m15: 90,
  m30: 120,
  h1: 180,
  h4: 365,
  d1: 0,
  mn1: 0,
};

const buildChunks = (range, frame) => {
  const chunkDays = CHUNK_DAYS[frame] || 0;
  if (!chunkDays) return [{ from: range.from, to: range.to }];
  const chunks = [];
  let cursor = new Date(range.from).getTime();
  const toMs = new Date(range.to).getTime();
  while (cursor < toMs) {
    const next = cursor + chunkDays * DAY_MS;
    const chunkEnd = Math.min(next, toMs);
    // Return Date objects to keep the consumer logic (toISOString, getTime) working without extra parsing.
    chunks.push({ from: new Date(cursor), to: new Date(chunkEnd) });
    cursor = chunkEnd;
  }
  return chunks;
};

module.exports = {
  TIMEFRAME_TO_MS,
  DAY_MS,
  DEFAULT_RANGE_DAYS,
  CHUNK_DAYS,
  buildChunks,
};

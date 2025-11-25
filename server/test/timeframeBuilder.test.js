const assert = require('assert');
const { buildTimeframesFromTicks } = require('../src/services/timeframeBuilder');

const createTick = (timestamp, price, volume = 0.25) => ({
  timestamp,
  askPrice: price + 0.5,
  bidPrice: price - 0.5,
  askVolume: volume,
  bidVolume: volume,
});

const start = Date.parse('2024-01-01T00:00:00.000Z');
const ticks = [];
for (let minute = 0; minute < 10; minute += 1) {
  const ts = start + minute * 60 * 1000;
  ticks.push(createTick(ts, 100 + minute, 0.1 + minute * 0.01));
}

const frames = buildTimeframesFromTicks(ticks, ['M1', 'M5', 'H1']);

const m1 = frames.get('M1');
assert.ok(m1, 'M1 frame should exist');
assert.strictEqual(m1.length, 10);
assert.strictEqual(m1[0].open, 100);
assert.strictEqual(m1[m1.length - 1].close, 109);

const m5 = frames.get('M5');
assert.ok(m5, 'M5 frame should exist');
assert.strictEqual(m5.length, 2);
assert.strictEqual(m5[0].high, 104);
assert.strictEqual(m5[1].low, 105);

const h1 = frames.get('H1');
assert.ok(h1, 'H1 frame should exist');
assert.strictEqual(h1.length, 1);
assert.strictEqual(h1[0].open, 100);
assert.strictEqual(h1[0].close, 109);

console.log('timeframeBuilder tests passed ✅');

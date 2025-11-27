const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { writeIndicator, readIndicator, encodeId } = require('../src/services/indicatorFileService');
const { INDICATORS_DIR } = require('../src/constants/paths');

const TEST_ID = 'tmp_indicator_test';
const REQUEST_PATH = 'indicators/tmp_indicator_test.py';
const CANONICAL_REL = 'tmp_indicator_test.py';
const CANONICAL_PATH = path.join(INDICATORS_DIR, CANONICAL_REL);
const LEGACY_PATH = path.join(INDICATORS_DIR, REQUEST_PATH);

const cleanup = () => {
  [CANONICAL_PATH, LEGACY_PATH].forEach((file) => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
  const legacyFolder = path.dirname(LEGACY_PATH);
  if (legacyFolder !== INDICATORS_DIR && fs.existsSync(legacyFolder) && fs.readdirSync(legacyFolder).length === 0) {
    fs.rmdirSync(legacyFolder);
  }
};

cleanup();

const item = writeIndicator(TEST_ID, '# test indicator', REQUEST_PATH);
assert.ok(fs.existsSync(CANONICAL_PATH), 'file should be created directly under indicators/');
assert.strictEqual(fs.existsSync(LEGACY_PATH), false, 'should not create nested indicators/ folder when path is prefixed');
assert.ok(item, 'writeIndicator should return an item');

const read = readIndicator(item.id || encodeId(CANONICAL_REL));
assert.ok(read, 'readIndicator should resolve the saved file');
assert.strictEqual(
  read.filePath.replace(/\\/g, '/').includes('/indicators/indicators/'),
  false,
  'metadata path should not include duplicated indicators folder'
);

cleanup();
console.log('indicatorFileService path normalization tests passed');

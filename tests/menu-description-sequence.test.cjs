const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative) {
  const context = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  return context.exports;
}
const { menuDescriptionFrame: frame, menuDescriptionDuration: duration, menuMotion } = load('../src/utils/menu-description-sequence.ts');
const { ownerMenuTools } = load('../src/data/menu.ts');
const lengths = Array.from(ownerMenuTools, tool => Array.from(tool.subtitle || '').length);
const counts = (at, reduced = false) => Array.from(frame(at, lengths, reduced).characters);
const empty = lengths.map(() => 0);
const eraseEnd = duration(lengths) - menuMotion.titleMoveMs;

test('every description starts empty and reveals its first character together at 55 ms', () => {
  assert.deepEqual(counts(0), empty);
  assert.deepEqual(counts(54), empty);
  assert.deepEqual(counts(55), lengths.map(length => Math.min(length, 1)));
  assert.deepEqual(counts(110), lengths.map(length => Math.min(length, 2)));
});

test('typing advances by one character every 55 ms without pause or stagger', () => {
  for (let n = 1; n <= Math.max(...lengths); n++) {
    assert.deepEqual(counts(n * 55 - 1), lengths.map(length => Math.min(length, n - 1)));
    assert.deepEqual(counts(n * 55), lengths.map(length => Math.min(length, n)));
  }
  assert.deepEqual(counts(14_999), lengths);
  assert.equal(frame(14_999, lengths, false).titleProgress, 0);
});

test('15 seconds includes typing; backspacing removes one character from each end every 35 ms', () => {
  assert.deepEqual(counts(15_000), lengths);
  for (let n = 1; n <= Math.max(...lengths); n++) {
    assert.deepEqual(counts(15_000 + n * 35 - 1), lengths.map(length => Math.max(0, length - n + 1)));
    assert.deepEqual(counts(15_000 + n * 35), lengths.map(length => Math.max(0, length - n)));
  }
});

test('titles wait for the longest description to erase, then ease downward over 280 ms', () => {
  assert.equal(frame(eraseEnd - 1, lengths, false).titleProgress, 0);
  assert.deepEqual(counts(eraseEnd), empty);
  assert.equal(frame(eraseEnd, lengths, false).titleProgress, 0);
  assert.equal(frame(eraseEnd + 70, lengths, false).titleProgress, 0.0625);
  assert.equal(frame(eraseEnd + 140, lengths, false).titleProgress, 0.5);
  assert.equal(frame(eraseEnd + 280, lengths, false).titleProgress, 1);
});

test('finished descriptions stay hidden and titles settled indefinitely', () => {
  for (const at of [duration(lengths), 60_000, 3_600_000]) {
    assert.deepEqual(counts(at), empty);
    assert.equal(frame(at, lengths, false).titleProgress, 1);
  }
});

test('sampling elapsed time skips delayed frames without accumulating timer drift', () => {
  assert.deepEqual(counts(1_000), lengths.map(length => Math.min(length, 18)));
  assert.deepEqual(counts(15_777), lengths.map(length => Math.max(0, length - 22)));
  assert.deepEqual(counts(0), empty); // A fresh opening never retains an old frame.
  assert.equal(frame(0, lengths, false).titleProgress, 0);
});

test('reduced motion shows full text immediately and hides/repositions instantly at 15 seconds', () => {
  for (const at of [0, 55, 3_000, 14_999]) {
    assert.deepEqual(counts(at, true), lengths);
    assert.equal(frame(at, lengths, true).titleProgress, 0);
  }
  for (const at of [15_000, 15_001, 60_000]) {
    assert.deepEqual(counts(at, true), empty);
    assert.equal(frame(at, lengths, true).titleProgress, 1);
  }
});

test('an unusually long description backspaces only characters actually typed by the deadline', () => {
  const long = [400, 5];
  assert.deepEqual(Array.from(frame(15_000, long, false).characters), [272, 5]);
  assert.deepEqual(Array.from(frame(15_035, long, false).characters), [271, 4]);
  assert.deepEqual(Array.from(frame(duration(long), long, false).characters), [0, 0]);
});

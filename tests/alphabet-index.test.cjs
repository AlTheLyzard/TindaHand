const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/alphabet-index.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { alphabetIndexAtOffset: pick, currentAlphabetSection: current } = context.exports;

test('alphabet drag clamps outside the rail and reaches every section', () => {
  assert.equal(pick(0, 0, 7), -1);
  assert.equal(pick(0, 308, 0), -1);
  assert.equal(pick(-20, 308, 7), 0);
  for (let i = 0; i < 7; i++) assert.equal(pick(i * 44 + 22, 308, 7), i);
  assert.equal(pick(400, 308, 7), 6);
});

test('small movements around a letter boundary retain the current section in either direction', () => {
  assert.equal(pick(43, 308, 7, 0), 0);
  assert.equal(pick(45, 308, 7, 0), 0);
  assert.equal(pick(48, 308, 7, 0), 1);
  assert.equal(pick(43, 308, 7, 1), 1);
  assert.equal(pick(40, 308, 7, 1), 0);
  assert.equal(pick(290, 308, 7, 0), 6, 'fast drags can cross several sections');
  assert.equal(pick(12.5, 70, 7, 0), 1, 'hysteresis shrinks to fit compact cells');
});

test('current section follows the top edge and retains the last short section at the end', () => {
  const letters = ['A', 'B', 'C'];
  const offsets = { A: 0, B: 250, C: 500 };
  assert.equal(current(letters, offsets, 180, 0, 400, 800), 'A');
  assert.equal(current(letters, offsets, 180, 300, 200, 1000), 'A');
  assert.equal(current(letters, offsets, 180, 429, 200, 1000), 'B');
  assert.equal(current(letters, offsets, 180, 500, 200, 1000), 'B');
  assert.equal(current(letters, offsets, 180, 680, 200, 1000), 'C');
  assert.equal(current(letters, offsets, 180, 400, 400, 800), 'C', 'last section cannot reach the top');
});

test('filtering uses only current letters, defaults to the first short result and clears an empty list', () => {
  assert.equal(current(['C'], { A: 0, B: 100, C: 0 }, 180, 0, 600, 400), 'C');
  assert.equal(current(['B', 'C'], { A: 0, B: 0, C: 250 }, 180, 0, 600, 500), 'B');
  assert.equal(current([], { A: 0 }, 180, 400, 400, 800), null);
  assert.equal(current(['A', 'B'], {}, 180, 180, 400, 800), 'A', 'unmeasured offsets cannot select a later section');
});

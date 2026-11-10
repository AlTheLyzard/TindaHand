const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/sheet.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { sheetHeights, releaseSheet } = context.exports;

test('initial sheet contains the full form and is capped to the available safe area', () => {
  const tall = sheetHeights(820, 420, 240);
  assert.equal(tall.content, 660);
  assert.equal(tall.expanded, 820);
  assert.equal(sheetHeights(820, 1500, 240).content, 820);
  assert.equal(sheetHeights(280, 420, 220).content, 280);
  assert.equal(sheetHeights(280, 420, 220).compact, 280);
});
test('release snaps to content, compact or expanded, including directional velocity', () => {
  const heights = sheetHeights(820, 420, 240);
  assert.equal(releaseSheet(650, 0, heights), 'content');
  assert.equal(releaseSheet(385, 0, heights), 'compact');
  assert.equal(releaseSheet(805, 0, heights), 'expanded');
  assert.equal(releaseSheet(680, -0.9, heights), 'expanded');
  assert.equal(releaseSheet(500, 0.9, heights), 'compact');
});
test('dismissal requires pulling past compact or a downward flick near compact', () => {
  const heights = sheetHeights(820, 420, 240);
  assert.equal(releaseSheet(heights.compact - 73, 0, heights), 'dismiss');
  assert.equal(releaseSheet(heights.compact + 10, 1.3, heights), 'dismiss');
  assert.notEqual(releaseSheet(heights.compact + 10, -1.3, heights), 'dismiss');
  assert.notEqual(releaseSheet(heights.content, 1.3, heights), 'dismiss');
});

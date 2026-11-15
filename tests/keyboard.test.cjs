const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/keyboard.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { focusedFieldScroll } = context.exports;
const base = { viewport: { top: 80, height: 420 }, field: { top: 360, height: 100 }, input: { top: 385, height: 48 }, offset: 200 };

test('visible label, field and error require no movement', () => {
  assert.equal(focusedFieldScroll(base), 200);
});
test('keyboard coverage scrolls only the obscured field region into view', () => {
  assert.equal(focusedFieldScroll({ ...base, keyboardTop: 400 }), 272);
});
test('a login PIN field reserves measured room for its primary button above the keyboard', () => {
  const group = { viewport: { top: 72, height: 855 }, field: { top: 453, height: 438 },
    input: { top: 555, height: 138 }, offset: 0, keyboardTop: 855, scrollAfter: 225 };
  const offset = focusedFieldScroll(group);
  assert.equal(offset, 273);
  assert.ok(group.field.top - offset >= group.viewport.top + 12, 'the PIN label and error remain visible');
  assert.ok(group.field.top + group.field.height + group.scrollAfter - offset <= group.keyboardTop - 12,
    'the measured button space also clears the keyboard');
});
test('an already resized viewport does not add a second keyboard offset', () => {
  assert.equal(focusedFieldScroll({ ...base, viewport: { top: 80, height: 320 }, keyboardTop: 400 }), 272);
});
test('switching upward preserves the label and clamps the scroll origin', () => {
  assert.equal(focusedFieldScroll({ ...base, field: { top: 60, height: 90 } }), 168);
  assert.equal(focusedFieldScroll({ ...base, offset: 0, field: { top: 60, height: 90 } }), 0);
});
test('large help text prioritizes the actual editor in a short viewport', () => {
  assert.equal(focusedFieldScroll({ ...base, viewport: { top: 80, height: 160 }, field: { top: 120, height: 330 }, input: { top: 200, height: 48 } }), 220);
});
test('hidden or unusable viewports cannot trigger runaway scrolling', () => {
  assert.equal(focusedFieldScroll({ ...base, viewport: { top: 80, height: 0 } }), 200);
  assert.equal(focusedFieldScroll({ ...base, keyboardTop: 50 }), 200);
});
test('dismissing the keyboard does not add spacing or move a visible field', () => {
  assert.equal(focusedFieldScroll({ ...base, keyboardTop: Infinity }), 200);
});
test('a not-yet-measured label region falls back to the visible native editor', () => {
  assert.equal(focusedFieldScroll({ ...base, field: { top: 0, height: 0 } }), 200);
});

test('remembered identity and PIN scroll together above a reduced keyboard viewport', () => {
  const group = { viewport: { top: 24, height: 280 }, field: { top: 220, height: 232 }, input: { top: 370, height: 48 }, offset: 0, keyboardTop: 304 };
  const offset = focusedFieldScroll(group);
  assert.equal(offset, 160);
  assert.ok(group.field.top - offset >= group.viewport.top + 12, 'the ID stays visible');
  assert.ok(group.input.top + group.input.height - offset <= group.keyboardTop - 12, 'the PIN stays accessible');
});

test('clamps to real scrollable content while the keyboard viewport is still resizing', () => {
  assert.equal(focusedFieldScroll({ ...base, keyboardTop: 300, contentHeight: 650 }), 230);
  assert.equal(focusedFieldScroll({ ...base, keyboardTop: 300, contentHeight: 300 }), 0);
});

test('an already revealed field stays put on repeated selection or validation measurements', () => {
  const covered = { ...base, keyboardTop: 400 };
  const next = focusedFieldScroll(covered);
  const movement = next - covered.offset;
  assert.equal(focusedFieldScroll({ ...covered, offset: next,
    field: { ...covered.field, top: covered.field.top - movement },
    input: { ...covered.input, top: covered.input.top - movement } }), next);
});

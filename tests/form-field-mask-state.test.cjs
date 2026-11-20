const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'src/utils/form-field-mask-state.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loadedModule = { exports: {} };
new Function('exports', 'module', compiled)(loadedModule.exports, loadedModule);
const { getFormFieldMaskState } = loadedModule.exports;

test('password mask switches cleanly between hidden, visible and empty states', () => {
  const base = { password: true, passwordIndicators: true, value: 'Secret123!', accentColor: '#2F6CC9' };
  const hidden = getFormFieldMaskState({ ...base, visible: false });
  assert.equal(hidden.hasValue, true);
  assert.equal(hidden.secureTextEntry, true);
  assert.equal(hidden.showPasswordIndicators, true);
  assert.equal(hidden.showMaskIndicators, true);
  assert.equal(hidden.textColor, 'transparent');
  assert.equal(hidden.hidePlaceholder, true);
  assert.equal(hidden.caretHidden, false);
  assert.equal(hidden.selectionColor, '#2F6CC9');

  const shown = getFormFieldMaskState({ ...base, visible: true });
  assert.equal(shown.secureTextEntry, false);
  assert.equal(shown.showMaskIndicators, false);
  assert.equal(shown.textColor, undefined);
  assert.equal(shown.hidePlaceholder, true);
  assert.notEqual(shown.caretHidden, true);

  const empty = getFormFieldMaskState({ ...base, value: '', visible: false });
  assert.equal(empty.hasValue, false);
  assert.equal(empty.showMaskIndicators, false);
  assert.equal(empty.hidePlaceholder, false);
  assert.notEqual(empty.caretHidden, true);
});

test('PIN visibility behavior keeps its existing indicator and cursor rules', () => {
  const base = { pin: true, pinIndicators: true, pinVisibilityToggle: true, value: '1234', accentColor: '#2F6CC9' };
  const hidden = getFormFieldMaskState({ ...base, visible: false });
  assert.equal(hidden.showPinIndicators, true);
  assert.equal(hidden.textColor, 'transparent');
  assert.equal(hidden.caretHidden, true);
  assert.equal(hidden.selectionColor, 'transparent');

  const shown = getFormFieldMaskState({ ...base, visible: true });
  assert.equal(shown.showPinIndicators, false);
  assert.equal(shown.secureTextEntry, false);
  assert.equal(shown.textColor, undefined);
});

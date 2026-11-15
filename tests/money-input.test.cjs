const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
function load(file) {
  const context = { exports: {}, require: name => load(path.join(path.dirname(file), name + '.ts')) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}
const { formatMoneyInput: format, parseMoneyPaste: paste, editMoneyInput: edit } = load('src/utils/money-input.ts');
const { parsePaymentAmount: centavos } = load('src/utils/pos-payment.ts');
const caret = start => ({ start, end: start });

test('money typing groups whole pesos and preserves decimal editing states', () => {
  for (const [raw, display] of [['', ''], ['1000', '1,000'], ['12500.50', '12,500.50'], ['1000.', '1,000.'], ['1000.5', '1,000.5'], ['.', '.'], ['.5', '.5']]) assert.equal(format(raw), display);
  let previous = '', selection = caret(0), result;
  for (const digit of '12500.50') {
    const proposed = previous.slice(0, selection.start) + digit + previous.slice(selection.end);
    result = edit(previous, proposed, selection);
    previous = result.text; selection = result.selection;
  }
  assert.equal(result.text, '12,500.50'); assert.equal(result.canonical, '12500.50'); assert.equal(centavos(result.canonical), 1250050);
  assert.equal(result.selection.start, 9);
});

test('blur pads valid amounts without rounding or changing empty/invalid values', () => {
  for (const [raw, display] of [['', ''], ['1000', '1,000.00'], ['1000.', '1,000.00'], ['1000.5', '1,000.50'], ['0', '0.00'], ['.01', '0.01'], ['00010.50', '10.50'], ['.', '.'], ['1.234', '1.234']]) assert.equal(format(raw, true), display);
  assert.equal(format('900719925474099.99', true), '900,719,925,474,099.99');
  assert.equal(centavos('900719925474099.99'), null);
});

test('paste validates grouping, symbols, precision and syntax before producing canonical pesos', () => {
  for (const [input, raw] of [['1,000.', '1000.'], ['₱12,500.50', '12500.50'], [' 1000.5 ', '1000.5'], ['0.00', '0.00'], ['', '']]) assert.equal(paste(input), raw);
  for (const value of ['1,00', '12,34,567', '1,,000', '1 000', '-100', '+100', '1e3', '1.234', '100 PHP', '₱₱10', '1.2.3', '₱', ' ']) {
    assert.equal(paste(value), null, value);
    assert.equal(edit('', value, caret(0)), null, value);
  }
  const result = edit('50.00', '₱12,500.50', { start: 0, end: 5 });
  assert.equal(result.canonical, '12500.50'); assert.equal(result.text, '12,500.50');
});

test('middle insertion, selection replacement, backspace, separator deletion and clearing retain caret position', () => {
  let result = edit('1,000', '12,000', caret(1));
  assert.equal(result.canonical, '12000'); assert.equal(result.selection.start, 2);
  result = edit('12,500.50', '12,000.50', { start: 3, end: 4 });
  assert.equal(result.text, '12,000.50'); assert.equal(result.selection.start, 4);
  result = edit('12,500', '1,500', caret(2));
  assert.equal(result.text, '1,500'); assert.equal(result.selection.start, 1);
  result = edit('1,000', '1000', caret(2));
  assert.equal(result.canonical, '000'); assert.equal(result.selection.start, 0);
  result = edit('1,234', '1234', caret(1));
  assert.equal(result.canonical, '134'); assert.equal(result.selection.start, 1);
  result = edit('1,234.50', '', { start: 0, end: 8 });
  assert.equal(result.canonical, ''); assert.equal(result.text, ''); assert.equal(result.selection.start, 0);
  assert.equal(edit('1,000.50', '1,000.501', caret(8)), null);
  result = edit('', '1500.5', caret(8));
  assert.equal(result.text, '1,500.5'); assert.equal(result.canonical, '1500.5');
  result = edit('1', '15', { start: 0, end: 8 });
  assert.equal(result.text, '15'); assert.equal(result.selection.start, 2);
});

test('money input keeps presentation out of form values, rejects native edits and follows external shortcuts', () => {
  const slots = []; let cursor = 0, canonical = '', changes = [];
  const state = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  };
  const context = { exports: {}, require(name) {
    if (name === 'react') return { useState: state, useRef: value => state(() => ({ current: value }))[0], useImperativeHandle() {}, useEffect: fn => fn(), useLayoutEffect: fn => fn() };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === 'nativewind') return { cssInterop() {} };
    if (name === './keyboard-aware-scroll-view') return { KeyboardInput: 'Input' };
    if (name === '@/utils/money-input') return { editMoneyInput: edit, formatMoneyInput: format };
    throw Error(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ui/money-input.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  const render = () => { cursor = 0; return context.exports.MoneyInput({ value: canonical, onChangeText: value => { canonical = value; changes.push(value); } }).props; };
  let input = render();
  input.onChangeText('1000.5'); input = render();
  assert.equal(input.value, '1,000.5'); assert.equal(canonical, '1000.5');
  input.onBlur({}); input = render();
  assert.equal(input.value, '1,000.50'); assert.equal(canonical, '1000.5');
  input.onSelectionChange({ nativeEvent: { selection: { start: 0, end: 8 } } });
  input.onChangeText('1,00'); input = render();
  assert.equal(input.value, '1,000.50'); assert.equal(canonical, '1000.5');
  input.onChangeText('₱12,500.50'); input = render();
  assert.equal(input.value, '12,500.50'); assert.equal(canonical, '12500.50');
  canonical = '500'; input = render(); input = render();
  assert.equal(input.value, '500.00'); assert.equal(canonical, '500');
  canonical = ''; input = render(); input = render(); input.onBlur({});
  assert.equal(render().value, '');
  assert.deepEqual(changes, ['1000.5', '12500.50']);

  // Native events can share a render. Blur must settle the latest edit, and an
  // invalid following key must restore that draft rather than the old prop.
  input = render();
  input.onChangeText('1500.5');
  input.onBlur({});
  input = render();
  assert.equal(input.value, '1,500.50'); assert.equal(canonical, '1500.5');
  input.onSelectionChange({ nativeEvent: { selection: { start: 0, end: 8 } } });
  input.onChangeText('2500.50');
  input.onChangeText('2,500.501');
  input = render();
  assert.equal(input.value, '2,500.50'); assert.equal(canonical, '2500.50');

  // An unrelated form render before the parent acknowledges the edit also
  // preserves a decimal point and fractional draft.
  input.onSelectionChange({ nativeEvent: { selection: { start: 0, end: 8 } } });
  input.onChangeText('1500.');
  const pendingValue = canonical;
  canonical = '2500.50'; input = render();
  assert.equal(input.value, '1,500.');
  canonical = pendingValue; input = render();
  assert.equal(input.value, '1,500.');
});

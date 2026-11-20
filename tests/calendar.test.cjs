const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const context = { exports: {}, require: name => load(path.join(path.dirname(file), name + '.ts')) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  cache.set(file, context.exports); return context.exports;
}
const { calendarDays, inclusiveCalendarDays, moveCalendarMonth, selectCalendarRange } = load(path.join(__dirname, '../src/utils/calendar.ts'));

test('calendar starts Monday and includes adjacent dates, leap days and year transitions', () => {
  const october = calendarDays('2026-10');
  assert.equal(october[0], '2026-09-28'); assert.equal(october.at(-1), '2026-11-01');
  assert.equal(october.length % 7, 0);
  assert.ok(calendarDays('2028-02').includes('2028-02-29'));
  assert.ok(!calendarDays('2027-02').includes('2027-02-29'));
  assert.equal(moveCalendarMonth('2026-12', 1), '2027-01');
  assert.equal(moveCalendarMonth('2027-01', -1), '2026-12');
});

test('month navigation respects existing year and date restrictions', () => {
  assert.equal(moveCalendarMonth('1900-01', -1, '1900-01-01'), '1900-01');
  assert.equal(moveCalendarMonth('0001-01', -1), '0001-01');
  assert.equal(moveCalendarMonth('9999-12', 1), '9999-12');
  assert.equal(moveCalendarMonth('2026-11', 1, '2026-10-01', '2026-11-15'), '2026-11');
});

test('range endpoints are inclusive across months and DST, with same-day ranges allowed', () => {
  assert.equal(inclusiveCalendarDays({ from: '2026-10-01', to: '2026-10-31' }), 31);
  assert.equal(inclusiveCalendarDays({ from: '2028-02-28', to: '2028-03-01' }), 3);
  assert.equal(inclusiveCalendarDays({ from: '2026-03-07', to: '2026-03-09' }), 3);
  assert.equal(inclusiveCalendarDays({ from: '2026-12-31', to: '2027-01-01' }), 2);
  assert.equal(inclusiveCalendarDays({ from: '2026-11-13', to: '2026-11-13' }), 1);
  assert.equal(inclusiveCalendarDays({ from: '2026-11-14', to: '2026-11-13' }), 0);
  assert.equal(inclusiveCalendarDays({ from: '2026-02-29', to: '2026-03-01' }), 0);
});

test('range selection restarts after a complete range and orders a backwards endpoint', () => {
  const committed = { from: '2026-10-01', to: '2026-10-31' };
  const start = selectCalendarRange(committed, '2026-12-01');
  assert.equal(start.from, '2026-12-01'); assert.equal(start.to, '');
  const end = selectCalendarRange(start, '2026-11-28');
  assert.equal(end.from, '2026-11-28'); assert.equal(end.to, '2026-12-01');
  assert.equal(committed.from, '2026-10-01'); assert.equal(committed.to, '2026-10-31');
});

function calendarUIHarness() {
  let cursor = 0;
  const slots = [];
  const dependencies = {
    react: { useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { Text: 'Text', View: 'View', useWindowDimensions: () => ({ fontScale: 1 }) },
    './button': { Button: 'Button', IconButton: 'IconButton' },
    './motion-pressable': { MotionPressable: 'Pressable' },
    '@/components/pos/pos-icon': { PosIcon: 'Icon' },
    '@/constants/design-tokens.json': require('../src/constants/design-tokens.json'),
    '@/utils/date': load(path.join(__dirname, '../src/utils/date.ts')),
    '@/utils/calendar': load(path.join(__dirname, '../src/utils/calendar.ts')),
  };
  const context = { exports: {}, require(name) {
    if (name in dependencies) return dependencies[name];
    throw Error('Unexpected dependency ' + name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ui/date-picker.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return props => { cursor = 0; return context.exports.DateCalendar(props); };
}

test('shared date calendar uses the larger semibold day numbers across date-picker surfaces', () => {
  const tree = calendarUIHarness()({ selection: { from: '2026-11-19', to: '2026-11-19' }, mode: 'single', month: '2026-11', onMonth() {}, onSelect() {} });
  const visit = node => Array.isArray(node) ? node.flatMap(visit) : node?.props ? [node, ...visit(node.props.children)] : [];
  const day = visit(tree).find(node => node.type === 'Text' && typeof node.props.children === 'number');
  assert.ok(day);
  assert.equal(day.props.style.fontFamily, 'Poppins_600SemiBold');
  assert.equal(day.props.style.fontSize, 18);
});

function pickerHarness(component, props) {
  const slots = []; let cursor = 0;
  const context = { exports: {}, require(name) {
    if (name === 'react') return { useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    } };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return { Text: 'Text', View: 'View' };
    if (name === '@/utils/calendar') return load(path.join(__dirname, '../src/utils/calendar.ts'));
    if (name === '@/utils/date') return load(path.join(__dirname, '../src/utils/date.ts'));
    if (name === '@/constants/design-tokens.json') return require('../src/constants/design-tokens.json');
    return {};
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ui/date-picker.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  return () => { cursor = 0; return context.exports[component](props).props.children; };
}

test('single date is a local draft: cancel preserves committed value; only confirmation publishes', () => {
  let committed = '2028-02-29', cancelled = 0;
  const render = pickerHarness('DatePicker', { value: committed, onChange: value => { committed = value; }, onClose: () => cancelled++ });
  assert.equal(render()[0].props.selection.from, '2028-02-29');
  render()[0].props.onSelect('2028-03-01');
  assert.equal(committed, '2028-02-29');
  render()[2].props.onPress(); assert.equal(cancelled, 1); assert.equal(committed, '2028-02-29');
  render()[1].props.onPress(); assert.equal(committed, '2028-03-01');
});

test('range confirmation requires both endpoints and never mutates its input selection', () => {
  const committed = { from: '2026-10-01', to: '2026-10-31' }; let applied;
  const render = pickerHarness('DateRangePicker', { value: committed, onChange: value => { applied = value; }, onClose() {} });
  render()[0].props.onSelect('2026-12-31'); assert.equal(render()[1].props.disabled, true);
  render()[0].props.onSelect('2027-01-02'); assert.equal(render()[1].props.disabled, false);
  assert.equal(applied, undefined); assert.equal(committed.to, '2026-10-31');
  render()[1].props.onPress(); assert.equal(applied.from, '2026-12-31'); assert.equal(applied.to, '2027-01-02');
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree?.props ? [tree, ...nodes(tree.props.children)] : [];
}
function harness() {
  const slots = [], actions = [];
  let cursor = 0;
  const state = initial => {
    const i = cursor++;
    if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
  };
  const dependencies = {
    react: { useState: state, useRef: initial => state(() => ({ current: initial }))[0] },
    'react-native': { View: 'View', Text: 'Text', Keyboard: { dismiss() {} } },
    '@/components/ui/button': { IconButton: 'IconButton', ButtonSurface: 'ButtonSurface' },
    '@/constants/design-tokens.json': require('../src/constants/design-tokens.json'),
    '@/utils/dashboard': { formatPesos: amount => `pesos:${amount}` },
    '@/utils/date': { formatCalendarDate: value => `date:${value}` },
    '@/utils/inventory': { assetLabels: { equipment: 'Equipment' } },
    './inventory-popover': { InventoryPopover: 'Popover' },
  };
  const context = { exports: {}, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name in dependencies) return dependencies[name];
    throw Error('Unexpected dependency ' + name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/inventory/asset-card.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  const asset = { id: 'safe-asset', name: 'A long equipment name', valueCentavos: 345678, recordedDate: '2026-01-03', classification: 'equipment', usefulLifeYears: 5 };
  const render = () => { cursor = 0; return context.exports.AssetCard({ asset, onEdit: () => actions.push('edit') }); };
  const trigger = () => nodes(render()).find(node => node.type === 'IconButton').props;
  const popover = () => nodes(render()).find(node => node.type === 'Popover').props;
  const choose = () => nodes(render()).find(node => node.type === 'ButtonSurface').props.onPress();
  return { render, trigger, popover, choose, actions };
}

test('opening and dismissing an asset menu never edits or deletes a record', () => {
  const h = harness(); h.trigger().onPress();
  assert.equal(h.popover().visible, true);
  assert.deepEqual(h.actions, []);
  h.popover().onClose(); h.popover().onHidden();
  assert.equal(h.popover().visible, false);
  assert.deepEqual(h.actions, []);
});

test('the only asset menu action edits once after the menu window dismisses', () => {
  const h = harness(); h.trigger().onPress();
  const actions = nodes(h.render()).filter(node => node.type === 'ButtonSurface');
  assert.equal(actions.length, 1);
  assert.equal(actions[0].props.accessibilityLabel, 'Edit A long equipment name');
  h.choose();
  assert.equal(h.popover().visible, false);
  assert.deepEqual(h.actions, [], 'wait for the native modal to dismiss before the edit flow');
  h.popover().onHidden(); assert.deepEqual(h.actions, ['edit']);
  h.popover().onHidden(); assert.deepEqual(h.actions, ['edit'], 'do not replay a handled edit');
});

test('asset cards render their record rather than example content, with only a menu in the body', () => {
  const h = harness(), tree = h.render();
  const body = nodes(tree).filter(node => node.type === 'Text').map(node => node.props.children).flat().join('');
  assert.match(body, /A long equipment name/); assert.match(body, /Equipment/);
  assert.match(body, /pesos:345678/); assert.match(body, /date:2026-01-03/);
  assert.equal(h.trigger().accessibilityLabel, 'Actions for A long equipment name');
  assert.equal(tree.props.children.filter(child => child.type === 'Button').length, 0);
});

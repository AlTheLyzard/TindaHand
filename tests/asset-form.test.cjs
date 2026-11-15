const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function load(file, dependencies) {
  const context = { exports: {}, require: name => {
    if (name === 'react/jsx-runtime') return require(name);
    if (name in dependencies) return dependencies[name];
    throw Error('Unexpected dependency ' + name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return context.exports;
}
const { parsePaymentAmount } = load('src/utils/pos-payment.ts', {});
const labels = { current: 'Current Asset', equipment: 'Equipment', furniture: 'Furniture & Fixtures' };
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || !tree.props) return [];
  return [tree, ...nodes(tree.props.children)];
}
function harness() {
  const slots = [], writes = [], routes = [], feedback = [];
  let cursor = 0, accepted = true;
  const state = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  };
  const dependencies = {
    react: { useState: state, useRef: value => state(() => ({ current: value }))[0] },
    'react-native': { Keyboard: { dismiss() {} }, Text: 'Text', View: 'View' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) },
    'expo-router': { useLocalSearchParams: () => ({ mode: 'add' }), router: { canGoBack: () => true, back: () => routes.push('back') } },
    '@/i18n/use-translation': { useTranslation() {} }, '@/i18n': { t: key => key },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/keyboard-aware-scroll-view': { KeyboardAwareScrollView: 'ScrollView' },
    '@/components/ui/motion-modal': { MotionModal: 'Modal' },
    '@/components/ui/success-content': { SuccessContent: 'SuccessContent' },
    '@/components/dashboard/quick-add-ui': { quickAddColors: { backdrop: 'rgba(16,35,66,0.42)' } },
    './inventory-ui': Object.fromEntries(['InvCard', 'InvDanger', 'InvField', 'InventoryFrame', 'InvText'].map(name => [name, name])),
    './asset-classification-field': { AssetClassificationField: 'Classification' },
    '@/state/inventory': { useInventory: () => ({ store: { assets: [] }, dispatch: action => { writes.push(action); return accepted; }, setFeedback: message => feedback.push(message) }) },
    '@/utils/inventory': { assetLabels: labels, todayInManila: () => '2026-11-14' },
    '@/utils/dashboard': { formatPesos: amount => String(amount) },
    '@/utils/pos-payment': { parsePaymentAmount },
    '@/components/ui/content-state': { useContentPreview: () => ({}), EmptyState: 'EmptyState' },
    '@/components/ui/content-skeletons': { RecordSkeleton: 'Skeleton' },
  };
  dependencies['./inventory-ui'].inventoryIllustrations = {};
  const { AssetScreen } = load('src/components/inventory/asset-screen.tsx', dependencies);
  const render = () => { cursor = 0; return AssetScreen(); };
  const field = label => nodes(render()).find(node => node.type === 'InvField' && node.props.label === label).props;
  const classification = () => nodes(render()).find(node => node.type === 'Classification').props;
  const submit = () => nodes(render()).find(node => node.type === 'Button' && node.props.children === 'inventory.add.asset2').props.onPress();
  const modal = () => render().props.overlay;
  const success = () => nodes(modal()).find(node => node.type === 'SuccessContent');
  const fill = (value = '1500.5', category = 'equipment') => {
    field('inventory.asset.name.required').onChangeText('Demo shelf');
    field('inventory.amount.value.required').onChangeText(value);
    classification().onChange(category);
    if (category !== 'current') field('inventory.estimated.useful.life.in.years.required').onChangeText('5');
  };
  return { field, classification, submit, modal, success, fill, writes, routes, feedback, reject: () => { accepted = false; } };
}

test('asset classification changes preserve the ungrouped amount, name and useful-life draft', () => {
  const h = harness(); h.fill();
  for (const key of ['current', 'furniture', 'equipment']) h.classification().onChange(key);
  assert.equal(h.field('inventory.amount.value.required').value, '1500.5');
  assert.equal(h.field('inventory.asset.name.required').value, 'Demo shelf');
  assert.equal(h.field('inventory.estimated.useful.life.in.years.required').value, '5');
  assert.equal(h.classification().value, 'equipment');
});

test('asset save maps decimal pesos to centavos exactly and confirms only an accepted write', () => {
  const h = harness(); h.fill(); h.submit();
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].asset.valueCentavos, 150050);
  assert.equal(h.writes[0].asset.classification, 'equipment');
  assert.equal(h.modal().props.visible, true);
  assert.equal(h.success().props.title, 'Changes Saved');
  assert.equal(h.success().props.amountCentavos, 150050);
  assert.match(h.success().props.message, /Demo shelf added successfully/);
  h.submit(); assert.equal(h.writes.length, 1, 'rapid taps cannot duplicate an asset');
  h.success().props.onClose(); assert.equal(h.modal().props.visible, false);
  assert.equal(h.routes.length, 0, 'wait for modal dismissal before leaving');
  h.modal().props.onHidden(); assert.deepEqual(h.routes, ['back']);
  assert.deepEqual(h.feedback, [], 'do not show the old inventory confirmation as well');
});

test('invalid amounts and failed writes never open asset success; failure remains retryable', () => {
  for (const amount of ['', '0', '-1', '1.234', '1,500', '900719925474099.99']) {
    const h = harness(); h.fill(amount); h.submit();
    assert.equal(h.writes.length, 0, amount); assert.equal(h.modal().props.visible, false);
  }
  const h = harness(); h.fill(); h.reject(); h.submit(); h.submit();
  assert.equal(h.writes.length, 2); assert.equal(h.modal().props.visible, false);
  assert.equal(h.field('inventory.amount.value.required').value, '1500.5');
});

test('repeated asset additions have independent confirmations and retain current-asset mapping', () => {
  const ids = new Set();
  for (let index = 0; index < 3; index++) {
    const h = harness(); h.fill('1500.', 'current'); h.submit();
    assert.equal(h.writes[0].asset.valueCentavos, 150000);
    assert.equal(h.writes[0].asset.usefulLifeYears, 0);
    ids.add(h.success().props.eventKey);
    h.modal().props.onRequestClose(); assert.equal(h.modal().props.visible, false);
    h.modal().props.onHidden(); assert.deepEqual(h.routes, ['back']);
  }
  assert.equal(ids.size, 3, 'each new success has its own replay key');
});

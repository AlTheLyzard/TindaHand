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
function harness({ mode = 'add', asset } = {}) {
  const slots = [], writes = [], routes = [], feedback = [];
  let cursor = 0, accepted = true;
  const store = { assets: asset ? [asset] : [] };
  const state = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  };
  const dependencies = {
    react: { useState: state, useEffect() {}, useRef: value => state(() => ({ current: value }))[0] },
    'react-native': { Keyboard: { dismiss() {} }, Text: 'Text', View: 'View' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) },
    'expo-router': { useLocalSearchParams: () => ({ mode, id: asset?.id }), router: { dismissTo: destination => routes.push(`${destination.pathname}?tab=${destination.params.tab}`) } },
    '@/i18n/use-translation': { useTranslation() {} }, '@/i18n': { t: key => key },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/keyboard-aware-scroll-view': { KeyboardAwareScrollView: 'ScrollView' },
    '@/components/ui/motion-modal': { MotionModal: 'Modal' },
    '@/components/ui/confirmation-content': { ConfirmationContent: 'ConfirmationContent' },
    '@/components/ui/success-content': { SuccessContent: 'SuccessContent' },
    'expo-image': { Image: 'Image' },
    '@/components/dashboard/quick-add-ui': { quickAddColors: { backdrop: 'rgba(16,35,66,0.42)' } },
    './inventory-ui': Object.fromEntries(['InvCard', 'InvDanger', 'InvField', 'InventoryFrame', 'InvText'].map(name => [name, name])),
    './asset-classification-field': { AssetClassificationField: 'Classification', assetClassificationIllustrations: { current: {}, equipment: {}, furniture: {} } },
    '@/state/inventory': { useInventory: () => ({ store, dispatch: action => { writes.push(action); return accepted; }, setFeedback: message => feedback.push(message) }) },
    '@/utils/inventory': { assetLabels: labels, todayInManila: () => '2026-11-14' },
    '@/utils/dashboard': { formatPesos: amount => String(amount) },
    '@/utils/pos-payment': { parsePaymentAmount },
    '@/components/ui/content-state': { useContentPreview: () => ({}), EmptyState: 'EmptyState' },
    '@/components/ui/content-skeletons': { RecordSkeleton: 'Skeleton' },
  };
  dependencies['./inventory-ui'].inventoryIllustrations = {};
  const { AssetScreen } = load('src/components/inventory/asset-screen.tsx', dependencies);
  const render = () => { cursor = 0; return AssetScreen(); };
  const allNodes = () => { const tree = render(); return [...nodes(tree), ...nodes(tree.props.footer)]; };
  const field = label => allNodes().find(node => node.type === 'InvField' && node.props.label === label).props;
  const classification = () => allNodes().find(node => node.type === 'Classification').props;
  const button = label => allNodes().find(node => node.type === 'Button' && node.props.children === label);
  const review = () => button('Review Details')?.props.onPress();
  const confirmSave = () => button('Confirm & Save')?.props.onPress();
  const submit = () => { review(); confirmSave(); };
  const screen = () => render();
  const overlay = () => nodes(render().props.overlay);
  const modal = () => overlay().find(node => node.type === 'Modal');
  const deleteModal = () => overlay().find(node => node.type === 'Modal' && node.props.visible);
  const success = () => nodes(modal()).find(node => node.type === 'SuccessContent');
  const fill = (value = '1500.5', category = 'equipment') => {
    field('inventory.asset.name.required').onChangeText('Demo shelf');
    field('inventory.amount.value.required').onChangeText(value);
    classification().onChange(category);
    if (category !== 'current') field('inventory.estimated.useful.life.in.years.required').onChangeText('5');
  };
  return { field, classification, button, review, confirmSave, submit, screen, overlay, modal, deleteModal, success, fill, writes, routes, feedback, reject: () => { accepted = false; } };
}

test('asset classification changes preserve the ungrouped amount, name and useful-life draft', () => {
  const h = harness(); h.fill();
  for (const key of ['current', 'furniture', 'equipment']) h.classification().onChange(key);
  assert.equal(h.field('inventory.amount.value.required').value, '1500.5');
  assert.equal(h.field('inventory.asset.name.required').value, 'Demo shelf');
  assert.equal(h.field('inventory.estimated.useful.life.in.years.required').value, '5');
  assert.equal(h.classification().value, 'equipment');
});

test('asset review shows the saved draft and does not write until Confirm & Save', () => {
  const h = harness(); h.fill(); h.review();
  const screen = h.screen();
  assert.equal(screen.props.title, 'Review Asset Details');
  assert.equal(screen.props.footer, undefined, 'review actions stay at the end of scrollable content');
  assert.equal(h.writes.length, 0);
  assert.ok(h.button('Confirm & Save'));
  assert.ok(h.button('Edit Details'));
  assert.equal(h.button('Cancel'), undefined);
  h.confirmSave();
  assert.equal(h.writes.length, 1);
});

test('asset save maps decimal pesos to centavos exactly and confirms only an accepted write', () => {
  const h = harness(); h.fill(); h.submit();
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].asset.valueCentavos, 150050);
  assert.equal(h.writes[0].asset.classification, 'equipment');
  assert.equal(h.modal().props.visible, true);
  assert.equal(h.success().props.title, 'Asset Added');
  assert.equal(h.success().props.amountCentavos, 150050);
  assert.match(h.success().props.message, /Demo shelf added successfully/);
  h.submit(); assert.equal(h.writes.length, 1, 'rapid taps cannot duplicate an asset');
  h.success().props.onClose(); assert.equal(h.modal().props.visible, false);
  assert.equal(h.routes.length, 0, 'wait for modal dismissal before leaving');
  h.modal().props.onHidden(); assert.deepEqual(h.routes, ['/owner-inventory?tab=assets']);
  assert.deepEqual(h.feedback, [], 'do not show the old inventory confirmation as well');
});

test('invalid amounts and failed writes never open asset success; failure remains retryable', () => {
  for (const amount of ['', '0', '-1', '1.234', '1,500', '900719925474099.99']) {
    const h = harness(); h.fill(amount); h.submit();
    assert.equal(h.writes.length, 0, amount); assert.equal(h.modal().props.visible, false);
  }
  const h = harness(); h.fill(); h.reject(); h.submit(); h.submit();
  assert.equal(h.writes.length, 2); assert.equal(h.modal().props.visible, false);
  h.button('Edit Details').props.onPress();
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
    h.modal().props.onHidden(); assert.deepEqual(h.routes, ['/owner-inventory?tab=assets']);
  }
  assert.equal(ids.size, 3, 'each new success has its own replay key');
});

test('edit keeps Save Changes disabled until a field changes and delete requires confirmation', () => {
  const asset = { id: 'asset-demo', name: 'Demo shelf', valueCentavos: 150050, usefulLifeYears: 5, classification: 'equipment', recordedDate: '2026-11-14' };
  const h = harness({ mode: 'edit', asset });
  assert.equal(h.button('inventory.save.changes').props.disabled, true);
  h.field('inventory.asset.name.required').onChangeText('Updated shelf');
  assert.equal(h.button('inventory.save.changes').props.disabled, false);
  h.button('inventory.save.changes').props.onPress();
  assert.equal(h.writes[0].type, 'saveAsset');

  const d = harness({ mode: 'edit', asset });
  d.button('Delete Asset').props.onPress();
  const confirmation = d.overlay().find(node => node.type === 'Modal' && node.props.visible);
  const content = nodes(confirmation).find(node => node.type === 'ConfirmationContent');
  assert.ok(content);
  assert.match(content.props.message, /Demo shelf/);
  assert.equal(d.writes.length, 0);
  content.props.onConfirm();
  assert.equal(d.writes[0].type, 'deleteAsset');
  confirmation.props.onHidden();
  assert.deepEqual(d.routes, ['/owner-inventory?tab=assets']);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const tokens = require('../src/constants/design-tokens.json');

function navigationFixture(role, selectedIndex, weights) {
  const pending = [];
  let measurements = { owner: [-1, -1, -1, -1], cashier: [-1, -1, -1, -1] };
  // Model Reanimated's native RN-to-UI scheduling: set(updater) computes from
  // the current RN snapshot; modify(updater) merges when its UI task executes.
  const centers = {
    get value() { return measurements; },
    set(updater) {
      const next = typeof updater === 'function' ? updater(measurements) : updater;
      pending.push(() => { measurements = next; });
    },
    modify(updater) { pending.push(() => { measurements = updater(measurements); }); },
  };
  const animatedStyles = [];
  const selection = { value: weights ?? [0, 1, 2, 3].map(index => Number(index === selectedIndex)) };
  const source = fs.readFileSync(path.join(__dirname, '../src/components/dashboard/bottom-navigation.tsx'), 'utf8');
  const context = {
    exports: {},
    require(specifier) {
      if (specifier === 'react/jsx-runtime') return require(specifier);
      if (specifier === 'expo-image') return { Image: 'Image' };
      if (specifier === 'react-native') return {
        Pressable: 'Pressable', View: 'View',
        StyleSheet: { create: styles => styles, hairlineWidth: 1 },
        useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
      };
      if (specifier === 'react-native-reanimated') return {
        __esModule: true, default: { View: 'AnimatedView', Text: 'AnimatedText' },
        useAnimatedStyle: updater => { animatedStyles.push(updater); return {}; },
      };
      if (specifier === '@/constants/design-tokens.json') return tokens;
      if (specifier.startsWith('@/assets/')) return specifier;
      throw Error('Unexpected module: ' + specifier);
    },
  };
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, context);
  const tree = context.exports.BottomNavigation({ role, bottomInset: 34, selectedIndex, selection, centers, onPress() {} });
  const items = tree.props.children[0].props.children[0];
  return {
    items, centers, selection,
    indicator: () => animatedStyles[0](),
    measure(index, x, width) { items[index].props.onLayout({ nativeEvent: { layout: { x, width, y: 0, height: 56 } } }); },
    flush() { while (pending.length) pending.shift()(); },
  };
}

test('batched native navigation layouts retain every measured center and reveal the underline', () => {
  const fixture = navigationFixture('owner', 0);
  assert.equal(fixture.indicator().opacity, 0);
  // All four events arrive before any queued UI task executes.
  fixture.measure(0, 0, 80);
  fixture.measure(1, 80, 100);
  fixture.measure(2, 180, 90);
  fixture.measure(3, 270, 120);
  fixture.flush();
  assert.deepEqual(Array.from(fixture.centers.value.owner), [40, 130, 225, 330]);
  assert.equal(fixture.indicator().opacity, 1);
  assert.equal(fixture.indicator().transform[0].translateX, 40 - tokens.navigation.indicatorWidth / 2);
  fixture.selection.value = [0.25, 0, 0, 0.75];
  assert.equal(fixture.indicator().opacity, 1);
  assert.equal(fixture.indicator().transform[0].translateX, 40 * 0.25 + 330 * 0.75 - 14);
});

test('cashier layouts and batched resizing update actual centers without needing a Home measurement', () => {
  const fixture = navigationFixture('cashier', 2);
  fixture.measure(0, 0, 130);
  fixture.measure(1, 130, 130);
  fixture.measure(2, 260, 130);
  fixture.flush();
  assert.equal(fixture.centers.value.cashier[0], -1);
  assert.equal(fixture.indicator().opacity, 1);
  assert.equal(fixture.indicator().transform[0].translateX, 195 - 14);
  fixture.measure(0, 0, 100);
  fixture.measure(1, 100, 120);
  fixture.measure(2, 220, 100);
  fixture.flush();
  assert.deepEqual(Array.from(fixture.centers.value.cashier), [-1, 50, 160, 270]);
  assert.equal(fixture.indicator().opacity, 1);
  assert.equal(fixture.indicator().transform[0].translateX, 160 - 14);
});

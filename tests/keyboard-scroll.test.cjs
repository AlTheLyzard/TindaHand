const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise native measurement ordering without adding a renderer dependency.
function harness() {
  const timers = new Map(), frames = new Map(), measurements = [], scrolls = [], cleanups = [];
  let nextId = 0, focused = true;
  const context = { exports: {},
    setTimeout(callback) { timers.set(++nextId, callback); return nextId; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    require(name) {
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'nativewind') return { cssInterop() {} };
      if (name === 'react') return {
        createContext: value => ({ Provider: 'Provider', value }), useContext: context => context.value,
        useRef: current => ({ current }), useState: value => [value, () => {}],
        useCallback: callback => callback, useMemo: callback => callback(), useImperativeHandle() {},
        useLayoutEffect: callback => { cleanups.push(callback()); }, useEffect: callback => { cleanups.push(callback()); },
      };
      if (name === 'react-native') return { View: 'View', KeyboardAvoidingView: 'KeyboardAvoidingView', ScrollView: 'ScrollView', Platform: { OS: 'android' },
        Keyboard: { metrics: () => ({ screenY: 300 }), addListener: () => ({ remove() {} }) } };
      if (name === '@/components/ui/motion-content') return {};
      if (name === '@/utils/keyboard') return { focusedFieldScroll: ({ offset, field }) => offset + Math.max(0, field.top + field.height - 288) };
      throw Error('Unexpected dependency ' + name);
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/components/ui/keyboard-aware-scroll-view.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  const tree = context.exports.KeyboardAwareScrollView({});
  const view = tree.props.children;
  const input = { isFocused: () => focused, measureInWindow: callback => measurements.push(() => callback(0, 330, 200, 48)) };
  const region = { measureInWindow: callback => measurements.push(() => callback(0, 310, 200, 90)) };
  view.props.ref.current = { measureInWindow: callback => measurements.push(() => callback(0, 0, 320, 300)),
    scrollTo: value => scrolls.push(value) };
  view.props.onContentSizeChange(320, 900);
  return { view, controller: tree.props.value, input, region, scrolls, timers, frames,
    viewport: props => context.exports.KeyboardViewport(props),
    frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
    measureOne() { measurements.shift()?.(); },
    flush() { while (measurements.length) measurements.shift()(); },
    settle() { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); },
    unmount() { cleanups.forEach(callback => callback?.()); },
    blur() { focused = false; tree.props.value.blur(input); },
  };
}

test('a native scroll invalidates stale geometry and rechecks the focused field after settling', () => {
  const h = harness();
  h.controller.focus({ input: h.input, region: h.region }); h.frame(); h.measureOne();
  h.view.props.onScroll({ nativeEvent: { contentOffset: { y: 40 } } });
  h.flush(); assert.equal(h.scrolls.length, 0, 'discard the measurement interrupted by native scrolling');
  h.settle(); h.flush();
  assert.equal(h.scrolls.length, 1);
  assert.equal(h.scrolls[0].y, 152, 'use the latest native offset');
  assert.equal(h.scrolls[0].animated, false);
});

test('blur and unmount cannot move the previous focused input', () => {
  const h = harness(); h.controller.focus({ input: h.input, region: h.region }); h.frame(); h.measureOne();
  h.blur(); h.flush(); h.settle(); h.flush(); assert.equal(h.scrolls.length, 0);
  h.unmount(); assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
});

test('Android avoids NativeWind flex/height conflicts without stacking keyboard offsets', () => {
  const tree = harness().viewport({ behavior: 'height', keyboardVerticalOffset: 42,
    style: { flexGrow: 1, flexShrink: 1, flexBasis: '0%' } });
  const avoidance = tree.props.children;
  assert.equal(avoidance.props.behavior, 'padding');
  assert.equal(avoidance.props.keyboardVerticalOffset, 42);
});

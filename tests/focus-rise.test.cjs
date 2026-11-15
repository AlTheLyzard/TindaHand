const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

// Exercise the mounted lifecycle with the same dependency-free hook harness used
// by overlay tests. Native timing and rendering still need device verification.
function harness(initialReduced = false, platform = 'web') {
  const slots = [], effects = [], animations = [];
  const timers = new Map(), listeners = new Map();
  let now = 0, timerId = 0;
  const navigation = { addListener(type, callback) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(callback);
    return () => listeners.get(type).delete(callback);
  } };
  let cursor = 0, reduced = initialReduced, focused = true, focusCallback, focusCleanup, node;
  const equal = (a, b) => a && b.every((value, index) => Object.is(value, a[index]));
  const slot = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial();
    return slots[index];
  };
  const context = { exports: {},
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    require(name) {
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
    if (name === 'react') return {
      useRef: initial => slot(() => ({ current: initial })),
      useCallback(callback, deps) {
        const state = slot(() => ({}));
        if (!equal(state.deps, deps)) Object.assign(state, { callback, deps });
        return state.callback;
      },
      useLayoutEffect(callback, deps) {
        const state = slot(() => ({}));
        if (!equal(state.deps, deps)) {
          state.deps = deps;
          effects.push(() => { state.cleanup?.(); state.cleanup = callback(); });
        }
      },
    };
    if (name === 'expo-router') return { useNavigation: () => navigation, useFocusEffect(callback) {
      effects.push(() => {
        if (callback === focusCallback) return;
        focusCleanup?.(); focusCallback = callback;
        focusCleanup = focused ? callback() : undefined;
      });
    } };
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === '@/constants/motion') return { motion: { transition: 280 } };
    if (name === '@/state/motion') return { useMotionReduced: () => reduced };
    if (name === 'react-native-reanimated') return {
      default: { View: 'Animated.View' },
      Easing: { cubic: 'cubic', out: value => `out(${value})` }, ReduceMotion: { Never: 'never' },
      useSharedValue: initial => slot(() => ({ value: initial, pending: null, set(next) {
        if (typeof next === 'number') { this.value = next; this.pending = null; }
        else { this.pending = next; animations.push(next); }
      } })),
      cancelAnimation: value => { value.pending = null; },
      useAnimatedStyle: callback => ({ read: callback }),
      withTiming: (target, config) => ({ target, config }),
      withDelay: (delay, animation) => ({ delay, ...animation }),
    };
    throw Error(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ui/focus-rise.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return {
    animations,
    emit(type, closing = false) { [...(listeners.get(type) ?? [])].forEach(fn => fn({ data: { closing } })); },
    handlers(type) { return [...(listeners.get(type) ?? [])]; },
    pending: () => timers.size,
    advance(ms) {
      now += ms;
      for (const [id, timer] of [...timers]) if (timer.due <= now) { timers.delete(id); timer.callback(); }
    },
    render(index = 0, children = 'card') {
      cursor = 0; node = context.exports.FocusRise({ index, children });
      while (effects.length) effects.shift()();
      return node;
    },
    style: () => node.props.style.at(-1).read(),
    progress: () => slots[0],
    reduced: value => { reduced = value; },
    blur() { focused = false; focusCleanup?.(); focusCleanup = undefined; },
    focus() { if (!focused) { focused = true; focusCleanup = focusCallback(); } },
    unmount() { focusCleanup?.(); focusCleanup = undefined; },
  };
}

test('focus entrances stagger whole cards and ordinary content renders do not restart them', () => {
  for (let index = 0; index < 5; index++) {
    const h = harness(); const node = h.render(index);
    assert.equal(node.props.children, 'card'); assert.equal(node.props.pointerEvents, 'box-none');
    assert.equal(h.style().opacity, 0); assert.equal(h.style().transform[0].translateY, 20);
    const animation = h.animations[0];
    assert.equal(animation.delay, index * 60); assert.equal(animation.target, 1);
    assert.equal(animation.config.duration, 400); assert.equal(animation.config.easing, 'out(cubic)');
    h.progress().value = 0.5;
    h.render(index, 'updated filter, data or overlay');
    assert.equal(h.animations.length, 1); assert.equal(h.style().opacity, 0.5);
    assert.equal(h.style().transform[0].translateY, 10);
  }
});

test('blur and unmount cancel pending entrances and leave retained cards fully visible', () => {
  const h = harness(); h.render(4);
  assert.ok(h.progress().pending);
  h.blur();
  assert.equal(h.progress().pending, null); assert.equal(h.style().opacity, 1);
  assert.equal(h.style().transform[0].translateY, 0);
  h.focus(); assert.equal(h.animations.length, 2);
  h.unmount(); assert.equal(h.progress().pending, null); assert.equal(h.style().opacity, 1);
});

test('rapid blur/focus events cancel stale work and only the latest visit can animate', () => {
  const h = harness(); h.render();
  h.blur(); h.focus(); h.blur(); h.focus();
  assert.equal(h.animations.length, 3); assert.equal(h.progress().pending, h.animations.at(-1));
  h.blur(); assert.equal(h.progress().pending, null); assert.equal(h.style().opacity, 1);
});

test('reduced motion skips entrances and a live preference change finishes without replay', () => {
  const h = harness(true); h.render(4);
  assert.equal(h.animations.length, 0); assert.equal(h.style().opacity, 1);
  h.reduced(false); h.render(4); assert.equal(h.animations.length, 0);
  h.blur(); h.focus(); assert.equal(h.animations.length, 1);
  h.reduced(true); h.render(4);
  assert.equal(h.progress().pending, null); assert.equal(h.style().opacity, 1);
  assert.equal(h.style().transform[0].translateY, 0);
  h.reduced(false); h.render(4); assert.equal(h.animations.length, 1);
});

test('Android and iOS entrances wait for native presentation rather than running behind the stack', () => {
  for (const platform of ['android', 'ios']) {
    const h = harness(false, platform); h.render(4);
    assert.equal(h.animations.length, 0); assert.equal(h.style().opacity, 0);
    h.emit('transitionStart'); h.advance(600);
    assert.equal(h.animations.length, 0, 'native presentation is still in progress');
    h.emit('transitionEnd', true); assert.equal(h.animations.length, 0, 'closing transitions cannot start entry');
    h.emit('transitionEnd');
    assert.equal(h.animations.length, 1); assert.equal(h.animations[0].delay, 240);
    assert.equal(h.animations[0].config.duration, 400, 'the full duration remains after presentation');
    assert.equal(h.pending(), 0); assert.equal(h.handlers('transitionEnd').length, 0);
    h.emit('transitionEnd'); h.render(4, 'filter or overlay update');
    assert.equal(h.animations.length, 1);
  }
});

test('native routes without transition events and interrupted transitions have bounded fallbacks', () => {
  const h = harness(false, 'android'); h.render();
  h.advance(559); assert.equal(h.animations.length, 0);
  h.advance(1); assert.equal(h.animations.length, 1);
  h.blur(); h.focus(); h.emit('transitionStart');
  h.advance(1999); assert.equal(h.animations.length, 1);
  h.advance(1); assert.equal(h.animations.length, 2);
  h.blur(); assert.equal(h.style().opacity, 1);
});

test('blur, unmount and reduced motion cancel a pending native entrance, including stale events', () => {
  const h = harness(false, 'android'); h.render();
  const staleEnd = h.handlers('transitionEnd')[0];
  h.blur(); h.advance(3000); staleEnd({ data: { closing: false } });
  assert.equal(h.animations.length, 0); assert.equal(h.style().opacity, 1); assert.equal(h.pending(), 0);
  h.focus(); h.reduced(true); h.render();
  h.reduced(false); h.render(); h.advance(3000); h.emit('transitionEnd');
  assert.equal(h.animations.length, 0, 'disabling reduced motion cannot restart this visit');
  h.blur(); h.focus(); const unmountedEnd = h.handlers('transitionEnd')[0]; h.unmount();
  unmountedEnd({ data: { closing: false } }); h.advance(3000);
  assert.equal(h.animations.length, 0); assert.equal(h.style().opacity, 1);
});

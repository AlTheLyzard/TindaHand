const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Scheduling/lifecycle coverage without a new dependency; device rendering is
// verified separately when native runtimes are connected.
function harness() {
  const slots = [], effects = [], timers = new Map(), frames = new Map(), animations = [];
  let cursor = 0, nextId = 0, now = 0, reduced = false, presented = true;
  const state = initial => {
    const slot = cursor++;
    if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial;
    return [slots[slot], value => { slots[slot] = value; }];
  };
  const context = {
    exports: {},
    setTimeout(callback, delay) { timers.set(++nextId, { callback, at: now + delay }); return nextId; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    require(specifier) {
      if (specifier === 'react/jsx-runtime') return require(specifier);
      if (specifier === 'react') return {
        useState: state,
        useLayoutEffect(callback, deps) {
          const slot = cursor++;
          if (effects[slot] && deps.every((value, index) => Object.is(value, effects[slot].deps[index]))) return;
          effects[slot]?.cleanup?.();
          effects[slot] = { deps, cleanup: callback() };
        },
      };
      if (specifier === 'react-native') return { View: 'View', StyleSheet: { create: styles => styles } };
      if (specifier === '@/state/motion') return { useMotionReduced: () => reduced };
      if (specifier === '@/state/presentation') return { usePresentationVisible: () => presented };
      if (specifier === 'react-native-reanimated') return {
        default: { View: 'Animated.View' },
        Easing: { out: value => value, inOut: value => value, cubic: 'cubic' },
        ReduceMotion: { System: 'system', Never: 'never' },
        useAnimatedStyle: callback => callback(),
        useSharedValue(initial) {
          return state(() => ({ value: initial, cancelled: 0,
            get() { return this.value; },
            set(value) { if (typeof value === 'number') this.value = value; else animations.push(value); },
          }))[0];
        },
        cancelAnimation(value) { value.cancelled++; },
        withTiming: (to, config) => ({ to, config }),
        withSequence: (mode, ...steps) => ({ mode, steps }),
      };
      throw Error('Unexpected dependency: ' + specifier);
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/components/ui/success-check.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  return {
    timers, frames, animations,
    render(props = {}) { cursor = 0; return context.exports.SuccessCheck(props); },
    time(milliseconds) { now += milliseconds; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback(); } },
    frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
    progress(value) { const progress = slots.find(slot => slot && typeof slot.get === 'function'); if (value !== undefined) progress.value = value; return progress.value; },
    reduced(value) { reduced = value; }, presented(value) { presented = value; },
    unmount() { effects.forEach(effect => effect?.cleanup?.()); },
  };
}
function checkStrokes(tree) {
  const strokes = tree.props.children.props.children.props.children;
  assert.equal(strokes.length, 2);
  for (const stroke of strokes) {
    const geometry = Object.assign({}, ...stroke.props.style);
    assert.ok(geometry.width > 0 && geometry.height > 0, 'complete native strokes always exist');
  }
}

test('check waits for layout and host presentation; re-renders do not duplicate events', () => {
  const h = harness(); h.presented(false);
  const first = h.render(); first.props.onLayout(); h.render();
  h.time(1000); h.frame(); assert.equal(h.animations.length, 0);
  h.presented(true); h.render(); h.time(0); h.frame();
  assert.equal(h.animations.length, 1);
  assert.equal(h.animations[0].steps.reduce((sum, step) => sum + step.config.duration, 0), 1000);
  assert.equal(h.progress(), 0, 'the drawing starts at the first tip');
  h.render().props.onLayout(); h.render(); h.time(0); h.frame();
  assert.equal(h.animations.length, 1);
});

test('each new success event and reused opening starts once, and closing cleans up', () => {
  const h = harness(); h.render().props.onLayout(); h.render({ eventKey: 'first' }); h.time(0); h.frame();
  h.render({ eventKey: 'second' }); h.time(0); h.frame(); assert.equal(h.animations.length, 2);
  h.render({ visible: false, eventKey: 'second' });
  assert.equal(h.progress(), 0); assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
  h.render({ visible: true, eventKey: 'second' }); h.time(0); h.frame(); assert.equal(h.animations.length, 3);
  h.unmount(); assert.equal(h.progress(), 1); assert.equal(h.timers.size, 0);
});

test('a missing completion or interruption still leaves a completed visible check', () => {
  const h = harness(); h.render().props.onLayout(); h.render(); h.time(0); h.frame();
  h.time(1160); assert.equal(h.progress(), 1); checkStrokes(h.render());
  h.render({ eventKey: 2, delay: 280 }); h.unmount(); h.time(1000); h.frame();
  assert.equal(h.animations.length, 1, 'unmounted delayed work must not start');
});

test('reduced motion and nonanimated icons remain static with no timers', () => {
  const h = harness(); h.render().props.onLayout(); h.reduced(true);
  checkStrokes(h.render()); h.time(1000); h.frame();
  assert.equal(h.animations.length, 0); assert.equal(h.progress(), 1);
  h.reduced(false); checkStrokes(h.render({ animate: false }));
  assert.equal(h.timers.size, 0);
});

test('the live preference governs animation after the startup setting changes', () => {
  const h = harness(); h.reduced(true); h.render().props.onLayout(); h.render();
  assert.equal(h.timers.size, 0);
  h.reduced(false); h.render(); h.time(0); h.frame();
  assert.equal(h.animations.length, 1);
  assert.equal(h.animations[0].mode, 'never');
  assert.ok(h.animations[0].steps.every(step => step.config.reduceMotion === 'never'));
  h.reduced(true); h.render(); assert.equal(h.progress(), 1); assert.equal(h.timers.size, 0);
});

test('short stroke draws before the long stroke while the circle stays fixed', () => {
  const h = harness(); h.render().props.onLayout(); h.render(); h.time(0); h.frame();
  const sample = progress => {
    h.progress(progress);
    const circle = h.render().props.children;
    assert.equal(circle.type, 'View');
    assert.equal(circle.props.style.transform, undefined, 'the circle never scales or bounces');
    return circle.props.children.props.children.map(stroke => Object.assign({}, ...stroke.props.style));
  };
  let [short, long] = sample(0);
  assert.equal(short.height, 0); assert.equal(long.width, 0);
  [short, long] = sample(0.18);
  assert.equal(short.height, 8); assert.equal(long.width, 0);
  [short, long] = sample(0.36);
  assert.equal(short.height, 16); assert.equal(long.width, 0);
  [short, long] = sample(0.68);
  assert.equal(short.height, 16); assert.ok(Math.abs(long.width - 14) < 0.001);
  [short, long] = sample(1);
  assert.equal(short.height, 16); assert.equal(long.width, 28);
});

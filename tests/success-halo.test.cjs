const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');

test('halo replays per event, cleans up on close/unmount, and follows live Reduce Motion', () => {
  const slots = [], effects = [], animations = []; let cursor = 0, reduced = false, presented = false;
  const context = { exports: {}, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return { useEffect(callback, deps) {
      const index = cursor++;
      if (effects[index] && deps.every((value, i) => Object.is(value, effects[index].deps[i]))) return;
      effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: callback() };
    } };
    if (name === 'react-native') return { View: 'View' };
    if (name === '@/state/motion') return { useMotionReduced: () => reduced };
    if (name === '@/state/presentation') return { usePresentationVisible: () => presented };
    if (name === './success-check') return { SuccessCheck: 'SuccessCheck' };
    if (name === 'react-native-reanimated') return {
      default: { View: 'Animated.View' }, Easing: { inOut: x => x, sin: 'sin' }, ReduceMotion: { Never: 'never' },
      useSharedValue(initial) {
        const index = cursor++;
        if (!slots[index]) slots[index] = { value: initial, cancelled: 0, get() { return this.value; }, set(value) { if (typeof value === 'number') this.value = value; else animations.push(value); } };
        return slots[index];
      },
      cancelAnimation(value) { value.cancelled++; }, useAnimatedStyle: callback => callback(),
      withTiming: (to, config) => ({ to, config }), withRepeat: (animation, count, reverse) => ({ animation, count, reverse }),
    };
    throw Error(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ui/success-halo.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  const render = (eventKey = 'first', visible = true) => { cursor = 0; return context.exports.SuccessHalo({ eventKey, visible }); };
  render(); assert.equal(animations.length, 0, 'wait for presentation');
  presented = true; const tree = render(); assert.equal(animations.length, 1);
  assert.equal(tree.props.children[1].props.animate, false, 'the check never pulses');
  render(); assert.equal(animations.length, 1, 'rerender does not restart the loop');
  assert.equal(animations[0].count, -1); assert.equal(animations[0].reverse, true);
  render('second'); assert.equal(animations.length, 2);
  render('second', false); assert.equal(slots[0].get(), 0);
  reduced = true; render('third'); assert.equal(animations.length, 2);
  reduced = false; render('third'); assert.equal(animations.length, 3);
  assert.equal(animations.at(-1).animation.config.reduceMotion, 'never');
  const cancellations = slots[0].cancelled; effects.forEach(effect => effect?.cleanup?.());
  assert.ok(slots[0].cancelled > cancellations); assert.equal(slots[0].get(), 0);
});

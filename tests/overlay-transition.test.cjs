const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');

function harness() {
  const slots = [], effects = [], animations = [];
  let cursor = 0, reduced = false, notifications = 0;
  const state = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  };
  function effect(callback, deps) {
    const index = cursor++;
    if (effects[index] && deps.every((dep, i) => Object.is(dep, effects[index].deps[i]))) return;
    effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: callback() };
  }
  const context = { exports: {}, require(name) {
    if (name === 'react') return { useState: state, useRef: initial => state(() => ({ current: initial }))[0], useCallback: fn => fn, useEffect: effect, useLayoutEffect: effect };
    if (name === 'react-native') return { Platform: { OS: 'ios' } };
    if (name === '@/state/motion') return { useMotionReduced: () => reduced };
    if (name === '@/constants/motion') return { motion: { transition: 280, ease: 'ease' } };
    if (name === 'react-native-worklets') return { scheduleOnRN: (fn, ...args) => fn(...args) };
    if (name === 'react-native-reanimated') return {
      ReduceMotion: { Never: 'never' },
      useSharedValue: initial => state(() => ({ value: initial, get() { return this.value; }, set(value) { if (typeof value === 'number') this.value = value; else animations.push(value); } }))[0],
      cancelAnimation() {}, withTiming: (target, config, complete) => ({ target, config, complete }),
    };
    throw Error(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/use-overlay-transition.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  const hidden = () => notifications++;
  return { animations, render(visible, native = true, initial = 0) { cursor = 0; return context.exports.useOverlayTransition(visible, hidden, 280, native, initial); },
    reduced(value) { reduced = value; }, notifications: () => notifications, unmount() { effects.forEach(item => item?.cleanup?.()); } };
}

test('iOS entrance waits for the native window, rather than finishing before onShow', () => {
  const h = harness(); const result = h.render(true);
  assert.equal(h.animations.length, 0); assert.equal(result.progress.get(), 0);
  result.onShow(); assert.equal(h.animations.at(-1).target, 1);
  assert.equal(h.animations.at(-1).config.reduceMotion, 'never');
  h.animations.at(-1).complete(true); assert.equal(h.render(true).opened, true);
});

test('interrupted exits cannot dismiss a reopened modal; iOS completion waits for onDismiss', () => {
  const h = harness(); h.render(true).onShow();
  h.render(false); const staleExit = h.animations.at(-1);
  h.render(true); staleExit.complete(true); assert.equal(h.notifications(), 0);
  assert.equal(h.render(true).presented, true);
  h.render(false); h.animations.at(-1).complete(true);
  const hidden = h.render(false); assert.equal(hidden.presented, false); assert.equal(h.notifications(), 0);
  hidden.onDismiss(); hidden.onDismiss(); assert.equal(h.notifications(), 1);
});

test('Quick Add internal exit begins fully shown and reduced motion removes travel timing', () => {
  const h = harness(); const entry = h.render(true, false, 1);
  assert.equal(entry.progress.get(), 1);
  h.reduced(true); h.render(false, false, 1);
  assert.equal(h.animations.at(-1).target, 0); assert.equal(h.animations.at(-1).config.duration, 0);
  h.unmount(); h.animations.at(-1).complete(true); assert.equal(h.notifications(), 0);
});

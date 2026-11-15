const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

function load(file, requireModule) {
  const context = { exports: {}, require: requireModule };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, context);
  return context.exports;
}
const sequence = load('src/utils/menu-description-sequence.ts', () => { throw Error('Unexpected import'); });
const { ownerMenuTools } = load('src/data/menu.ts', () => { throw Error('Unexpected import'); });
const lengths = Array.from(ownerMenuTools, tool => Array.from(tool.subtitle || '').length);

// Exercise the actual hook with delayed UI-to-RN messages and a controllable
// animation clock. This checks lifecycle races without pretending to be native UI.
function harness() {
  const slots = [], effects = [], reactions = [], values = [], queued = [];
  let cursor = 0, result, inputs, writes = 0;
  function state(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], next => { writes++; slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  }
  const ref = initial => state(() => ({ current: initial }))[0];
  const reanimated = {
    Easing: { linear: 'linear' }, ReduceMotion: { Never: 'never' },
    useSharedValue(initial) {
      return state(() => {
        const shared = { value: initial, pending: null, set(next) {
          if (next && typeof next === 'object') this.pending = next;
          else { this.pending = null; this.value = next; }
        } };
        values.push(shared); return shared;
      })[0];
    },
    cancelAnimation: shared => { shared.pending = null; },
    withTiming: (target, config) => ({ target, config }),
    useDerivedValue(read) {
      const holder = ref(read); holder.current = read;
      return state(() => ({ get value() { return holder.current(); } }))[0];
    },
    useAnimatedReaction(prepare, react) {
      const reaction = state(() => {
        const entry = { previous: null }; reactions.push(entry); return entry;
      })[0];
      Object.assign(reaction, { prepare, react });
    },
  };
  const { useMenuDescriptions } = load('src/hooks/use-menu-descriptions.ts', name => {
    if (name === 'react') return {
      useRef: ref, useState: state,
      useCallback(fn, deps) {
        const holder = ref({ fn, deps });
        if (!deps.every((dep, index) => Object.is(dep, holder.current.deps[index]))) holder.current = { fn, deps };
        return holder.current.fn;
      },
      useLayoutEffect(callback, deps) {
        const index = cursor++;
        if (effects[index] && deps.every((dep, i) => Object.is(dep, effects[index].deps[i]))) return;
        effects[index]?.cleanup?.(); effects[index] = { deps, callback, pending: true };
      },
    };
    if (name === 'react-native-reanimated') return reanimated;
    if (name === 'react-native-worklets') return { scheduleOnRN: (fn, ...args) => queued.push(() => fn(...args)) };
    if (name === '@/utils/menu-description-sequence') return sequence;
    throw Error(name);
  });
  function react() {
    for (const reaction of reactions) {
      const next = reaction.prepare(); reaction.react(next, reaction.previous); reaction.previous = next;
    }
  }
  function render(visible = true, opened = true, reduced = false) {
    inputs = [visible, opened, reduced]; cursor = 0;
    result = useMenuDescriptions(...inputs, lengths);
    for (const effect of effects) if (effect?.pending) {
      effect.pending = false; effect.cleanup = effect.callback();
    }
    react(); return result;
  }
  return {
    render,
    sample(at) { for (const value of values) if (value.pending) value.value = Math.min(at, value.pending.target); react(); },
    flush() { while (queued.length) queued.shift()(); return render(...inputs); },
    pending: () => values.filter(value => value.pending).length,
    writes: () => writes,
    unmount() { effects.forEach(effect => effect?.cleanup?.()); },
  };
}

test('real description contents type, hold for 15 seconds, erase, and remain empty', () => {
  const h = harness(); h.render(true, false); assert.equal(h.pending(), 0);
  assert.deepEqual(Array.from(h.flush().characters), lengths.map(() => 0));
  h.render(); assert.equal(h.pending(), 1);
  for (const at of [55, 110, 3_000, 14_999, 15_000, 15_035, sequence.menuDescriptionDuration(lengths), 60_000]) {
    h.sample(at); const result = h.flush();
    assert.deepEqual(Array.from(result.characters), Array.from(sequence.menuDescriptionFrame(at, lengths, false).characters));
  }
  h.unmount(); assert.equal(h.pending(), 0);
});

test('closing during typing, holding, erasing, or collapse rejects queued text and cancels the clock', () => {
  for (const at of [110, 8_000, 15_350, sequence.menuDescriptionDuration(lengths) - 140]) {
    const h = harness(); h.render(); h.flush(); h.sample(at);
    h.render(false, false); assert.equal(h.pending(), 0);
    const before = h.writes(); h.flush(); assert.equal(h.writes(), before, 'stale text update after close');
    h.render(true, false); h.flush();
    assert.deepEqual(Array.from(h.flush().characters), lengths.map(() => 0));
    h.render(); h.sample(55);
    assert.deepEqual(Array.from(h.flush().characters), lengths.map(length => Math.min(1, length)));
    h.unmount();
  }
});

test('rapid reopen and unmount ignore callbacks queued by previous openings', () => {
  const h = harness();
  for (let i = 0; i < 8; i++) { h.render(); h.sample(1_000); h.render(false, false); }
  h.render(true, false);
  assert.deepEqual(Array.from(h.flush().characters), lengths.map(() => 0));
  h.render(); h.sample(110);
  assert.deepEqual(Array.from(h.flush().characters), lengths.map(length => Math.min(2, length)));
  h.sample(220); h.unmount();
  const before = h.writes(); h.flush(); assert.equal(h.writes(), before);
  assert.equal(h.pending(), 0);
});

test('reduced motion keeps the deadline and cannot resurrect descriptions until reopening', () => {
  const h = harness(); h.render(true, true, true);
  assert.deepEqual(Array.from(h.flush().characters), lengths);
  h.sample(15_000); assert.deepEqual(Array.from(h.flush().characters), lengths.map(() => 0));
  h.render(true, true, false); h.flush();
  assert.deepEqual(Array.from(h.flush().characters), lengths.map(() => 0));
  h.render(false, false); h.render(); h.sample(55);
  assert.deepEqual(Array.from(h.flush().characters), lengths.map(length => Math.min(1, length)));
  h.unmount();
});

function rowFixture() {
  const frame = { value: sequence.menuDescriptionFrame(0, lengths, false) };
  const height = { value: 0, set(next) { this.value = next; } };
  const { MenuRow } = load('src/components/menu/menu-row.tsx', name => {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return { useId: () => 'hint' };
    if (name === 'react-native') return { Platform: { OS: 'ios' }, StyleSheet: { create: value => value }, Text: 'Text', View: 'View' };
    if (name === 'react-native-reanimated') return { __esModule: true, default: { View: 'AnimatedView' }, useSharedValue: () => height, useAnimatedStyle: read => ({ read }) };
    if (name === '@/components/ui/motion-pressable') return { MotionPressable: 'Pressable' };
    if (name === '@/components/menu/menu-icon') return { MenuIcon: 'MenuIcon' };
    if (name === '@/constants/design-tokens.json') return require('../src/constants/design-tokens.json');
    throw Error(name);
  });
  return {
    render(at, { preparing = false, characters } = {}) {
      frame.value = sequence.menuDescriptionFrame(at, lengths, false);
      const row = MenuRow({ tool: ownerMenuTools[0], selected: true, onPress() {}, optionIndex: 0, frame, characters: characters ?? frame.value.characters[0], preparing });
      const block = row.props.children[1];
      const [title, description] = block.props.children;
      description.props.children.props.onLayout({ nativeEvent: { layout: { height: 34 } } });
      const [measurement, text] = description.props.children.props.children;
      return { row, block, title, description, measurement, text, style: description.props.style[1].read() };
    },
  };
}

test('description text is removed and its measured space collapses only after erasing', () => {
  const h = rowFixture();
  const full = h.render(14_999);
  assert.equal(full.text.props.children, ownerMenuTools[0].subtitle);
  assert.equal(full.style.height, 34); assert.equal(full.style.opacity, 1);
  const partial = h.render(15_035);
  assert.equal(partial.text.props.children, ownerMenuTools[0].subtitle.slice(0, -1));
  assert.equal(partial.style.height, 34);
  const eraseEnd = sequence.menuDescriptionDuration(lengths) - sequence.menuMotion.titleMoveMs;
  const empty = h.render(eraseEnd);
  assert.equal(empty.text, false); assert.equal(empty.style.opacity, 0); assert.equal(empty.style.height, 34);
  const collapsing = h.render(eraseEnd + 140);
  assert.equal(collapsing.style.height, 17); assert.equal(collapsing.style.opacity, 0);
  const done = h.render(60_000);
  assert.equal(done.style.height, 0); assert.equal(done.style.display, 'none'); assert.equal(done.text, false);
  assert.equal(done.title.props.style.transform, undefined, 'title must use normal layout');
  assert.ok(!done.block.props.className.includes('gap-'), 'no leftover gap after description collapse');
  assert.equal(done.measurement.props.style[1].opacity, 0);
  assert.equal(done.row.props.accessibilityState.selected, true);
  // A delayed RN update cannot paint retained text over the title during collapse.
  assert.equal(h.render(eraseEnd + 140, { characters: lengths[0] }).style.opacity, 0);
  assert.equal(h.render(0, { preparing: true, characters: lengths[0] }).style.opacity, 0);
  assert.equal(h.render(55).style.height, 34);
});

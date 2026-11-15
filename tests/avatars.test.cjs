const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function fixture() {
  const cache = new Map();
  const identityStorage = require('./helpers/identity-storage.cjs')();
  const authStorage = require('./helpers/auth-storage.cjs')();
  function load(file) {
    file = path.normalize(file);
    if (cache.has(file)) return cache.get(file);
    const context = { exports: {}, __DEV__: true, setTimeout,
      process: { env: { EXPO_PUBLIC_ENABLE_MOCK_AUTH: 'true' } },
      require(name) {
        if (name === '@/services/auth-identity-storage') return { authIdentityStorage: identityStorage };
        if (name === '@/services/auth-record-storage') return { authRecordStorage: authStorage.recordStorage };
        if (name === '@/services/auth-secret-storage') return { authSecretStorage: authStorage.secretStorage };
        const base = name.startsWith('@/') ? name.replace('@/', 'src/') : path.join(path.dirname(file), name);
        const target = [`${base}.ts`, `${base}/index.ts`].find(candidate => fs.existsSync(candidate));
        if (!target) throw Error(`Unexpected module ${name}`);
        return load(target);
      },
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
    cache.set(file, context.exports);
    return context.exports;
  }
  const avatars = load('src/services/avatars.ts');
  return { load, ...avatars, order: load('src/constants/profile-avatar-ids.ts').avatarPickerOrder };
}
const owner = { id: 'TH-DEMO-OWNER', name: 'Demo Owner', mode: 'mock' };
const values = index => ({ name: `Operator ${index}`, pin: String(index).padStart(4, '0'), confirmPin: String(index).padStart(4, '0') });

test('migration retains Owner first, preserves valid Operator selections, repairs missing/duplicates by stable ID regardless of input order/status', () => {
  const { reconcileStoreAvatars } = fixture();
  const primary = Object.freeze({ id: 'owner', avatarId: 'avatar-04' });
  const operators = Object.freeze([
    Object.freeze({ id: 'op-c', avatarId: 'avatar-04', status: 'inactive' }),
    Object.freeze({ id: 'op-b', avatarId: 'avatar-11' }),
    Object.freeze({ id: 'op-a', avatarId: 'avatar-11' }),
    Object.freeze({ id: 'op-d' }),
    Object.freeze({ id: 'op-e', avatarId: 'obsolete-avatar' }),
    Object.freeze({ id: 'op-f', avatarId: 'avatar-01' }),
  ]);
  const forward = reconcileStoreAvatars(primary, operators).value;
  const reverse = reconcileStoreAvatars(primary, [...operators].reverse()).value;
  assert.deepEqual([...forward], [...reverse]);
  assert.equal(forward.get('owner'), 'avatar-04');
  assert.equal(forward.get('op-a'), 'avatar-11');
  assert.equal(forward.get('op-f'), 'avatar-01', 'gap filling must not steal a later valid selection');
  assert.equal(forward.get('op-b'), 'avatar-02');
  assert.equal(forward.get('op-c'), 'avatar-03');
  assert.equal(forward.get('op-d'), 'avatar-05');
  assert.equal(forward.get('op-e'), 'avatar-06');
  assert.equal(new Set(forward.values()).size, 7);
  assert.equal(operators[0].avatarId, 'avatar-04', 'planning never mutates source accounts');
  assert.equal(reconcileStoreAvatars(primary, operators.map(item => ({ ...item, avatarId: forward.get(item.id) }))).value.get('op-c'), 'avatar-03');
});

test('missing Owner avatar uses the first free preset without displacing valid Operator choices', () => {
  const { reconcileStoreAvatars } = fixture();
  assert.equal(reconcileStoreAvatars({ id: 'owner' }, []).value.get('owner'), 'avatar-01');
  for (const avatarId of [null, undefined, 'obsolete-avatar']) {
    const result = reconcileStoreAvatars({ id: 'owner', avatarId }, [{ id: 'operator', avatarId: 'avatar-01' }]);
    assert.equal(result.value.get('owner'), 'avatar-02');
    assert.equal(result.value.get('operator'), 'avatar-01');
  }
});

test('allocation follows shared preset order, excludes Owner/inactive Operators and permits cross-store reuse', () => {
  const { createAvatarService, avatarInUse, order } = fixture();
  const service = createAvatarService();
  service.initializeStore('store-a', { id: 'owner', avatarId: 'avatar-01' }, [{ id: 'inactive', avatarId: 'avatar-02', status: 'inactive' }]);
  service.initializeStore('store-b', { id: 'owner', avatarId: 'avatar-01' });
  assert.equal(avatarInUse(service.getSnapshot(), 'store-a', 'owner', 'avatar-01'), false, 'own selection stays selectable');
  assert.equal(avatarInUse(service.getSnapshot(), 'store-a', 'owner', 'avatar-02'), true);
  assert.equal(service.allocate('store-b', 'other', () => {}).value, 'avatar-02');
  for (const [index, id] of order.slice(2).entries()) {
    let saved;
    const result = service.allocate('store-a', `op-${index}`, value => { saved = value; });
    assert.equal(result.value, id); assert.equal(saved, id);
  }
  assert.equal(service.allocate('store-a', 'one-too-many', () => assert.fail('exhaustion must not persist')).ok, false);
  assert.equal(service.getSnapshot().get('store-a').size, 12);
});

test('reassignment releases the previous preset only on successful commit; conflicts and failures preserve snapshots', () => {
  const { createAvatarService, avatarInUse } = fixture();
  const service = createAvatarService();
  service.initializeStore('store', { id: 'owner', avatarId: 'avatar-01' }, [{ id: 'op', avatarId: 'avatar-02' }]);
  const before = service.getSnapshot();
  let notifications = 0;
  service.subscribe(() => notifications++);
  const conflict = service.replace('store', 'owner', 'avatar-02', () => assert.fail('must not commit conflicts'));
  assert.equal(conflict.ok, false); assert.match(conflict.message, /select another avatar/);
  assert.equal(service.getSnapshot(), before);
  assert.throws(() => service.replace('store', 'owner', 'avatar-03', () => { throw Error('save failed'); }), /save failed/);
  assert.equal(service.getSnapshot(), before);
  assert.equal(avatarInUse(service.getSnapshot(), 'store', 'op', 'avatar-01'), true);
  assert.equal(notifications, 0);
  assert.equal(service.replace('store', 'owner', 'avatar-03', () => {
    assert.equal(service.getSnapshot(), before, 'the old avatar stays reserved until persistence succeeds');
    assert.equal(service.allocate('store', 'reentrant', () => assert.fail('must serialize store commits')).ok, false);
  }).ok, true);
  assert.equal(avatarInUse(service.getSnapshot(), 'store', 'op', 'avatar-01'), false);
  assert.equal(service.allocate('store', 'new', () => {}).value, 'avatar-01');
  assert.equal(before.get('store').get('owner'), 'avatar-01', 'published snapshots stay immutable');
  assert.equal(notifications, 2);
});

test('failed creation never reserves an avatar and exhausted migration never publishes partial assignments', () => {
  const { createAvatarService, AVATARS_EXHAUSTED } = fixture();
  const service = createAvatarService();
  const before = service.getSnapshot();
  const result = service.initializeStore('too-large', { id: 'owner' }, Array.from({ length: 12 }, (_, i) => ({ id: `op-${i}` })));
  assert.equal(result.ok, false); assert.equal(result.message, AVATARS_EXHAUSTED);
  assert.equal(service.getSnapshot(), before);
  service.initializeStore('store', { id: 'owner' });
  assert.throws(() => service.allocate('store', 'failed', () => { throw Error('creation failed'); }));
  assert.equal(service.allocate('store', 'retry', () => {}).value, 'avatar-02');
  assert.equal(service.allocate('store', 'retry', () => assert.fail('no duplicate IDs')).ok, false);
});

test('multiple Operator creation fills exactly 12 accounts, deactivation reserves avatars, exhaustion creates no record or credential', async () => {
  const { load, order, AVATARS_EXHAUSTED } = fixture();
  const service = load('src/services/settings.ts').createMockSettingsService({ empty: true, delayMs: 0 });
  const records = [];
  for (let index = 1; index < 12; index++) {
    const result = await service.createCashier(owner, values(index));
    assert.equal(result.ok, true); assert.equal(result.value.avatarId, order[index]);
    records.push(result.value);
  }
  const inactive = await service.setOperatorActive(owner, records[0].id, false);
  assert.equal(inactive.value.avatarId, records[0].avatarId);
  const before = service.getSnapshot();
  const reservations = service.avatars.getSnapshot();
  const blocked = await service.createCashier(owner, values(12));
  assert.equal(blocked.ok, false); assert.equal(blocked.message, AVATARS_EXHAUSTED);
  assert.equal(service.getSnapshot(), before); assert.equal(service.avatars.getSnapshot(), reservations);
  assert.equal(service.cashiers(owner.id).length, 11);
  assert.equal(service.matchOperator(owner.id, values(12).pin), null);
  const restored = await service.setOperatorActive(owner, records[0].id, true);
  assert.equal(restored.value.avatarId, records[0].avatarId);
  assert.equal(new Set([reservations.get(owner.id).get(owner.id), ...service.cashiers(owner.id).map(item => item.avatarId)]).size, 12);
});

test('failed Operator validation, canceled authorization and service errors consume no presets', async () => {
  const { load } = fixture();
  const service = load('src/services/settings.ts').createMockSettingsService({ empty: true, delayMs: 0 });
  const before = service.avatars.getSnapshot();
  assert.equal((await service.createCashier(owner, { ...values(1), name: '' })).ok, false);
  assert.equal((await service.createCashier(owner, values(1), () => false)).ok, false);
  service.failNext('create');
  assert.equal((await service.createCashier(owner, values(1))).ok, false);
  assert.equal(service.avatars.getSnapshot(), before);
  const created = await service.createCashier(owner, values(1));
  assert.equal(created.value.avatarId, 'avatar-02'); assert.equal(created.value.id, 'TH-KH-0003');
});

test('picker preview, Apply, Cancel, profile reads and repeated initialization never change reservations', async () => {
  const { load } = fixture();
  const service = load('src/services/profile.ts').createMockProfileService({
    enabled: true, delayMs: 0, context: () => ({ owner, sessionId: 'session' }),
    verifyPin: () => true, onIdentity() {}, emailAvailable: () => true,
  });
  service.initialize(owner, 'owner@example.test');
  const profile = service.getSnapshot().get(owner.id);
  const { createProfileEditor, profileEditor: reduce } = load('src/utils/profile-editor.ts');
  const before = service.avatars.getSnapshot();
  let editor = createProfileEditor(profile);
  editor = reduce(reduce(editor, { type: 'pick' }), { type: 'preview', avatarId: 'avatar-09' });
  assert.equal(reduce(editor, { type: 'cancel-step' }).draft.avatarId, 'avatar-01');
  editor = reduce(editor, { type: 'apply-avatar' });
  assert.equal(editor.draft.avatarId, 'avatar-09');
  await service.read(); service.initialize(owner, 'owner@example.test');
  assert.equal(service.avatars.getSnapshot(), before);
  assert.equal(service.getSnapshot().get(owner.id), profile);
  await service.save({ draft: editor.draft, ownerPin: '0123' });
  service.initialize(owner, 'owner@example.test');
  assert.equal(service.getSnapshot().get(owner.id).avatarId, 'avatar-09', 'rehydration preserves saved choices');
});

test('save-time race retains Owner assignment and complete draft; retry selects a different free preset', async () => {
  const { load, AVATAR_IN_USE, avatarInUse } = fixture();
  const settings = load('src/services/settings.ts').createMockSettingsService({ empty: true, delayMs: 0 });
  const service = load('src/services/profile.ts').createMockProfileService({
    enabled: true, delayMs: 20, avatars: settings.avatars,
    context: () => ({ owner, sessionId: 'session' }), verifyPin: (_id, pin) => pin === '0123',
    emailAvailable: () => true, onIdentity() {},
  });
  service.initialize(owner, 'owner@example.test');
  const initial = service.getSnapshot().get(owner.id);
  const { createProfileEditor, profileEditor: reduce } = load('src/utils/profile-editor.ts');
  let editor = createProfileEditor(initial);
  editor = reduce(editor, { type: 'field', field: 'name', value: 'Updated Owner' });
  editor = reduce(reduce(reduce(editor, { type: 'pick' }), { type: 'preview', avatarId: 'avatar-02' }), { type: 'apply-avatar' });
  const draft = editor.draft;
  const pending = service.save({ draft, ownerPin: '0123' });
  assert.equal(avatarInUse(settings.avatars.getSnapshot(), owner.id, owner.id, 'avatar-02'), false);
  const created = await settings.createCashier(owner, values(1));
  assert.equal(created.value.avatarId, 'avatar-02');
  const failed = await pending;
  assert.equal(failed.ok, false); assert.equal(failed.message, AVATAR_IN_USE);
  assert.equal(service.getSnapshot().get(owner.id), initial);
  assert.equal(settings.avatars.getSnapshot().get(owner.id).get(owner.id), 'avatar-01');
  editor = reduce(editor, { type: 'pick' });
  assert.equal(editor.draft, draft); assert.equal(editor.preview, 'avatar-02');
  editor = reduce(reduce(editor, { type: 'preview', avatarId: 'avatar-03' }), { type: 'apply-avatar' });
  const saved = await service.save({ draft: editor.draft, ownerPin: '0123' });
  assert.equal(saved.ok, true); assert.equal(saved.value.name, 'Updated Owner');
  assert.equal(saved.value.avatarId, 'avatar-03');
  assert.equal((await settings.createCashier(owner, values(2))).value.avatarId, 'avatar-01', 'successful replacement releases the old preset');
});

test('wrong PIN, email conflict and profile service failures keep the old reservation and replacement free', async () => {
  const { load, avatarInUse } = fixture();
  const service = load('src/services/profile.ts').createMockProfileService({
    enabled: true, delayMs: 0, context: () => ({ owner, sessionId: 'session' }),
    verifyPin: (_id, pin) => pin === '0123', onIdentity() {}, emailAvailable: email => email !== 'taken@example.test',
  });
  service.initialize(owner, 'owner@example.test');
  const draft = { ...service.getSnapshot().get(owner.id), avatarId: 'avatar-12' };
  const before = service.avatars.getSnapshot();
  assert.equal((await service.save({ draft, ownerPin: '9999' })).ok, false);
  assert.equal((await service.save({ draft: { ...draft, email: 'taken@example.test' }, ownerPin: '0123' })).ok, false);
  service.failNext('save');
  assert.equal((await service.save({ draft, ownerPin: '0123' })).ok, false);
  assert.equal(service.avatars.getSnapshot(), before);
  assert.equal(avatarInUse(before, owner.id, 'another', 'avatar-01'), true);
  assert.equal(avatarInUse(before, owner.id, owner.id, 'avatar-12'), false);
});

test('authenticated account creation and profile saving share assignments across stores', async () => {
  const { load } = fixture();
  const auth = load('src/services/authentication.ts').createAuthenticationService({ enabled: true });
  const settings = load('src/services/settings.ts').settingsService;
  await auth.authenticateOwner({ ownerId: owner.id, password: 'DemoStore25@!' });
  const before = (await auth.profile.read()).value;
  const created = await auth.createOperator(values(10));
  assert.equal(created.value.avatarId, 'avatar-02');
  assert.equal((await auth.profile.save({ draft: { ...before, avatarId: created.value.avatarId }, ownerPin: '0123' })).ok, false);
  assert.equal((await auth.profile.save({ draft: { ...before, avatarId: 'avatar-09' }, ownerPin: '0123' })).ok, true);
  assert.equal((await auth.createOperator(values(11))).value.avatarId, 'avatar-01');
  const registration = await auth.registerOwner({ name: 'Second Owner', email: 'second@example.test', password: 'StoreTest25!', confirmPassword: 'StoreTest25!', pin: '0007', confirmPin: '0007' });
  assert.equal(registration.status, 'confirmed');
  assert.equal((await auth.profile.read()).value.avatarId, 'avatar-01');
  assert.equal((await auth.createOperator(values(12))).value.avatarId, 'avatar-02');
  assert.equal(settings.cashiers(owner.id)[0].avatarId, 'avatar-11', 'existing valid fixtures stay selected');
});

test('picker exposes In use and disabled semantics while the current account avatar remains selectable', () => {
  const { createAvatarService, avatarInUse } = fixture();
  const service = createAvatarService();
  service.initializeStore('store', { id: 'owner', avatarId: 'avatar-01' }, [{ id: 'inactive', avatarId: 'avatar-02', status: 'inactive' }]);
  // Render the option with host/motion stubs; native interaction itself requires a device.
  const jsx = (_type, props) => ({ type: _type, props });
  const context = { exports: {}, require(name) {
    if (name === 'react') return { useEffect() {} };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-native') return { Text: 'Text' };
    if (name === 'react-native-reanimated') return {
      default: { View: 'AnimatedView' }, useSharedValue: value => ({ value, set() {} }),
      useAnimatedStyle: callback => callback(), cancelAnimation() {}, withDelay() {}, withTiming() {},
    };
    if (name === '@/components/ui/motion-pressable') return { MotionPressable: 'Pressable' };
    if (name === '@/constants/motion') return { motion: {} };
    if (name === '@/constants/profile-avatars') return { profileAvatars: { 'avatar-01': { label: 'Owner portrait' }, 'avatar-02': { label: 'Operator portrait' } } };
    if (name === '@/state/motion') return { useMotionReduced: () => true };
    if (name === './profile-ui') return { ProfileAvatar: 'ProfileAvatar' };
    throw Error(`Unexpected module ${name}`);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/profile/avatar-option.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  for (const [index, id] of ['avatar-01', 'avatar-02'].entries()) {
    const inUse = avatarInUse(service.getSnapshot(), 'store', 'owner', id);
    const rendered = context.exports.AvatarOption({ id, index, selected: index === 0, inUse, onSelect() {} });
    const [button, indicator] = rendered.props.children;
    assert.equal(button.props.disabled, index === 1);
    assert.equal(button.props.accessibilityState.disabled, index === 1);
    assert.equal(button.props.accessibilityState.checked, index === 0);
    assert.equal(button.props['aria-disabled'], index === 1);
    assert.equal(indicator.props.children.trim(), index === 1 ? 'In use' : '');
    assert.equal(button.props.children.props.avatarId, id);
    assert.equal(rendered.props.testID, `avatar-entrance-${id}`, 'entrance animation remains on its original wrapper');
  }
});

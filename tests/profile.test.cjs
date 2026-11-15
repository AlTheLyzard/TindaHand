const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function fixture(development = true) {
  const cache = new Map();
  const identityStorage = require('./helpers/identity-storage.cjs')();
  const authStorage = require('./helpers/auth-storage.cjs')();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const context = { exports: {}, __DEV__: development, setTimeout, Date,
      process: { env: { EXPO_PUBLIC_ENABLE_MOCK_AUTH: 'true' } },
      require(name) {
        if (name === '@/services/auth-identity-storage') return { authIdentityStorage: identityStorage };
        if (name === '@/services/auth-record-storage') return { authRecordStorage: authStorage.recordStorage };
        if (name === '@/services/auth-secret-storage') return { authSecretStorage: authStorage.secretStorage };
        const base = name.startsWith('@/') ? name.replace('@/', 'src/') : path.join(path.dirname(file), name);
        const target = [`${base}.ts`, `${base}/index.ts`].find(p => fs.existsSync(p));
        if (!target) throw Error(`Unexpected module ${name}`);
        return load(target);
      },
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
    cache.set(file, context.exports);
    return context.exports;
  }
  return load;
}
const draft = { name: 'José Dela Cruz-Santos', storeName: '', email: 'owner@example.test', avatarId: null };
const ownerLogin = { ownerId: 'TH-DEMO-OWNER', password: 'DemoStore25@!' };

test('profile validation accepts ordinary punctuation and accents, trims boundaries and rejects invalid fields', () => {
  const { validateProfile, normalizeProfile } = fixture()('src/utils/profile.ts');
  assert.equal(Object.keys(validateProfile(draft)).length, 0);
  for (const name of ['', '   ', '\t\n']) assert.ok(validateProfile({ ...draft, name }).name);
  assert.ok(validateProfile({ ...draft, name: 'x'.repeat(121) }).name);
  assert.ok(validateProfile({ ...draft, storeName: 'x'.repeat(121) }).storeName);
  assert.match(validateProfile({ ...draft, email: '' }).email, /email address/);
  assert.match(validateProfile({ ...draft, email: 'invalid' }).email, /valid email/);
  assert.ok(validateProfile({ ...draft, avatarId: 'external-photo' }).avatarId);
  const clean = normalizeProfile({ ...draft, name: ' José ', storeName: ' Store ', email: ' Person+store@Example.test ' });
  assert.equal(clean.name, 'José'); assert.equal(clean.storeName, 'Store'); assert.equal(clean.email, 'person+store@example.test');
});

test('editor preserves drafts through picker, confirmation/verification cancellation, recoverable failures and discard', () => {
  const load = fixture();
  const { createProfileEditor, profileEditor: reduce } = load('src/utils/profile-editor.ts');
  const { profileChanged } = load('src/utils/profile.ts');
  let state = createProfileEditor(draft);
  state = reduce(state, { type: 'field', field: 'name', value: 'Edited Owner' });
  const edited = state.draft;
  state = reduce(state, { type: 'pick' });
  state = reduce(state, { type: 'preview', avatarId: 'avatar-02' });
  assert.equal(state.draft.avatarId, 'avatar-01');
  state = reduce(state, { type: 'cancel-step' });
  assert.equal(state.draft, edited, 'Cancel keeps the previous draft avatar and all fields');
  state = reduce(reduce(reduce(state, { type: 'pick' }), { type: 'preview', avatarId: 'avatar-03' }), { type: 'apply-avatar' });
  assert.equal(state.draft.avatarId, 'avatar-03'); assert.equal(state.saved.avatarId, 'avatar-01');
  const beforeVerification = state.draft;
  state = reduce(state, { type: 'verify' });
  assert.equal(state.draft, beforeVerification, 'verification/failure does not mutate the draft');
  state = reduce(state, { type: 'cancel-step' });
  assert.equal(state.draft, beforeVerification);
  assert.equal(profileChanged(state.draft, state.saved), true);
  state = reduce(state, { type: 'discard' });
  assert.equal(profileChanged(state.draft, state.saved), false);
  assert.equal(state.draft.name, draft.name);
});

function profileFixture(development = true) {
  const load = fixture(development);
  let context = { owner: { id: 'owner-1', name: draft.name }, sessionId: 'session-1' };
  let time = 100;
  const changes = [];
  const service = load('src/services/profile.ts').createMockProfileService({
    enabled: true, delayMs: 0, now: () => time, context: () => context,
    verifyPin: (_id, pin) => pin === '0123', onIdentity: value => changes.push(value), emailAvailable: email => email !== 'taken@example.test',
  });
  service.initialize(context.owner, draft.email);
  return { service, changes, advance: ms => { time += ms; }, logout: () => { context = null; }, load };
}

test('Owner defaults use the first preset; legacy drafts resolve null/missing values without changing saved records or becoming dirty', () => {
  const load = fixture();
  const { DEFAULT_OWNER_AVATAR_ID, avatarPickerOrder, resolveOwnerAvatarId } = load('src/constants/profile-avatar-ids.ts');
  const { profileDraft, profileChanged } = load('src/utils/profile.ts');
  const { createProfileEditor, profileEditor: reduce } = load('src/utils/profile-editor.ts');
  assert.equal(DEFAULT_OWNER_AVATAR_ID, avatarPickerOrder[0]);
  for (const avatarId of [null, undefined]) {
    const legacy = Object.freeze({ ...draft, ownerId: 'existing-owner', avatarId, pendingEmail: null });
    const projected = profileDraft(legacy);
    let editor = createProfileEditor(projected);
    editor = reduce(editor, { type: 'pick' });
    assert.equal(resolveOwnerAvatarId(legacy.avatarId), 'avatar-01');
    assert.equal(editor.preview, 'avatar-01', 'the visible default is also the selected picker option');
    assert.equal(profileChanged(editor.draft, editor.saved), false);
    assert.equal(legacy.avatarId, avatarId, 'presentation does not mutate the persisted value');
  }
  assert.equal(profileDraft({ ...draft, avatarId: 'avatar-11' }).avatarId, 'avatar-11');
});

test('new Owners receive the default and another selected avatar saves and survives subsequent reads', async () => {
  const { service, changes, load } = profileFixture();
  const initial = service.getSnapshot().get('owner-1');
  assert.equal(initial.avatarId, 'avatar-01');
  const before = service.getSnapshot();
  await service.read();
  assert.equal(service.getSnapshot(), before, 'a profile read emits no avatar update');
  assert.equal(changes.length, 0);
  const { createProfileEditor, profileEditor: reduce } = load('src/utils/profile-editor.ts');
  let editor = createProfileEditor(initial);
  editor = reduce(reduce(editor, { type: 'pick' }), { type: 'preview', avatarId: 'avatar-09' });
  assert.equal(reduce(editor, { type: 'cancel-step' }).draft.avatarId, 'avatar-01');
  editor = reduce(editor, { type: 'apply-avatar' });
  const result = await service.save({ draft: editor.draft, ownerPin: '0123' });
  assert.equal(result.ok, true);
  assert.equal((await service.read()).value.avatarId, 'avatar-09');
  assert.equal(changes.length, 1, 'only the explicit save writes the selection');
});

test('PIN failures, invalid fields, duplicate submissions and service failures never commit profile data; retry succeeds', async () => {
  const { service } = profileFixture();
  const saved = service.getSnapshot().get('owner-1');
  const next = { ...draft, name: 'Changed Owner', avatarId: 'avatar-12' };
  assert.equal((await service.save({ draft: next, ownerPin: '9999' })).ok, false);
  assert.equal((await service.save({ draft: { ...next, name: '  ' }, ownerPin: '0123' })).ok, false);
  service.failNext('save');
  assert.equal((await service.save({ draft: next, ownerPin: '0123' })).ok, false);
  assert.equal(service.getSnapshot().get('owner-1'), saved);
  const results = await Promise.all([service.save({ draft: next, ownerPin: '0123' }), service.save({ draft: next, ownerPin: '0123' })]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(service.getSnapshot().get('owner-1').name, 'Changed Owner');
  assert.equal(service.getSnapshot().get('owner-1').ownerId, 'owner-1');
  assert.ok(!JSON.stringify([...service.getSnapshot().values()]).includes('0123'));
  const injected = await service.save({ draft: { ...next, ownerId: 'forged-owner', pin: '9876' }, ownerPin: '0123' });
  assert.equal(injected.value.ownerId, 'owner-1', 'request fields cannot replace the permanent Owner ID');
  assert.equal(service.getSnapshot().size, 1);
  assert.ok(!JSON.stringify(injected.value).includes('9876'), 'unknown credential fields are never stored');
});

test('pending email never replaces registered email before verification; expiry, resend, cancel and success are explicit', async () => {
  const { service, advance } = profileFixture();
  const result = await service.save({ draft: { ...draft, name: 'New Name', email: 'new@example.test' }, ownerPin: '0123' });
  assert.equal(result.value.name, 'New Name'); assert.equal(result.value.email, draft.email);
  assert.equal(result.value.pendingEmail.address, 'new@example.test');
  assert.equal((await service.email('check')).value.email, draft.email);
  assert.equal((await service.email('resend')).ok, false, 'cooldown is service-owned');
  advance(900001);
  assert.equal((await service.email('simulate-verified')).ok, false);
  assert.equal(service.getSnapshot().get('owner-1').pendingEmail.status, 'expired');
  service.failNext('email'); assert.equal((await service.email('resend')).ok, false);
  assert.equal((await service.email('resend')).ok, true);
  assert.equal((await service.email('cancel')).value.pendingEmail, null);
  assert.equal(service.getSnapshot().get('owner-1').email, draft.email);
  await service.save({ draft: { ...draft, email: 'new@example.test' }, ownerPin: '0123' });
  const verified = await service.email('simulate-verified');
  assert.equal(verified.value.email, 'new@example.test'); assert.equal(verified.value.pendingEmail, null);
});

test('profile mock denies production/unauthenticated access and rejects writes after session changes', async () => {
  const { service, logout } = profileFixture();
  const pending = service.save({ draft: { ...draft, name: 'Late Save' }, ownerPin: '0123' });
  logout(); assert.equal((await pending).ok, false);
  assert.equal(service.getSnapshot().get('owner-1').name, draft.name);
  assert.equal((await service.read()).ok, false);
  const production = profileFixture(false).service;
  assert.equal((await production.save({ draft, ownerPin: '0123' })).ok, false);
  assert.equal((await production.email('simulate-verified')).ok, false);
});

test('failed permissions roll back canonical state, operators stay isolated, and overlapping requests cannot commit stale values', async () => {
  const load = fixture();
  const service = load('src/services/settings.ts').createMockSettingsService({ delayMs: 0 });
  const owner = { id: ownerLogin.ownerId, name: 'Demo Owner', mode: 'mock' };
  const [first, second] = service.cashiers(owner.id);
  const original = service.operatorPermissions(first.id);
  const previousSnapshot = service.getSnapshot();
  service.failNext('permission');
  assert.equal((await service.setOperatorPermission(owner, first.id, 'pos', false)).ok, false);
  assert.equal(service.operatorPermissions(first.id), original);
  const results = await Promise.all([service.setOperatorPermission(owner, first.id, 'pos', false), service.setOperatorPermission(owner, first.id, 'pos', true)]);
  assert.equal(results[0].ok, true); assert.equal(results[1].ok, false);
  assert.equal(service.operatorPermissions(first.id).includes('pos'), false);
  assert.equal(service.operatorPermissions(second.id).includes('pos'), true);
  assert.equal(previousSnapshot.permissionsByOperator.size, 0, 'published snapshots remain immutable');
  assert.equal((await service.setOperatorPermission(owner, second.id, 'financial', true)).ok, false);
  assert.equal((await service.setOperatorPermission({ ...owner, id: 'other-store' }, first.id, 'pos', true)).ok, false);
});

test('deactivation/reactivation preserves permissions and account attribution, rejects inactive editing and failure leaves status unchanged', async () => {
  const load = fixture();
  const service = load('src/services/settings.ts').createMockSettingsService({ delayMs: 0 });
  const owner = { id: ownerLogin.ownerId, name: 'Demo Owner', mode: 'mock' };
  const operator = service.cashiers(owner.id)[0];
  await service.setOperatorPermission(owner, operator.id, 'inventory', false);
  const permissions = service.operatorPermissions(operator.id);
  service.failNext('operator-status');
  assert.equal((await service.setOperatorActive(owner, operator.id, false)).ok, false);
  assert.equal(service.cashiers(owner.id)[0].status, 'active');
  await service.setOperatorActive(owner, operator.id, false);
  assert.equal(service.matchOperator(owner.id, '1423'), null);
  assert.equal((await service.setOperatorPermission(owner, operator.id, 'inventory', true)).ok, false);
  assert.equal(service.operatorPermissions(operator.id), permissions);
  await service.setOperatorActive(owner, operator.id, true);
  assert.equal(service.matchOperator(owner.id, '1423').id, operator.id);
  assert.equal(service.operatorPermissions(operator.id), permissions);
  assert.equal(service.cashiers(owner.id).length, 2);
});

test('live Operator authentication uses saved capabilities, cannot administer accounts, and permission changes invalidate sessions', async () => {
  const load = fixture();
  const auth = load('src/services/authentication.ts').createAuthenticationService({ enabled: true });
  const settings = load('src/services/settings.ts').settingsService;
  const owner = { id: ownerLogin.ownerId, name: 'Demo Owner', mode: 'mock' };
  await auth.authenticateOwner(ownerLogin);
  await auth.setOperatorPermission({ operatorId: 'TH-KH-0001', group: 'pos', allowed: false });
  const session = (await auth.loginOperator({ ownerId: owner.id, pin: '1423' })).value;
  const { hasCapability } = load('src/utils/operator-access.ts');
  assert.equal(hasCapability(session, 'pos'), false);
  assert.equal(hasCapability(session, 'receivables'), true);
  for (const capability of ['manage-operators', 'financial', 'expenses', 'payables', 'products-create', 'products-delete', 'assets-write']) assert.equal(hasCapability(session, capability), false);
  assert.equal((await auth.profile.read()).ok, false);
  assert.equal((await auth.setOperatorActive({ operatorId: 'TH-KH-0002', active: false })).ok, false);
  await settings.setOperatorPermission(owner, 'TH-KH-0001', 'receivables', false);
  assert.equal(await auth.restoreSession(), null);
});

test('full logout revokes access, rejects in-flight account changes, keeps stored profiles/operators and requires password', async () => {
  const load = fixture();
  const auth = load('src/services/authentication.ts').createAuthenticationService({ enabled: true });
  const settings = load('src/services/settings.ts').settingsService;
  await auth.authenticateOwner(ownerLogin);
  const before = JSON.stringify(settings.cashiers(ownerLogin.ownerId));
  const mutation = auth.createOperator({ name: 'Late Operator', pin: '0044', confirmPin: '0044' });
  await auth.logout();
  assert.equal((await mutation).ok, false);
  assert.equal(await auth.restoreSession(), null);
  assert.equal(JSON.stringify(settings.cashiers(ownerLogin.ownerId)), before);
  assert.equal((await auth.profile.read()).ok, false);
  assert.equal((await auth.unlockOwner({ ownerId: ownerLogin.ownerId, pin: '0123' })).ok, false);
  assert.equal((await auth.authenticateOwner(ownerLogin)).ok, true);
  assert.equal((await auth.profile.read()).value.ownerId, ownerLogin.ownerId);
});

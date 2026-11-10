const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
function fixture({ development = true, flag = 'true', scenario } = {}) {
  const cache = new Map();
  function load(file) {
    file = path.normalize(file);
    if (cache.has(file)) return cache.get(file);
    const context = { exports: {}, __DEV__: development, setTimeout,
      process: { env: { EXPO_PUBLIC_ENABLE_MOCK_AUTH: flag, EXPO_PUBLIC_MOCK_RECOVERY_SCENARIO: scenario } },
      require(name) {
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
const draft = { name: 'Fictional Owner', email: 'new@example.test', password: 'StoreTest25!', confirmPassword: 'StoreTest25!', pin: '0007', confirmPin: '0007' };
const ownerLogin = { ownerId: 'TH-DEMO-OWNER', password: 'DemoStore25@!' };

test('registration validates six fields, returns permanent identity and a separate credential-free session', async () => {
  const load = fixture();
  const { validateRegistration, validateEmail } = load('src/utils/registration.ts');
  for (const email of ['', 'bad', 'x@', 'a b@example.test']) assert.ok(validateEmail(email));
  assert.equal(validateEmail(' person+store@example.test '), undefined);
  assert.ok(validateRegistration({ ...draft, email: 'invalid' }).email);
  const service = load('src/services/authentication.ts').createAuthenticationService({ enabled: true });
  const failed = await service.registerOwner({ ...draft, confirmPin: '0008' });
  assert.equal(failed.status, 'error'); assert.equal(await service.restoreSession(), null);
  const result = await service.registerOwner(draft);
  assert.equal(result.status, 'confirmed'); assert.equal(result.account.id, 'TH-MA-0001');
  const session = await service.restoreSession();
  assert.equal(session.owner.id, result.account.id);
  for (const secret of [draft.pin, draft.password, draft.email]) assert.ok(!JSON.stringify(session).includes(secret));
  assert.equal((await service.registerOwner(draft)).status, 'error');
  await service.logout();
  assert.equal((await service.unlockOwner({ ownerId: result.account.id, pin: draft.pin })).ok, false);
  assert.equal((await service.authenticateOwner({ ownerId: result.account.id, password: draft.password })).value.owner.id, result.account.id);
});

test('password establishes device authentication, lock enables PIN access, full logout and expiry require password', async () => {
  const load = fixture(); let now = 100;
  const service = load('src/services/authentication.ts').createAuthenticationService({ enabled: true, now: () => now });
  const input = { ownerId: ownerLogin.ownerId, pin: '0123' };
  assert.equal((await service.unlockOwner(input)).ok, false);
  assert.equal((await service.authenticateOwner({ ...ownerLogin, password: 'bad' })).ok, false);
  assert.equal(await service.restoreSession(), null);
  assert.equal((await service.authenticateOwner(ownerLogin)).ok, true);
  await service.lockSession(); assert.equal((await service.restoreSession()).locked, true);
  assert.equal((await service.unlockOwner({ ...input, pin: '0000' })).ok, false);
  assert.equal((await service.unlockOwner(input)).value.locked, false);
  await service.logout(); assert.equal(await service.restoreSession(), null);
  assert.equal((await service.unlockOwner(input)).ok, false);
  await service.authenticateOwner(ownerLogin); now += 8 * 60 * 60 * 1000 + 1;
  assert.equal(await service.restoreSession(), null); assert.equal((await service.unlockOwner(input)).ok, false);
});

test('production and non-opt-in adapters never authenticate or perform recovery', async () => {
  for (const config of [{ development: false }, { flag: 'false' }, { flag: undefined }, { flag: 'TRUE' }]) {
    // Explicitly omit flag to test undefined rather than fixture default.
    const load = fixture(config.flag === undefined && 'flag' in config ? { flag: '' } : config);
    const { authenticationService: service } = load('src/services/authentication.ts');
    assert.equal((await service.authenticateOwner(ownerLogin)).ok, false);
    assert.equal((await service.requestPinRecovery({ email: 'owner@example.test' })).ok, false);
    assert.equal((await service.verifyRecoveryToken({ token: 'mock-owner-recovery' })).ok, false);
    assert.equal(await service.restoreSession(), null);
  }
});

test('recovery responses are neutral, respect service cooldown, do not authenticate and never auto-reset', async () => {
  const load = fixture(); let now = 100;
  const service = load('src/services/authentication.ts').createAuthenticationService({ enabled: true, now: () => now });
  const known = await service.requestPinRecovery({ email: 'owner@example.test' });
  const unknown = await service.requestPinRecovery({ email: 'unknown@example.test' });
  assert.deepEqual(known, unknown); assert.equal(known.value.resendAt, 30100);
  assert.equal(await service.restoreSession(), null);
  assert.equal((await service.verifyRecoveryToken({ token: 'mock-owner-recovery' })).ok, true);
  assert.equal((await service.requestPinRecovery({ email: 'failure@example.test' })).ok, false);
  now = 30101;
  const resent = await service.requestPinRecovery({ email: 'unknown@example.test' });
  assert.equal(resent.value.resendAt, 60101);
  now += 900000;
  assert.equal((await service.verifyRecoveryToken({ token: 'mock-owner-recovery' })).code, 'expired');
});

test('recovery verifies missing/invalid/expired/used tokens and atomically resets once without changing ID/password', async () => {
  const load = fixture();
  const service = load('src/services/authentication.ts').createAuthenticationService({ enabled: true });
  assert.equal((await service.verifyRecoveryToken({ token: '' })).code, 'missing');
  assert.equal((await service.resetOwnerPin({ token: 'unknown', pin: '0011' })).code, 'invalid');
  await service.authenticateOwner(ownerLogin);
  await service.requestPinRecovery({ email: 'owner@example.test' });
  const token = 'mock-owner-recovery';
  assert.equal((await service.resetOwnerPin({ token, pin: '1a34' })).ok, false);
  const results = await Promise.all([service.resetOwnerPin({ token, pin: '0011' }), service.resetOwnerPin({ token, pin: '0022' })]);
  assert.equal(results[0].ok, true); assert.equal(results[1].code, 'used');
  assert.equal(await service.restoreSession(), null);
  assert.equal((await service.unlockOwner({ ownerId: ownerLogin.ownerId, pin: '0011' })).ok, false);
  const authenticated = await service.authenticateOwner(ownerLogin);
  assert.equal(authenticated.value.owner.id, ownerLogin.ownerId);
  await service.lockSession();
  assert.equal((await service.unlockOwner({ ownerId: ownerLogin.ownerId, pin: '0123' })).ok, false);
  assert.equal((await service.unlockOwner({ ownerId: ownerLogin.ownerId, pin: '0011' })).ok, true);
  assert.equal((await service.verifyRecoveryToken({ token })).code, 'used');
  for (const scenario of ['expired', 'used']) {
    const scenarioService = fixture({ scenario })('src/services/authentication.ts').authenticationService;
    assert.equal((await scenarioService.verifyRecoveryToken({ token })).code, scenario);
  }
});

test('Operator identity comes from unique active PIN; create, reset, reactivation and Owner verification enforce rules', async () => {
  const load = fixture();
  const service = load('src/services/authentication.ts').createAuthenticationService({ enabled: true });
  const settings = load('src/services/settings.ts').settingsService;
  const values = { name: 'Fictional Operator', pin: '1423', confirmPin: '1423' };
  assert.equal((await service.createOperator(values)).ok, false);
  await service.authenticateOwner(ownerLogin);
  assert.equal((await service.createOperator(values)).ok, false, 'active PIN duplication rejected');
  const created = await service.createOperator({ ...values, pin: '0011', confirmPin: '0011' });
  assert.equal(created.ok, true);
  const actor = { id: ownerLogin.ownerId, name: 'Demo Owner', mode: 'mock' };
  assert.equal((await service.resetOperatorPin({ operatorId: created.value.id, ownerPin: '9999', pin: '0022', confirmPin: '0022' })).ok, false);
  assert.equal((await service.resetOperatorPin({ operatorId: created.value.id, ownerPin: '0123', pin: '1423', confirmPin: '1423' })).ok, false);
  const loggedIn = await service.loginOperator({ ownerId: actor.id, pin: '0011' });
  assert.equal(loggedIn.value.role, 'cashier'); assert.equal(loggedIn.value.operator.id, created.value.id);
  assert.ok(loggedIn.value.operator.permissions.includes('pos')); assert.ok(!loggedIn.value.operator.permissions.includes('financial'));
  assert.ok(!JSON.stringify(loggedIn).includes('0011'));
  assert.equal((await service.createOperator({ ...values, pin: '0099', confirmPin: '0099' })).ok, false);
  await settings.setOperatorActive(actor, created.value.id, false);
  assert.equal(await service.restoreSession(), null);
  assert.equal((await service.loginOperator({ ownerId: actor.id, pin: '0011' })).ok, false);
  const replacement = await settings.createCashier(actor, { ...values, pin: '0011', confirmPin: '0011' });
  assert.equal(replacement.ok, true);
  assert.equal((await settings.setOperatorActive(actor, created.value.id, true)).ok, false, 'reactivation cannot introduce duplicate PIN');
  assert.equal((await settings.resetCashierPin(actor, created.value.id, { ownerPin: '0123', pin: '0022', confirmPin: '0022' })).ok, true);
  assert.equal((await settings.setOperatorActive(actor, created.value.id, true)).ok, true);
  assert.equal(settings.matchOperator(actor.id, '0022').id, created.value.id);
});


test('resending invalidates older recovery links without resurrecting a consumed token', async () => {
  const load = fixture(); let now = 100;
  const service = load('src/services/authentication.ts').createAuthenticationService({ enabled: true, now: () => now });
  await service.requestPinRecovery({ email: 'owner@example.test' });
  await service.resetOwnerPin({ token: 'mock-owner-recovery', pin: '0066' });
  now += 30001;
  await service.requestPinRecovery({ email: 'owner@example.test' });
  assert.equal((await service.verifyRecoveryToken({ token: 'mock-owner-recovery' })).code, 'used');
  assert.equal((await service.verifyRecoveryToken({ token: 'mock-owner-recovery-2' })).ok, true);
});

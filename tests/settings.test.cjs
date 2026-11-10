const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function modules(development = true) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const context = { exports: {}, __DEV__: development, process: { env: { EXPO_PUBLIC_ENABLE_MOCK_AUTH: 'true' } }, setTimeout, Date,
      require(specifier) {
        const base = specifier.startsWith('@/') ? `src/${specifier.slice(2)}` : path.join(path.dirname(file), specifier);
        const target = [`${base}.ts`, `${base}/index.ts`].find(p => fs.existsSync(p));
        if (!target) throw new Error('Unexpected module: ' + specifier);
        return load(target);
      },
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
    cache.set(file, context.exports);
    return context.exports;
  }
  return load;
}
const load = modules();
const { createMockSettingsService } = load('src/services/settings.ts');
const { validateCashier, validatePinChange, canClearCache } = load('src/utils/settings.ts');
const { syncFixtures } = load('src/data/settings.ts');
const owner = { id: 'TH-DEMO-OWNER', name: 'Demo Owner', mode: 'mock' };
const pin = { ownerPin: '0123', pin: '0042', confirmPin: '0042' };

test('PIN forms reject required, nonnumeric, length and mismatch states while retaining leading zeros', () => {
  assert.equal(Object.keys(validatePinChange({ ownerPin: '', pin: '', confirmPin: '' })).length, 3);
  for (const value of ['123', '12345', '12a3', '１２３４', ' 123']) assert.ok(validatePinChange({ ...pin, pin: value }).pin);
  assert.ok(validatePinChange({ ...pin, ownerPin: '123' }).ownerPin);
  assert.ok(validatePinChange({ ...pin, confirmPin: '0043' }).confirmPin);
  assert.equal(Object.keys(validatePinChange(pin)).length, 0);
  assert.ok(validateCashier({ name: '  ', pin: '0042', confirmPin: '0042' }).name);
});

test('creation has deterministic unique IDs, concurrent write protection and credential-free store-scoped reads', async () => {
  const service = createMockSettingsService({ empty: true, delayMs: 0 });
  let notifications = 0;
  const unsubscribe = service.subscribe(() => notifications++);
  const values = { name: '  Fictional Cashier  ', pin: '0001', confirmPin: '0001' };
  const initialSnapshot = service.getSnapshot();
  assert.equal(service.getSnapshot(), initialSnapshot);
  const [first, duplicate] = await Promise.all([service.createCashier(owner, values), service.createCashier(owner, values)]);
  assert.equal(first.ok, true); assert.equal(duplicate.ok, false);
  assert.equal(first.value.id, 'TH-KH-0003'); assert.equal(first.value.name, 'Fictional Cashier');
  assert.notEqual(service.getSnapshot(), initialSnapshot);
  assert.equal(initialSnapshot.cashiers.length, 0, 'previous snapshots remain unchanged for retained screens');
  assert.equal(service.getSnapshot().cashiers.length, 1);
  const second = await service.createCashier(owner, { ...values, name: 'Second Cashier', pin: '0002', confirmPin: '0002' });
  assert.equal(second.value.id, 'TH-KH-0004');
  assert.equal(service.cashiers(owner.id).length, 2);
  assert.equal(service.cashiers('other-store').length, 0);
  assert.deepEqual(Object.keys(first.value).sort(), ['id', 'name', 'ownerId', 'status']);
  assert.equal(service.verifyCashier(owner.id, first.value.id, '0001').id, first.value.id);
  assert.equal(service.verifyCashier('other-store', first.value.id, '0001'), null);
  assert.equal(notifications, 2); unsubscribe();
  assert.equal(createMockSettingsService({ empty: true }).cashiers(owner.id).length, 0);
});

test('Owner verification and reset target only the selected cashier without receiving their old PIN', async () => {
  const service = createMockSettingsService({ delayMs: 0 });
  const [first, second] = service.cashiers(owner.id);
  const denied = await service.resetCashierPin(owner, first.id, { ...pin, ownerPin: '1423' });
  assert.equal(denied.ok, false); assert.ok(denied.fields.ownerPin);
  assert.equal((await service.resetCashierPin(owner, first.id, pin)).ok, true);
  assert.equal(service.verifyCashier(owner.id, first.id, '0042').id, first.id);
  assert.equal(service.verifyCashier(owner.id, first.id, '1423'), null);
  assert.equal(service.verifyCashier(owner.id, second.id, '2846').id, second.id);
  assert.equal((await service.resetCashierPin(owner, 'missing-id', pin)).ok, false);
  service.initializePreviewOwner('other-store', '0123');
  assert.equal((await service.resetCashierPin({ ...owner, id: 'other-store', mode: 'preview' }, first.id, pin)).ok, false);
  assert.equal((await service.changeOwnerPin(owner, pin)).ok, true);
  assert.equal(service.verifyOwnerPin(owner.id, '0123'), false);
  assert.equal(service.verifyOwnerPin(owner.id, '0042'), true);
  assert.equal((await service.resetCashierPin(owner, second.id, pin)).ok, false);
});

test('failed and invalid saves leave lists and credentials unchanged, then permit retry', async () => {
  const service = createMockSettingsService({ failNext: 'create', delayMs: 0 });
  const before = JSON.stringify(service.cashiers(owner.id));
  const values = { name: 'New Cashier', pin: '0056', confirmPin: '0056' };
  assert.equal((await service.createCashier(owner, values)).ok, false);
  assert.equal(JSON.stringify(service.cashiers(owner.id)), before);
  assert.equal((await service.createCashier(owner, { ...values, confirmPin: '1234' })).ok, false);
  assert.equal(JSON.stringify(service.cashiers(owner.id)), before);
  assert.equal((await service.createCashier(owner, values)).value.id, 'TH-KH-0003');
  service.failNext('change-pin');
  assert.equal((await service.changeOwnerPin(owner, pin)).ok, false);
  assert.equal(service.verifyOwnerPin(owner.id, '0123'), true);
  service.failNext('reset-pin');
  assert.equal((await service.resetCashierPin(owner, 'TH-KH-0001', pin)).ok, false);
  assert.equal(service.verifyCashier(owner.id, 'TH-KH-0001', '1423').id, 'TH-KH-0001');
});

test('all sync states enforce cache restrictions; failed sync retries through progress to complete', async () => {
  const service = createMockSettingsService({ scenario: 'offline', failNext: 'sync', delayMs: 0 });
  for (const [status, state] of Object.entries(syncFixtures)) {
    assert.equal(canClearCache(state), status === 'up-to-date' || status === 'complete');
  }
  assert.equal((await service.clearCache(owner)).ok, false);
  const observed = [];
  service.subscribe(() => observed.push({ ...service.syncState(owner.id) }));
  const first = service.synchronize(owner);
  assert.equal((await service.synchronize(owner)).ok, false);
  assert.equal((await service.clearCache(owner)).ok, false);
  assert.equal((await first).ok, false);
  assert.equal(service.syncState(owner.id).status, 'failed');
  assert.equal(service.syncState(owner.id).pendingRecords, 3);
  assert.equal((await service.synchronize(owner)).ok, true);
  assert.equal(service.syncState(owner.id).status, 'complete');
  assert.equal(service.syncState(owner.id).pendingRecords, 0);
  assert.ok(service.syncState(owner.id).lastSyncedAt);
  assert.ok(observed.some(item => item.status === 'syncing' && item.progress === 58));
  assert.equal((await service.clearCache(owner)).ok, true);
});

test('cache confirmation rechecks after opening, never changes records, and permits failure retry', async () => {
  const service = createMockSettingsService({ delayMs: 5 });
  const records = JSON.stringify(service.cashiers(owner.id));
  const request = service.clearCache(owner);
  service.preview(owner.id, 'offline');
  assert.equal((await request).ok, false, 'eligibility is checked at confirmation completion');
  service.preview(owner.id, 'complete'); service.failNext('clear-cache');
  assert.equal((await service.clearCache(owner)).ok, false);
  assert.equal((await service.clearCache(owner)).ok, true);
  assert.equal(JSON.stringify(service.cashiers(owner.id)), records);
  assert.equal(service.verifyOwnerPin(owner.id, '0123'), true);
  assert.equal(service.verifyCashier(owner.id, 'TH-KH-0001', '1423').id, 'TH-KH-0001');
});

test('production, uninitialized and confirmed real identities cannot invoke the mock mutations', async () => {
  const { createMockSettingsService: production } = modules(false)('src/services/settings.ts');
  const service = production({ delayMs: 0 });
  assert.equal((await service.changeOwnerPin(owner, pin)).ok, false);
  assert.equal((await service.synchronize(owner)).ok, false);
  const development = createMockSettingsService({ delayMs: 0 });
  for (const actor of [null, { ...owner, mode: 'confirmed' }, { ...owner, id: 'unknown' }]) {
    assert.equal((await development.clearCache(actor)).ok, false);
  }
});

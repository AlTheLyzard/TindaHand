const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function modules(development, flag) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const context = { exports: {}, __DEV__: development, setTimeout, process: { env: { EXPO_PUBLIC_ENABLE_MOCK_AUTH: flag } },
      require(specifier) {
        const base = specifier.startsWith('@/') ? `src/${specifier.slice(2)}` : path.join(path.dirname(file), specifier);
        const target = [`${base}.ts`, `${base}/index.ts`].find(p => fs.existsSync(path.join(__dirname, '..', p)));
        if (!target) throw new Error('Unexpected module: ' + specifier);
        return load(target);
      },
    };
    vm.runInNewContext(code, context);
    cache.set(file, context.exports);
    return context.exports;
  }
  return load;
}

test('Owner login accepts the changed Settings PIN and rejects the previous PIN without exposing credentials', async () => {
  const load = modules(true, 'true');
  const data = load('src/data/mock-auth.ts'); const demoOwner = { ...data.demoOwner, ...load('src/data/mock-auth-credentials.ts').mockOwnerCredentials };
  const { settingsService } = load('src/services/settings.ts');
  const { authenticateMockOwner } = load('src/services/mock-auth.ts');
  const actor = { id: demoOwner.id, name: demoOwner.name, mode: 'mock' };
  const result = await settingsService.changeOwnerPin(actor, { ownerPin: demoOwner.pin, pin: '0042', confirmPin: '0042' });
  assert.equal(result.ok, true);
  assert.equal(authenticateMockOwner('owner', demoOwner.id, demoOwner.pin), null);
  const session = authenticateMockOwner('owner', demoOwner.id, '0042');
  assert.equal(session.owner.id, demoOwner.id);
  assert.ok(!JSON.stringify(session).includes('0042'));
});

test('mock login requires both development mode and the exact explicit flag', () => {
  for (const [development, flag] of [[false, 'true'], [false, undefined], [true, undefined], [true, 'false'], [true, '1'], [true, 'TRUE']]) {
    const load = modules(development, flag);
    const data = load('src/data/mock-auth.ts'); const demoOwner = { ...data.demoOwner, ...load('src/data/mock-auth-credentials.ts').mockOwnerCredentials };
    const { authenticateMockOwner } = load('src/services/mock-auth.ts');
    assert.equal(authenticateMockOwner('owner', demoOwner.id, demoOwner.pin), null);
  }
});

test('only the exact fictional Owner credentials authenticate; session has no PIN', () => {
  const load = modules(true, 'true');
  const data = load('src/data/mock-auth.ts'); const demoOwner = { ...data.demoOwner, ...load('src/data/mock-auth-credentials.ts').mockOwnerCredentials };
  const { authenticateMockOwner } = load('src/services/mock-auth.ts');
  for (const [role, id, pin] of [
    ['cashier', demoOwner.id, demoOwner.pin], ['owner', '', demoOwner.pin],
    ['owner', demoOwner.id.toLowerCase(), demoOwner.pin], ['owner', ` ${demoOwner.id}`, demoOwner.pin],
    ['owner', demoOwner.id, '9999'], ['owner', demoOwner.id, '123'], ['owner', demoOwner.id, '01x3'],
  ]) assert.equal(authenticateMockOwner(role, id, pin), null);
  const session = authenticateMockOwner('owner', demoOwner.id, demoOwner.pin);
  assert.equal(session.kind, 'mock');
  assert.equal(session.role, 'owner');
  assert.equal(session.owner.id, demoOwner.id);
  assert.equal(session.owner.name, demoOwner.name);
  assert.ok(!JSON.stringify(session).includes(demoOwner.pin));
});

test('formatted typed or pasted demo ID reaches the existing login handler', () => {
  const load = modules(true, 'true');
  const { formatOwnerId } = load('src/utils/owner-id.ts');
  const { authenticateMockOwner } = load('src/services/mock-auth.ts');
  const data = load('src/data/mock-auth.ts'); const demoOwner = { ...data.demoOwner, ...load('src/data/mock-auth-credentials.ts').mockOwnerCredentials };
  for (const entry of ['thdemoowner', 'th-demo-owner', 'TH-DEMO-OWNER']) {
    assert.equal(authenticateMockOwner('owner', formatOwnerId(entry), demoOwner.pin).owner.id, demoOwner.id);
  }
});

test('shared Owner gate rejects disabled, production, cashier, incomplete and logged-out sessions', () => {
  const load = modules(true, 'true');
  const { authenticateMockOwner } = load('src/services/mock-auth.ts');
  const data = load('src/data/mock-auth.ts'); const demoOwner = { ...data.demoOwner, ...load('src/data/mock-auth-credentials.ts').mockOwnerCredentials };
  const { resolveOwnerAccess } = load('src/utils/dashboard-access.ts');
  const session = authenticateMockOwner('owner', demoOwner.id, demoOwner.pin);
  assert.equal(resolveOwnerAccess(null, 'owner', true, true, session, true).mode, 'mock');
  for (const [role, access, development, enabled, current] of [
    ['owner', true, false, true, session], ['owner', true, true, false, session],
    ['cashier', true, true, true, session], ['owner', false, true, true, session],
    ['owner', true, true, true, null], ['owner', true, true, true, { ...session, owner: { id: '', name: 'Demo' } }],
  ]) assert.equal(resolveOwnerAccess(null, role, access, development, current, enabled), null);
  const oldCompletion = { id: 'old', name: 'Old Owner', mode: 'confirmed', toastExpiresAt: null };
  assert.equal(resolveOwnerAccess(oldCompletion, 'owner', true, false, session, true), null, 'a mock session cannot fall back to registration access in production');
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Use the installed TypeScript compiler without a new test dependency.
const moduleCache = new Map();
function loadModule(relativePath) {
  if (moduleCache.has(relativePath)) return moduleCache.get(relativePath);
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = {
    exports: {},
    require: (specifier) => {
      if (specifier === 'react-native') return require('react-native-web');
      // This static-markup check covers Button semantics; motion needs a mounted renderer.
      if (specifier === '@/components/ui/motion-pressable') return { MotionPressable: require('react-native-web').Pressable };
      if (specifier === 'react' || specifier === 'react/jsx-runtime') return require(specifier);
      const base = specifier.startsWith('@/') ? `src/${specifier.slice(2)}`
        : specifier.startsWith('.') ? path.join(path.dirname(relativePath), specifier).replaceAll('\\', '/') : null;
      if (!base) throw new Error('Only project modules are supported in this test loader.');
      const resolved = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(p => fs.existsSync(path.join(__dirname, '..', p)));
      if (!resolved) throw new Error('Project module not found: ' + specifier);
      return loadModule(resolved);
    },
  };
  vm.runInNewContext(code, context);
  moduleCache.set(relativePath, context.exports);
  return context.exports;
}

const { parseAccountRole, validateLogin } = loadModule('src/utils/account-access.ts');
const { validateRegistration } = loadModule('src/utils/registration.ts');
const { canOpenOwnerDashboard } = loadModule('src/utils/dashboard-access.ts');
const { summarizeDashboard, formatPesos } = loadModule('src/utils/dashboard.ts');
const { emptyDashboardDemo } = loadModule('src/data/content-preview.ts');
const { cashAmountError, createCashRegisterStore } = loadModule('src/utils/cash-register.ts');
const { dashboardDemo } = loadModule('src/data/dashboard.ts');

test('cash adjustments validate exact centavos and consume each form only once', () => {
  const store = createCashRegisterStore();
  const token = store.begin();
  const balance = summarizeDashboard('daily').cashCentavos;
  for (const value of ['', ' ', '0', '0.00', '-1', '+2', '1e3', '1,000', '1.234', 'abc', '.', 'Infinity', '90071992547409.92']) {
    assert.ok(cashAmountError(value), value);
    assert.equal(store.add(token, value, balance), null, value);
  }
  assert.equal(cashAmountError('.01'), null);
  assert.equal(cashAmountError('1500.'), null);
  assert.equal(store.add(token, '1500.25', balance), 150025);
  assert.equal(store.add(token, '1500.25', balance), null);
  assert.equal(store.add(token, '10', balance), null);
  assert.equal(store.add(store.begin(), '.01', balance), 150026);
  assert.equal(store.add(store.begin(), '90071992547409.91', balance), null);
});

test('cash additions update all period cash totals without changing sales or source fixtures', () => {
  const seed = JSON.stringify(dashboardDemo);
  for (const period of ['daily', 'weekly', 'monthly']) {
    const before = summarizeDashboard(period);
    const after = summarizeDashboard(period, dashboardDemo, 150025);
    assert.equal(after.cashCentavos, before.cashCentavos + 150025);
    assert.equal(after.moneyIn, before.moneyIn + 150025);
    for (const key of ['moneyOut', 'totalSalesCentavos', 'saleCount', 'growth']) assert.equal(after[key], before[key]);
  }
  assert.equal(JSON.stringify(dashboardDemo), seed);
});

test('first-use dashboard has zero totals and no fabricated growth or ranking in every period', () => {
  const reference = summarizeDashboard('daily');
  for (const period of ['daily', 'weekly', 'monthly']) {
    const empty = summarizeDashboard(period, emptyDashboardDemo);
    assert.equal(empty.cashCentavos, 0);
    assert.equal(empty.totalSalesCentavos, 0);
    assert.equal(empty.saleCount, 0);
    assert.equal(empty.moneyIn, 0);
    assert.equal(empty.moneyOut, 0);
    assert.equal(empty.growth, null);
    assert.equal(empty.bestSellers.length, 0);
    assert.equal(empty.outOfStock, 0);
    assert.equal(empty.lowStock, 0);
  }
  assert.deepEqual(summarizeDashboard('daily'), reference, 'preview must not change the populated fixture');
});
const { createScrollDirectionTracker } = loadModule('src/utils/scroll-direction.ts');
const { t, translate, DEFAULT_LOCALE, SUPPORTED_LOCALES, getAppLocale, setAppLocale, subscribeToLocale } = loadModule('src/i18n/index.ts');

test('English is the default and reserved Filipino remains an English fallback', () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.deepEqual(Array.from(SUPPORTED_LOCALES), ['en', 'fil']);
  let notifications = 0;
  const unsubscribe = subscribeToLocale(() => notifications++);
  setAppLocale('fil');
  assert.equal(getAppLocale(), 'en');
  assert.equal(translate('fil', 'roles.owner'), 'Owner');
  assert.equal(t('roles.cashier'), 'Cashier');
  assert.equal(notifications, 0, 'Unavailable languages must not change active English');
  unsubscribe();
});

test('localized interpolation preserves dynamic content and uses the requested English terminology', () => {
  assert.equal(t('dashboard.greeting', { name: 'Juan $& {{cash}}' }), 'Good day, Juan $& {{cash}}!');
  assert.equal(t('dashboard.identity', { id: 'TH-MA-0001', date: 'Oct 21, 2026' }), 'ID: TH-MA-0001 • Oct 21, 2026');
  assert.equal(t('dashboard.itemCount', { count: 5 }), '5 items');
  assert.equal(t('dashboard.itemCountOne', { count: 1 }), '1 item');
  assert.equal(t('fields.requiredAccessibility', { label: 'Owner ID' }), 'Owner ID, required');
  assert.equal(t('auth.progress', { step: 2 }), 'Account setup, step 2 of 3');
  for (const [key,value] of Object.entries({ 'dashboard.cashTitle':'Cash in Register', 'dashboard.income':'Income', 'dashboard.expenses':'Expenses', 'dashboard.period.daily':'Daily', 'dashboard.period.weekly':'Weekly', 'dashboard.period.monthly':'Monthly', 'dashboard.bestSellers':'Best-Selling Items' })) assert.equal(t(key),value);
});

test('dashboard direction accumulates small movements and requires a threshold after reversal', () => {
  const direction = createScrollDirectionTracker(8);
  assert.equal(direction(0, 500), null);
  assert.equal(direction(3, 500), null);
  assert.equal(direction(6, 500), null);
  assert.equal(direction(8, 500), 'down');
  assert.equal(direction(8, 500), null);
  assert.equal(direction(7, 500), null);
  assert.equal(direction(10, 500), null);
  assert.equal(direction(9, 500), null);
  assert.equal(direction(2, 500), 'up');
});

test('dashboard direction ignores both edge bounces, invalid offsets and non-scrollable content', () => {
  const direction = createScrollDirectionTracker(8);
  assert.equal(direction(40, 500), 'down');
  for (const y of [-20, -5, 0, 4]) assert.equal(direction(y, 500), null);
  assert.equal(direction(8, 500), 'down');
  assert.equal(direction(500, 500), 'down');
  for (const y of [520, 510, 500, 496]) assert.equal(direction(y, 500), null);
  assert.equal(direction(492, 500), 'up');
  assert.equal(direction(NaN, 500), null);
  assert.equal(direction(10, Infinity), null);
  const stationary = createScrollDirectionTracker(8);
  for (const y of [0, 10, -10, 0]) assert.equal(stationary(y, 0), null);
});

test('owner dashboard requires completed onboarding, owner capability and permitted completion mode', () => {
  const owner = { name: 'Demo Owner', id: 'TH-MA-0001', mode: 'confirmed', toastExpiresAt: null };
  assert.equal(canOpenOwnerDashboard(owner, 'owner', true, false), true);
  assert.equal(canOpenOwnerDashboard(null, 'owner', true, true), false);
  assert.equal(canOpenOwnerDashboard(owner, 'cashier', true, true), false);
  assert.equal(canOpenOwnerDashboard(owner, null, true, true), false);
  assert.equal(canOpenOwnerDashboard(owner, 'owner', false, true), false);
  assert.equal(canOpenOwnerDashboard({ ...owner, id: ' ' }, 'owner', true, true), false);
  assert.equal(canOpenOwnerDashboard({ ...owner, mode: 'preview' }, 'owner', true, false), false);
  assert.equal(canOpenOwnerDashboard({ ...owner, mode: 'preview' }, 'owner', true, true), true);
});

test('dashboard derives reference totals, stock and ranking from integer-centavo fixtures', () => {
  const daily = summarizeDashboard('daily');
  assert.equal(daily.cashCentavos, 1245000);
  assert.equal(daily.totalSalesCentavos, 1245000);
  assert.equal(daily.growth, 12);
  assert.equal(daily.outOfStock, 3);
  assert.equal(daily.lowStock, 5);
  assert.equal(daily.bestSellers[0].quantity, 86);
  assert.equal(summarizeDashboard('weekly').totalSalesCentavos, daily.totalSalesCentavos);
  assert.equal(summarizeDashboard('monthly').growth, null);
  assert.equal(formatPesos(1245000), '₱12,450.00');
});
const validDraft = {
  name: 'Demo Owner', password: 'DemoStore25@!', confirmPassword: 'DemoStore25@!',
  pin: '0123', confirmPin: '0123',
};

test('only the two documented, unambiguous roles can open login', () => {
  assert.equal(parseAccountRole('owner'), 'owner');
  assert.equal(parseAccountRole('cashier'), 'cashier');
  for (const value of [undefined, '', 'admin', 'OWNER', ['owner'], ['owner', 'cashier']]) {
    assert.equal(parseAccountRole(value), null);
  }
});

const { createRegistrationRequest } = loadModule('src/utils/registration-request.ts');
const { registerOwner } = loadModule('src/services/registration.ts');

test('invalid registration never calls the service', async () => {
  let calls = 0;
  const request = createRegistrationRequest(async () => { calls++; });
  const result = await request({ ...validDraft, pin: '12' });
  assert.equal(calls, 0);
  assert.equal(result.status, 'error');
  assert.ok(result.fields.pin);
});

test('confirmed service result is returned once and uses the server ID', async () => {
  let calls = 0;
  const original = { ...validDraft, name: '  Demo Owner  ' };
  const request = createRegistrationRequest(async (input) => {
    calls++;
    assert.equal(input.name, 'Demo Owner');
    input.password = 'modified adapter copy';
    return { status: 'confirmed', account: { name: input.name, id: 'SERVER-OWNER-42' } };
  });
  const result = await request(original);
  assert.equal(result.status, 'confirmed');
  assert.equal(result.account.id, 'SERVER-OWNER-42');
  assert.equal(original.password, validDraft.password);
  assert.equal(await request(original), null);
  assert.equal(calls, 1);
});

test('simultaneous taps share a lock and a failed request can be retried', async () => {
  let finish;
  let calls = 0;
  const request = createRegistrationRequest(async () => {
    calls++;
    return new Promise((resolve) => { finish = resolve; });
  });
  const first = request(validDraft);
  assert.equal(await request(validDraft), null);
  assert.equal(calls, 1);
  finish({ status: 'error', message: 'Please retry.' });
  assert.equal((await first).status, 'error');
  const retry = request(validDraft);
  assert.equal(calls, 2);
  finish({ status: 'confirmed', account: { name: 'Demo Owner', id: 'SERVER-42' } });
  assert.equal((await retry).status, 'confirmed');
});

test('transport exceptions are safe and preserve the caller draft for retry', async () => {
  const draft = { ...validDraft };
  let calls = 0;
  const request = createRegistrationRequest(async () => {
    calls++;
    throw new Error(`Sensitive transport detail ${validDraft.password}`);
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await request(draft);
    assert.equal(result.status, 'error');
    assert.ok(!result.message.includes(validDraft.password));
  }
  assert.equal(calls, 2);
  assert.deepEqual(draft, validDraft);
});

test('adapter field errors are retained and incomplete confirmations never unlock success', async () => {
  const errors = { status: 'error', message: 'Please review your details.', fields: { name: 'Name could not be accepted.' } };
  assert.equal((await createRegistrationRequest(async () => errors)(validDraft)).fields.name, errors.fields.name);
  for (const account of [{ name: 'Demo Owner', id: '' }, { name: '', id: 'SERVER-42' }]) {
    const result = await createRegistrationRequest(async () => ({ status: 'confirmed', account }))(validDraft);
    assert.equal(result.status, 'error');
  }
});

test('unconnected default adapter never confirms account creation', async () => {
  const result = await registerOwner(validDraft);
  assert.equal(result.status, 'error');
  assert.ok(result.message.includes('No account has been created'));
});

test('button default, disabled and loading states expose correct accessible interaction state', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { Button } = loadModule('src/components/ui/button.tsx');
  const render = (props) => renderToStaticMarkup(React.createElement(Button, props, 'Create My Account'));
  const normal = render({});
  assert.ok(!normal.includes('disabled=""'));
  const disabled = render({ disabled: true });
  assert.ok(disabled.includes('disabled=""'));
  assert.ok(disabled.includes('aria-disabled="true"'));
  const loading = render({ loading: true });
  assert.ok(loading.includes('disabled=""'));
  assert.ok(loading.includes('aria-busy="true"'));
  assert.ok(loading.includes('role="progressbar"'));
});

test('login requires ID and exactly four ASCII digits, preserving leading zeroes', () => {
  assert.equal(validateLogin('TH-MA-0001', '0123').id, undefined);
  assert.equal(validateLogin('TH-MA-0001', '0123').pin, undefined);
  assert.ok(validateLogin('   ', '0123').id);
  for (const pin of ['', '123', '12345', '12a4', '１２３４']) {
    assert.ok(validateLogin('TH-MA-0001', pin).pin);
  }
});

test('registration preview requires all five fields and a nonblank name', () => {
  assert.equal(Object.keys(validateRegistration(validDraft)).length, 0);
  const emptyDraft = Object.fromEntries(Object.keys(validDraft).map((field) => [field, '']));
  assert.equal(Object.keys(validateRegistration(emptyDraft)).length, 5);
  assert.ok(validateRegistration({ ...validDraft, name: '   ' }).name);
});

test('registration enforces every password complexity rule', () => {
  for (const password of ['Ab1!', 'demostore25@!', 'DEMOSTORE25@!', 'DemoStore@@', 'DemoStore25', 'DemoStore25 ']) {
    assert.ok(validateRegistration({ ...validDraft, password, confirmPassword: password }).password);
  }
});

test('registration rejects invalid and mismatching PINs and passwords', () => {
  for (const pin of ['123', '12345', '12a4', '１２３４']) {
    assert.ok(validateRegistration({ ...validDraft, pin, confirmPin: pin }).pin);
  }
  assert.equal(validateRegistration({ ...validDraft, confirmPassword: 'Other25@!' }).confirmPassword,
    'Passwords do not match. Please enter the correct password.');
  assert.equal(validateRegistration({ ...validDraft, confirmPin: '9876' }).confirmPin,
    'PINs do not match. Please enter the correct PIN.');
});

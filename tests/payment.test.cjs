const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/pos-payment.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { parsePaymentAmount, paymentAmounts, paymentErrors, emptyPaymentDraft } = context.exports;
const draft = patch => ({ ...emptyPaymentDraft(), ...patch });
const valid = (total, value) => !Object.values(paymentErrors(total, value)).some(Boolean);

test('peso parser preserves exact centavos and rejects malformed, negative and unsafe values', () => {
  for (const [input, expected] of [['83', 8300], ['100.00', 10000], ['0.29', 29], ['.50', 50], ['12.', 1200], [' 00012.30 ', 1230], ['90071992547409.91', Number.MAX_SAFE_INTEGER]]) assert.equal(parsePaymentAmount(input), expected, input);
  for (const input of ['', '.', '1.001', '-5', '+5', '1e3', 'NaN', 'Infinity', '₱100', '1,000', '1 00', '90071992547409.92']) assert.equal(parsePaymentAmount(input), null, input);
});

test('Cash and GCash full payment block insufficient payment and ignore hidden drafts', () => {
  assert.ok(valid(8300, draft({ cashAmount: '100', gcashAmount: 'bad', partialAmount: '-2', splitCashAmount: 'bad' })));
  assert.equal(paymentAmounts(8300, draft({ cashAmount: '100' })).changeCentavos, 1700);
  assert.equal(paymentAmounts(8300, draft({ cashAmount: '10' })).changeCentavos, 0);
  assert.equal(paymentErrors(8300, draft({ cashAmount: '50' })).amount, 'insufficient');
  assert.equal(paymentErrors(8300, draft({ cashAmount: '' })).cash, 'required');
  assert.equal(paymentErrors(8300, draft({ cashAmount: '0' })).amount, 'positive');
  assert.equal(paymentErrors(0, draft({ cashAmount: '100' })).order, true);
  assert.ok(valid(8300, draft({ method: 'gcash', cashAmount: 'bad', gcashAmount: '83', gcashReference: '000abc' })));
  assert.equal(paymentErrors(8300, draft({ method: 'gcash', gcashAmount: '83', gcashReference: '  ' })).reference, true);
});

test('Split combines both tenders and derives change only from Cash', () => {
  const split = draft({ method: 'split', splitCashAmount: '70', splitGcashAmount: '30', splitReference: '0004770064462' });
  assert.ok(valid(10000, split));
  assert.equal(paymentAmounts(10000, split).paidCentavos, 10000);
  assert.equal(paymentAmounts(10000, split).changeCentavos, 0);
  assert.equal(paymentAmounts(10000, { ...split, splitCashAmount: '100' }).changeCentavos, 3000);
  assert.equal(paymentErrors(10000, { ...split, splitCashAmount: '69.99' }).amount, 'insufficient');
  assert.equal(paymentErrors(10000, { ...split, splitReference: '' }).reference, true);
  const over = paymentAmounts(10000, { ...split, splitCashAmount: '20', splitGcashAmount: '110' });
  assert.equal(over.changeCentavos, 2000);
  assert.equal(paymentErrors(10000, { ...split, splitGcashAmount: '110' }).gcash, 'overpayment');
  assert.equal(valid(10000, { ...split, splitGcashAmount: '110' }), false);
  assert.ok(valid(10000, { ...split, splitCashAmount: '100', splitGcashAmount: '0', splitReference: '' }));
});

test('Partial Payment requires a customer, retains its tender, and guides fully paid sales away from debt', () => {
  const partial = draft({ method: 'partial', partialMethod: 'cash', partialAmount: '40', customerName: 'Bini Rha' });
  assert.ok(valid(10000, partial));
  assert.equal(paymentAmounts(10000, partial).remainingCentavos, 6000);
  assert.equal(paymentErrors(10000, { ...partial, customerName: ' ' }).customer, true);
  assert.ok(valid(10000, { ...partial, customerName: '', customerId: 'existing' }));
  assert.equal(paymentErrors(10000, { ...partial, partialAmount: '100' }).amount, 'fullyPaid');
  assert.equal(paymentErrors(10000, { ...partial, partialAmount: '101' }).amount, 'fullyPaid');
  assert.equal(valid(10000, { ...partial, partialAmount: '0' }), false);
  assert.equal(paymentErrors(10000, { ...partial, partialMethod: null }).tender, true);
  assert.equal(paymentErrors(10000, { ...partial, partialMethod: 'gcash' }).reference, true);
  assert.ok(valid(10000, { ...partial, partialMethod: 'gcash', partialReference: '00001' }));
});

test('all active amounts reject malformed and negative values; combined overflow cannot complete', () => {
  for (const value of ['', '-1', '1.001', 'Infinity', '1e2']) {
    for (const patch of [{ cashAmount: value }, { method: 'gcash', gcashAmount: value, gcashReference: 'x' },
      { method: 'split', splitCashAmount: value, splitGcashAmount: '30', splitReference: 'x' },
      { method: 'split', splitCashAmount: '70', splitGcashAmount: value, splitReference: 'x' },
      { method: 'partial', partialAmount: value, customerName: 'Demo' }]) assert.equal(valid(10000, draft(patch)), false);
  }
  const overflow = draft({ method: 'split', splitCashAmount: '90071992547409.91', splitGcashAmount: '1', splitReference: 'x' });
  assert.equal(paymentErrors(10000, overflow).amount, 'invalid');
});

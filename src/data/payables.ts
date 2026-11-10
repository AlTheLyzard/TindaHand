import { demoOwner } from './mock-auth';
import type { PayablesLedger } from '@/types/payables';

const ownerId = demoOwner.id;
/** Fictional examples from the supplied AP frames, with consistent arithmetic. */
export const payablesSeed: PayablesLedger = {
  creditors: ['Coca Cola Bottlers', 'Mang Arthuro', 'Yorme', 'Boy bunda', 'Kuya', 'Carmina', 'Anne', 'Arman Salon', 'Arthur Nery', 'Azalea', 'Binay', 'Bini Rha', 'Cheska', 'Camote Cue'].map((name, index) => ({ id: `demo-creditor-${index + 1}`, ownerId, name })),
  debts: [
    { id: 'demo-payable-cola', ownerId, creditorId: 'demo-creditor-1', name: 'Coca Cola Bottlers', originalAmountCentavos: 450000, dueDate: '2026-11-10', details: 'Beverage delivery', occurredAt: '2026-10-26T02:00:00Z' },
    { id: 'demo-payable-arthuro', ownerId, creditorId: 'demo-creditor-2', name: 'Mang Arthuro', originalAmountCentavos: 120000, dueDate: '2026-11-12', details: 'Store supplies', occurredAt: '2026-10-02T02:00:00Z' },
    ...['Yorme', 'Boy bunda', 'Kuya', 'Carmina', 'Anne'].map((name, index) => ({ id: `demo-payable-paid-${index}`, ownerId, creditorId: `demo-creditor-${index + 3}`, name, originalAmountCentavos: [30000, 1400, 120000, 120000, 120000][index], dueDate: null, details: '', occurredAt: '2026-10-02T02:00:00Z' })),
  ],
  payments: [
    { id: 'demo-payable-payment-arthuro', ownerId, debtId: 'demo-payable-arthuro', amountCentavos: 50000, occurredAt: '2026-10-15T02:00:00Z' },
    ...[30000, 1400, 120000, 120000, 120000].map((amountCentavos, index) => ({ id: `demo-payable-payment-${index}`, ownerId, debtId: `demo-payable-paid-${index}`, amountCentavos, occurredAt: '2026-10-20T02:00:00Z' })),
  ],
};

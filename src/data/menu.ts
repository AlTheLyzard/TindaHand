import type { OwnerTool } from '@/types/menu';

/** Ordered to match docs/designs/More tools (FS).png. All destinations are owner-gated. */
export const ownerMenuTools = [
  {
    id: 'financial-statements', label: 'Financial Statements', icon: 'financial',
    subtitle: 'General Journal, Ledger, Income Statement, Balance Sheet',
    temporaryMessage: 'Financial statement generation and downloads are not available in this frontend demo yet.',
  },
  {
    id: 'transaction-history', label: 'Transaction History', icon: 'history',
    subtitle: 'Review and manage store transactions',
    temporaryMessage: 'Completed POS orders from this session appear below. Search, filters, and record management are not available yet.',
  },
  {
    id: 'store-expenses', label: 'Store Expenses', icon: 'expense',
    subtitle: 'Record and review store spending',
    temporaryMessage: '',
  },
  {
    id: 'receivables-payables', label: 'Receivables & Payables', icon: 'customerDebt',
    subtitle: 'Manage money owed to and by you',
    temporaryMessage: 'Customer balances from POS and Quick Add appear below. Debt payments and payment history are not available yet. You can also record a debt with Quick Add.',
    actions: [{ label: 'Add Customer Debt', kind: 'customerDebt' }, { label: 'Add Store Debt', kind: 'storeDebt' }],
  },
  {
    id: 'settings', label: 'Settings', icon: 'settings',
    temporaryMessage: 'Application, notification, and account preferences are not available in this frontend demo yet.',
  },
] as const satisfies readonly OwnerTool[];

export const ownerProfileTool: OwnerTool = {
  id: 'profile', label: 'Profile', icon: 'profile',
  temporaryMessage: 'Profile editing and cashier access management are not available in this frontend demo yet.',
};

export function findOwnerTool(id: string | undefined): OwnerTool | undefined {
  return [...ownerMenuTools, ownerProfileTool].find(tool => tool.id === id);
}

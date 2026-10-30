import type { QuickAddKind } from '@/types/quick-add';

/** Frontend-only presentation state sampled by the sidebar's UI-thread clock. */
export type MenuDescriptionFrame = {
  characters: readonly number[];
  titleProgress: number;
};

/** Frontend navigation metadata, not a future API contract. */
export type OwnerToolId = 'financial-statements' | 'transaction-history' | 'store-expenses' | 'receivables-payables' | 'settings' | 'profile';
export type OwnerMenuIcon = 'financial' | 'history' | 'expense' | 'customerDebt' | 'settings' | 'profile';
export type OwnerTool = {
  id: OwnerToolId;
  label: string;
  icon: OwnerMenuIcon;
  subtitle?: string;
  temporaryMessage: string;
  actions?: readonly { label: string; kind: QuickAddKind }[];
};

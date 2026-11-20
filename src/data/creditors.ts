import { demoOwner } from './mock-auth';
import type { Creditor } from '@/types/payables';

/** Fictional supplier records, kept separate from the customer catalog. */
// TODO(backend): Replace supplier fixtures with authenticated store creditor records.
// - Method/Action: GET / Fetch creditors
// - Expected Input/Payload: None (authenticated store session and optional search query)
// - Expected Response: Creditor[] with stable id, ownerId, and name fields
// - UI State to Wire: Populate creditor selection and refresh after creditor creation
export const mockCreditors: readonly Creditor[] = [
  { id: 'demo-creditor-rice-supply', ownerId: demoOwner.id, name: 'Santos Rice Supply' },
  { id: 'demo-creditor-beverage-trading', ownerId: demoOwner.id, name: 'Reyes Beverage Trading' },
  { id: 'demo-creditor-packaging', ownerId: demoOwner.id, name: 'Dela Cruz Packaging' },
  { id: 'demo-creditor-wholesale', ownerId: demoOwner.id, name: 'Luzon Grocery Wholesale' },
  { id: 'demo-creditor-water', ownerId: demoOwner.id, name: 'Clear Spring Water Supply' },
];

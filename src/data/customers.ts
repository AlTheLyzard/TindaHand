import type { Customer } from '@/types/pos';

/** Fictional names from the POS references; no contact details are required. */
// TODO(backend): Replace the POS customer seed with the store's customer records.
// - Method/Action: GET / Fetch customers
// - Expected Input/Payload: None (authenticated store session and optional search query)
// - Expected Response: Customer[] with stable id and display name fields
// - UI State to Wire: Populate customer pickers and preserve selected customer IDs
export const customerSeed: readonly Customer[] = [
  { id: 'demo-customer-bini', name: 'Bini Rha' },
  { id: 'demo-customer-maloy', name: 'Ante Maloy' },
];

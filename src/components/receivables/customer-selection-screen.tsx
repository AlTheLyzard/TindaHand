import { router } from 'expo-router';
import { Keyboard } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { useInventory } from '@/state/inventory';
import { useReceivableDraft } from '@/state/receivable-draft';
import { useAuthFlow } from '@/state/auth-flow';
import { useApiCustomers } from '@/hooks/use-customers';
import { CustomerList, receivablesRoot } from './receivables-ui';

export function CustomerSelectionScreen() {
  const { store } = useInventory();
  const { setDraft } = useReceivableDraft();
  const { owner } = useAuthFlow();
  const confirmedMode = owner?.mode === 'confirmed';
  const { customers: apiCustomers } = useApiCustomers(confirmedMode ? owner?.id : undefined);
  const back = () => { Keyboard.dismiss(); router.dismissTo(`${receivablesRoot}/customer-new`); };
  return <InventoryFrame title="Customer Names" back inlineTitle onBack={back}>
    <CustomerList customers={confirmedMode ? apiCustomers : (store.pos?.customers ?? [])} onSelect={customer => { setDraft(previous => ({ ...previous, name: customer.name, customerId: customer.id })); back(); }} />
  </InventoryFrame>;
}

import { selectDraftCreditor } from '@/utils/creditor-selection';
import { router } from 'expo-router';
import { Keyboard } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { CreditorList, balancesRoot } from './payables-ui';
import { useQuickAdd } from '@/state/quick-add';
import { usePayableDraft } from '@/state/payable-draft';

export function CreditorSelectionScreen() {
  const { payables } = useQuickAdd();
  const { setDraft } = usePayableDraft();
  const back = () => { Keyboard.dismiss(); if (router.canGoBack()) router.back(); else router.replace(`${balancesRoot}/new`); };
  return <InventoryFrame title="Creditor Names" back inlineTitle subtitle="Select a creditor from your existing list." onBack={back}>
    <CreditorList creditors={payables.creditors} onSelect={creditor => {
      setDraft(previous => selectDraftCreditor(previous, payables.creditors, creditor.id));
      back();
    }} />
  </InventoryFrame>;
}

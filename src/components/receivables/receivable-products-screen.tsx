import tokens from '@/constants/design-tokens.json';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardViewport } from '@/components/ui/keyboard-aware-scroll-view';
import { CreditProductBrowser } from '@/components/pos/credit-product-browser';
import { useReceivableDraft } from '@/state/receivable-draft';
import { receivablesRoot } from './receivables-ui';

export function ReceivableProductsScreen() {
  const { draft, setDraft } = useReceivableDraft();
  const back = () => router.dismissTo(`${receivablesRoot}/customer-new`);
  return <SafeAreaView style={{ flex: 1, backgroundColor: tokens.color.appBackground }}>
    <KeyboardViewport style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <CreditProductBrowser name={draft.name} selection={draft.items} onReturn={back}
        onConfirm={items => { setDraft(previous => ({ ...previous, items })); back(); }} />
    </KeyboardViewport>
  </SafeAreaView>;
}

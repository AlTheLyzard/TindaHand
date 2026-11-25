import { router } from 'expo-router';
import { EmptyState } from '@/components/ui/content-state';
import { ProductBrowsingScreen } from '@/components/pos/product-browsing-screen';
import { selectProduct } from '@/utils/pos';
import { useAuthFlow } from '@/state/auth-flow';
import { useReceivableDraft } from '@/state/receivable-draft';
import { useReceivablesRoot } from './receivables-ui';
import { useStoreOwner } from '@/hooks/use-store-owner';

export function ReceivableProductsScreen() {
  const { deviceSession } = useAuthFlow();
  const storeOwner = useStoreOwner();
  const root = useReceivablesRoot();
  const { draft, setDraft } = useReceivableDraft();
  const back = () => router.dismissTo(`${root}/customer-new`);
  if (!storeOwner) return <EmptyState title="Store session unavailable" description="Return to Account Balances and choose Record Debt again." />;

  return <ProductBrowsingScreen owner={storeOwner} basePath={deviceSession?.role === 'operator' ? '/operator-pos' : '/owner-pos'} title="Select Products"
    backAction={{ label: 'Back to Customer Debt', onPress: back }}
    selectionOverride={draft.items}
    onProductAdd={product => setDraft(previous => ({ ...previous, items: selectProduct(previous.items, product) }))}
    onViewCart={back} cartLabel="View Cart" searchPlaceholder="Search Product" />;
}

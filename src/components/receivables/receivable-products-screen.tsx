import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Keyboard, Text, View, type ScrollViewInstance } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { Button } from '@/components/ui/button';
import { EmptyState as ContentState } from '@/components/ui/content-state';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import { useInventory } from '@/state/inventory';
import { useReceivableDraft } from '@/state/receivable-draft';
import { filterProducts, selectProduct, selectionSummary } from '@/utils/pos';
import { formatPesos } from '@/utils/dashboard';
import { CustomerSearch, receivablesRoot } from './receivables-ui';

export function ReceivableProductsScreen() {
  const { store: { products } } = useInventory();
  const { draft, setDraft } = useReceivableDraft();
  const [selection, setSelection] = useState(draft.items);
  const [query, setQuery] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  const visible = filterProducts(products, query, null, null);
  const letters = [...new Set(visible.map(product => product.name.charAt(0).toUpperCase()))];
  const summary = selectionSummary(selection);
  const back = () => { Keyboard.dismiss(); router.dismissTo(`${receivablesRoot}/customer-new`); };
  return <InventoryFrame title="New Customer Debt" back inlineTitle onBack={back} scrollRef={scroll} footer={<>
    <View className="flex-row flex-wrap gap-3">
      <View className="min-w-[110px] flex-1"><Button variant="secondary" onPress={back}>Cancel</Button></View>
      <View className="min-w-[130px] flex-1"><Button onPress={() => { setDraft(previous => ({ ...previous, items: selection })); back(); }}>Review Debt</Button></View>
    </View>
    <Text accessibilityLiveRegion="polite" className="text-center font-poppins text-[12px] text-text-secondary">{summary.quantity} items · {formatPesos(summary.totalCentavos)}</Text>
  </>}>
    <Text className="font-poppins-semibold text-[12px] text-brand">Customer</Text>
    <View className="rounded-control border border-[#B0C8E3] bg-white p-4"><Text className="font-poppins-semibold text-[14px] text-[#102342]">{draft.name || 'No customer entered yet'}</Text></View>
    <View className="flex-row items-center justify-between"><Text accessibilityRole="header" className="font-poppins-semibold text-[18px] text-[#102342]">Products</Text><Text className="font-poppins-semibold text-[12px] text-text-secondary">{products.length} Products</Text></View>
    <CustomerSearch value={query} onChange={setQuery} kind="product" />
    {!visible.length && <ContentState title="No matching products" description="Try another product name or clear your search." />}
    {letters.map(letter => <View key={letter} className="gap-3">
      <Text accessibilityRole="header" className="font-poppins-semibold text-[12px] text-[#102342]">{letter}</Text>
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
        {visible.filter(product => product.name.charAt(0).toUpperCase() === letter).map(product => {
          const count = selection[product.id]?.quantity ?? 0;
          const photoUri = products.find(item => item.id === product.id)?.photoUri;
          const remaining = Math.max(0, product.stock - count);
          const color = remaining === 0 ? '#972020' : remaining <= 5 ? '#AA5C00' : '#1D5D21';
          return <View key={product.id} style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Add product ${product.name}, ${formatPesos(product.unitPriceCentavos)}, ${remaining} available`} accessibilityState={{ disabled: !remaining, selected: count > 0 }} disabled={!remaining} onPress={() => setSelection(previous => selectProduct(previous, product))} className="flex-1 gap-2 rounded-control border border-[#B0C8E3] bg-white p-2" style={{ opacity: remaining ? 1 : 0.6 }}>
              <View className="rounded-control bg-[#D9E7F4]" style={{ aspectRatio: 0.85 }}>
                {photoUri && <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessible={false} />}
                <View className="absolute right-1 top-1 rounded border bg-white px-1 py-0.5" style={{ borderColor: color }}><Text className="font-poppins text-[10px]" style={{ color }}>{remaining ? `${remaining} in stock` : 'No stock'}</Text></View>
              </View>
              <Text className="font-poppins text-[12px] leading-[18px] text-[#102342]">{product.name}</Text>
              <View className="flex-row flex-wrap items-center justify-between gap-1"><Text className="font-poppins-semibold text-[14px] text-action">{formatPesos(product.unitPriceCentavos)}</Text><View className="min-h-12 items-center justify-center"><PosIcon name="plus" size={22} color="#102342" /></View></View>
              {!!count && <Text className="font-poppins-semibold text-[11px] text-action">{count} selected</Text>}
            </Pressable>
          </View>;
        })}
      </View>
    </View>)}
  </InventoryFrame>;
}

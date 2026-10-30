import type { ScrollViewInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, ScrollView, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { AlphabetIndex } from './alphabet-index';
import { PosIcon } from './pos-icon';
import { Button } from '@/components/ui/button';
import { QuickAddField } from '@/components/dashboard/quick-add-ui';
import { useInventory } from '@/state/inventory';
import { useAuthFlow } from '@/state/auth-flow';
import type { ProductSelection } from '@/types/pos';
import { filterProducts, selectProduct, selectionSummary } from '@/utils/pos';
import { formatPesos } from '@/utils/dashboard';

/** Full-screen presentation inside the existing modal; draft and stock ownership stay with the caller. */
export function CreditProductBrowser({ name, onName, selection, onChange, onReturn, nameError }: {
  name: string; onName: (name: string) => void; selection: ProductSelection;
  onChange: (update: (previous: ProductSelection) => ProductSelection) => void; onReturn: () => void; nameError?: string;
}) {
  const { store: { products } } = useInventory();
  const { owner } = useAuthFlow();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const scroll = useRef<ScrollViewInstance>(null);
  const sections = useRef<Record<string, number>>({});
  const gridOffset = useRef(0);
  const gridStart = useSharedValue(0), scrollY = useSharedValue(0), viewportHeight = useSharedValue(0);
  const [active, setActive] = useState<string | null>(null);
  const visible = filterProducts(products, query, null, null);
  const letters = [...new Set(visible.map(product => product.name.charAt(0).toUpperCase()))];
  const summary = selectionSummary(selection);
  return <View className="flex-1 bg-canvas">
    <View className="border-b border-[#ADC9EE] bg-white">
      <View className="w-full max-w-[460px] flex-row items-center gap-3 self-center px-5 py-3">
        <Image source={require('@/assets/images/brand/tindahand-mark.png')} style={{ width: 36, height: 38 }} accessible={false} resizeMode="contain" />
        <Text className="flex-1 font-poppins-bold text-[22px] text-brand">TindaHand</Text>
        <Image source={require('@/assets/images/dashboard/settings.png')} style={{ width: 24, height: 24 }} accessible={false} resizeMode="contain" />
        <View accessible={false} className="h-9 w-9 items-center justify-center rounded-pill bg-[#D1E2F8]"><Text className="font-poppins-bold text-[14px] text-action">{owner?.name.charAt(0).toUpperCase()}</Text></View>
      </View>
    </View>
    <View className="w-full max-w-[460px] flex-1 self-center" onLayout={event => { viewportHeight.value = event.nativeEvent.layout.height; }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScroll={event => { scrollY.value = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to debt form" onPress={onReturn} className="-ml-2 mt-1 min-h-12 w-12 items-center justify-center"><PosIcon name="back" size={24} color="#2675DB" /></Pressable>
        <Text accessibilityRole="header" className="mb-4 font-poppins-bold text-[32px] leading-[48px] text-brand">{'New Customer\nDebt'}</Text>
        <Text className="mb-6 font-poppins text-[14px] leading-[21px] text-text-secondary">Keep track of what your customers owe and when they need to pay.</Text>
        <QuickAddField label="Customer name or other identifying details" value={name} onChangeText={onName} placeholder="e.g. Arman Salon" error={nameError} />
        <View className="my-4 min-h-12 flex-row items-center justify-between gap-2"><Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[18px] text-[#102342]">Products</Text><Text className="font-poppins-bold text-[12px] text-text-secondary">{visible.length} {visible.length === 1 ? 'Product' : 'Products'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Search products" accessibilityState={{ expanded: searchOpen }} onPress={() => setSearchOpen(value => !value)} className="min-h-12 min-w-12 items-center justify-center"><PosIcon name="search" size={20} color="#4A607A" /></Pressable>
        </View>
        {searchOpen && <View className="mb-4"><QuickAddField label="Search products" required={false} value={query} onChangeText={setQuery} placeholder="Enter product name" returnKeyType="search" onSubmitEditing={Keyboard.dismiss} /></View>}
        <View className="pr-5" onLayout={event => { gridOffset.current = event.nativeEvent.layout.y; gridStart.value = event.nativeEvent.layout.y; }}>
          {visible.length === 0 && <Text className="py-6 font-poppins text-[12px] text-text-secondary">No products match your search.</Text>}
          {letters.map(letter => <View key={letter} className="mb-5" onLayout={event => { sections.current[letter] = event.nativeEvent.layout.y; }}>
            <Text accessibilityRole="header" className="mb-2 font-poppins-bold text-[12px] text-[#102342]">{letter}</Text>
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
              {visible.filter(product => product.name.charAt(0).toUpperCase() === letter).map(product => {
                const count = selection[product.id]?.quantity ?? 0;
                const remaining = Math.max(0, product.stock - count);
                const photoUri = products.find(item => item.id === product.id)?.photoUri;
                return <View key={product.id} style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}>
                  <View className="flex-1 rounded-surface bg-white p-3">
                    {photoUri ? <Image source={{ uri: photoUri }} style={{ width: '100%', aspectRatio: 1.35, marginBottom: 8 }} resizeMode="cover" /> : <View accessible={false} className="mb-2 w-full bg-[#D9E7F4]" style={{ aspectRatio: 1.35 }} />}
                    <Text className="font-poppins-bold text-[11px] leading-4 text-[#102342]">{product.name}</Text>
                    <Text className="font-poppins text-[12px] text-[#102342]">{formatPesos(product.unitPriceCentavos)}</Text>
                  </View>
                  <View className="my-2 rounded-control border px-2 py-1" style={{ backgroundColor: remaining ? '#E7F3E8' : '#FDEEEF', borderColor: remaining ? '#36833C' : '#CC333B' }}><Text className="font-poppins-bold text-[11px]" style={{ color: remaining ? '#286B2C' : '#B4232C' }}>{remaining} in stock</Text></View>
                  <Button visualVariant="quickAdd" disabled={!remaining} accessibilityLabel={`Add ${product.name}, ${formatPesos(product.unitPriceCentavos)}, ${remaining} available`} onPress={() => onChange(previous => selectProduct(previous, product))}>{count ? `+ Add · ${count} selected` : '+ Add'}</Button>
                </View>;
              })}
            </View>
          </View>)}
        </View>
      </ScrollView>
      <AlphabetIndex letters={letters} active={active} gridStart={gridStart} scrollY={scrollY} viewportHeight={viewportHeight} onPick={letter => { setActive(letter); Keyboard.dismiss(); scroll.current?.scrollTo({ y: letter ? gridOffset.current + (sections.current[letter] ?? 0) : 0, animated: false }); }} />
    </View>
    <View className="rounded-t-[24px] bg-white px-4 pb-3 pt-4">
      <View className="w-full max-w-[428px] flex-row gap-3 self-center"><View className="flex-1"><Button visualVariant="quickAdd" variant="secondary" onPress={onReturn}>Cancel</Button></View><View className="flex-1"><Button visualVariant="quickAdd" onPress={onReturn}>Review Debt</Button></View></View>
      <Text accessibilityLiveRegion="polite" className="my-2 text-center font-poppins text-[11px] text-text-secondary">{summary.quantity} selected · {formatPesos(summary.totalCentavos)}</Text>
      {!keyboardVisible && <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden className="min-h-[72px] w-full max-w-[330px] flex-row items-center justify-around self-center rounded-pill border border-[#ADC9EE] bg-white" style={{ boxShadow: '0 4px 12px #10234230' }}>
        {(['home', 'cart', 'inventory', 'menu'] as const).map(icon => <View key={icon} className="h-14 w-14 items-center justify-center rounded-pill" style={{ backgroundColor: icon === 'menu' ? '#D1E2F8' : 'transparent' }}><PosIcon name={icon} size={30} color="#4A607A" /></View>)}
      </View>}
    </View>
  </View>;
}

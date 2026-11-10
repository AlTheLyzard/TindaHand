import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Text, View, type TextInputInstance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuickAddField } from '@/components/dashboard/quick-add-ui';
import { CalendarPicker } from '@/components/inventory/inventory-ui';
import { PosChip } from '@/components/pos/pos-chip';
import { Button } from '@/components/ui/button';
import { MotionModal } from '@/components/ui/motion-modal';
import { ResizableSheet } from '@/components/ui/resizable-sheet';
import { transactionMethods } from '@/data/transactions';
import type { TransactionFilters } from '@/types/transactions';
import { emptyTransactionFilters, transactionFilterError } from '@/utils/transactions';

/** Mounted per opening: draft changes never reach the applied filters on dismissal. */
export function TransactionFilterSheet({ applied, onApply, onClose }: {
  applied: TransactionFilters; onApply: (filters: TransactionFilters) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => ({ ...applied }));
  const [open, setOpen] = useState(true);
  const [calendar, setCalendar] = useState<'from' | 'to' | null>(null);
  const toInput = useRef<TextInputInstance>(null);
  const insets = useSafeAreaInsets();
  const error = transactionFilterError(draft);
  const dismiss = () => { Keyboard.dismiss(); setOpen(false); };
  return <MotionModal visible={open} sheet statusBarTranslucent navigationBarTranslucent
    backdropColor="rgba(16,35,66,0.42)" onHidden={onClose}
    onRequestClose={() => calendar ? setCalendar(null) : dismiss()}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ResizableSheet testID="transaction-filters" title={calendar ? (calendar === 'from' ? 'Start date' : 'End date') : 'Filter Transactions'}
            onClose={() => calendar ? setCalendar(null) : dismiss()}
            footer={!calendar && <View style={{ gap: 12, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) }}>
              {!!error && <Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{error}</Text>}
              <View className="flex-row gap-3">
                <Button variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setDraft(emptyTransactionFilters()); }}>Reset</Button>
                <Button fullWidth={false} style={{ flex: 2 }} disabled={!!error} onPress={() => { if (!error) { onApply({ ...draft }); dismiss(); } }}>Apply Filters</Button>
              </View>
            </View>}>
            {calendar ? <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}><CalendarPicker value={draft[calendar]}
              onChange={date => { setDraft(previous => ({ ...previous, [calendar]: date })); setCalendar(null); }} onClose={() => setCalendar(null)} /></View> :
              <View className="gap-5 pb-3">
                <Text className="font-poppins-semibold text-[14px] text-brand">Date range</Text>
                <Text className="font-poppins text-[12px] text-text-secondary">Dates include the entire day in the store timezone (Asia/Manila). Leave blank for any date.</Text>
                <QuickAddField date required={false} label="Start date" value={draft.from} placeholder="YYYY-MM-DD" maxLength={10}
                  onChangeText={from => setDraft(previous => ({ ...previous, from }))} onPickDate={() => { Keyboard.dismiss(); setCalendar('from'); }}
                  autoCapitalize="none" returnKeyType="next" onSubmitEditing={() => toInput.current?.focus()} />
                <QuickAddField ref={toInput} date required={false} label="End date" value={draft.to} placeholder="YYYY-MM-DD" maxLength={10}
                  onChangeText={to => setDraft(previous => ({ ...previous, to }))} onPickDate={() => { Keyboard.dismiss(); setCalendar('to'); }}
                  autoCapitalize="none" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                <View className="gap-1">
                  <Text className="font-poppins-semibold text-[14px] text-brand">Payment method</Text>
                  <View accessibilityRole="radiogroup" accessibilityLabel="Payment method" className="flex-row flex-wrap gap-x-2">
                    {transactionMethods.map(method => <PosChip key={method.value} radio label={method.label} selected={draft.paymentMethod === method.value}
                      onPress={() => setDraft(previous => ({ ...previous, paymentMethod: method.value }))} />)}
                  </View>
                </View>
              </View>}
          </ResizableSheet>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  </MotionModal>;
}

import tokens from '@/constants/design-tokens.json';
import { KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { useRef, useState } from 'react';
import { Keyboard, Platform, Text, View, type TextInputInstance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuickAddField } from '@/components/dashboard/quick-add-ui';
import { DateRangePicker } from '@/components/ui/date-picker';
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
  const [calendar, setCalendar] = useState(false);
  const toInput = useRef<TextInputInstance>(null);
  const insets = useSafeAreaInsets();
  const error = transactionFilterError(draft);
  const dismiss = () => { Keyboard.dismiss(); setOpen(false); };
  return <MotionModal visible={open} sheet statusBarTranslucent navigationBarTranslucent
    backdropColor={tokens.overlay.navySoft} onHidden={onClose}
    onRequestClose={() => calendar ? setCalendar(false) : dismiss()}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ResizableSheet testID="transaction-filters" title={calendar ? 'Choose Date Range' : 'Filter Transactions'}
            subtitle={calendar ? undefined : 'Choose a payment method or date range.'} alwaysShowSubtitle
            onClose={() => calendar ? setCalendar(false) : dismiss()}
            footer={!calendar && <View style={{ gap: 12, paddingVertical: 12, paddingBottom: insets.bottom + 12 }}>
              {!!error && <Text accessibilityRole="alert" className=" type-micro-caption text-error-base">{error}</Text>}
              <View className="flex-row gap-3">
                <View className="flex-1"><Button compact variant="secondary" onPress={() => { Keyboard.dismiss(); setDraft(emptyTransactionFilters()); }}>Reset</Button></View>
                <View className="flex-[2]"><Button compact disabled={!!error} onPress={() => { if (!error) { onApply({ ...draft }); dismiss(); } }}>Apply Filter</Button></View>
              </View>
            </View>}>
            {calendar ? <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}><DateRangePicker value={{ from: draft.from, to: draft.to }} onChange={range => { setDraft(previous => ({ ...previous, ...range })); setCalendar(false); }} onClose={() => setCalendar(false)} /></View> :
              <View className="gap-4 pb-3">
                <View className="gap-2">
                  <Text className=" type-micro-financial-rate text-brand">Payment method</Text>
                  <View accessibilityRole="radiogroup" accessibilityLabel="Payment method" className="flex-row flex-wrap gap-x-2">
                    {transactionMethods.map(method => <PosChip key={method.value} radio label={method.label} selected={draft.paymentMethod === method.value}
                      onPress={() => setDraft(previous => ({ ...previous, paymentMethod: method.value }))} />)}
                  </View>
                </View>
                <View className="gap-2">
                  <Text className=" type-micro-financial-rate text-brand">Date range</Text>
                  <Text className=" type-micro-caption leading-[18px] text-text-secondary">Dates include the entire day in the store timezone (Asia/Manila). Leave blank for any date.</Text>
                  <QuickAddField date required={false} label="Start date" value={draft.from} placeholder="YYYY-MM-DD" maxLength={10}
                    onChangeText={from => setDraft(previous => ({ ...previous, from }))} onPickDate={() => { Keyboard.dismiss(); setCalendar(true); }}
                    autoCapitalize="none" returnKeyType="next" onSubmitEditing={() => toInput.current?.focus()} />
                  <QuickAddField ref={toInput} date required={false} label="End date" value={draft.to} placeholder="YYYY-MM-DD" maxLength={10}
                    onChangeText={to => setDraft(previous => ({ ...previous, to }))} onPickDate={() => { Keyboard.dismiss(); setCalendar(true); }}
                    autoCapitalize="none" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                </View>
              </View>}
          </ResizableSheet>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  </MotionModal>;
}

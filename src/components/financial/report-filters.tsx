import tokens from '@/constants/design-tokens.json';
import { KeyboardInput as TextInput, KeyboardField, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { useState } from 'react';
import { Keyboard, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, IconButton } from '@/components/ui/button';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { MotionModal } from '@/components/ui/motion-modal';
import { PosChip } from '@/components/pos/pos-chip';
import { PosIcon } from '@/components/pos/pos-icon';
import { ReportCalendar } from './report-calendar';
import { useTranslation } from '@/i18n/use-translation';
import type { ReportSelection, ReportPreset } from '@/types/financial';
import { presetSelection, selectionError, storeToday } from '@/utils/financial';
import { selectCalendarRange } from '@/utils/calendar';
import { formatCalendarDate, validCalendarDate } from '@/utils/date';

export function ReportFilters({ draft, applied, single, busy, onDraft, onApply, onReset }: {
  draft: ReportSelection; applied: ReportSelection; single: boolean; busy: boolean;
  onDraft: (selection: ReportSelection) => void; onApply: () => void; onReset: () => void;
}) {
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [field, setField] = useState<'from' | 'to'>(single ? 'to' : 'from');
  const [month, setMonth] = useState(draft.from.slice(0, 7));
  const error = selectionError(draft);
  const presets: ReportPreset[] = ['today', 'week', 'month', 'custom'];
  const targets = single ? ['to'] as const : ['from', 'to'] as const;
  const stackPageDates = width < 350 || fontScale > 1.35;
  const stackModalDates = width < 380 || fontScale > 1.35;

  function open(target: 'from' | 'to') {
    setField(target);
    const date = target === 'from' ? draft.from : draft.to;
    setMonth((validCalendarDate(date) ? date : storeToday()).slice(0, 7));
    setVisible(true);
  }
  function close() {
    Keyboard.dismiss();
    setVisible(false);
  }
  function choosePreset(preset: ReportPreset) {
    if (preset === 'custom') {
      onDraft({ ...draft, preset });
      const date = field === 'from' ? draft.from : draft.to;
      setMonth((validCalendarDate(date) ? date : storeToday()).slice(0, 7));
      return;
    }
    Keyboard.dismiss();
    const selection = presetSelection(preset);
    onDraft(single
      ? { preset, from: selection.to, to: selection.to }
      : selection);
    setMonth(selection.to.slice(0, 7));
  }
  function update(value: string, target: 'from' | 'to') {
    onDraft(single
      ? { preset: 'custom', from: value, to: value }
      : { ...draft, preset: 'custom', [target]: value });
    if (validCalendarDate(value)) setMonth(value.slice(0, 7));
  }
  function selectField(target: 'from' | 'to') {
    Keyboard.dismiss();
    setField(target);
    const date = draft[target];
    setMonth((validCalendarDate(date) ? date : storeToday()).slice(0, 7));
    if (draft.preset !== 'custom') onDraft({ ...draft, preset: 'custom' });
  }
  function select(date: string) {
    Keyboard.dismiss();
    if (single) {
      update(date, 'to');
      return;
    }
    const range = selectCalendarRange(draft, date);
    onDraft({ preset: 'custom', ...range });
    setField(range.to ? 'from' : 'to');
  }
  const displayDate = (target: 'from' | 'to') => {
    const date = draft[target];
    return validCalendarDate(date) ? formatCalendarDate(date) : date;
  };

  return <>
    <View className="gap-3">
      <View className={stackPageDates ? 'gap-3' : 'flex-row gap-3'}>
        {targets.map(target => <View key={target} className={`${stackPageDates ? '' : 'min-w-0 flex-1'} gap-1`}>
          <Text className="type-label-nav text-brand">{t(single ? 'financial.asOf' : `financial.${target}`)}</Text>
          <MotionPressable accessibilityRole="button" accessibilityLabel={`${t(single ? 'financial.asOf' : `financial.${target}`)}: ${formatCalendarDate(applied[target])}`}
            accessibilityHint={t('financial.openDateFilter')} onPress={() => open(target)}
            className="min-h-14 flex-row items-center justify-between gap-2 rounded-control border border-outline bg-white px-3">
            <Text numberOfLines={1} className="min-w-0 flex-1 type-micro-financial-rate text-text-primary">{formatCalendarDate(applied[target])}</Text>
            <PosIcon name="calendar" size={18} color={tokens.color.darkNavy} />
          </MotionPressable>
        </View>)}
      </View>
      <View accessibilityLiveRegion="polite" className="gap-1 rounded-control border border-accent bg-accent-soft p-3">
        <Text className="type-label-nav text-action">{t('financial.applied')}</Text>
        <Text className="type-micro-financial-rate text-brand">{single ? formatCalendarDate(applied.to) : periodLabelForFilter(applied)}</Text>
      </View>
    </View>

    <MotionModal visible={visible} onRequestClose={close}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} className="flex-1">
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
            <View accessibilityViewIsModal onAccessibilityEscape={close} className="w-full max-w-[412px] self-center gap-3 rounded-control border border-outline bg-white p-4">
              <View className="flex-row items-center gap-2">
                <PosIcon name="calendar" size={22} color={tokens.color.darkNavy} />
                <Text accessibilityRole="header" className="flex-1 type-title-accent text-brand">{t('financial.filterRange')}</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {presets.map(preset => <PosChip key={preset} compact singleLine label={t(`financial.${preset}`)}
                  selected={draft.preset === preset} onPress={() => choosePreset(preset)} />)}
              </View>
              <KeyboardField className="gap-3">
                <View className={stackModalDates ? 'gap-3' : 'flex-row gap-3'}>
                  {targets.map(target => {
                    const invalid = target === 'from'
                      ? !validCalendarDate(draft.from)
                      : !validCalendarDate(draft.to) || (validCalendarDate(draft.from) && draft.to < draft.from);
                    return <View key={target} className={`${stackModalDates ? '' : 'min-w-0 flex-1'} gap-1`}>
                      <Text className="type-label-nav text-brand">{t(single ? 'financial.asOf' : `financial.${target}`)}</Text>
                      <View className="min-h-12 flex-row items-center rounded-control border bg-white px-3"
                        style={{ borderColor: invalid ? tokens.color.errorBase : field === target && draft.preset === 'custom' ? tokens.color.brightBlue : tokens.color.borderOutline,
                          backgroundColor: invalid ? tokens.color.errorTint : tokens.color.surfaceCard }}>
                        <MotionPressable accessibilityRole="button" accessibilityLabel={t(single ? 'financial.asOf' : `financial.${target}`)}
                          accessibilityHint={invalid ? error ?? t('financial.openDateFilter') : t('financial.openDateFilter')}
                          onPress={() => selectField(target)} style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                          <TextInput accessibilityElementsHidden accessible={false} pointerEvents="none" value={displayDate(target)}
                            editable={false} showSoftInputOnFocus={false} className="min-w-0 py-3 type-label-nav text-text-primary" style={{ flex: 1 }} />
                        </MotionPressable>
                        <IconButton accessibilityLabel={t(single ? 'financial.asOf' : `financial.${target}`)}
                          onPress={() => selectField(target)}
                          icon={({ color }) => <PosIcon name="calendar" size={17} color={color} />} />
                      </View>
                    </View>;
                  })}
                </View>
                {error && <View className="flex-row items-start gap-2 rounded-control border border-error-base bg-error-tint p-3">
                  <PosIcon name="alert" size={18} color={tokens.color.errorBase} />
                  <Text accessibilityRole="alert" className="flex-1 type-micro-caption text-error-base">{error}</Text>
                </View>}
              </KeyboardField>
              <ReportCalendar selection={draft} single={single} month={month} onMonth={setMonth} onSelect={select} compact />
              <View className="gap-2 pt-1">
                <Button disabled={!!error || busy} onPress={() => { Keyboard.dismiss(); onApply(); close(); }}>{t('financial.apply')}</Button>
                <Button variant="secondary" disabled={busy} onPress={() => { onReset(); close(); }}>{t('financial.reset')}</Button>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </MotionModal>
  </>;
}

function periodLabelForFilter(selection: ReportSelection) {
  return selection.from === selection.to
    ? formatCalendarDate(selection.from)
    : `${formatCalendarDate(selection.from)} – ${formatCalendarDate(selection.to)}`;
}

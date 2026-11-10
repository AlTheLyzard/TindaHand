import { ChoiceChip } from '@/components/ui/choice-chip';
import { MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useTranslation } from '@/i18n/use-translation';
import { t } from '@/i18n';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, type TextInputProps, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardAction, DashboardCircle, DashboardIcon, dashboardIcons } from '@/components/dashboard/dashboard-ui';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button, IconButton } from '@/components/ui/button';
import { useNavigationHeight } from '@/state/navigation-motion';
import { useAuthFlow } from '@/state/auth-flow';
import { todayInManila } from '@/utils/inventory';
import { useInventory } from '@/state/inventory';
import { QuickAddField } from '@/components/dashboard/quick-add-ui';
import { validCalendarDate } from '@/utils/date';
import { Image as BackgroundImage } from 'expo-image';
import { ResizableSheet } from '@/components/ui/resizable-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export function InvText({ children, bold = false, size = 12, color = '#4A607A' }: { children: ReactNode; bold?: boolean; size?: number; color?: string }) {
  return <Text style={{ fontFamily: bold ? 'Poppins_700Bold' : 'Poppins_400Regular', fontSize: size, color }}>{children}</Text>;
}
export function InventoryFrame({ title, children, back = false, inlineTitle = false, onBack, onNavigate, scrollRef, overlay, footer, hideNavigationWithKeyboard = false, hideNavigation = false, background = false }: {
  title: string; children: ReactNode; back?: boolean; inlineTitle?: boolean; onBack?: () => void;
  onNavigate?: (action: () => void) => void; scrollRef?: RefObject<ScrollViewInstance | null>; overlay?: ReactNode; footer?: ReactNode; hideNavigationWithKeyboard?: boolean; hideNavigation?: boolean; background?: boolean;
}) {
  useTranslation();
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
  const { owner } = useAuthFlow();
  const scroll = useRef<ScrollViewInstance>(null);
  const [notice, setNotice] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    if (!hideNavigationWithKeyboard) return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, [hideNavigationWithKeyboard]);
  const navigate = (action: () => void) => { Keyboard.dismiss(); if (onNavigate) onNavigate(action); else action(); };
  const showNavigation = !hideNavigation && !(hideNavigationWithKeyboard && keyboardVisible);
  const goBack = () => { Keyboard.dismiss(); if (onBack) onBack(); else if (router.canGoBack()) router.back(); else router.replace('/owner-inventory'); };
  const backButton = back && (onBack ? <IconButton accessibilityLabel="Go back" onPress={goBack} className="min-h-12 min-w-12 self-start items-center justify-center" icon={({ color }) => <PosIcon name="back" color={color} />} /> : <IconButton variant="secondary" accessibilityLabel={t('inventory.back')} onPress={goBack} style={{ alignSelf: 'flex-start' }} icon={({ color }) => <InvText size={24} color={color}>‹</InvText>} />);
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
    {background && <View pointerEvents="none" accessible={false} style={{ position: 'absolute', inset: 0 }}>
      <BackgroundImage source={require('@/assets/images/financial/report-background.svg')} contentFit="fill" style={{ position: 'absolute', inset: 0 }} />
      <Image source={require('@/assets/images/financial/store-background.png')} resizeMode="stretch" style={{ position: 'absolute', bottom: showNavigation ? navigationHeight + insets.bottom : 0, width: '100%', height: 110, opacity: 0.7 }} />
    </View>}
    <View className="border-b border-[#ADC9EE] bg-white"><View className="w-full max-w-[460px] flex-row items-center gap-2 self-center px-5 py-2">
      <Image source={require('@/assets/images/brand/tindahand-mark.png')} style={{ width: 32, height: 34 }} resizeMode="contain" accessible={false} />
      <Text className="min-w-0 flex-1 font-poppins-bold text-[20px] text-brand">TindaHand</Text>
      <DashboardAction label={t("inventory.settings")} onPress={() => navigate(() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'settings' } }))}><DashboardIcon source={dashboardIcons.settings} size={26} /></DashboardAction>
      <DashboardAction label={t("inventory.profile")} onPress={() => navigate(() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'profile' } }))}><DashboardCircle><InvText bold color="#245399">{owner?.name.trim().charAt(0).toUpperCase()}</InvText></DashboardCircle></DashboardAction>
    </View></View>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollRef ?? scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: footer ? 24 : insets.bottom + (showNavigation ? navigationHeight : 0) + 24 }}>
        <View className="w-full max-w-[460px] gap-4 self-center px-5 pt-3">
          {inlineTitle ? <View className="flex-row items-center gap-1">{backButton}<Text accessibilityRole="header" className="min-w-0 flex-1 font-poppins-bold text-[20px] text-brand">{title}</Text></View> : <>
            <Text accessibilityRole="header" className="font-poppins-bold text-[28px] text-brand">{title}</Text>{backButton}
          </>}
          {children}
        </View>
      </ScrollView>
      {!!footer && <View className={background ? 'px-5 pt-4' : 'rounded-t-card bg-white px-5 pt-4'} style={{ paddingBottom: insets.bottom + (showNavigation ? navigationHeight : 0) + 12 }}><View className="w-full max-w-[420px] gap-3 self-center">{footer}</View></View>}
    </KeyboardAvoidingView>
    {showNavigation && <DashboardNavigation onHome={() => { Keyboard.dismiss(); router.navigate('/owner-dashboard'); }} onPos={() => { Keyboard.dismiss(); router.navigate('/owner-pos'); }} onUnavailable={() => setNotice(t("inventory.more.tools"))} onNavigate={onNavigate} />}
    <InvModal visible={!!notice} title={notice} onClose={() => setNotice('')}><InvText>{t("inventory.this.feature.is.not.available.in.this")}</InvText><Button onPress={() => setNotice('')}>{t("inventory.close")}</Button></InvModal>
    {overlay}
  </SafeAreaView>;
}
export function InvModal({ visible, title, children, onClose, sheet = false, subtitle, footer }: { visible: boolean; title: string; children: ReactNode; onClose: () => void; sheet?: boolean; subtitle?: string; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <Modal sheet={sheet} visible={visible} onRequestClose={onClose}>
    {sheet ? <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaView edges={['top', 'left', 'right']} className="flex-1"><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ResizableSheet alwaysShowSubtitle title={title} subtitle={subtitle} onClose={onClose} testID="inventory-sheet" footer={<View className="gap-3 py-3" style={{ paddingBottom: insets.bottom + 12 }}>{footer}</View>}><View className="gap-4 pb-3">{children}</View></ResizableSheet></KeyboardAvoidingView></SafeAreaView></GestureHandlerRootView> :
    <View className={`flex-1 ${sheet ? 'justify-end' : 'justify-center px-5'}`}>
      <View accessibilityViewIsModal className="max-h-[90%] w-full max-w-[460px] self-center rounded-t-card bg-white" style={{ borderRadius: sheet ? undefined : 16, paddingBottom: insets.bottom + 12 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Text accessibilityRole="header" className="font-poppins-bold text-[22px] text-brand">{title}</Text>{children}
        </ScrollView>
      </View>
    </View>}
  </Modal>;
}
export function InvField({ label, error, inputRef, style, ...props }: TextInputProps & { label: string; error?: string; inputRef?: Ref<TextInputInstance> }) {
  return <MotionLayout className="gap-1"><InvLabel label={label} /><TextInput {...props} ref={inputRef} accessibilityLabel={props.accessibilityLabel ?? label.replace(/\s*\*$/, ', required')} accessibilityHint={error} placeholderTextColor="#5A7394" autoCorrect={false}
    className="min-h-12 rounded-control border bg-white px-4 py-3 font-poppins text-[12px] text-[#102342]" style={[{ borderColor: error ? '#D32F2F' : '#FFFFFF', boxShadow: '0 3px 3px #B0C8E3' }, style]} />
    {!!error && <MotionRegion><Text accessibilityRole="alert" className="font-poppins text-[10px] text-[#972020]">{error}</Text></MotionRegion>}
  </MotionLayout>;
}
export function InvSelect({ label, value, options, onChange, error }: { label: string; value: string; options: Readonly<Record<string, string>>; onChange: (value: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  return <View className="gap-1"><InvLabel label={label} />
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${options[value] ?? t("inventory.select.an.option")}`} accessibilityState={{ expanded: open }} onPress={() => { Keyboard.dismiss(); setOpen(true); }} className="min-h-12 flex-row items-center justify-between gap-2 rounded-control border bg-white px-4 py-3" style={{ borderColor: error ? '#D32F2F' : '#FFFFFF', boxShadow: '0 3px 3px #B0C8E3' }}><InvText color="#102342">{options[value] ?? t("inventory.select.an.option")}</InvText><InvText>⌄</InvText></Pressable>
    {!!error && <MotionRegion><Text accessibilityRole="alert" className="font-poppins text-[10px] text-[#972020]">{error}</Text></MotionRegion>}
    <InvModal visible={open} title={label} onClose={() => setOpen(false)}>{Object.entries(options).map(([key, text]) => <InvChip key={key} label={text} selected={value === key} onPress={() => { onChange(key); setOpen(false); }} />)}<Button variant="secondary" onPress={() => setOpen(false)}>{t("inventory.cancel")}</Button></InvModal>
  </View>;
}
export function InvChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <ChoiceChip label={label} selected={selected} onPress={onPress} />;
}
export function InvDanger({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button variant="destructive" onPress={onPress}>{label}</Button>;
}
export function InvCard({ children }: { children: ReactNode }) {
  return <View className="gap-3 rounded-control border border-[#B0C8E3] bg-white p-3">{children}</View>;
}
function InvLabel({ label }: { label: string }) {
  const required = /\*\s*$/.test(label);
  return <Text className="font-poppins-bold text-[12px] text-action">{label.replace(/\s*\*$/, '')}{required && <Text className="text-[#D32F2F]"> *</Text>}</Text>;
}
export function InventoryFeedback() {
  useTranslation();
  const { feedback, setFeedback } = useInventory();
  return <InvModal visible={!!feedback} title={t("inventory.changes.saved")} onClose={() => setFeedback('')}><Text accessibilityRole="alert" className="font-poppins text-[14px] text-[#1D5D21]">{feedback}</Text><Button onPress={() => setFeedback('')}>{t("inventory.close")}</Button></InvModal>;
}
export function InvDateField({ label, value, onChange, error, compact = false, inputRef, required = true, disabled = false }: { label: string; value: string; onChange: (date: string) => void; error?: string; compact?: boolean; inputRef?: Ref<TextInputInstance>; required?: boolean; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  function pickDate() { if (disabled) return; Keyboard.dismiss(); setOpen(true); }
  return <View className="gap-2" style={{ opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>{compact ? <QuickAddField requiredIndicator="asterisk" ref={inputRef} editable={!disabled} date required={required} onPickDate={pickDate} label={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" error={error} maxLength={10} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /> : <>
    <InvField label={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" error={error} maxLength={10} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
    <Button variant="secondary" accessibilityLabel={t("inventory.choose", { value1: label.toLowerCase() })} onPress={pickDate} icon={props => <PosIcon name="calendar" {...props} />}>{t("inventory.choose.date")}</Button></>}
    <InvModal visible={open} title={label} onClose={() => setOpen(false)}>
      {open && <CalendarPicker value={value} minYear={compact ? 1 : 1900} onChange={date => { onChange(date); setOpen(false); }} onClose={() => setOpen(false)} />}
    </InvModal>
  </View>;
}

/** Reuses the inventory calendar within either a screen modal or Quick Add's existing window. */
export function CalendarPicker({ value, onChange, onClose, minYear = 1 }: { value: string; onChange: (date: string) => void; onClose: () => void; minYear?: number }) {
  const [month, setMonth] = useState(() => (validCalendarDate(value) ? value : todayInManila()).slice(0, 7));
  const number = Number(month.slice(5));
  const first = new Date(`${month}-01T12:00:00Z`);
  const last = new Date(first); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
  const count = last.getUTCDate();
  const offset = first.getUTCDay();
  function move(delta: number) {
    const next = new Date(first); next.setUTCMonth(number - 1 + delta);
    if (next.getUTCFullYear() >= minYear && next.getUTCFullYear() <= 9999) setMonth(next.toISOString().slice(0, 7));
  }
  return <View className="gap-4">
      <View className="flex-row flex-wrap items-center justify-between gap-2"><InvChip label={t("inventory.previous")} selected={false} onPress={() => move(-1)} /><InvText bold>{month}</InvText><InvChip label={t("inventory.next")} selected={false} onPress={() => move(1)} /></View>
      <ScrollView horizontal><View style={{ width: 336, flexDirection: 'row', flexWrap: 'wrap' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <View key={i} style={{ width: 48, alignItems: 'center' }}><InvText>{day}</InvText></View>)}
        {Array.from({ length: offset }, (_, i) => <View key={`blank-${i}`} style={{ width: '14.285%' }} />)}
        {Array.from({ length: count }, (_, i) => { const date = `${month}-${String(i + 1).padStart(2, '0')}`; return <Pressable key={date} accessibilityRole="button" accessibilityLabel={date} accessibilityState={{ selected: value === date }} onPress={() => onChange(date)} style={{ width: '14.285%', minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: value === date ? '#D1E1F5' : '#FFFFFF' }}><InvText bold>{i + 1}</InvText></Pressable>; })}
      </View></ScrollView><Button variant="secondary" onPress={onClose}>{t("inventory.cancel")}</Button>
  </View>;
}

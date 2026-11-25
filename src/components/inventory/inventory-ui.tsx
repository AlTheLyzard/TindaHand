import { MoneyInput } from '@/components/ui/money-input';
import { KeyboardField, KeyboardAwareScrollView as ScrollView, KeyboardInput as TextInput, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { ChoiceChip } from '@/components/ui/choice-chip';
import { MotionRegion } from '@/components/ui/motion-content';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { useTranslation } from '@/i18n/use-translation';
import { t } from '@/i18n';
import { router } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { Image, Keyboard, Platform, Text, View, useWindowDimensions, type ImageSourcePropType, type ScrollViewInstance, type ScrollViewProps, type TextInputProps, type TextInputInstance, type TextStyle, type ViewInstance } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainHeader } from '@/components/dashboard/main-header';
import { OperatorHeader } from '@/components/operator/operator-header';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button, IconButton } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { useNavigationHeight } from '@/state/navigation-motion';
import { useInventory } from '@/state/inventory';
import { useAuthFlow } from '@/state/auth-flow';
import { FieldLabel, fieldLabel } from '@/components/ui/field-label';
import { DropdownField } from '@/components/ui/dropdown-field';
import { DatePicker } from '@/components/ui/date-picker';
import { SuccessContent } from '@/components/ui/success-content';
import { Image as BackgroundImage } from 'expo-image';
import { ResizableSheet } from '@/components/ui/resizable-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import tokens from '@/constants/design-tokens.json';
import { InventoryPopover } from './inventory-popover';
import { validDate } from '@/utils/inventory';

// These controls are also used by debts/expenses; keep this refinement scoped to Inventory.
const InventoryPresentation = createContext(false);

export const inventoryIllustrations = {
  addProduct: require('@/assets/images/inventory/AddProduct.png'),
  editProduct: require('@/assets/images/inventory/EditProduct.png'),
  expiry: require('@/assets/images/inventory/AddExpiryDate.png'),
  restock: require('@/assets/images/inventory/RestockProduct.png'),
  asset: require('@/assets/images/inventory/AddAsset.png'),
};

export function InvText({ children, bold = false, size = 12, color = tokens.color.textSecondary }: { children: ReactNode; bold?: boolean; size?: number; color?: string }) {
  const role = size <= 10 ? 'helper' : size <= 12 ? bold ? 'labelNav' : 'microCaption'
    : size <= 14 ? bold ? 'buttonCta' : 'microFinancialRate' : size <= 16 ? bold ? 'listFinancial' : 'bodyPrimary'
      : size <= 18 ? 'h3Heading' : size <= 22 ? 'titleAccent' : size <= 24 ? 'h2Section' : size <= 30 ? 'largeMetric' : 'h1Display';
  const typography = tokens.typography[role];
  const weight = typography.fontWeight === 300 ? 'light' : typography.fontWeight === 400 ? 'regular' : typography.fontWeight === 500 ? 'medium' : typography.fontWeight === 600 ? 'semibold' : 'bold';
  return <Text style={{ fontFamily: tokens.typography.weights[weight], fontSize: typography.fontSize, lineHeight: typography.lineHeight, color }}>{children}</Text>;
}
export function InventoryFrame({ title, children, back = false, inlineTitle = false, onBack, onNavigate, scrollRef, overlay, footer, hideNavigationWithKeyboard = false, hideNavigation = false, background = false, illustration, subtitle, refreshControl }: {
  title: string; children: ReactNode; back?: boolean; inlineTitle?: boolean; onBack?: () => void;
  onNavigate?: (action: () => void) => void; scrollRef?: RefObject<ScrollViewInstance | null>; overlay?: ReactNode; footer?: ReactNode; hideNavigationWithKeyboard?: boolean; hideNavigation?: boolean; background?: boolean;
  illustration?: ImageSourcePropType; subtitle?: string; refreshControl?: ScrollViewProps['refreshControl'];
}) {
  useTranslation();
  const { deviceSession } = useAuthFlow();
  const operator = deviceSession?.role === 'operator';
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
  const scroll = useRef<ScrollViewInstance>(null);
  const { fontScale } = useWindowDimensions();
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
  const goBack = () => { Keyboard.dismiss(); if (onBack) onBack(); else if (router.canGoBack()) router.back(); else router.replace(operator ? '/operator-inventory' : '/owner-inventory'); };
  const backButton = back && <BackButton accessibilityLabel={t('inventory.back')} onPress={goBack} />;
  return <InventoryPresentation.Provider value={background}><View className="flex-1 bg-canvas">
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1" style={{ backgroundColor: 'transparent' }}>
    {operator ? <OperatorHeader onNavigate={navigate} /> : <MainHeader onNavigate={navigate} />}
    <View className="flex-1">
    {background && <View testID="inventory-application-background" pointerEvents="none" accessible={false} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* One viewport-sized image keeps the waves and storefront continuous as content scrolls. */}
      <BackgroundImage source={require('@/assets/images/auth/background.png')} contentFit="cover" contentPosition="bottom" style={{ position: 'absolute', inset: 0 }} />
    </View>}
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollRef ?? scroll} refreshControl={refreshControl} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: footer ? 24 : insets.bottom + (showNavigation ? navigationHeight : 0) + 24 }}>
        <View className="w-full max-w-[460px] gap-5 self-center px-5" style={{ paddingTop: tokens.spacing.headerTitleGap + 4 }}>
          {inlineTitle ? <View className="flex-row items-start gap-2" style={{ minHeight: illustration ? 104 : undefined }}><View className="min-w-0 flex-1 gap-2"><View className="flex-row items-center gap-2">{back && <View>{backButton}</View>}<Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} className="min-w-0 flex-1 type-h1-display text-brand" style={{ lineHeight: tokens.typography.h1Display.lineHeight * fontScale }}>{title}</Text></View>{!!subtitle && <Text className="type-micro-financial-rate leading-[21px] text-text-primary">{subtitle}</Text>}</View>{illustration && <Image source={illustration} accessible={false} resizeMode="contain" style={{ width: 76, height: 88, flexShrink: 0 }} />}</View> : <>
            <Text accessibilityRole="header" className="type-h1-display text-brand">{title}</Text>{backButton}
          </>}
          {children}
        </View>
      </ScrollView>
      {!!footer && <View className={background ? 'px-5 pt-4' : 'rounded-t-card bg-white px-5 pt-4'} style={{ paddingBottom: insets.bottom + (showNavigation ? navigationHeight : 0) + 12 }}><View className="w-full max-w-[420px] gap-3 self-center">{footer}</View></View>}
    </KeyboardAvoidingView>
    </View>
    {showNavigation && <DashboardNavigation onHome={() => { Keyboard.dismiss(); router.navigate(operator ? '/operator-pos' : '/owner-dashboard'); }} onPos={() => { Keyboard.dismiss(); router.navigate(operator ? '/operator-pos' : '/owner-pos'); }} onUnavailable={() => setNotice(t("inventory.more.tools"))} onNavigate={onNavigate} />}
    <InvModal visible={!!notice} title={notice} onClose={() => setNotice('')}><InvText>{t("inventory.this.feature.is.not.available.in.this")}</InvText><Button onPress={() => setNotice('')}>{t("inventory.close")}</Button></InvModal>
    {overlay}
    </SafeAreaView>
  </View></InventoryPresentation.Provider>;
}
export function InvModal({ visible, title, children, onClose, sheet = false, subtitle, footer, bottomPadding, titleStyle, subtitleStyle }: { visible: boolean; title: string; children: ReactNode; onClose: () => void; sheet?: boolean; subtitle?: string; footer?: ReactNode; bottomPadding?: number; titleStyle?: TextStyle; subtitleStyle?: TextStyle }) {
  const insets = useSafeAreaInsets();
  return <Modal sheet={sheet} visible={visible} onRequestClose={onClose}>
    {sheet ? <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaView edges={['top', 'left', 'right']} className="flex-1"><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ResizableSheet alwaysShowSubtitle title={title} subtitle={subtitle} titleStyle={titleStyle} subtitleStyle={subtitleStyle} onClose={onClose} testID="inventory-sheet" footer={footer ? <View className="gap-3 py-3" style={{ paddingBottom: insets.bottom + 12 }}>{footer}</View> : undefined}><View className="gap-4 pb-3">{children}</View></ResizableSheet></KeyboardAvoidingView></SafeAreaView></GestureHandlerRootView> :
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1"><KeyboardAvoidingView className="flex-1 justify-center px-5" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View accessibilityViewIsModal className="max-h-[90%] w-full max-w-[460px] self-center rounded-t-card bg-white" style={{ borderRadius: sheet ? undefined : 16, paddingBottom: bottomPadding ?? insets.bottom + 12 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Text accessibilityRole="header" className=" type-title-accent text-brand">{title}</Text>{children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView></SafeAreaView>}
  </Modal>;
}
export function InvField({ label, error, inputRef, style, trailing, fieldFooter, hideLabel = false, batch = false, money = false, ...props }: TextInputProps & { label: string; error?: string; inputRef?: Ref<TextInputInstance>; trailing?: ReactNode; fieldFooter?: ReactNode; hideLabel?: boolean; batch?: boolean; money?: boolean }) {
  const { fontScale } = useWindowDimensions();
  const presentation = useContext(InventoryPresentation);
  const Input = money ? MoneyInput : TextInput;
  if (!presentation && !batch) return <KeyboardField className="gap-1">{!hideLabel && <InvLabel label={label} />}<View className="min-h-12 flex-row items-center rounded-control border bg-white" style={{ borderColor: error ? tokens.color.errorBase : tokens.color.borderOutline }}>
    {money && <Text accessibilityElementsHidden className="pl-4 type-body-primary text-text-primary">₱</Text>}
    <Input {...props} ref={inputRef} accessibilityLabel={props.accessibilityLabel ?? label.replace(/\s*\*$/, ', required')} accessibilityHint={error} placeholderTextColor={tokens.color.textPlaceholder} autoCorrect={false}
      className="min-w-0 flex-1 py-3 pr-4 type-body-primary text-text-primary" style={[{ paddingLeft: money ? 4 : 16 }, style]} />{trailing}
    </View>
    {!!fieldFooter && <View pointerEvents="none" style={{ alignSelf: 'flex-end', marginTop: 4 }}>{fieldFooter}</View>}
    {!!error && <MotionRegion><Text accessibilityRole="alert" className=" type-helper text-error-base">{error}</Text></MotionRegion>}
  </KeyboardField>;
  return <KeyboardField className="gap-1">{!hideLabel && <InvLabel label={label} />}<View className="flex-row items-center bg-white" style={{ minHeight: tokens.button.height, borderWidth: 1, borderRadius: tokens.radius.control, borderColor: error ? tokens.color.errorBase : tokens.color.borderOutline, position: fieldFooter ? 'relative' : undefined }}>
    {money && <Text accessibilityElementsHidden style={{ paddingLeft: batch ? 8 : 16, color: tokens.color.textPrimary, fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.bodyPrimary.fontSize, lineHeight: tokens.typography.bodyPrimary.lineHeight }}>₱</Text>}
    <Input {...props} ref={inputRef} accessibilityLabel={props.accessibilityLabel ?? label.replace(/\s*\*$/, ', required')} accessibilityHint={error} placeholderTextColor={tokens.color.textPlaceholder} autoCorrect={false} underlineColorAndroid="transparent"
      className="min-w-0 flex-1 type-body-primary text-text-primary" style={[{ minHeight: Math.max(tokens.button.height - 2, tokens.typography.bodyPrimary.lineHeight * fontScale + 24), paddingLeft: money ? 4 : batch ? 8 : 16, paddingRight: batch ? 8 : 16, paddingVertical: 12, textAlignVertical: 'center' }, style]} />{trailing}{fieldFooter && <View pointerEvents="none" style={{ position: 'absolute', right: 12, bottom: 6 }}>{fieldFooter}</View>}</View>
    {!!error && <MotionRegion><Text accessibilityRole="alert" className=" type-helper text-error-base">{error}</Text></MotionRegion>}
  </KeyboardField>;
}
export function InvSelect({ label, value, options, onChange, error, anchored = false }: { label: string; value: string; options: Readonly<Record<string, string>>; onChange: (value: string) => void; error?: string; anchored?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<ViewInstance>(null);
  return <DropdownField label={label} value={value}
    options={Object.entries(options).map(([optionValue, optionLabel]) => ({ value: optionValue, label: optionLabel }))}
    onChange={onChange} placeholder={t("inventory.select.an.option")} error={error} open={open} onOpenChange={setOpen}
    triggerRef={trigger} menuTestID="inventory-category-options" optionTestIDPrefix="inventory-option-"
    renderMenu={anchored ? menu => <InventoryPopover visible={open} anchorRef={trigger} label={`${label} options`}
      testID="inventory-category-options" onClose={() => setOpen(false)} onHidden={() => trigger.current?.focus()}>{menu}</InventoryPopover> : undefined} />;
}
export function InvChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <ChoiceChip label={label} selected={selected} onPress={onPress} />;
}
export function InvDanger({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button variant="destructive" onPress={onPress}>{label}</Button>;
}
export function InvCard({ children }: { children: ReactNode }) {
  return <View className="gap-3 rounded-control border border-outline bg-white p-3">{children}</View>;
}
function InvLabel({ label }: { label: string }) {
  return <FieldLabel label={label} style={{ fontFamily: tokens.typography.weights.semibold, color: tokens.color.textPrimary }} />;
}
export function InventoryFeedback() {
  useTranslation();
  const { feedback, setFeedback } = useInventory();
  const insets = useSafeAreaInsets();
  return <Modal visible={!!feedback} onRequestClose={() => setFeedback('')}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
        {!!feedback && <SuccessContent testID="inventory-success" title="Changes Saved" message={feedback} eventKey={feedback}
          visible={!!feedback} onClose={() => setFeedback('')} />}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
/** Pads single-digit month/day so "2028-9-1" → "2028-09-01". No-op if already padded or not a date-like string. */
function normalizeDateInput(raw: string): string {
  const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const normalized = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    return validDate(normalized) ? normalized : raw;
  }
  const us = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!us) return raw;
  const normalized = `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  return validDate(normalized) ? normalized : raw;
}
function formatDateInput(value: string): string {
  if (!validDate(value)) return value;
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
}

export function InvDateField({ label, value, onChange, error, compact = false, inputRef, required = true, disabled = false, displayLabel }: { label: string; value: string; onChange: (date: string) => void; error?: string; compact?: boolean; inputRef?: Ref<TextInputInstance>; required?: boolean; disabled?: boolean; displayLabel?: string }) {
  const [open, setOpen] = useState(false);
  function pickDate() { if (disabled) return; Keyboard.dismiss(); setOpen(true); }
  // Normalize (pad month/day) when the user finishes editing, not while typing.
  function handleBlur() { const n = normalizeDateInput(value); if (n !== value) onChange(n); }
  const updateDate = (raw: string) => onChange(normalizeDateInput(raw));
  return <View className="gap-2" style={{ opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
    <InvField batch={compact} inputRef={inputRef} editable={!disabled} label={(compact ? displayLabel ?? label : label) + (required ? ' *' : '')}
      accessibilityLabel={label + (required ? ', required' : '')} value={formatDateInput(value)} onChangeText={updateDate} onBlur={handleBlur}
      placeholder="MM/DD/YYYY" keyboardType="numbers-and-punctuation" error={error} maxLength={10} returnKeyType="done"
      onSubmitEditing={() => { handleBlur(); Keyboard.dismiss(); }}
      trailing={<IconButton disabled={disabled} accessibilityLabel={'Choose ' + label.toLowerCase()} onPress={pickDate} icon={() => <PosIcon name="calendarDue" size={18} color={tokens.color.textSecondary} />} />} />
    <InvModal visible={open} title={fieldLabel(label)} onClose={() => setOpen(false)} bottomPadding={0}>
      {open && <DatePicker value={value} minYear={compact ? 1 : 1900} onChange={date => { onChange(date); setOpen(false); }} onClose={() => setOpen(false)} />}
    </InvModal>
  </View>;
}

/** Compatibility export: all date fields use the shared draft/confirm picker. */
export { DatePicker as CalendarPicker } from '@/components/ui/date-picker';

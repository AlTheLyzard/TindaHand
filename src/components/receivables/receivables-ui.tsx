import tokens from '@/constants/design-tokens.json';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/ui/search-bar';
import { useEffect, useRef, useState, type Ref } from 'react';
import { Text, TextInput, View, type StyleProp, type TextInputInstance, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import Animated, { ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { MotionLayout, MotionSurface, MotionText } from '@/components/ui/motion-content';
import type { Customer } from '@/types/pos';
import { PartyNameField } from '@/components/ui/party-name-field';
import { useInventory } from '@/state/inventory';
import { payableColors } from '@/components/payables/payables-ui';
import { EmptyState as ContentState } from '@/components/ui/content-state';
import type { ReceivableStatus } from '@/types/receivables';
import { formatPesos } from '@/utils/dashboard';
import { motion } from '@/constants/motion';
import { useMotionReduced } from '@/state/motion';
import { useAuthFlow } from '@/state/auth-flow';

export const receivableColors = { ...payableColors, orange: tokens.color.warningText, red: tokens.color.errorBase, redSurface: tokens.color.errorTint, overdueGroup: tokens.color.errorSoft };
export const ownerReceivablesRoot = '/owner-menu/receivables-payables' as const;
export const operatorReceivablesRoot = '/operator-receivables' as const;
export function useReceivablesRoot() {
  const { deviceSession } = useAuthFlow();
  return deviceSession?.role === 'operator' ? operatorReceivablesRoot : ownerReceivablesRoot;
}
export const debtDescription = 'Keep track of what your customers owe and when they need to pay.';

/** Complete status classes stay in one place so debt cards and group panels agree. */
export const receivableStatusStyles = {
  overdue: { label: 'Overdue', panel: 'bg-error-soft', card: 'border-error-base bg-error-tint', ink: 'text-error-base', accent: tokens.color.errorBase, surface: tokens.color.errorTint, badgeBackground: tokens.color.errorBase, badgeInk: tokens.color.surfaceCard },
  pending: { label: 'Pending', panel: 'bg-accent-container', card: 'border-action bg-surface-subtle', ink: 'text-royal-blue', accent: tokens.color.royalBlue, surface: tokens.color.surfaceSubtle, badgeBackground: tokens.color.royalBlue, badgeInk: tokens.color.surfaceCard },
  partial: { label: 'Remaining Balance', panel: 'bg-warning-tint', card: 'border-warning-base bg-warning-tint', ink: 'text-warning-text', accent: tokens.color.warningText, surface: tokens.color.warningTint, badgeBackground: tokens.color.warningBase, badgeInk: tokens.color.surfaceCard },
  paid: { label: 'Paid', panel: 'bg-white', card: 'border-outline bg-white', ink: 'text-success-base', accent: tokens.color.successBase, surface: tokens.color.successTint, badgeBackground: tokens.color.successBase, badgeInk: tokens.color.surfaceCard },
} as const;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
cssInterop(AnimatedTextInput, { className: 'style' });

function animatedValue(value: number, format: 'peso' | 'percent' | 'integer') {
  'worklet';
  if (format === 'integer') return String(Math.max(0, Math.round(value)));
  if (format === 'percent') {
    const hundredths = Math.max(0, Math.round(value));
    return `${hundredths === 0 || hundredths === 10000 ? hundredths / 100 : (hundredths / 100).toFixed(2)}%`;
  }
  const centavos = Math.max(0, Math.round(value));
  const whole = Math.floor(centavos / 100).toString();
  let grouped = '';
  for (let index = 0; index < whole.length; index += 1) {
    if (index > 0 && (whole.length - index) % 3 === 0) grouped += ',';
    grouped += whole[index];
  }
  return `₱${grouped}.${String(centavos % 100).padStart(2, '0')}`;
}

/** One number renderer keeps changing financial values on the UI thread. */
export function AnimatedNumber({ value, format = 'peso', prefix = '', className, style, fitContent = false, accessibilityLabel }: {
  value: number; format?: 'peso' | 'percent' | 'integer'; prefix?: string; className: string; style?: StyleProp<TextStyle>; fitContent?: boolean; accessibilityLabel?: string;
}) {
  const reduced = useMotionReduced();
  const animatedValueRef = useSharedValue(0);
  useEffect(() => {
    animatedValueRef.set(reduced ? value : withTiming(value, {
      duration: motion.number,
      easing: motion.ease,
      reduceMotion: ReduceMotion.System,
    }));
  }, [animatedValueRef, reduced, value]);
  const animatedProps = useAnimatedProps<TextInputProps>(() => {
    const text = `${prefix}${animatedValue(animatedValueRef.value, format)}`;
    return { text, defaultValue: text } as unknown as Partial<TextInputProps>;
  }, [format, prefix]);
  return <AnimatedTextInput
    accessible
    accessibilityLabel={accessibilityLabel ?? `${prefix}${format === 'peso' ? formatPesos(value) : animatedValue(value, format)}`}
    editable={false}
    focusable={false}
    pointerEvents="none"
    underlineColorAndroid="transparent"
    animatedProps={animatedProps}
    className={className}
    style={[{ width: format === 'peso' && !fitContent ? '100%' : undefined, padding: 0, paddingTop: 0, paddingBottom: 0, paddingVertical: 0, margin: 0, borderWidth: 0, backgroundColor: 'transparent', fontVariant: ['tabular-nums'], includeFontPadding: false }, style]}
  />;
}

export function AnimatedPesoValue({ centavos, ...props }: {
  centavos: number; prefix?: string; className: string; style?: StyleProp<TextStyle>; fitContent?: boolean; accessibilityLabel?: string;
}) {
  return <AnimatedNumber value={centavos} format="peso" {...props} />;
}

export function ReceivableCountBadge({ count, backgroundColor, textColor }: { count: number; backgroundColor: string; textColor: string }) {
  const reduced = useMotionReduced();
  const scale = useSharedValue(1);
  const previous = useRef(count);
  useEffect(() => {
    if (previous.current !== count) {
      previous.current = count;
      scale.set(reduced ? 1 : withSequence(
        withSpring(motion.badgeScale, { ...motion.badgeSpring, reduceMotion: ReduceMotion.System }),
        withSpring(1, { ...motion.badgeSpring, reduceMotion: ReduceMotion.System }),
      ));
    }
  }, [count, reduced, scale]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <MotionLayout style={animatedStyle as unknown as StyleProp<ViewStyle>}>
    <View style={{ minWidth: tokens.size.statusIndicator - tokens.spacing.half, minHeight: tokens.size.statusIndicator - tokens.spacing.half, paddingHorizontal: tokens.spacing.half,
      alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.pill, backgroundColor }}>
      <Text className="type-status-badge" style={{ color: textColor }}>{count}</Text>
    </View>
  </MotionLayout>;
}

export function ReceivableProgressBar({ progress, color, label = 'Debt payment progress', height = 'h-2' }: {
  progress: number; color: string; label?: string; height?: string;
}) {
  const reduced = useMotionReduced();
  const width = useSharedValue(0);
  useEffect(() => {
    const next = Math.max(0, Math.min(100, progress));
    width.set(reduced ? next : withTiming(next, {
      duration: motion.progress,
      easing: motion.ease,
      reduceMotion: ReduceMotion.System,
    }));
  }, [progress, reduced, width]);
  const fill = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    minWidth: width.value === 0 ? tokens.spacing.two : 0,
    backgroundColor: color,
  }));
  return <View accessibilityRole="progressbar" accessibilityLabel={label}
    accessibilityValue={{ min: 0, max: 100, now: progress, text: `${progress.toFixed(2)}% paid` }}
    className={`${height} overflow-hidden rounded-pill bg-white`}>
    <Animated.View className="h-full rounded-pill" style={fill} />
  </View>;
}

export function ReceivableSummaryCard({ title, amountCentavos, caption, paid = false, dark = false, amountPrefix = '' }: {
  title: string; amountCentavos: number; caption?: string; paid?: boolean; dark?: boolean; amountPrefix?: string;
}) {
  const ink = dark ? tokens.color.surfaceCard : paid ? receivableColors.green : receivableColors.blue;
  const surface = dark ? tokens.color.darkNavy : paid ? receivableColors.greenSurface : receivableColors.blueSurface;
  return <MotionSurface className="gap-3 rounded-card border p-4" style={{ borderColor: ink, backgroundColor: surface }}>
    <MotionText className="type-h3-heading" style={{ color: ink }}>{title}</MotionText>
    <AnimatedPesoValue centavos={amountCentavos} prefix={amountPrefix} className="type-large-metric" style={{ color: ink, lineHeight: 45, height: 45 }} />
    {!!caption && <Text className="type-micro-caption text-text-secondary" style={dark ? { color: tokens.color.surfaceCard } : undefined}>{caption}</Text>}
  </MotionSurface>;
}

export function receivableStatusAppearance(status: ReceivableStatus) {
  const appearance = receivableStatusStyles[status];
  return { label: appearance.label, color: appearance.accent, surface: appearance.surface };
}

export function ReceivableStatusPill({ status }: { status: ReceivableStatus }) {
  const appearance = receivableStatusAppearance(status);
  return <View className="rounded-pill border px-3 py-1" style={{ borderColor: appearance.color, backgroundColor: appearance.surface }}>
    <Text className="type-label-nav" style={{ color: appearance.color }}>{appearance.label}</Text>
  </View>;
}

export function CustomerSearch({ value, onChange, kind = 'customer', placeholder }: { value: string; onChange: (value: string) => void; kind?: 'customer' | 'product'; placeholder?: string }) {
  return <SearchBar label={`Search ${kind} name`} value={value} onChangeText={onChange}
    placeholder={placeholder ?? (kind === 'customer' ? 'Enter Customer Name' : 'Enter Product Name')}
    onClear={() => onChange('')} clearLabel={`Clear ${kind} search`} />;
}
export function CustomerNameField({ value, customerId, onChange, onMatch, onSelect, error, errorBackground, inputRef, onNext, floatingSuggestions, customers: customersProp, label = 'Customer name or other identifying details', placeholder }: {
  value: string; customerId?: string; onChange: (name: string) => void; onMatch: (customer: Customer) => void;
  onSelect: () => void; error?: string; errorBackground?: string; inputRef?: Ref<TextInputInstance>; onNext?: () => void; floatingSuggestions?: boolean; customers?: readonly Customer[]; label?: string; placeholder?: string;
}) {
  const { store } = useInventory();
  const records = customersProp ?? store.pos?.customers ?? [];
  return <PartyNameField kind="customer" label={label} value={value} selectedId={customerId} placeholder={placeholder} errorBackground={errorBackground}
    records={records} onChange={onChange} onMatch={onMatch} onSelect={onSelect} error={error} inputRef={inputRef} onNext={onNext} floatingSuggestions={floatingSuggestions} />;
}
export function CustomerList({ customers, onSelect, onAddNew, searchPlaceholder = 'Search Customer...', description = 'Choose a customer for this debt.', emptyDescription = 'Return to the debt form to enter a new customer.', searchLabel }: {
  customers: readonly Customer[]; onSelect: (customer: Customer) => void; onAddNew?: () => void; searchPlaceholder?: string; description?: string; emptyDescription?: string; searchLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const rows = customers.filter(customer => customer.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice().sort((a, b) => a.name.localeCompare(b.name));
  return <View className="gap-4">
    {!!description && <Text className=" type-micro-financial-rate leading-[21px] text-text-secondary">{description}</Text>}
    {onAddNew && <Button variant="secondary" onPress={onAddNew}>+ Add New Customer</Button>}
    {!!searchLabel && <Text className="type-label-nav text-text-primary">{searchLabel}</Text>}
    <CustomerSearch value={query} onChange={setQuery} placeholder={searchPlaceholder} />
    {!rows.length && <ContentState title={query ? 'No matching customers' : 'No customers yet'} description={emptyDescription} />}
    {rows.map((customer, index) => {
      const letter = customer.name.charAt(0).toUpperCase();
      const duplicate = rows.filter(row => row.name.toLocaleLowerCase() === customer.name.toLocaleLowerCase()).length > 1;
      return <View key={customer.id} className="gap-3">
        {(index === 0 || rows[index - 1].name.charAt(0).toUpperCase() !== letter) && <Text className="mt-2 type-label-nav text-text-primary">{letter}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={`Select customer ${customer.name}${duplicate ? `, ${customer.id}` : ''}`} onPress={() => onSelect(customer)} className="min-h-[64px] flex-row items-center gap-4 rounded-control border border-outline bg-white p-4 active:bg-ice-container">
          <View className="h-9 w-9 items-center justify-center rounded-pill bg-accent-soft"><Text className=" type-micro-financial-rate text-action">{customer.name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('')}</Text></View>
          <View className="min-w-0 flex-1"><Text className=" type-button-cta text-text-primary">{customer.name}</Text>{duplicate && <Text className=" type-helper text-text-secondary">{customer.id}</Text>}</View>
        </Pressable>
      </View>;
    })}
  </View>;
}

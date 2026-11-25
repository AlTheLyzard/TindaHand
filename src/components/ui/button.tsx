import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { MotionPressable } from '@/components/ui/motion-pressable';
import tokens from '@/constants/design-tokens.json';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'text' | 'destructiveText' | 'destructive' | 'destructiveOutline' | 'positive';
type Icon = (props: { color: string; size: number }) => ReactNode;
type SurfaceProps = Omit<ComponentProps<typeof MotionPressable>, 'children'> & {
  variant?: ButtonVariant;
  pressedVariant?: ButtonVariant;
  loading?: boolean;
  interactionBackgroundColor?: string;
  children: ReactNode | ((appearance: { color: string; size: number }) => ReactNode);
};

/** Shared palette and feedback for CTAs and controls that retain their own geometry. */
export function ButtonSurface({ variant = 'primary', pressedVariant, loading = false, disabled, children, style, interactionBackgroundColor,
  onPress, onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur, ...props }: SurfaceProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const pending = useRef(false);
  const blocked = !!disabled || loading;
  const appearanceVariant = pressed && !blocked && pressedVariant ? pressedVariant : variant;
  const textOnly = appearanceVariant === 'text' || appearanceVariant === 'destructiveText';
  const outlined = appearanceVariant === 'secondary' || appearanceVariant === 'outlined' || appearanceVariant === 'destructiveOutline';
  const palette = tokens.button[appearanceVariant === 'destructiveText' ? 'destructiveOutline' : appearanceVariant === 'outlined' || textOnly ? 'secondary' : appearanceVariant];
  const destructive = appearanceVariant.startsWith('destructive');
  const secondary = appearanceVariant === 'secondary' || appearanceVariant === 'outlined';
  const ink = destructive ? tokens.button.destructive : secondary ? tokens.button.primary : tokens.button.primary;
  const state = disabled ? 'disabled' : loading ? 'default' : pressed ? 'pressed' : hovered ? 'hover' : 'default';
  const color = disabled ? palette.disabledText
    : textOnly && appearanceVariant === 'text' ? pressed ? tokens.color.deepRoyalBlue : hovered ? tokens.color.royalBlue : tokens.color.brightBlue
      : secondary ? tokens.button.secondary.ink
        : outlined || textOnly ? ink[pressed ? 'pressed' : hovered ? 'hover' : 'default'] : tokens.color.textInverse;
  const appearance: ViewStyle = {
    backgroundColor: textOnly
      ? interactionBackgroundColor && (pressed || hovered || props.accessibilityState?.selected) ? interactionBackgroundColor
        : pressed || hovered ? palette[state] : 'transparent'
      : palette[state],
    borderWidth: textOnly ? 0 : 1,
    borderColor: disabled ? appearanceVariant === 'destructiveOutline' ? tokens.color.errorTint : outlined ? tokens.color.borderOutline : palette.disabled
      : secondary ? tokens.color.darkNavy : outlined ? ink[pressed ? 'pressed' : hovered ? 'hover' : 'default'] : palette[state],
    boxShadow: textOnly ? 'none' : `${tokens.shadow.raised}, ${outlined || disabled
      ? destructive ? tokens.button.destructiveHighlight
        : appearanceVariant === 'positive' ? tokens.button.positiveHighlight : tokens.button.outlineHighlight
      : tokens.button.highlight}`,
    outlineWidth: focused && !blocked ? 2 : 0, outlineOffset: 3, outlineStyle: 'solid',
    outlineColor: destructive ? tokens.button.destructive.default : tokens.color.brightBlue,
  };
  return <MotionPressable {...props} fadeOnPress={false} accessibilityRole={props.accessibilityRole ?? 'button'}
    disabled={blocked} aria-busy={loading} accessibilityState={{ ...props.accessibilityState, disabled: blocked, busy: loading }}
    onPress={event => {
      if (blocked || pending.current) return;
      const result: unknown = onPress?.(event);
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        pending.current = true;
        void Promise.resolve(result).finally(() => { pending.current = false; }).catch(() => {});
      }
    }}
    onPressIn={event => { setPressed(true); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); onPressOut?.(event); }}
    onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
    onFocus={event => {
      const target = event.target as unknown as { matches?: (selector: string) => boolean };
      setFocused(target.matches?.(':focus-visible') ?? true);
      onFocus?.(event);
    }}
    onBlur={event => { setFocused(false); setPressed(false); onBlur?.(event); }}
    style={[appearance, style]}>
    {typeof children === 'function' ? children({ color, size: tokens.button.iconSize }) : children}
  </MotionPressable>;
}

type ButtonProps = Omit<SurfaceProps, 'children'> & {
  children: string;
  icon?: Icon;
  iconPosition?: 'leading' | 'trailing';
  fullWidth?: boolean;
  shape?: 'control' | 'pill';
  compact?: boolean;
  textColor?: string;
  textStyle?: StyleProp<TextStyle>;
};

/** The 2× artwork maps to a 50 dp minimum; labels grow and wrap with system text. */
export function Button({ children, icon, iconPosition = 'leading', fullWidth = true,
  shape = 'control', compact = false, loading = false, textColor, textStyle, style, ...props }: ButtonProps) {
  const { fontScale } = useWindowDimensions();
  const flattenedTextStyle = StyleSheet.flatten(textStyle);
  const scaledTextStyle = flattenedTextStyle?.lineHeight === undefined
    ? textStyle
    : { ...flattenedTextStyle, lineHeight: flattenedTextStyle.lineHeight * fontScale };
  return <ButtonSurface {...props} accessibilityLabel={props.accessibilityLabel ?? children} loading={loading} style={[styles.button,
    { width: fullWidth ? '100%' : undefined, borderRadius: shape === 'pill' ? tokens.radius.pill : tokens.button.radius,
      paddingHorizontal: props.variant === 'text' || props.variant === 'destructiveText' ? 8 : compact ? 12 : tokens.button.paddingHorizontal }, style]}>
    {({ color, size }) => <>
      <View accessible={false} style={[styles.content, { opacity: loading ? 0 : 1 }]}>
        {icon && iconPosition === 'leading' && <View style={styles.icon}>{icon({ color, size })}</View>}
        <Text style={[styles.label, { color: props.disabled ? color : textColor ?? color,
          fontSize: tokens.typography.buttonCta.fontSize, lineHeight: tokens.typography.buttonCta.lineHeight * fontScale }, scaledTextStyle]}>{children}</Text>
        {icon && iconPosition === 'trailing' && <View style={styles.icon}>{icon({ color, size })}</View>}
      </View>
      {loading && <View pointerEvents="none" style={styles.loading}><ActivityIndicator size="small" color={color} /></View>}
    </>}
  </ButtonSurface>;
}

export function IconButton({ icon, accessibilityLabel, variant = 'text', style, ...props }: Omit<SurfaceProps, 'children'> & {
  icon: Icon; accessibilityLabel: string;
}) {
  return <ButtonSurface {...props} accessibilityLabel={accessibilityLabel} variant={variant}
    hitSlop={props.hitSlop ?? 4} style={[styles.iconButton, style]}>
    {appearance => icon(appearance)}
  </ButtonSurface>;
}

const styles = StyleSheet.create({
  button: { minHeight: tokens.button.height, minWidth: tokens.size.touchTarget, justifyContent: 'center', alignItems: 'center', paddingVertical: tokens.button.paddingVertical },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.button.iconGap, maxWidth: '100%' },
  label: { flexShrink: 1, textAlign: 'center', fontFamily: tokens.button.fontFamily },
  icon: { flexShrink: 0 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  iconButton: { minHeight: tokens.size.touchTarget, minWidth: tokens.size.touchTarget, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center' },
});

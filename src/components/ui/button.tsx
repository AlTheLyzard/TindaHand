import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { MotionPressable } from '@/components/ui/motion-pressable';
import tokens from '@/constants/design-tokens.json';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'text' | 'destructiveText' | 'destructive' | 'destructiveOutline' | 'positive';
type Icon = (props: { color: string; size: number }) => ReactNode;
type SurfaceProps = Omit<ComponentProps<typeof MotionPressable>, 'children'> & {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode | ((appearance: { color: string; size: number }) => ReactNode);
};

/** Shared palette and feedback for CTAs and controls that retain their own geometry. */
export function ButtonSurface({ variant = 'primary', loading = false, disabled, children, style,
  onPress, onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur, ...props }: SurfaceProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const pending = useRef(false);
  const blocked = !!disabled || loading;
  const textOnly = variant === 'text' || variant === 'destructiveText';
  const outlined = variant === 'secondary' || variant === 'outlined' || variant === 'destructiveOutline';
  const palette = tokens.button[variant === 'destructiveText' ? 'destructiveOutline' : variant === 'outlined' || textOnly ? 'secondary' : variant];
  const ink = variant.startsWith('destructive') ? tokens.button.destructive : tokens.button.primary;
  const state = disabled ? 'disabled' : loading ? 'default' : pressed ? 'pressed' : hovered ? 'hover' : 'default';
  const color = disabled ? palette.disabledText : outlined || textOnly ? ink[pressed ? 'pressed' : hovered ? 'hover' : 'default'] : '#FFFFFF';
  const appearance: ViewStyle = {
    backgroundColor: textOnly ? pressed || hovered ? palette[state] : 'transparent' : palette[state],
    borderWidth: textOnly ? 0 : 1,
    borderColor: disabled ? variant === 'destructiveOutline' ? '#FFEBEE' : outlined ? '#B0C8E3' : palette.disabled : outlined ? ink[pressed ? 'pressed' : hovered ? 'hover' : 'default'] : palette[state],
    boxShadow: textOnly ? 'none' : outlined || disabled
      ? variant.startsWith('destructive') ? 'inset 0 2px 4px rgba(211,47,47,0.15)'
        : variant === 'positive' ? 'inset 0 2px 4px rgba(37,91,41,0.25)' : tokens.button.outlineHighlight
      : tokens.button.highlight,
    outlineWidth: focused && !blocked ? 2 : 0, outlineOffset: 3, outlineStyle: 'solid',
    outlineColor: variant.startsWith('destructive') ? tokens.button.destructive.default : tokens.button.primary.default,
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
};

/** The 2× artwork maps to a 50 dp minimum; labels grow and wrap with system text. */
export function Button({ children, icon, iconPosition = 'leading', fullWidth = true,
  shape = 'control', compact = false, loading = false, style, ...props }: ButtonProps) {
  return <ButtonSurface {...props} accessibilityLabel={props.accessibilityLabel ?? children} loading={loading} style={[styles.button,
    { width: fullWidth ? '100%' : undefined, borderRadius: shape === 'pill' ? tokens.radius.pill : tokens.button.radius,
      paddingHorizontal: props.variant === 'text' || props.variant === 'destructiveText' ? 8 : compact ? 12 : tokens.button.paddingHorizontal }, style]}>
    {({ color, size }) => <>
      <View accessible={false} style={[styles.content, { opacity: loading ? 0 : 1 }]}>
        {icon && iconPosition === 'leading' && <View style={styles.icon}>{icon({ color, size })}</View>}
        <Text style={[styles.label, { color, fontSize: compact ? 12 : tokens.button.fontSize }]}>{children}</Text>
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
  label: { flexShrink: 1, textAlign: 'center', fontFamily: tokens.button.fontFamily, lineHeight: tokens.button.lineHeight },
  icon: { flexShrink: 0 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  iconButton: { minHeight: tokens.size.touchTarget, minWidth: tokens.size.touchTarget, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center' },
});

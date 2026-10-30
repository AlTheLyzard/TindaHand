import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { ActivityIndicator, StyleSheet, Text, type PressableProps } from 'react-native';
import { useState } from 'react';

type ButtonProps = Omit<PressableProps, 'children'> & {
  children: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  visualVariant?: 'default' | 'quickAdd';
};

/** Shared sticker-sheet CTA styles, with a minimum 48 dp touch target. */
export function Button({ children, variant = 'primary', disabled, loading = false, visualVariant = 'default', onPressIn, onPressOut, ...props }: ButtonProps) {
  const primary = variant === 'primary';
  const blocked = disabled || loading;
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      onPressIn={event => { if (visualVariant === 'quickAdd') setPressed(true); onPressIn?.(event); }}
      onPressOut={event => { if (visualVariant === 'quickAdd') setPressed(false); onPressOut?.(event); }}
      disabled={blocked}
      aria-busy={loading}
      accessibilityState={{ ...props.accessibilityState, disabled: !!blocked, busy: loading }}
      className={
        blocked
          ? 'min-h-[48px] w-full flex-row items-center justify-center gap-2 rounded-control border border-[#A6BFDC] bg-[#B7CEE6] px-4 py-3'
          : primary
          ? 'min-h-[48px] w-full items-center justify-center rounded-control border border-[#7399CC] bg-action px-4 py-3 active:bg-brand web:focus-visible:outline web:focus-visible:outline-2 web:focus-visible:outline-offset-4 web:focus-visible:outline-action'
          : 'min-h-[48px] w-full items-center justify-center rounded-control border border-action bg-white px-4 py-3 active:bg-[#CFD5E0] web:focus-visible:outline web:focus-visible:outline-2 web:focus-visible:outline-offset-4 web:focus-visible:outline-action'
      }
      style={visualVariant === 'quickAdd' ? [styles.shadow, {
        minHeight: 50,
        backgroundColor: blocked ? '#B7CEE6' : primary ? pressed ? '#16336B' : '#28549A' : pressed ? '#CFD5E0' : '#FFFFFF',
        boxShadow: primary && !blocked ? 'inset 0 2px 3px #ADC9EE, 0 3px 4px rgba(17,47,111,0.4)' : '0 2px 4px rgba(17,47,111,0.22)',
      }] : styles.shadow}>
      {loading && <ActivityIndicator style={{ position: 'absolute', left: 12 }} size="small" color="#245399" />}
      <Text
        className={
          blocked
            ? 'text-center font-poppins-bold text-[14px] leading-5 text-[#4A607A]'
            : primary
            ? 'text-center font-poppins-bold text-[14px] leading-5 text-white'
            : 'text-center font-poppins-bold text-[14px] leading-5 text-action'
        }
        style={visualVariant === 'quickAdd' ? { fontFamily: 'Poppins_600SemiBold' } : undefined}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    boxShadow: '0 2px 4px rgba(17, 47, 111, 0.28)',
  },
});

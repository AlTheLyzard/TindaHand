import { Modal, StyleSheet, type ModalProps } from 'react-native';
import { memo, type ReactNode } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useOverlayTransition } from '@/hooks/use-overlay-transition';

type Props = Omit<ModalProps, 'animationType' | 'transparent'> & {
  backdropColor?: string;
  sheet?: boolean;
  onHidden?: () => void;
};

// Keep the last visible content intact while parent state clears on dismissal.
export const RetainedContent = memo(function RetainedContent({ children }: { visible: boolean; children: ReactNode }) {
  return <>{children}</>;
}, (_, next) => !next.visible);

/** A single clock coordinates the backdrop and surface on both entrance and exit. */
export function MotionModal({ visible = true, children, onShow, onDismiss, onHidden, sheet = false,
  backdropColor = 'rgba(0,0,0,0.30)', ...props }: Props) {
  const transition = useOverlayTransition(visible, onHidden);
  const backdrop = useAnimatedStyle(() => ({ opacity: transition.progress.value }));
  const surface = useAnimatedStyle(() => ({
    opacity: transition.progress.value,
    transform: [{ translateY: transition.reduced ? 0 : (1 - transition.progress.value) * (sheet ? 28 : 12) },
      { scale: sheet || transition.reduced ? 1 : 0.985 + transition.progress.value * 0.015 }],
  }));
  return <Modal {...props} visible={transition.presented} transparent animationType="none"
    onShow={event => { transition.onShow(); onShow?.(event); }}
    onDismiss={() => { transition.onDismiss(); onDismiss?.(); }}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor }, backdrop]} />
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'} style={[{ flex: 1 }, surface]}>
      <RetainedContent visible={visible}>{children}</RetainedContent>
    </Animated.View>
  </Modal>;
}

import { Modal, StyleSheet, useWindowDimensions, type ModalProps } from 'react-native';
import { memo, type ReactNode } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useOverlayTransition } from '@/hooks/use-overlay-transition';
import { PresentationContext, usePresentationVisible } from '@/state/presentation';

type Props = Omit<ModalProps, 'animationType' | 'transparent'> & {
  backdropColor?: string;
  sheet?: boolean;
  transitionDuration?: number;
  onHidden?: () => void;
};

// Keep the last visible content intact while parent state clears on dismissal.
export const RetainedContent = memo(function RetainedContent({ children }: { visible: boolean; children: ReactNode }) {
  return <>{children}</>;
}, (_, next) => !next.visible);

/** A single clock coordinates the backdrop and surface on both entrance and exit. */
export function MotionModal({ visible = true, children, onShow, onDismiss, onHidden, sheet = false,
  backdropColor = 'rgba(0,0,0,0.30)', transitionDuration, ...props }: Props) {
  const parentVisible = usePresentationVisible();
  const window = useWindowDimensions();
  const transition = useOverlayTransition(visible, onHidden, transitionDuration);
  const backdrop = useAnimatedStyle(() => ({ opacity: transition.progress.value }));
  const surface = useAnimatedStyle(() => ({
    opacity: sheet && !transition.reduced ? 1 : transition.progress.value,
    // Wait for native onShow (iOS can present the window after React effects).
    // Move the entire sheet from below the viewport on the same clock as its backdrop.
    transform: [{ translateY: transition.reduced ? 0 : (1 - transition.progress.value) * (sheet ? window.height : 12) },
      { scale: sheet || transition.reduced ? 1 : 0.985 + transition.progress.value * 0.015 }],
  }));
  // Match the screen's edge-to-edge coordinate space: content reserves its bottom
  // inset once. Translucency extends the background; it does not hide system bars.
  return <Modal statusBarTranslucent navigationBarTranslucent {...props} visible={transition.presented} transparent animationType="none"
    onShow={event => { transition.onShow(); onShow?.(event); }}
    onDismiss={() => { transition.onDismiss(); onDismiss?.(); }}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor }, backdrop]} />
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'} style={[{ flex: 1 }, surface]}>
      <PresentationContext.Provider value={parentVisible && visible && transition.opened}>
        <RetainedContent visible={visible}>{children}</RetainedContent>
      </PresentationContext.Provider>
    </Animated.View>
  </Modal>;
}

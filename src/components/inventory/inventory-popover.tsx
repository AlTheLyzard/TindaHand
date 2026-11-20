import { useCallback, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionModal } from '@/components/ui/motion-modal';
import { MotionPressable } from '@/components/ui/motion-pressable';
import tokens from '@/constants/design-tokens.json';
import { usePresentationVisible } from '@/state/presentation';

type Anchor = { x: number; y: number; width: number; height: number };
type Placement = 'auto' | 'below';

/** A separate modal window escapes the sheet's clipped scroll body without changing its layout. */
export function InventoryPopover({ visible, anchorRef, onClose, onHidden, label, children, width, placement = 'auto', testID }: {
  visible: boolean; anchorRef: RefObject<ViewInstance | null>; onClose: () => void; onHidden?: () => void;
  label: string; children: ReactNode; width?: number; placement?: Placement; testID: string;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const host = useRef<ViewInstance>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const measureAnchor = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, anchorWidth, height) => {
      host.current?.measureInWindow((originX, originY) => {
        setAnchor({ x: x - originX, y: y - originY, width: anchorWidth, height });
      });
    });
  }, [anchorRef]);
  useLayoutEffect(() => {
    if (visible) measureAnchor();
    // Remeasure after rotation or a system text-size change as well as native onShow.
  }, [visible, window.width, window.height, window.fontScale, measureAnchor]);
  const margin = tokens.spacing.two;
  const leftEdge = insets.left + margin, rightEdge = window.width - insets.right - margin;
  const topEdge = insets.top + margin, bottomEdge = window.height - insets.bottom - margin;
  const popoverWidth = Math.max(0, Math.min(width ?? anchor?.width ?? 0, rightEdge - leftEdge));
  // A scrolled or partially visible trigger must not pull the overlay outside the viewport.
  const anchorTop = Math.max(topEdge + margin, Math.min(anchor?.y ?? 0, bottomEdge - margin));
  const anchorBottom = Math.max(topEdge + margin, Math.min((anchor?.y ?? 0) + (anchor?.height ?? 0), bottomEdge - margin));
  const below = Math.max(0, bottomEdge - anchorBottom - margin);
  const above = Math.max(0, anchorTop - margin - topEdge);
  const opensBelow = placement === 'below' || (below >= Math.min(240, (bottomEdge - topEdge) / 2) || below >= above);
  return <MotionModal visible={visible} backdropColor="transparent" onShow={measureAnchor} onRequestClose={onClose}
    onHidden={() => { setAnchor(null); onHidden?.(); }}>
    <MeasureOnPresentation measure={measureAnchor} />
    <View ref={host} collapsable={false} style={{ flex: 1 }} onLayout={measureAnchor}>
      <MotionPressable testID={`${testID}-backdrop`} accessibilityRole="button" accessibilityLabel={`Close ${label}`}
        onPress={onClose} style={StyleSheet.absoluteFill} />
      {anchor && <View testID={testID} accessibilityViewIsModal accessibilityLabel={label} onAccessibilityEscape={onClose}
        style={{ position: 'absolute', left: Math.max(leftEdge, Math.min(anchor.x + anchor.width - popoverWidth, rightEdge - popoverWidth)),
          width: popoverWidth, maxHeight: opensBelow ? below : above,
          ...(opensBelow ? { top: anchorBottom + margin } : { bottom: window.height - anchorTop + margin }),
          borderWidth: 1, borderColor: tokens.color.borderOutline, borderRadius: tokens.radius.control,
          backgroundColor: tokens.color.surfaceCard, overflow: 'hidden' }}>
        <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ flexGrow: 0, flexShrink: 1, minHeight: 0 }} contentContainerStyle={{ padding: tokens.spacing.one }}>
          {children}
        </ScrollView>
      </View>}
    </View>
  </MotionModal>;
}

function MeasureOnPresentation({ measure }: { measure: () => void }) {
  const presented = usePresentationVisible();
  // Native modal entrances transform their host. Measure again at rest so those
  // transforms cannot leave the popover offset from its trigger on iOS/Android.
  useLayoutEffect(() => { if (presented) measure(); }, [presented, measure]);
  return null;
}

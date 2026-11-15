import { cssInterop } from 'nativewind';
import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Text, type TextProps } from 'react-native';

/** `status` is an ARIA role, not an Android accessibilityRole. */
export function StatusText({ children, ...props }: Omit<TextProps, 'accessibilityRole' | 'role'> & { children: string }) {
  useEffect(() => {
    // Android/web use the live region below; VoiceOver needs an announcement.
    if (Platform.OS === 'ios' && children) AccessibilityInfo.announceForAccessibilityWithOptions(children, { queue: true });
  }, [children]);
  return <Text {...props} accessibilityLiveRegion="polite">{children}</Text>;
}
cssInterop(StatusText, { className: 'style' });

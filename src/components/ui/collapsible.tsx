import { ButtonSurface } from '@/components/ui/button';
import { PropsWithChildren, useState } from 'react';
import { StyleSheet } from 'react-native';
import { MotionRegion } from '@/components/ui/motion-content';
import { PosIcon } from '@/components/pos/pos-icon';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  return (
    <ThemedView>
      <ButtonSurface variant="text" accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: isOpen }}
        style={[styles.heading, { minHeight: 48 }]}
        onPress={() => setIsOpen((value) => !value)}>
        <ThemedView type="backgroundElement" style={styles.button}>
          <PosIcon name={isOpen ? 'chevronUp' : 'chevronDown'} size={14} color={theme.text} />
        </ThemedView>

        <ThemedText type="small">{title}</ThemedText>
      </ButtonSurface>
      {isOpen && (
        <MotionRegion>
          <ThemedView type="backgroundElement" style={styles.content}>
            {children}
          </ThemedView>
        </MotionRegion>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressedHeading: {
    opacity: 0.7,
  },
  button: {
    width: Spacing.four,
    height: Spacing.four,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: Spacing.three,
    borderRadius: Spacing.three,
    marginLeft: Spacing.four,
    padding: Spacing.four,
  },
});

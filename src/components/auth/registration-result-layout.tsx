import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AuthBackground } from '@/components/auth/auth-background';
import { RegistrationProgress } from '@/components/auth/registration-progress';
import tokens from '@/constants/design-tokens.json';

/** AuthBackground applies all safe-area insets before this viewport is laid out. */
export function RegistrationResultLayout({ step, notice, children, footer }: {
  step: 1 | 2;
  notice?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return <AuthBackground>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.page}>
        <RegistrationProgress step={step} />
        {notice}
        <View style={styles.content}>{children}</View>
        <View style={styles.footer}>{footer}</View>
      </View>
    </ScrollView>
  </AuthBackground>;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: {
    width: '100%', maxWidth: 460, alignSelf: 'center', flexGrow: 1,
    paddingHorizontal: 20, paddingBottom: tokens.spacing.four,
  },
  // Surplus height surrounds the content. Intrinsic height wins on short screens
  // and with larger text, so the footer stays in flow and scrolls into reach.
  content: { flexGrow: 1, flexShrink: 0, justifyContent: 'center', paddingVertical: tokens.spacing.four },
  footer: { paddingTop: tokens.spacing.three },
});

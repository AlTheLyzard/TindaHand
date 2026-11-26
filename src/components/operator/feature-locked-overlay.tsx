/**
 * FeatureLockedOverlay
 *
 * A modal dialog shown when May-Ari has disabled a feature for Kahera.
 * Shows the reason plus shortcuts to whatever features are still available.
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { DeviceSession } from '@/types/auth';
import { hasCapability } from '@/utils/operator-access';
import tokens from '@/constants/design-tokens.json';

type FeatureLockedOverlayProps = {
  featureName: string;
  deviceSession: DeviceSession;
};

type Shortcut = { label: string; icon: string; onPress: () => void };

function buildShortcuts(session: DeviceSession): Shortcut[] {
  const shortcuts: Shortcut[] = [];
  if (hasCapability(session, 'inventory-edit') || hasCapability(session, 'restock'))
    shortcuts.push({ label: 'Inventory', icon: '📦', onPress: () => router.navigate('/operator-inventory' as never) });
  if (hasCapability(session, 'pos'))
    shortcuts.push({ label: 'POS', icon: '🛒', onPress: () => router.navigate('/operator-pos' as never) });
  if (hasCapability(session, 'receivables'))
    shortcuts.push({ label: 'Customer Debts', icon: '📋', onPress: () => router.navigate('/operator-receivables' as never) });
  if (hasCapability(session, 'transactions'))
    shortcuts.push({ label: 'Transactions', icon: '🧾', onPress: () => router.navigate({ pathname: '/operator-more', params: { section: 'transactions' } } as never) });
  shortcuts.push({ label: 'Profile', icon: '👤', onPress: () => router.navigate('/operator-profile' as never) });
  shortcuts.push({ label: 'Settings', icon: '⚙️', onPress: () => router.navigate({ pathname: '/operator-more', params: { section: 'settings' } } as never) });
  return shortcuts;
}

export function FeatureLockedOverlay({ featureName, deviceSession }: FeatureLockedOverlayProps) {
  const shortcuts = buildShortcuts(deviceSession);

  return (
    <Modal transparent animationType="fade" statusBarTranslucent navigationBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🔒</Text>
          </View>

          <Text style={styles.heading} accessibilityRole="header">
            Feature Disabled
          </Text>

          <Text style={styles.body}>
            Your May-Ari has turned off access to{'\n'}
            <Text style={styles.featureName}>{featureName}</Text>{' '}
            for your account.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.goToLabel}>Go to</Text>

          <View style={styles.shortcuts}>
            {shortcuts.map(s => (
              <Pressable
                key={s.label}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                onPress={s.onPress}
                accessibilityRole="button"
                accessibilityLabel={`Go to ${s.label}`}
              >
                <Text style={styles.chipIcon}>{s.icon}</Text>
                <Text style={styles.chipLabel}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 30, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: tokens.color.surfaceCard,
    borderRadius: tokens.radius.card,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.color.errorTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  icon: { fontSize: 30 },
  heading: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: tokens.color.darkNavy,
    textAlign: 'center',
    lineHeight: 26,
  },
  body: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: tokens.color.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featureName: {
    fontFamily: 'Poppins_600SemiBold',
    color: tokens.color.darkNavy,
  },
  divider: {
    height: 1,
    width: '80%',
    backgroundColor: tokens.color.borderOutline,
    marginVertical: 2,
  },
  goToLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: tokens.color.textPlaceholder,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    width: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: tokens.color.appBackground,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: tokens.color.borderOutline,
  },
  chipPressed: {
    backgroundColor: tokens.color.borderOutline,
  },
  chipIcon: { fontSize: 14 },
  chipLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: tokens.color.darkNavy,
  },
});

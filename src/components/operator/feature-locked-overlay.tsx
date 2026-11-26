/**
 * FeatureLockedOverlay
 *
 * A paywall-style dark overlay shown on Kahera's screen when May-Ari has
 * disabled access to a feature (POS, Inventory, etc.). The screen content
 * renders underneath (non-interactive) so it's clear what feature is locked.
 */
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import tokens from '@/constants/design-tokens.json';

const SCREEN = Dimensions.get('screen');

type FeatureLockedOverlayProps = {
  featureName: string;
};

export function FeatureLockedOverlay({ featureName }: FeatureLockedOverlayProps) {
  return (
    <View style={styles.overlay} pointerEvents="box-only" accessibilityViewIsModal>
      <View style={styles.card}>
        {/* Lock icon */}
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

        <Text style={styles.hint}>
          Contact your May-Ari to request access.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN.width,
    height: SCREEN.height,
    backgroundColor: 'rgba(10, 14, 30, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 100,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: tokens.color.surfaceCard,
    borderRadius: tokens.radius.card,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tokens.color.errorTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  icon: {
    fontSize: 34,
  },
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
    marginVertical: 4,
  },
  hint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: tokens.color.textPlaceholder,
    textAlign: 'center',
    lineHeight: 18,
  },
});

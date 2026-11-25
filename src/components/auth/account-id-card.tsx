import { ProfileAvatar } from '@/components/profile/profile-avatar';
import tokens from '@/constants/design-tokens.json';
import type { AvatarId } from '@/types/profile';
import { Text, View } from 'react-native';

type AccountIdCardProps = {
  nameLabel: string;
  name: string;
  idLabel: string;
  id: string;
  footerText: string;
  avatarId?: AvatarId | null;
};

/** Shared visual ID card used after May-Ari registration and Kahera setup. */
export function AccountIdCard({ nameLabel, name, idLabel, id, footerText, avatarId }: AccountIdCardProps) {
  return (
    <View
      accessible
      accessibilityLabel={`Unique ID. Store Owner. ${nameLabel}: ${name}. ${idLabel}: ${id}. ${footerText}`}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.brand}>TindaHand</Text>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle}>Unique ID</Text>
          <Text style={styles.headerSubtitle}>Store Owner</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.identityRow}>
          <View accessible={false} style={styles.avatarFrame}>
            <ProfileAvatar avatarId={avatarId} size={72} />
          </View>
          <View style={styles.details}>
            <Text style={styles.label}>{nameLabel}</Text>
            <Text style={styles.value}>{name}</Text>
            <View style={styles.divider} />
            <Text style={styles.label}>{idLabel}</Text>
            <Text style={styles.value}>{id}</Text>
          </View>
        </View>
        <Text style={styles.footerText}>{footerText}</Text>
      </View>

      <View accessible={false} style={styles.bottomBand} />
    </View>
  );
}

const styles = {
  card: {
    width: '100%' as const,
    overflow: 'hidden' as const,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.color.borderOutline,
    backgroundColor: tokens.color.darkNavy,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
    paddingHorizontal: 17,
    paddingVertical: 8,
  },
  brand: {
    flex: 1,
    minWidth: 0,
    color: tokens.color.textInverse,
    fontFamily: 'MomoTrustDisplay_400Regular',
    fontSize: 20,
    lineHeight: 26,
  },
  headerMeta: { alignItems: 'flex-end' as const },
  headerTitle: {
    color: tokens.color.textInverse,
    fontFamily: tokens.typography.weights.semibold,
    fontSize: 12,
    lineHeight: 15,
  },
  headerSubtitle: {
    color: tokens.color.textInverse,
    fontFamily: tokens.typography.weights.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: tokens.color.black,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: tokens.color.black,
    backgroundColor: tokens.color.surfaceCard,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 11,
  },
  identityRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  avatarFrame: {
    width: 78,
    height: 94,
    flexShrink: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 16,
    backgroundColor: tokens.color.softBlue,
  },
  details: { flex: 1, minWidth: 0 },
  label: {
    color: tokens.color.textPrimary,
    fontFamily: tokens.typography.weights.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  value: {
    color: tokens.color.brightBlue,
    fontFamily: tokens.typography.weights.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginVertical: 7,
    backgroundColor: tokens.color.textPlaceholder,
  },
  footerText: {
    marginTop: 11,
    color: tokens.color.textPrimary,
    fontFamily: tokens.typography.weights.regular,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center' as const,
  },
  bottomBand: { height: 24, backgroundColor: tokens.color.darkNavy },
};

import { View } from 'react-native';
import { IconButton } from '@/components/ui/button';

export function PosBackButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <IconButton accessibilityLabel={label} onPress={onPress} style={{ alignSelf: 'flex-start' }}
    icon={({ color }) => <View accessible={false} style={{ width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: color, transform: [{ rotate: '45deg' }] }} />} />;
}

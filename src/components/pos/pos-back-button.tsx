import { BackButton } from '@/components/ui/back-button';

export function PosBackButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <BackButton accessibilityLabel={label} onPress={onPress} />;
}

import tokens from '@/constants/design-tokens.json';
import { Button } from '@/components/ui/button';
import { MotionModal } from '@/components/ui/motion-modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

export function OperatorPinHelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { fontScale } = useWindowDimensions();
  return <MotionModal visible={visible} onRequestClose={onClose} backdropColor={tokens.overlay.navyLight}>
    <SafeAreaView className="flex-1 justify-center">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
        <View accessibilityViewIsModal onAccessibilityEscape={onClose} className="w-full max-w-[340px] self-center rounded-control bg-white p-5">
          <Text accessibilityRole="header" className="mb-3 type-h3-heading text-brand" style={{ lineHeight: 26 * fontScale }}>Reset your Kahera PIN</Text>
          <Text className="mb-5 type-micro-financial-rate text-brand" style={{ lineHeight: 22 * fontScale }}>
            Contact your May-Ari for help. The May-Ari manages Kahera accounts and can reset your assigned PIN.
          </Text>
          <Button onPress={onClose}>Got it</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  </MotionModal>;
}

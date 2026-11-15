import { Button } from '@/components/ui/button';
import { MotionModal } from '@/components/ui/motion-modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

export function OperatorPinHelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { fontScale } = useWindowDimensions();
  return <MotionModal visible={visible} onRequestClose={onClose} backdropColor="rgba(16,35,48,0.36)">
    <SafeAreaView className="flex-1 justify-center">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
        <View accessibilityViewIsModal onAccessibilityEscape={onClose} className="w-full max-w-[340px] self-center rounded-control bg-white p-5" style={{ boxShadow: '0 3px 6px #00000040' }}>
          <Text accessibilityRole="header" className="mb-3 font-poppins-bold text-[18px] text-brand" style={{ lineHeight: 26 * fontScale }}>Reset your Operator PIN</Text>
          <Text className="mb-5 font-poppins text-[14px] text-brand" style={{ lineHeight: 22 * fontScale }}>
            Contact your Store Owner for help. The Owner manages Operator accounts and can reset your assigned PIN.
          </Text>
          <Button onPress={onClose}>Got it</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  </MotionModal>;
}

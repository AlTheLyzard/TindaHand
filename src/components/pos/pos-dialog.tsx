import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n/use-translation';
import { posStyles } from '@/components/pos/pos-styles';
import { PosIcon } from '@/components/pos/pos-icon';

export function PosDialog({ visible, title, message, confirmLabel, onClose, onConfirm, destructive = false }: {
  visible: boolean; title: string; message: string; confirmLabel: string;
  onClose: () => void; onConfirm: () => void; destructive?: boolean;
}) {
  const { t } = useTranslation();
  return <Modal backdropColor="rgba(0,0,0,0.60)" visible={visible} onRequestClose={onClose}>
    <SafeAreaView className="flex-1 justify-center">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
        <View accessibilityViewIsModal className="w-full max-w-[412px] self-center rounded-control bg-white p-4" style={{ boxShadow: '0 3px 6px #00000040' }}>
          <View className="mb-3 flex-row items-center gap-2 border-b border-[#ADC9EE] pb-3 pr-10 pt-1">
            {destructive && <View accessible={false} style={{ width: 24, height: 24, flexShrink: 0 }}><PosIcon name="alert" size={24} color="#B4232C" /></View>}
            <Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[16px]" style={{ color: destructive ? '#B4232C' : '#112F6F' }}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} className="absolute -right-2 -top-2 min-h-12 min-w-12 items-center justify-center"><Text className="text-[20px] text-[#102342]">×</Text></Pressable>
          </View>
          <Text className="mb-4 font-poppins text-[14px] leading-[22px] text-[#102342]">{message}</Text>
          <View className="flex-row flex-wrap justify-end gap-2">
            <Pressable accessibilityRole="button" onPress={onClose} className="min-w-24 items-center justify-center bg-white px-3 py-2" style={[posStyles.action, { borderColor: destructive ? '#CC333B' : '#7399CC' }]}><Text className="text-center font-poppins-bold text-[13px]" style={{ color: destructive ? '#B4232C' : '#245399' }}>{t('common.cancel')}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={onConfirm} className="min-w-24 items-center justify-center px-3 py-2" style={[posStyles.action, { borderColor: destructive ? '#CC333B' : '#7399CC', backgroundColor: destructive ? '#CC333B' : '#245399' }]}><Text className="text-center font-poppins-bold text-[13px] text-white">{confirmLabel}</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

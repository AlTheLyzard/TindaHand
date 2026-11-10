import { Button, IconButton } from '@/components/ui/button';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { useTranslation } from '@/i18n/use-translation';
import { PosIcon } from '@/components/pos/pos-icon';

export function PosDialog({ visible, title, message, children, confirmLabel, cancelLabel, onClose, onConfirm, destructive = false }: {
  visible: boolean; title: string; message?: string; children?: ReactNode; confirmLabel: string;
  onClose: () => void; onConfirm: () => void; destructive?: boolean; cancelLabel?: string;
}) {
  const { t } = useTranslation();
  return <Modal backdropColor="rgba(16,35,48,0.36)" visible={visible} onRequestClose={onClose}>
    <SafeAreaView className="flex-1 justify-center">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
        <View accessibilityViewIsModal className="w-full max-w-[340px] self-center rounded-control bg-white p-4" style={{ boxShadow: '0 3px 6px #00000040' }}>
          <View className="mb-3 flex-row items-center gap-2 border-b border-[#4A607A] pb-3 pr-6 pt-1">
            <View accessible={false} style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 14, backgroundColor: destructive ? '#E9A7A7' : '#ADC9EE', alignItems: 'center', justifyContent: 'center' }}>{destructive ? <PosIcon name="alert" size={26} color="#B4232C" /> : <Text className="h-6 w-6 rounded-full border-2 border-brand text-center font-poppins-bold text-[14px] leading-[21px] text-brand">i</Text>}</View>
            <Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[16px]" style={{ color: destructive ? '#B4232C' : '#112F6F' }}>{title}</Text>
            <IconButton accessibilityLabel={t('common.close')} onPress={onClose} className="absolute -right-2 -top-2" icon={() => <PosIcon name="close" size={18} color="#102342" />} />
          </View>
          {message && <Text className="mb-4 font-poppins text-[14px] leading-[22px] text-[#102342]">{message}</Text>}
          {children && <View className="mb-4">{children}</View>}
          <View className="gap-2">
            <Button variant={destructive ? 'destructive' : 'primary'} onPress={onConfirm}>{confirmLabel}</Button>
            <Button variant={destructive ? 'destructiveOutline' : 'secondary'} onPress={onClose}>{cancelLabel ?? t('common.cancel')}</Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

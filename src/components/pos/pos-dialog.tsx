import tokens from '@/constants/design-tokens.json';
import { ConfirmationActions } from '@/components/ui/confirmation-actions';
import { IconButton } from '@/components/ui/button';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { AccessibilityInfo, Platform, ScrollView, Text, View, type ViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, type ReactNode } from 'react';

import { useTranslation } from '@/i18n/use-translation';
import { PosIcon } from '@/components/pos/pos-icon';

export function PosDialog({ visible, title, message, children, confirmLabel, cancelLabel, onClose, onConfirm, onHidden, destructive = false, actionLayout = 'stack', busy = false, confirmDisabled = false }: {
  visible: boolean; title: string; message?: string; children?: ReactNode; confirmLabel: string;
  onClose: () => void; onConfirm: () => void; destructive?: boolean; cancelLabel?: string;
  onHidden?: () => void; actionLayout?: 'stack' | 'row'; busy?: boolean; confirmDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const close = useRef<ViewInstance>(null);
  return <Modal backdropColor={tokens.overlay.navyLight} visible={visible} onRequestClose={onClose} onHidden={onHidden} onShow={() => {
    if (!close.current) return;
    if (Platform.OS === 'web') close.current.focus();
    else AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus');
  }}>
    <SafeAreaView className="flex-1 justify-center">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
        <View accessibilityViewIsModal onAccessibilityEscape={onClose} className="w-full max-w-[340px] self-center rounded-control bg-white p-4">
          <View className="mb-3 flex-row items-center gap-2 border-b border-text-secondary pb-3 pr-6 pt-1">
            <View accessible={false} style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 14, backgroundColor: destructive ? tokens.color.errorSoft : tokens.color.navigationBorder, alignItems: 'center', justifyContent: 'center' }}>{destructive ? <PosIcon name="alert" size={26} color={tokens.color.errorBase} /> : <PosIcon name="info" size={26} color={tokens.color.darkNavy} />}</View>
            <Text accessibilityRole="header" className="flex-1 type-list-financial" style={{ color: destructive ? tokens.color.errorBase : tokens.color.darkNavy }}>{title}</Text>
            <IconButton ref={close} disabled={busy} accessibilityLabel={t('common.close')} onPress={onClose} className="absolute -right-2 -top-2" icon={() => <PosIcon name="close" size={18} color={tokens.color.textPrimary} />} />
          </View>
          {message && <Text className="mb-4 type-micro-financial-rate leading-[22px] text-text-primary">{message}</Text>}
          {children && <View className="mb-4">{children}</View>}
          <ConfirmationActions stacked={actionLayout !== 'row'} destructive={destructive} busy={busy} confirmDisabled={confirmDisabled}
            confirmLabel={confirmLabel} cancelLabel={cancelLabel ?? t('common.cancel')} onCancel={onClose} onConfirm={onConfirm} />
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

import type { ReactNode } from 'react';
import { Keyboard, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionModal } from '@/components/ui/motion-modal';
import { ResizableSheet } from '@/components/ui/resizable-sheet';
import { quickAddColors } from '@/components/dashboard/quick-add-ui';
import { motion } from '@/constants/motion';

/** Shared customer and creditor picker presentation used by debt forms. */
export function PartySelectionSheet({ visible, title, subtitle, children, onClose, onHidden, disabled = false, testID }: {
  visible: boolean;
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
  onHidden?: () => void;
  disabled?: boolean;
  testID: string;
}) {
  function close() {
    Keyboard.dismiss();
    onClose();
  }

  return <MotionModal visible={visible} sheet transitionDuration={motion.quickAddSheet} backdropColor={quickAddColors.backdrop}
    onRequestClose={close} onHidden={onHidden}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: 'transparent' }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ResizableSheet title={title} subtitle={subtitle} onClose={close} disabled={disabled} testID={testID}>
            {children}
          </ResizableSheet>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  </MotionModal>;
}

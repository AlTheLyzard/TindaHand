import { ButtonSurface, IconButton } from '@/components/ui/button';
import type { ViewInstance } from 'react-native';
import { MotionOverlay } from '@/components/ui/motion-overlay';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Modal, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { MenuRow } from '@/components/menu/menu-row';
import { MenuIcon } from '@/components/menu/menu-icon';
import { OwnerProfileAvatar as ProfileAvatar } from '@/components/profile/profile-ui';
import { useProfileSnapshot } from '@/hooks/use-owner-profile';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { ownerMenuTools } from '@/data/menu';
import { useMenuDescriptions } from '@/hooks/use-menu-descriptions';
import { useMenuDrawerTransition } from '@/hooks/use-menu-drawer-transition';
import { useAuthFlow } from '@/state/auth-flow';
import tokens from '@/constants/design-tokens.json';
import type { OwnerIdentity } from '@/types/auth';
import type { OwnerToolId } from '@/types/menu';

const descriptionLengths = ownerMenuTools.map(tool => 'subtitle' in tool ? Array.from(tool.subtitle).length : 0);

/** Transparent overlay: the originating screen and its local state stay mounted. */
export function OwnerMenuDrawer({ owner, visible, onClose, onPresentationChange, onNavigate }: {
  owner: OwnerIdentity; visible: boolean; onClose: () => void;
  onPresentationChange?: (presented: boolean) => void;
  onNavigate?: (action: () => void) => void;
}) {
  const { clear } = useAuthFlow();
  const profiles = useProfileSnapshot();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const closeButton = useRef<ViewInstance>(null);
  const panel = useRef<ViewInstance>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const selecting = useRef(false);
  const desired = useRef(visible);
  const finishDismissal = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    selecting.current = false;
    action?.();
  }, []);
  const motion = useMenuDrawerTransition(visible, finishDismissal);
  useLayoutEffect(() => { onPresentationChange?.(motion.presented); }, [motion.presented, onPresentationChange]);
  const { progress } = motion;
  const descriptions = useMenuDescriptions(visible, motion.opened, motion.reduced, descriptionLengths);
  const drawerWidth = Math.min(width * 0.8, 360);
  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (progress.value - 1) * drawerWidth }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  useEffect(() => {
    desired.current = visible;
    if (visible) { pendingAction.current = null; selecting.current = false; }
  }, [visible]);
  useEffect(() => () => { pendingAction.current = null; }, []);
  useEffect(() => {
    if (Platform.OS === 'web' && panel.current) (panel.current as unknown as { inert: boolean }).inert = confirmLogout;
  }, [confirmLogout]);
  function close() {
    desired.current = false;
    setConfirmLogout(false);
    onClose();
  }
  function navigate(action: () => void) {
    if (!desired.current || selecting.current) return;
    selecting.current = true;
    pendingAction.current = () => { if (onNavigate) onNavigate(action); else action(); };
    close();
  }
  const open = (tool: OwnerToolId) => navigate(() => tool === 'store-expenses'
    ? router.navigate('/owner-menu/store-expenses')
    : tool === 'transaction-history' ? router.navigate('/owner-menu/transaction-history')
    : tool === 'settings' ? router.navigate('/owner-menu/settings')
    : router.navigate({ pathname: '/owner-menu/[tool]', params: { tool } }));
  return <Modal visible={motion.presented} transparent animationType="none" presentationStyle="overFullScreen"
    statusBarTranslucent navigationBarTranslucent onDismiss={motion.onDismiss}
    onRequestClose={() => confirmLogout ? setConfirmLogout(false) : close()}
    onShow={() => {
      motion.onShow();
      if (!closeButton.current) return;
      if (Platform.OS === 'web') closeButton.current.focus();
      else AccessibilityInfo.sendAccessibilityEvent(closeButton.current, 'focus');
    }}>
    <View className="flex-1" accessibilityViewIsModal onAccessibilityEscape={() => confirmLogout ? setConfirmLogout(false) : close()}>
      <Animated.View testID="more-tools-backdrop" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,35,66,0.50)' }, backdropStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close More Tools backdrop" onPress={close} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[{ flex: 1, width: drawerWidth }, drawerStyle]}>
      <SafeAreaView ref={panel} testID="more-tools-drawer" edges={['top', 'left']} className="flex-1 bg-white"
        pointerEvents={confirmLogout || !visible ? 'none' : 'auto'} accessibilityElementsHidden={confirmLogout}
        importantForAccessibility={confirmLogout ? 'no-hide-descendants' : 'auto'} aria-hidden={confirmLogout}
        >
        <ScrollView contentContainerStyle={{ paddingTop: 40, paddingHorizontal: 20,
          paddingBottom: insets.bottom + tokens.spacing.four }}>
          <View className="mb-6 flex-row items-center gap-3">
            <Text accessibilityRole="header" className="min-w-0 flex-1 font-poppins-bold text-[24px] leading-9 text-brand">More Tools</Text>
            <IconButton ref={closeButton} accessibilityLabel="Close More Tools" onPress={close} className="min-h-12 min-w-12 items-center justify-center" icon={() => <MenuIcon name="close" />} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Profile: ${owner.name}, ${owner.id}, May-Ari (Owner)`}
            accessibilityHint="Opens Profile" onPress={() => open('profile')}
            className="mb-6 flex-row items-start gap-3 rounded-card bg-[#F0F8FF] p-4">
            <ProfileAvatar size={40} avatarId={profiles.get(owner.id)?.avatarId} />
            <View className="min-w-0 flex-1 gap-2">
              <Text className="font-poppins-bold text-[18px] leading-[27px] text-brand">{owner.name}</Text>
              <View className="flex-row items-center justify-between gap-2">
                <Text className="min-w-0 flex-1 font-poppins text-[12px] leading-[18px] text-text-secondary">{owner.id}</Text>
                <View className="shrink-0 rounded-control bg-brand px-2 py-1"><Text className="font-poppins-bold text-[12px] leading-[18px] text-white">Owner</Text></View>
              </View>
            </View>
          </Pressable>
          <View>
            {ownerMenuTools.map((tool, index) => <View key={tool.id}>
              {tool.id === 'settings' && <View className="mb-1 mt-1 border-t border-[#ADC9EE]" />}
              <MenuRow tool={tool} selected={pathname === `/owner-menu/${tool.id}` || pathname.startsWith(`/owner-menu/${tool.id}/`)} onPress={() => open(tool.id)} optionIndex={index} frame={descriptions.frame} characters={descriptions.characters[index] ?? 0}
                preparing={visible && !motion.opened && !motion.reduced} />
            </View>)}
            <ButtonSurface variant="destructiveText" accessibilityRole="button" accessibilityLabel="Log Out" accessibilityHint="Asks for confirmation before ending your session"
              onPress={() => setConfirmLogout(true)} className="min-h-[72px] flex-row items-center gap-3 rounded-surface px-3 py-3">
              {({ color }) => <><MenuIcon name="logout" /><Text className="min-w-0 flex-1 font-poppins text-[16px] leading-6" style={{ color }}>Log Out</Text></>}
            </ButtonSurface>
          </View>
        </ScrollView>
      </SafeAreaView>
      </Animated.View>
      <MotionOverlay visible={confirmLogout}>{confirmLogout && <ScrollView style={StyleSheet.absoluteFill} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
        <ConfirmationContent title="Log Out" message="Are you sure you want to log out of TindaHand?" cancelLabel="Cancel" confirmLabel="Log out"
          onCancel={() => setConfirmLogout(false)} onConfirm={() => {
            navigate(() => {
              clear();
              router.replace({ pathname: '/login', params: { role: 'owner', loggedOut: '1' } });
            });
          }} />
      </ScrollView>}</MotionOverlay>
    </View>
  </Modal>;
}

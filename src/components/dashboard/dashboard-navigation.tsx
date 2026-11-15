import { router, useFocusEffect } from 'expo-router';
import { useCallback, useId, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNavigation, type NavigationIcon } from '@/components/dashboard/bottom-navigation';
import { OwnerMenuDrawer } from '@/components/menu/owner-menu-drawer';
import type { NavigationLabelKey } from '@/i18n';
import { useAuthFlow } from '@/state/auth-flow';
import { navigationItems, useNavigationMotion } from '@/state/navigation-motion';
import { hasCapability } from '@/utils/operator-access';

export function DashboardNavigation({ onHome, onPos, onUnavailable, onNavigate }: {
  onHome: () => void; onPos?: () => void; onUnavailable: (feature: NavigationLabelKey) => void;
  onNavigate?: (action: () => void) => void;
}) {
  const { owner, deviceSession } = useAuthFlow();
  const operator = deviceSession?.role === 'operator';
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPresented, setMenuPresented] = useState(false);
  const hostId = useId();
  const { pathname, role, selectedIndex, selection, centers, setMenuSelection } = useNavigationMotion();
  const releaseMenuSelection = useCallback(() => {
    setMenuSelection(current => current?.hostId === hostId ? null : current);
  }, [hostId, setMenuSelection]);
  // Retained screens release their drawer selection when leaving a tool.
  useFocusEffect(useCallback(() => () => {
    setMenuOpen(false);
    setMenuPresented(false);
    releaseMenuSelection();
  }, [releaseMenuSelection]));
  const onMenuPresentationChange = useCallback((presented: boolean) => {
    setMenuPresented(presented);
    if (!presented) releaseMenuSelection();
  }, [releaseMenuSelection]);

  function navigate(icon: NavigationIcon) {
    const index = navigationItems.findIndex(item => item.icon === icon);
    if (icon === 'menu') {
      if (owner) {
        Keyboard.dismiss();
        if (!menuOpen) setMenuSelection({ hostId, pathname });
        setMenuOpen(value => !value);
      } else if (operator) {
        if (selectedIndex === index) return;
        const action = () => { Keyboard.dismiss(); router.navigate('/operator-more'); };
        if (onNavigate) onNavigate(action); else action();
      } else onUnavailable(navigationItems[index].label);
      return;
    }
    if (icon !== 'home' && selectedIndex === index && !menuOpen && !menuPresented) return;
    setMenuOpen(false);
    const action = () => {
      if (icon === 'home') {
        if (pathname === '/owner-dashboard') onHome();
        else {
          Keyboard.dismiss();
          // Return to the retained Dashboard so its filters and scroll survive.
          router.dismissTo('/owner-dashboard');
        }
      }
      else if (icon === 'cart' && onPos) onPos();
      else if (icon === 'inventory' && operator) {
        const canOpenInventory = hasCapability(deviceSession, 'inventory-edit')
          || hasCapability(deviceSession, 'restock')
          || hasCapability(deviceSession, 'assets-read');
        if (canOpenInventory) router.navigate('/operator-inventory');
        else onUnavailable(navigationItems[index].label);
      }
      else if (icon === 'inventory') router.navigate('/owner-inventory');
      else onUnavailable(navigationItems[index].label);
    };
    if (onNavigate) onNavigate(action); else action();
  }
  return <>
    <View pointerEvents={menuOpen || menuPresented ? 'none' : 'box-none'}
      accessibilityElementsHidden={menuOpen || menuPresented}
      importantForAccessibility={menuOpen || menuPresented ? 'no-hide-descendants' : 'auto'}
      aria-hidden={menuOpen || menuPresented} style={styles.host}>
      <BottomNavigation role={role} bottomInset={insets.bottom} selectedIndex={selectedIndex} selection={selection} centers={centers}
        menuOpen={menuOpen} onPress={navigate} />
    </View>
    {owner && <OwnerMenuDrawer owner={owner} visible={menuOpen} onClose={() => setMenuOpen(false)}
      onPresentationChange={onMenuPresentationChange} onNavigate={onNavigate} />}
  </>;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

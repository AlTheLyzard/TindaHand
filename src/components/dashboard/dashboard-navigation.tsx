import { router, useFocusEffect } from 'expo-router';
import { useCallback, useId, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNavigation, type NavigationIcon } from '@/components/dashboard/bottom-navigation';
import { OwnerMenuDrawer } from '@/components/menu/owner-menu-drawer';
import type { NavigationLabelKey } from '@/i18n';
import { useAuthFlow } from '@/state/auth-flow';
import { navigationItems, useNavigationMotion } from '@/state/navigation-motion';

export function DashboardNavigation({ onHome, onPos, onUnavailable, onNavigate }: {
  onHome: () => void; onPos?: () => void; onUnavailable: (feature: NavigationLabelKey) => void;
  onNavigate?: (action: () => void) => void;
}) {
  const { owner } = useAuthFlow();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPresented, setMenuPresented] = useState(false);
  const hostId = useId();
  const { pathname, role, selectedIndex, selection, setMenuSelection } = useNavigationMotion();
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
      } else onUnavailable(navigationItems[index].label);
      return;
    }
    if (icon !== 'home' && selectedIndex === index && !menuOpen && !menuPresented) return;
    setMenuOpen(false);
    const action = () => {
      if (icon === 'home') onHome();
      else if (icon === 'cart' && onPos) onPos();
      else if (icon === 'inventory') router.navigate('/owner-inventory');
      else onUnavailable(navigationItems[index].label);
    };
    if (onNavigate) onNavigate(action); else action();
  }
  const renderBar = (inDrawer = false) => <View pointerEvents={inDrawer ? 'none' : menuOpen || menuPresented ? 'none' : 'box-none'}
    accessibilityElementsHidden={!inDrawer && (menuOpen || menuPresented)}
    importantForAccessibility={!inDrawer && (menuOpen || menuPresented) ? 'no-hide-descendants' : 'auto'}
    aria-hidden={!inDrawer && (menuOpen || menuPresented)}
    style={[styles.host, { opacity: !inDrawer && (menuOpen || menuPresented) ? 0 : 1 }]}>
    <BottomNavigation role={role} bottomInset={insets.bottom} selectedIndex={selectedIndex} selection={selection}
      menuOpen={menuOpen} decorative={inDrawer} onPress={navigate} />
  </View>;
  return <>
    {renderBar()}
    {owner && <OwnerMenuDrawer owner={owner} visible={menuOpen} onClose={() => setMenuOpen(false)}
      navigation={renderBar(true)} onPresentationChange={onMenuPresentationChange} onNavigate={onNavigate} />}
  </>;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

import { useCallback, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { BackHandler, Keyboard } from 'react-native';
import { ProfilePageLayout } from './profile-page-layout';

export const profileRoot = '/owner-menu/profile' as const;
export const operatorsRoot = '/owner-menu/profile/operators' as const;
export function ProfileFrame({ title, subtitle, children, onBack, footer, busy = false }: {
  title: string; subtitle?: string; children: ReactNode; onBack?: () => void;
  footer?: ReactNode; busy?: boolean;
}) {
  const back = useCallback(() => {
    Keyboard.dismiss();
    if (busy) return;
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/owner-dashboard');
  }, [onBack, busy]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  }, [back]));
  return <ProfilePageLayout
    title={title} subtitle={subtitle} onBack={back} busy={busy} footer={footer}>
    {children}
  </ProfilePageLayout>;
}

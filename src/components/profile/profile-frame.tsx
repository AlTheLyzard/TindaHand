import { useCallback, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { BackHandler, Keyboard } from 'react-native';
import { MainHeader } from '@/components/dashboard/main-header';
import { ProfilePageLayout } from './profile-page-layout';
import tokens from '@/constants/design-tokens.json';

export const profileRoot = '/owner-menu/profile' as const;
export const operatorsRoot = '/owner-menu/profile/operators' as const;
export function ProfileFrame({ title, subtitle, children, onBack, onNavigate, busy = false }: {
  title: string; subtitle?: string; children: ReactNode; onBack?: () => void;
  onNavigate?: (action: () => void) => void; busy?: boolean;
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
  function navigate(action: () => void) { if (!busy) { Keyboard.dismiss(); if (onNavigate) onNavigate(action); else action(); } }
  return <ProfilePageLayout
    header={<MainHeader activeAction="profile" interactionBackgroundColor={tokens.color.surfaceSubtle}
      onNavigate={navigate} onSettingsPress={() => router.navigate('/owner-menu/settings')}
      onProfilePress={() => router.dismissTo(profileRoot)} />}
    title={title} subtitle={subtitle} onBack={back} busy={busy}>
    {children}
  </ProfilePageLayout>;
}

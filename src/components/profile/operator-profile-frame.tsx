import { useCallback, type ReactNode } from 'react';
import { BackHandler, Keyboard } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { OperatorHeader } from '@/components/operator/operator-header';
import { ProfilePageLayout } from './profile-page-layout';

export function OperatorProfileFrame({ title, subtitle, children, onBack, footer, busy = false }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  footer?: ReactNode;
  busy?: boolean;
}) {
  const back = useCallback(() => {
    Keyboard.dismiss();
    if (busy) return;
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/operator-pos');
  }, [busy, onBack]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  }, [back]));

  return <ProfilePageLayout
    header={<OperatorHeader activeAction="profile" onNavigate={action => { if (!busy) { Keyboard.dismiss(); action(); } }} />}
    title={title} subtitle={subtitle} onBack={back} busy={busy} footer={footer}>
    {children}
  </ProfilePageLayout>;
}

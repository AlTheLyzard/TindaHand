import { Redirect, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { OperatorSettingsLandingScreen } from '@/components/settings/operator-settings-screens';
import { TransactionHistoryScreen } from '@/components/transactions/transaction-history-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

export default function OperatorMoreRoute() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className="font-poppins text-[14px] text-brand">Restoring your session…</Text></View>;
  if (!deviceSession || deviceSession.role !== 'operator') return <Redirect href="/choose-account" />;
  if (section === 'transactions') {
    if (!hasCapability(deviceSession, 'transactions')) return <Redirect href="/choose-account" />;
    return <TransactionHistoryScreen operator />;
  }
  if (section === 'settings') {
    if (!hasCapability(deviceSession, 'settings')) return <Redirect href="/choose-account" />;
    return <OperatorSettingsLandingScreen />;
  }
  return <Redirect href="/operator-pos" />;
}

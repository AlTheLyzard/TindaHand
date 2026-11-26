import { Redirect, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { OperatorSettingsLandingScreen } from '@/components/settings/operator-settings-screens';
import { TransactionHistoryScreen } from '@/components/transactions/transaction-history-screen';
import { FeatureLockedOverlay } from '@/components/operator/feature-locked-overlay';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

export default function OperatorMoreRoute() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!deviceSession || deviceSession.role !== 'operator') return <Redirect href="/choose-account" />;
  if (section === 'transactions') {
    const transactionsLocked = !hasCapability(deviceSession, 'transactions');
    return (
      <View style={{ flex: 1 }}>
        {/* Always render the screen so it's visible beneath the overlay */}
        <TransactionHistoryScreen operator />
        {/* Paywall overlay when May-Ari has disabled transaction history access */}
        {transactionsLocked && <FeatureLockedOverlay featureName="Transaction History" deviceSession={deviceSession} />}
      </View>
    );
  }
  if (section === 'settings') {
    return <OperatorSettingsLandingScreen />;
  }
  return <Redirect href="/operator-pos" />;
}

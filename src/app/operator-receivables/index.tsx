import { ReceivableOverviewScreen } from '@/components/receivables/receivable-overview-screen';
import { FeatureLockedOverlay } from '@/components/operator/feature-locked-overlay';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { View } from 'react-native';

export default function OperatorReceivablesRoute() {
  const { deviceSession } = useAuthFlow();
  const session = deviceSession?.role === 'operator' ? deviceSession : null;
  const receivablesLocked = !hasCapability(session, 'receivables');
  return (
    <View style={{ flex: 1 }}>
      {/* Always render the screen so it's visible beneath the overlay */}
      <ReceivableOverviewScreen />
      {/* Paywall overlay when May-Ari has disabled receivables access */}
      {receivablesLocked && <FeatureLockedOverlay featureName="Customer Debts" />}
    </View>
  );
}

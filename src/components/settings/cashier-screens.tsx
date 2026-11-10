import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { RegistrationToast } from '@/components/auth/registration-toast';
import { SuccessMark } from '@/components/auth/success-mark';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/content-state';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useAuthFlow } from '@/state/auth-flow';
import { useSettings } from '@/state/settings';
import { SettingsFrame, settingsRoot } from './settings-frame';
import { CashierIdentity, OwnerStoreCard, SettingsCard, SettingsDescription, SettingsNotice } from './settings-ui';
import { CredentialForm } from './credential-form';

export function CashierListScreen({ pinManagement = false }: { pinManagement?: boolean }) {
  const { owner } = useAuthFlow();
  const service = useSettings();
  const [selected, setSelected] = useState<string | null>(null);
  if (!owner) return null;
  const cashiers = service.cashiers(owner.id);
  return <SettingsFrame title={pinManagement ? 'Operator PIN Management' : 'User Management'} parent={pinManagement ? `${settingsRoot}/security` : settingsRoot}>
    <SettingsDescription>{pinManagement ? 'Select an Operator to reset their access PIN.' : "Manage the people who have access to your store's TindaHand account."}</SettingsDescription>
    {!pinManagement && <View className="mb-4 gap-3 rounded-control bg-[#D1E1F5] p-4">
      <Text className="font-poppins-bold text-[12px] leading-[18px] text-brand">Registered Operators</Text>
      <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{cashiers.length} {cashiers.length === 1 ? 'Operator' : 'Operators'}</Text>
      <Button onPress={() => router.navigate(`${settingsRoot}/add-cashier`)}>Add Operator</Button>
    </View>}
    {cashiers.length === 0 ? <EmptyState title="No Operators yet" description="Add an Operator to this store to manage their access PIN." icon="profile" action="Add Operator" onAction={() => router.navigate(`${settingsRoot}/add-cashier`)} />
      : <View className="gap-3">{cashiers.map(cashier => pinManagement ? <View key={cashier.id} className="rounded-control border border-[#B0C8E3] bg-white p-4">
        <Pressable accessibilityRole="button" accessibilityLabel={`Select ${cashier.name}, ${cashier.id}, Active`} accessibilityState={{ expanded: selected === cashier.id }} onPress={() => setSelected(cashier.id)} className="min-h-12 justify-center">
          <CashierIdentity cashier={cashier} />
        </Pressable>
        {selected === cashier.id && <View className="mt-4 border-t border-[#ADC9EE] pt-4"><Button onPress={() => router.navigate({ pathname: '/owner-menu/settings/reset-cashier-pin', params: { cashierId: cashier.id } })}>Reset Operator PIN</Button></View>}
      </View> : <SettingsCard key={cashier.id}><CashierIdentity cashier={cashier} /></SettingsCard>)}</View>}
  </SettingsFrame>;
}
export function ChangePinScreen({ cashier = false }: { cashier?: boolean }) {
  const { owner } = useAuthFlow();
  const service = useSettings();
  const { cashierId } = useLocalSearchParams<{ cashierId?: string }>();
  const selected = owner && cashier ? service.cashiers(owner.id).find(item => item.id === cashierId) : null;
  const [success, setSuccess] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const dismiss = useCallback(() => setExpiresAt(null), []);
  if (!owner) return null;
  return <SettingsFrame title={cashier ? 'Reset Operator PIN' : 'Change My PIN'} parent={cashier ? `${settingsRoot}/cashier-pins` : `${settingsRoot}/security`}>
    {cashier && !selected ? <EmptyState title="Operator unavailable" description="This Operator is not in the current store's list." icon="profile" action="Back to Operator PIN Management" onAction={() => router.dismissTo(`${settingsRoot}/cashier-pins`)} /> : <>
      {selected && <View className="mb-5"><SettingsCard><CashierIdentity cashier={selected} /></SettingsCard></View>}
      <SettingsDescription>{cashier ? 'Verify with your Owner PIN, then enter a new four-digit Operator PIN.' : 'Enter your current Owner PIN and choose a new four-digit PIN.'}</SettingsDescription>
      {expiresAt && <RegistrationToast expiresAt={expiresAt} onDismiss={dismiss} title="PIN updated" message={success} />}
      <CredentialForm key={cashier ? selected!.id : 'owner'} mode={cashier ? 'cashier' : 'owner'}
        onSave={values => cashier ? service.resetCashierPin(owner, selected!.id, values).then(result => result.ok ? { ok: true as const, value: undefined } : result) : service.changeOwnerPin(owner, values)}
        onSuccess={() => { setSuccess(selected ? `PIN reset for ${selected.name} (${selected.id}).` : 'Your Owner PIN has been changed.'); setExpiresAt(Date.now() + 15000); }} />
      <Text className="mt-2 font-poppins text-[11px] leading-4 text-text-secondary">Demo only. PIN changes are held in memory for this app session.</Text>
    </>}
  </SettingsFrame>;
}
export function AddCashierScreen() {
  const { owner } = useAuthFlow();
  const service = useSettings();
  if (!owner) return null;
  return <SettingsFrame title="Add Operator" parent={`${settingsRoot}/users`}>
    <OwnerStoreCard owner={owner} />
    <CredentialForm mode="create" onSave={values => service.createCashier(owner, values)}
      onSuccess={created => router.replace({ pathname: '/owner-menu/settings/cashier-created', params: { cashierId: created.id } })} />
    <Text className="mt-2 font-poppins text-[11px] leading-4 text-text-secondary">Demo only. Operator accounts are kept in memory and reset when the app reloads.</Text>
  </SettingsFrame>;
}
export function CashierCreatedScreen() {
  const { owner } = useAuthFlow();
  const service = useSettings();
  const { cashierId } = useLocalSearchParams<{ cashierId?: string }>();
  const cashier = owner ? service.cashiers(owner.id).find(item => item.id === cashierId) : null;
  const [expiresAt, setExpiresAt] = useState<number | null>(() => Date.now() + 15000);
  const dismiss = useCallback(() => setExpiresAt(null), []);
  if (!owner) return null;
  return <SettingsFrame title="User Management" parent={`${settingsRoot}/users`}>
    {!cashier ? <EmptyState title="Account details unavailable" description="The cashier may belong to another store, or this demo session has ended." action="Back to User Management" onAction={() => router.dismissTo(`${settingsRoot}/users`)} /> : <>
      <RegistrationToast expiresAt={expiresAt} onDismiss={dismiss} title="Account created" message={`${cashier.name} has been added to your demo store.`} />
      <View className="mb-6 mt-5 gap-4"><SuccessMark /><Text accessibilityRole="header" className="font-poppins-bold text-[30px] leading-[42px] text-brand">Operator Account Created Successfully!</Text></View>
      <SettingsCard>
        <CashierIdentity cashier={cashier} />
        <View className="my-4 border-t border-[#ADC9EE]" />
        <Text className="font-poppins text-[14px] leading-[21px] text-text-secondary">Associated Owner / Store ID</Text>
        <Text className="mt-2 font-poppins-bold text-[18px] leading-[27px] text-brand">{owner.id}</Text>
        <View className="my-4 border-t border-[#ADC9EE]" />
        <Text className="font-poppins text-[14px] leading-[22px] text-[#0C1B3C]">For Operator login, use this Store / Owner ID, and the assigned four-digit Operator PIN.</Text>
      </SettingsCard>
      <SettingsNotice>Demo account only. These details are not saved after the app reloads.</SettingsNotice>
      <View className="min-h-6 flex-1" /><View className="gap-4 pt-4">
        <Button onPress={() => router.dismissTo('/owner-dashboard')}>Go to Dashboard</Button>
      </View>
    </>}
  </SettingsFrame>;
}

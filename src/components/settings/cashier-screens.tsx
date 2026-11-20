import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { RegistrationToast } from '@/components/auth/registration-toast';
import { SuccessMark } from '@/components/auth/success-mark';
import { Button } from '@/components/ui/button';
import { useLeaveOnce } from '@/hooks/use-leave-once';
import { EmptyState } from '@/components/ui/content-state';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useAuthFlow } from '@/state/auth-flow';
import { useSettings } from '@/state/settings';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { changeOwnerPin } from '@/services/settings';
import { SettingsFrame, settingsRoot } from './settings-frame';
import { CashierIdentity, OwnerStoreCard, SettingsCard, SettingsDescription, SettingsNotice } from './settings-ui';
import { CredentialForm } from './credential-form';
import { authenticationService } from '@/services/authentication';
import { createKahera } from '@/services/kahera-api';
import { useKaheraList } from '@/hooks/use-kahera-list';
import type { AvatarId } from '@/types/profile';

export function CashierListScreen({ pinManagement = false }: { pinManagement?: boolean }) {
  const { owner } = useAuthFlow();
  const [selected, setSelected] = useState<string | null>(null);
  const { cashiers } = useKaheraList();
  if (!owner) return null;
  return <SettingsFrame title={pinManagement ? 'Kahera PIN Management' : 'User Management'} parent={pinManagement ? `${settingsRoot}/security` : settingsRoot}>
    <SettingsDescription>{pinManagement ? 'Select a Kahera to reset their access PIN.' : "Manage the people who have access to your store's TindaHand account."}</SettingsDescription>
    {!pinManagement && <View className="mb-4 gap-3 rounded-control bg-[#D1E1F5] p-4">
      <Text className="font-poppins-bold text-[12px] leading-[18px] text-brand">Registered Kahera</Text>
      <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{cashiers.length} {cashiers.length === 1 ? 'Kahera' : 'Kahera'}</Text>
      <Button onPress={() => router.navigate(`${settingsRoot}/add-cashier`)}>Add Kahera</Button>
    </View>}
    {cashiers.length === 0 ? <EmptyState title="No Kahera yet" description="Add a Kahera to this store to manage their access PIN." icon="profile" action="Add Kahera" onAction={() => router.navigate(`${settingsRoot}/add-cashier`)} />
      : <View className="gap-3">{cashiers.map(cashier => pinManagement ? <View key={cashier.id} className="rounded-control border border-[#B0C8E3] bg-white p-4">
        <Pressable accessibilityRole="button" accessibilityLabel={`Select ${cashier.name}, ${cashier.id}, ${cashier.status === 'active' ? 'Active' : 'Inactive'}`} accessibilityState={{ expanded: selected === cashier.id }} onPress={() => setSelected(cashier.id)} className="min-h-12 justify-center">
          <CashierIdentity cashier={cashier} />
        </Pressable>
        {selected === cashier.id && <View className="mt-4 border-t border-[#ADC9EE] pt-4"><Button onPress={() => router.navigate({ pathname: '/owner-menu/settings/reset-cashier-pin', params: { cashierId: cashier.id } })}>Reset Kahera PIN</Button></View>}
      </View> : <SettingsCard key={cashier.id}><CashierIdentity cashier={cashier} /></SettingsCard>)}</View>}
  </SettingsFrame>;
}
export function ChangePinScreen({ cashier = false }: { cashier?: boolean }) {
  const { owner } = useAuthFlow();
  const service = useSettings();
  const { cashiers } = useKaheraList();
  const { cashierId } = useLocalSearchParams<{ cashierId?: string }>();
  const selected = owner && cashier ? cashiers.find(item => item.id === cashierId) : null;
  const [success, setSuccess] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const dismiss = useCallback(() => setExpiresAt(null), []);
  if (!owner) return null;
  return <SettingsFrame title={cashier ? 'Reset Kahera PIN' : 'Change My PIN'} parent={cashier ? `${settingsRoot}/cashier-pins` : `${settingsRoot}/security`}>
    {cashier && !selected ? <EmptyState title="Kahera unavailable" description="This Kahera is not in the current store's list." icon="profile" action="Back to Kahera PIN Management" onAction={() => router.dismissTo(`${settingsRoot}/cashier-pins`)} /> : <>
      {selected && <View className="mb-5"><SettingsCard><CashierIdentity cashier={selected} /></SettingsCard></View>}
      <SettingsDescription>{cashier ? 'Verify with your May-Ari PIN, then enter a new four-digit Kahera PIN.' : 'Enter your current May-Ari PIN and choose a new four-digit PIN.'}</SettingsDescription>
      {expiresAt && <RegistrationToast expiresAt={expiresAt} onDismiss={dismiss} title="PIN updated" message={success} />}
      <CredentialForm key={cashier ? selected!.id : 'owner'} mode={cashier ? 'cashier' : 'owner'}
        onSave={values => cashier
          ? authenticationService.resetOperatorPin({ ...values, operatorId: selected!.id }).then(result => result.ok ? { ok: true as const, value: undefined } : result)
          : MOCK_AUTH_ENABLED
            ? service.changeOwnerPin(owner, values)
            : changeOwnerPin(values.ownerPin, values.pin)
                .then(() => ({ ok: true as const, value: undefined }))
                .catch(() => ({ ok: false as const, message: 'PIN change failed. Check your current PIN and try again.' }))}
        onSuccess={() => { setSuccess(selected ? `PIN reset for ${selected.name} (${selected.id}).` : 'Your May-Ari PIN has been changed.'); setExpiresAt(Date.now() + 15000); }} />
      {MOCK_AUTH_ENABLED && <Text className="mt-2 font-poppins text-[11px] leading-4 text-text-secondary">Demo only. PIN changes are held in memory for this app session.</Text>}
    </>}
  </SettingsFrame>;
}
export function AddCashierScreen() {
  const { owner } = useAuthFlow();
  if (!owner) return null;
  return <SettingsFrame title="Add Kahera" parent={`${settingsRoot}/users`}>
    <OwnerStoreCard owner={owner} />
    <CredentialForm mode="create" onSave={async values => {
      const result = await createKahera({ name: values.name, pin: values.pin });
      if (!result.ok) return result;
      // Map API response to the Cashier shape the rest of the app expects.
      const cashier = {
        id: result.value.id,
        ownerId: result.value.ownerId,
        name: result.value.name,
        status: result.value.status,
        avatarId: (result.value.avatarId ?? 'avatar-01') as AvatarId,
      };
      return { ok: true as const, value: cashier };
    }}
      onSuccess={created => router.replace({ pathname: '/owner-menu/settings/cashier-created', params: { cashierId: created.id } })} />
  </SettingsFrame>;
}
export function CashierCreatedScreen() {
  const leave = useLeaveOnce();
  const { owner } = useAuthFlow();
  const { cashiers } = useKaheraList();
  const { cashierId } = useLocalSearchParams<{ cashierId?: string }>();
  const cashier = owner ? cashiers.find(item => item.id === cashierId) : null;
  const [expiresAt, setExpiresAt] = useState<number | null>(() => Date.now() + 15000);
  const dismiss = useCallback(() => setExpiresAt(null), []);
  if (!owner) return null;
  return <SettingsFrame title="User Management" parent={`${settingsRoot}/users`}>
    {!cashier ? <EmptyState title="Account details unavailable" description="The Kahera may belong to another store, or this demo session has ended." action="Back to User Management" onAction={() => router.dismissTo(`${settingsRoot}/users`)} /> : <>
      <RegistrationToast expiresAt={expiresAt} onDismiss={dismiss} title="Account created" message={`${cashier.name} has been added to your store.`} />
      <View className="mb-6 mt-5 gap-4"><SuccessMark animate eventKey={cashier.id} /><Text accessibilityRole="header" className="font-poppins-bold text-[30px] leading-[42px] text-brand">Kahera Account Created Successfully!</Text></View>
      <SettingsCard>
        <CashierIdentity cashier={cashier} />
        <View className="my-4 border-t border-[#ADC9EE]" />
        <Text className="font-poppins text-[14px] leading-[21px] text-text-secondary">Associated May-Ari / Store ID</Text>
        <Text className="mt-2 font-poppins-bold text-[18px] leading-[27px] text-brand">{owner.id}</Text>
        <View className="my-4 border-t border-[#ADC9EE]" />
        <Text className="font-poppins text-[14px] leading-[22px] text-[#0C1B3C]">For Kahera login, use this Store / May-Ari ID, and the assigned four-digit Kahera PIN.</Text>
      </SettingsCard>
      {MOCK_AUTH_ENABLED && <SettingsNotice>Demo account only. These details are not saved after the app reloads.</SettingsNotice>}
      <View className="min-h-6 flex-1" /><View className="gap-4 pt-4">
        <Button onPress={() => leave(() => router.dismissTo('/owner-dashboard'))}>Go to Dashboard</Button>
      </View>
    </>}
  </SettingsFrame>;
}

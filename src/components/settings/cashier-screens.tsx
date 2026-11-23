import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { RegistrationToast } from '@/components/auth/registration-toast';
import { SuccessMark } from '@/components/auth/success-mark';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button } from '@/components/ui/button';
import { useLeaveOnce } from '@/hooks/use-leave-once';
import { EmptyState } from '@/components/ui/content-state';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useAuthFlow } from '@/state/auth-flow';
import { useSettings } from '@/state/settings';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { changeOwnerPin } from '@/services/settings';
import { SettingsFrame, settingsRoot } from './settings-frame';
import { CashierIdentity, KaheraSettingsIdentityCard, OwnerSettingsIdentityCard, OwnerStoreCard, SettingsCard, SettingsDescription, SettingsNotice } from './settings-ui';
import { CredentialForm } from './credential-form';
import { authenticationService } from '@/services/authentication';
import { createKahera } from '@/services/kahera-api';
import { useKaheraList } from '@/hooks/use-kahera-list';
import type { AvatarId } from '@/types/profile';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import tokens from '@/constants/design-tokens.json';

export function CashierListScreen({ pinManagement = false }: { pinManagement?: boolean }) {
  const { owner } = useAuthFlow();
  const { cashiers } = useKaheraList();
  if (!owner) return null;
  return <SettingsFrame title={pinManagement ? 'Kahera PIN Management' : 'Kahera Management'} parent={pinManagement ? `${settingsRoot}/security` : settingsRoot}>
    <SettingsDescription>{pinManagement ? 'Manage the access PIN assigned to your Kahera.' : "Control access to your store."}</SettingsDescription>
    {!pinManagement && <View className="mb-4 gap-3 rounded-control bg-accent-soft p-4">
      <Text className=" type-label-nav leading-[18px] text-brand">Registered Kahera</Text>
      <Text className=" type-micro-caption leading-[18px] text-text-secondary">{cashiers.length} {cashiers.length === 1 ? 'Kahera' : 'Kahera'}</Text>
      <Button icon={({ color, size }) => <PosIcon name="userPlus" color={color} size={size} />} onPress={() => router.navigate(`${settingsRoot}/add-cashier`)}>Add Kahera</Button>
    </View>}
    {cashiers.length === 0 ? <EmptyState title="No Kahera yet" description="Add a Kahera to this store to manage their access PIN." icon="profile" action="Add Kahera" onAction={() => router.navigate(`${settingsRoot}/add-cashier`)} />
      : <View className="gap-3">{cashiers.map(cashier => pinManagement ? <View key={cashier.id} className="rounded-control border border-outline bg-white p-4">
        <Pressable accessibilityRole="button" accessibilityLabel={`Change ${cashier.name}'s Kahera PIN. Status: ${cashier.status}.`} onPress={() => router.navigate({ pathname: '/owner-menu/settings/reset-cashier-pin', params: { cashierId: cashier.id } })} className="min-h-12 flex-row items-center gap-3">
          <ProfileAvatar avatarId={cashier.avatarId} size={52} />
          <Text className="min-w-0 flex-1 type-h3-heading leading-[27px] text-brand">{cashier.name}</Text>
          <View className="rounded-pill px-3 py-2" style={{ backgroundColor: cashier.status === 'active' ? tokens.color.successTint : tokens.color.errorTint }}>
            <Text className="type-label-nav leading-[18px]" style={{ color: cashier.status === 'active' ? tokens.color.successBase : tokens.color.errorBase }}>{cashier.status === 'active' ? 'Active' : 'Deactivated'}</Text>
          </View>
          <PosIcon name="chevronRight" size={20} color={tokens.color.darkNavy} />
        </Pressable>
        <View className="mt-5 gap-1">
          <Text className="type-micro-caption leading-[18px] text-text-secondary">Linked Owner ID</Text>
          <Text className="type-h3-heading leading-[27px] text-text-primary">{cashier.ownerId}</Text>
        </View>
      </View> : <SettingsCard key={cashier.id}><CashierIdentity cashier={cashier} /></SettingsCard>)}</View>}
  </SettingsFrame>;
}
export function ChangePinScreen({ cashier = false }: { cashier?: boolean }) {
  const { owner } = useAuthFlow();
  const service = useSettings();
  const { cashiers } = useKaheraList();
  const { cashierId } = useLocalSearchParams<{ cashierId?: string }>();
  const selected = owner && cashier ? cashiers.find(item => item.id === cashierId) : null;
  if (!owner) return null;
  const parent = cashier
    ? '/owner-menu/settings/cashier-pins' as const
    : '/owner-menu/settings/security' as const;
  return <SettingsFrame title={cashier ? 'Change Kahera PIN' : 'Change my PIN'} parent={parent}>
    {cashier && !selected ? <EmptyState title="Kahera unavailable" description="This Kahera is not in the current store's list." icon="profile" action="Back to Kahera PIN Management" onAction={() => router.dismissTo(`${settingsRoot}/cashier-pins`)} /> : <>
      <View className="mb-6">{selected ? <KaheraSettingsIdentityCard cashier={selected} /> : <OwnerSettingsIdentityCard owner={owner} />}</View>
      <CredentialForm key={cashier ? selected!.id : 'owner'} mode={cashier ? 'cashier' : 'owner'}
        labelOverrides={{ ownerPin: 'Current PIN', pin: 'New PIN', confirmPin: 'Confirm new PIN' }}
        successMessage={cashier ? `The Kahera PIN for ${selected!.name} has been updated.` : 'Your May-Ari PIN has been updated.'}
        successEventKey={cashier ? `kahera-pin-${selected?.id}` : `may-ari-pin-${owner.id}`}
        onCancel={() => router.dismissTo(parent)}
        onSuccessClose={() => router.dismissTo(parent)}
        onSave={values => cashier
          ? authenticationService.resetOperatorPin({ ...values, operatorId: selected!.id }).then(result => result.ok ? { ok: true as const, value: undefined } : result)
          : MOCK_AUTH_ENABLED
            ? service.changeOwnerPin(owner, values)
            : changeOwnerPin(values.ownerPin, values.pin)
                .then(() => ({ ok: true as const, value: undefined }))
                .catch(() => ({ ok: false as const, message: 'PIN change failed. Check your current PIN and try again.' }))}
        onSuccess={() => {}} />
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
  return <SettingsFrame title="Kahera Management" parent={`${settingsRoot}/users`}>
    {!cashier ? <EmptyState title="Account details unavailable" description="The Kahera may belong to another store, or this demo session has ended." action="Back to Kahera Management" onAction={() => router.dismissTo(`${settingsRoot}/users`)} /> : <>
      <RegistrationToast expiresAt={expiresAt} onDismiss={dismiss} title="Account created" message={`${cashier.name} has been added to your store.`} />
      <View className="mb-6 mt-5 gap-4"><SuccessMark animate eventKey={cashier.id} /><Text accessibilityRole="header" className=" type-large-metric leading-[42px] text-brand">Kahera Account Created Successfully!</Text></View>
      <SettingsCard>
        <CashierIdentity cashier={cashier} />
        <View className="my-4 border-t border-outline" />
        <Text className=" type-micro-financial-rate leading-[21px] text-text-secondary">Associated May-Ari / Store ID</Text>
        <Text className="mt-2 type-h3-heading leading-[27px] text-brand">{owner.id}</Text>
        <View className="my-4 border-t border-outline" />
        <Text className=" type-micro-financial-rate leading-[22px] text-text-primary">For Kahera login, use this Store / May-Ari ID, and the assigned four-digit Kahera PIN.</Text>
      </SettingsCard>
      {MOCK_AUTH_ENABLED && <SettingsNotice>Demo account only. These details are not saved after the app reloads.</SettingsNotice>}
      <View className="min-h-6 flex-1" /><View className="gap-4 pt-4">
        <Button onPress={() => leave(() => router.dismissTo('/owner-dashboard'))}>Go to Dashboard</Button>
      </View>
    </>}
  </SettingsFrame>;
}

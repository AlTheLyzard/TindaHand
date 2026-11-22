import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { router, useFocusEffect, usePreventRemove, type Href } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { AvatarOption } from '@/components/profile/avatar-option';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionModal } from '@/components/ui/motion-modal';
import { PosDialog } from '@/components/pos/pos-dialog';
import { PosIcon } from '@/components/pos/pos-icon';
import { SuccessContent } from '@/components/ui/success-content';
import { ProfileError, ProfileNotice, ProfileSection, ProfileText } from '@/components/profile/profile-ui';
import { SettingsCard, SettingsRow } from '@/components/settings/settings-ui';
import { OperatorProfileFrame } from '@/components/profile/operator-profile-frame';
import { quickAddColors } from '@/components/dashboard/quick-add-ui';
import { avatarPickerOrder } from '@/constants/profile-avatars';
import { useAvatarSnapshot, useProfileSnapshot } from '@/hooks/use-owner-profile';
import { useAuthFlow } from '@/state/auth-flow';
import { useOperatorProfileDraft } from '@/state/operator-profile-draft';
import { useSettings } from '@/state/settings';
import { authenticationService } from '@/services/authentication';
import { AVATAR_IN_USE, avatarInUse } from '@/services/avatars';
import { validateOperatorProfile } from '@/utils/settings';
import { hasCapability } from '@/utils/operator-access';
import type { AvatarId } from '@/types/profile';
import type { OperatorProfileValues, SettingsErrors } from '@/types/settings';

function OperatorRoleBadge() {
  return <View className="rounded-pill bg-accent-soft px-3 py-1">
    <Text className="type-status-badge text-brand">Kahera</Text>
  </View>;
}

export function OperatorProfileScreen() {
  const flow = useAuthFlow();
  const settings = useSettings();
  const profiles = useProfileSnapshot();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const lock = useRef(false);
  const session = flow.deviceSession;
  const operator = session?.role === 'operator'
    ? settings.cashiers(session.ownerId).find(item => item.id === session.operatorId)
    : undefined;

  async function logout() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setLogoutVisible(false);
    try {
      await authenticationService.logout();
      flow.clear();
      if (router.canDismiss()) router.dismissAll();
      router.replace({ pathname: '/login', params: { role: 'cashier', loggedOut: '1' } });
    } catch {
      lock.current = false;
      setBusy(false);
      setFailure('Unable to log out. Please try again.');
    }
  }

  return <OperatorProfileFrame title="Profile" subtitle="Your account and store information" busy={busy} footer={<>
    {!!failure && <ProfileError message={failure} />}
    <Button variant="destructive" loading={busy} onPress={() => setLogoutVisible(true)}>Log Out</Button>
  </>}>
    {!operator || session?.role !== 'operator' ? <SettingsCard><ProfileError message="Your Operator profile is unavailable. Please log in again." /></SettingsCard> : <>
      <SettingsCard>
        <View className="flex-row items-center gap-3">
          <ProfileAvatar avatarId={operator.avatarId} size={44} />
          <View className="min-w-0 flex-1"><ProfileText bold>{operator.name}</ProfileText></View>
          <OperatorRoleBadge />
        </View>
        <View className="my-4 h-px bg-outline" />
        <ProfileText small>Owner ID</ProfileText>
        <ProfileText bold>{session.ownerId}</ProfileText>
        <View className="mt-1 flex-row items-center gap-1.5">
          <PosIcon name="info" size={14} />
          <ProfileText small>Assigned once. Cannot be changed.</ProfileText>
        </View>
        <View className="mt-4"><Button variant="outlined" onPress={() => router.push('/operator-profile/edit')}>Edit Profile</Button></View>
      </SettingsCard>
      <ProfileSection>Store</ProfileSection>
      <SettingsCard>
        <ProfileText bold>{profiles.get(session.ownerId)?.storeName || 'Not set'}</ProfileText>
      </SettingsCard>
      {hasCapability(session, 'settings') && <>
        <ProfileSection>Account</ProfileSection>
        <SettingsCard>
          <SettingsRow inCard title="Settings" description="Preferences and app settings" icon="settings" onPress={() => router.navigate({ pathname: '/operator-more', params: { section: 'settings' } })} />
        </SettingsCard>
      </>}
    </>}
    <PosDialog visible={logoutVisible} title="Log Out" message="Are you sure you want to log out of TindaHand?" confirmLabel="Log Out" destructive busy={busy} onClose={() => setLogoutVisible(false)} onConfirm={() => void logout()} />
  </OperatorProfileFrame>;
}

const emptyValues = (name: string, avatarId: AvatarId): OperatorProfileValues => ({ name, avatarId });

export function EditOperatorProfileScreen() {
  const flow = useAuthFlow();
  const settings = useSettings();
  const { draft, begin, update, clear } = useOperatorProfileDraft();
  const session = flow.deviceSession;
  const operator = session?.role === 'operator'
    ? settings.cashiers(session.ownerId).find(item => item.id === session.operatorId)
    : undefined;
  if (!operator || session?.role !== 'operator') return <OperatorProfileFrame title="Edit Profile"><SettingsCard><ProfileError message="Your Operator profile is unavailable. Please log in again." /></SettingsCard></OperatorProfileFrame>;
  return <EditOperatorProfile key={operator.id} operator={operator} values={draft?.operatorId === operator.id ? draft.values : emptyValues(operator.name, operator.avatarId)} initialized={draft?.operatorId === operator.id} onBegin={begin} onUpdate={update} onClear={clear} />;
}

function EditOperatorProfile({ operator, values, initialized, onBegin, onUpdate, onClear }: {
  operator: { id: string; ownerId: string; name: string; avatarId: AvatarId };
  values: OperatorProfileValues;
  initialized: boolean;
  onBegin: (operatorId: string, name: string, avatarId: AvatarId) => void;
  onUpdate: (values: Partial<OperatorProfileValues>) => void;
  onClear: () => void;
}) {
  const flow = useAuthFlow();
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<SettingsErrors>({});
  const [failure, setFailure] = useState('');
  const [dialog, setDialog] = useState<'confirm' | 'discard' | null>(null);
  const [savedProfile, setSavedProfile] = useState<{ name: string; eventKey: string } | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const lock = useRef(false);
  const pendingExit = useRef<() => void>(() => router.back());
  const pendingDialogAction = useRef<'show-saved' | 'leave-after-discard' | null>(null);
  const leaveAfterSuccess = useRef(false);
  const saveSequence = useRef(0);
  const insets = useSafeAreaInsets();
  const nameInput = useRef<TextInputInstance>(null);
  const hasChanges = values.name !== operator.name || values.avatarId !== operator.avatarId;
  const dirty = hasChanges;
  const fieldErrors = validateOperatorProfile(values);

  useEffect(() => {
    if (!initialized && !leaving) onBegin(operator.id, operator.name, operator.avatarId);
  }, [initialized, leaving, onBegin, operator.avatarId, operator.id, operator.name]);

  const disablePrevention = usePreventRemove(dirty && !leaving, ({ repeat }) => {
    if (busy) return;
    pendingExit.current = repeat;
    setDialog('discard');
  });
  function requestExit(action = () => router.back()) {
    if (lock.current) return;
    Keyboard.dismiss();
    if (dirty) { pendingExit.current = action; setDialog('discard'); return; }
    onClear(); setLeaving(true); disablePrevention(); action();
  }
  function updateField(value: string) {
    onUpdate({ name: value });
    setServerErrors(current => { const copy = { ...current }; delete copy.name; return copy; });
    setFailure('');
  }

  function requestSave() {
    setSubmitted(true);
    const errors = validateOperatorProfile(values);
    if (errors.name) { nameInput.current?.focus(); return; }
    if (lock.current || !hasChanges) return;
    Keyboard.dismiss();
    setDialog('confirm');
  }

  async function save() {
    if (lock.current || !hasChanges) return;
    const errors = validateOperatorProfile(values);
    if (errors.name) { setSubmitted(true); setDialog(null); nameInput.current?.focus(); return; }
    lock.current = true; setBusy(true); setFailure(''); setServerErrors({}); Keyboard.dismiss();
    try {
      const result = await authenticationService.updateOperatorProfile(values);
      if (!result.ok) {
        setFailure(result.message);
        setServerErrors(result.fields ?? {});
        if (result.fields?.name) nameInput.current?.focus();
        setDialog(null);
        return;
      }
      await flow.refreshSession();
      setSavedProfile({ name: result.value.name, eventKey: `${result.value.id}:${++saveSequence.current}` });
      onClear(); setLeaving(true); disablePrevention();
      pendingDialogAction.current = 'show-saved';
      setDialog(null);
    } catch {
      setFailure('Your profile could not be saved. Please try again.');
      setDialog(null);
    } finally { lock.current = false; setBusy(false); }
  }

  function closeSavedDialog() {
    leaveAfterSuccess.current = true;
    setSuccessVisible(false);
  }

  function handleDialogHidden() {
    const action = pendingDialogAction.current;
    pendingDialogAction.current = null;
    if (action === 'show-saved') setSuccessVisible(true);
    else if (action === 'leave-after-discard') pendingExit.current();
  }

  function handleSuccessHidden() {
    if (!leaveAfterSuccess.current) return;
    leaveAfterSuccess.current = false;
    router.replace('/operator-profile' as Href);
  }

  function discardChanges() {
    onClear(); setLeaving(true); disablePrevention();
    pendingDialogAction.current = 'leave-after-discard';
    setDialog(null);
  }

  const errors = (submitted ? fieldErrors : {}) as SettingsErrors;
  return <OperatorProfileFrame title="Edit Profile" subtitle="Update your personal details." onBack={() => requestExit()} busy={busy}>
    <SettingsCard>
      <View className="min-h-12 flex-row items-center gap-3 rounded-control">
        <ProfileAvatar avatarId={values.avatarId} size={64} />
        <View className="min-w-0 flex-1"><ProfileText bold>Profile Photo</ProfileText></View>
      </View>
      <View className="mt-4"><Button compact variant="outlined" onPress={() => router.push('/operator-profile/photo')}>Change Photo</Button></View>
    </SettingsCard>
    <Text accessibilityRole="header" className="mb-3 mt-5 type-label-nav leading-[18px] text-text-secondary">Personal Information</Text>
    <FormField ref={nameInput} label="Name" value={values.name} onChangeText={updateField} onBlur={() => setSubmitted(true)} error={serverErrors.name ?? errors.name} maxLength={120} autoCapitalize="words" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
    <View className="mt-4"><ProfileNotice title="Permanent Owner ID">{operator.ownerId} · Assigned once and cannot be edited.</ProfileNotice></View>
    {!!failure && <View className="mt-3"><ProfileError message={failure} /></View>}
    <View className="min-h-8 flex-1" />
    <View className="gap-3 pt-6"><Button loading={busy} disabled={!hasChanges} onPress={requestSave}>Save Changes</Button><Button variant="secondary" disabled={busy} onPress={() => requestExit()}>Cancel</Button></View>
    <PosDialog visible={dialog !== null}
      title={dialog === 'discard' ? 'Discard Changes?' : 'Save Changes?'}
      message={dialog === 'discard' ? 'Your unsaved profile changes will be discarded.' : 'Are you sure you want to save these updates to your profile?'}
      confirmLabel={dialog === 'discard' ? 'Discard Changes' : 'Save Changes'}
      cancelLabel={dialog === 'discard' ? 'Keep Editing' : undefined}
      destructive={dialog === 'discard'} busy={busy} onHidden={handleDialogHidden}
      onClose={() => setDialog(null)}
      onConfirm={() => {
        if (dialog === 'confirm') void save();
        else if (dialog === 'discard') discardChanges();
      }} />
    <MotionModal visible={successVisible} backdropColor={quickAddColors.backdrop}
      onRequestClose={closeSavedDialog} onHidden={handleSuccessHidden}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          {savedProfile && <SuccessContent testID="operator-profile-success" title="Changes Saved" value={savedProfile.name}
            message="Your profile changes have been saved successfully." eventKey={savedProfile.eventKey}
            visible={successVisible} onClose={closeSavedDialog} />}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </MotionModal>
  </OperatorProfileFrame>;
}

export function SelectOperatorProfilePhotoScreen() {
  const settings = useSettings();
  const session = useAuthFlow().deviceSession;
  const { draft, update } = useOperatorProfileDraft();
  const avatars = useAvatarSnapshot();
  const operator = session?.role === 'operator'
    ? settings.cashiers(session.ownerId).find(item => item.id === session.operatorId)
    : undefined;
  const activeDraft = draft && operator && draft.operatorId === operator.id ? draft.values : undefined;
  const initialAvatar = activeDraft?.avatarId ?? operator?.avatarId ?? avatarPickerOrder[0];
  const initialAvatarRef = useRef(initialAvatar);
  useEffect(() => { initialAvatarRef.current = initialAvatar; }, [initialAvatar]);
  const [preview, setPreview] = useState<AvatarId>(initialAvatar);
  const [failure, setFailure] = useState('');
  useFocusEffect(useCallback(() => { setPreview(initialAvatarRef.current); setFailure(''); }, [initialAvatarRef]));
  if (!operator) return <OperatorProfileFrame title="Select Profile Photo"><SettingsCard><ProfileError message="Your Operator profile is unavailable. Please log in again." /></SettingsCard></OperatorProfileFrame>;
  const photoInUse = avatarInUse(avatars, operator.ownerId, operator.id, preview);
  const photoChanged = preview !== operator.avatarId;
  function cancel() { router.back(); }
  function apply() {
    if (!photoChanged) return;
    if (photoInUse) { setFailure(AVATAR_IN_USE); return; }
    update({ avatarId: preview });
    router.back();
  }
  return <OperatorProfileFrame title="Select Profile Photo" onBack={cancel}>
    <View className="mb-4 items-center"><ProfileAvatar size={104} avatarId={preview} /></View>
    <SettingsCard>
      <View className="flex-row flex-wrap" accessibilityRole="radiogroup" accessibilityLabel="Preset profile avatars">
        {avatarPickerOrder.map((id, index) => <View key={id} testID={`operator-avatar-cell-${id}`} style={{ width: '25%', alignItems: 'center', paddingVertical: 6 }}>
          <AvatarOption id={id} index={index} selected={preview === id} inUse={avatarInUse(avatars, operator.ownerId, operator.id, id)} onSelect={() => { setPreview(id); setFailure(''); }} />
        </View>)}
      </View>
    </SettingsCard>
    {!!failure && <View className="mt-2"><ProfileError message={failure} /></View>}
    <View className="min-h-6 flex-1" />
    <View className="gap-3 pt-5"><Button disabled={!photoChanged || photoInUse} onPress={apply}>Apply</Button><Button variant="secondary" onPress={cancel}>Cancel</Button></View>
  </OperatorProfileFrame>;
}

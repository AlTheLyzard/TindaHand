import { useCallback, useReducer, useRef, useState } from 'react';
import { router, useFocusEffect, usePreventRemove } from 'expo-router';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { useAvatarSnapshot, useOwnerProfile } from '@/hooks/use-owner-profile';
import { useAuthFlow } from '@/state/auth-flow';
import { authenticationService } from '@/services/authentication';
import { AVATAR_IN_USE, avatarInUse } from '@/services/avatars';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { PosDialog } from '@/components/pos/pos-dialog';
import { SettingsCard } from '@/components/settings/settings-ui';
import { SettingsIcon } from '@/components/settings/settings-icon';
import { avatarPickerOrder } from '@/constants/profile-avatars';
import { AvatarOption } from './avatar-option';
import type { OwnerProfile, ProfileDraft } from '@/types/profile';
import { PROFILE_LIMITS, profileChanged, profileDraft, validateProfile } from '@/utils/profile';
import { createProfileEditor, profileEditor } from '@/utils/profile-editor';
import { ProfileFrame, profileRoot } from './profile-frame';
import { OwnerProfileAvatar as ProfileAvatar, ProfileError, ProfileNotice, ProfileSection, ProfileText, ProfileUnavailable } from './profile-ui';

export function EditProfileScreen() {
  const { profile, loading, error, reload } = useOwnerProfile();
  if (loading || error || !profile) return <ProfileFrame title="Edit Profile"><ProfileUnavailable loading={loading} error={error} retry={reload} /></ProfileFrame>;
  return <ProfileEditor profile={profile} />;
}
function ProfileEditor({ profile }: { profile: OwnerProfile }) {
  const avatars = useAvatarSnapshot();
  const [state, dispatch] = useReducer(profileEditor, profileDraft(profile), createProfileEditor);
  const { owner } = useAuthFlow();
  const [touched, setTouched] = useState<Partial<Record<keyof ProfileDraft, boolean>>>({});
  const [dialog, setDialog] = useState<'save' | 'discard' | null>(null);
  const [pin, setPin] = useState('');
  const [pinTouched, setPinTouched] = useState(false);
  const [pinEpoch, setPinEpoch] = useState(0);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pendingExit = useRef<() => void>(() => router.dismissTo(profileRoot));
  const requestLock = useRef(false);
  const active = useRef(true);
  const nameInput = useRef<TextInputInstance>(null), storeInput = useRef<TextInputInstance>(null), emailInput = useRef<TextInputInstance>(null), pinInput = useRef<TextInputInstance>(null);
  const errors = validateProfile(state.draft);
  const dirty = profileChanged(state.draft, state.saved);
  function clearPin() { setPin(''); setPinTouched(false); setPinEpoch(value => value + 1); }
  useFocusEffect(useCallback(() => { active.current = true; return () => { active.current = false; setPin(''); setPinTouched(false); setPinEpoch(value => value + 1); }; }, []));
  function cancelStep() { clearPin(); setFailure(''); dispatch({ type: 'cancel-step' }); }
  const disablePrevention = usePreventRemove(!!owner && !leaving && (dirty || state.phase !== 'edit'), ({ repeat }) => {
    if (busy) return;
    if (state.phase !== 'edit') { cancelStep(); return; }
    pendingExit.current = repeat; setDialog('discard');
  });
  function requestExit(action = () => router.dismissTo(profileRoot)) {
    if (requestLock.current) return;
    if (dirty) { pendingExit.current = action; setDialog('discard'); }
    else { clearPin(); setLeaving(true); disablePrevention(); action(); }
  }
  function back() { if (state.phase !== 'edit') cancelStep(); else requestExit(); }
  function update(field: keyof ProfileDraft, value: string) {
    dispatch({ type: 'field', field, value }); setTouched(current => ({ ...current, [field]: true })); setFailure('');
  }
  function confirmSave() {
    setTouched({ name: true, storeName: true, email: true });
    if (errors.name) { nameInput.current?.focus(); return; }
    if (errors.storeName) { storeInput.current?.focus(); return; }
    if (errors.email) { emailInput.current?.focus(); return; }
    if (dirty && !requestLock.current) { Keyboard.dismiss(); setDialog('save'); }
  }
  function applyAvatar() {
    if (state.preview && avatarInUse(authenticationService.profile.avatars.getSnapshot(), profile.ownerId, profile.ownerId, state.preview)) {
      setFailure(AVATAR_IN_USE); return;
    }
    setFailure(''); dispatch({ type: 'apply-avatar' });
  }
  async function save() {
    setPinTouched(true);
    if (!/^[0-9]{4}$/.test(pin) || requestLock.current) return;
    requestLock.current = true; setBusy(true); setFailure(''); Keyboard.dismiss();
    // Request-local only; clear the masked input before awaiting the service.
    const currentPin = pin; clearPin();
    try {
      const result = await authenticationService.profile.save({ draft: state.draft, ownerPin: currentPin });
      if (!active.current) return;
      if (!result.ok) {
        setFailure(result.message);
        if (result.message === AVATAR_IN_USE) dispatch({ type: 'pick' });
        return;
      }
      setLeaving(true); disablePrevention();
      router.dismissTo({ pathname: profileRoot, params: { updated: result.value.pendingEmail ? 'pending' : 'complete' } });
    } catch { if (active.current) setFailure('Unable to save your profile. Your draft is intact. Enter your PIN and retry.'); }
    finally { requestLock.current = false; if (active.current) setBusy(false); }
  }
  const title = state.phase === 'avatar' ? 'Select Profile Photo' : state.phase === 'verify' ? 'Verify Your Identity' : 'Edit Profile';
  return <ProfileFrame title={title} subtitle={state.phase === 'avatar' ? 'Choose a photo to personalize your profile.' : state.phase === 'verify' ? 'Enter your current PIN to confirm your identity.' : 'Update your personal details.'} onBack={back} onNavigate={requestExit} busy={busy}>
    {state.phase === 'avatar' ? <>
      <View className="mb-5 items-center"><ProfileAvatar size={104} avatarId={state.preview} /></View>
      <SettingsCard><View className="flex-row flex-wrap" accessibilityRole="radiogroup" accessibilityLabel="Preset profile avatars">
        {avatarPickerOrder.map((id, index) => <View key={id} testID={`avatar-cell-${id}`} style={{ width: '33.333%', alignItems: 'center', paddingVertical: 8 }}>
          <AvatarOption id={id} index={index} selected={state.preview === id} inUse={avatarInUse(avatars, profile.ownerId, profile.ownerId, id)} onSelect={() => { setFailure(''); dispatch({ type: 'preview', avatarId: id }); }} />
        </View>)}
      </View></SettingsCard>
      {!!failure && <ProfileError message={failure} />}
      <View className="min-h-8 flex-1" /><View className="gap-3 pt-6"><Button disabled={!!state.preview && avatarInUse(avatars, profile.ownerId, profile.ownerId, state.preview)} onPress={applyAvatar}>Apply</Button><Button variant="secondary" onPress={cancelStep}>Cancel</Button></View>
    </> : state.phase === 'verify' ? <>
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-pill bg-[#D1E2F8]"><SettingsIcon name="security" /></View>
      <FormField key={pinEpoch} ref={pinInput} label="Enter your Current PIN" requiredIndicator="asterisk" pin pinIndicators pinVisibilityToggle keyboardType="number-pad" maxLength={4} autoComplete="off" textContentType="none" value={pin} editable={!busy}
        onChangeText={value => { setPin(value.replace(/[^0-9]/g, '').slice(0, 4)); setPinTouched(true); setFailure(''); }} onBlur={() => setPinTouched(true)}
        error={failure || (pinTouched && !/^[0-9]{4}$/.test(pin) ? 'Enter exactly four numeric digits.' : undefined)} help="Enter your PIN · exactly 4 numeric digits." returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
      <View className="min-h-12 flex-1" /><ProfileNotice title="Your PIN is Secure">Your PIN is only used to verify your identity. Never share it with anyone.</ProfileNotice>
      <View className="gap-3 pt-6"><Button loading={busy} disabled={!/^[0-9]{4}$/.test(pin)} onPress={() => void save()}>Verify</Button><Button variant="secondary" disabled={busy} onPress={cancelStep}>Cancel</Button></View>
    </> : <>
      <SettingsCard><View className="flex-row items-center gap-4"><ProfileAvatar avatarId={state.draft.avatarId} size={70} /><View className="min-w-0 flex-1 gap-2"><ProfileText bold>Profile Photo</ProfileText><Button compact fullWidth={false} variant="secondary" style={{ alignSelf: 'flex-start' }} onPress={() => dispatch({ type: 'pick' })}>Change Photo</Button></View></View></SettingsCard>
      <Text className="mt-4 font-poppins text-[10px] text-text-secondary"><Text className="text-[#B42318]">*</Text> Required fields</Text>
      <ProfileSection>Personal Information</ProfileSection>
      <FormField ref={nameInput} label="Name" requiredIndicator="asterisk" value={state.draft.name} onChangeText={value => update('name', value)} onBlur={() => setTouched(current => ({ ...current, name: true }))} error={touched.name ? errors.name : undefined} maxLength={PROFILE_LIMITS.name} autoCapitalize="words" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => storeInput.current?.focus()} />
      <ProfileSection>Store Information</ProfileSection>
      <FormField ref={storeInput} label="Store Name" required={false} value={state.draft.storeName} onChangeText={value => update('storeName', value)} error={touched.storeName ? errors.storeName : undefined} maxLength={PROFILE_LIMITS.storeName} autoCapitalize="words" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailInput.current?.focus()} />
      <ProfileSection>Contact Information</ProfileSection>
      <FormField ref={emailInput} label="Registered Email Address" requiredIndicator="asterisk" value={state.draft.email} onChangeText={value => update('email', value)} onBlur={() => setTouched(current => ({ ...current, email: true }))} error={touched.email ? errors.email : undefined} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" maxLength={PROFILE_LIMITS.email} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
      <View className="mt-4"><ProfileNotice title="Permanent May-Ari ID">{profile.ownerId} · Assigned once and cannot be edited.</ProfileNotice></View>
      {profile.pendingEmail && <View className="mt-3"><ProfileNotice title="Pending email verification">{profile.pendingEmail.address}. Your current registered email stays active until verification succeeds.</ProfileNotice></View>}
      {!!failure && <ProfileError message={failure} />}
      <View className="min-h-8 flex-1" /><View className="gap-3 pt-6"><Button disabled={!dirty || Object.keys(errors).length > 0 || busy} onPress={confirmSave}>Save Changes</Button><Button variant="secondary" onPress={() => requestExit()}>Cancel</Button></View>
    </>}
    <PosDialog visible={dialog === 'save'} title="Save Changes?" message="Are you sure you want to save these changes to this profile?" confirmLabel="Save Changes" onClose={() => setDialog(null)} onConfirm={() => { setDialog(null); clearPin(); setFailure(''); dispatch({ type: 'verify' }); }} />
    <PosDialog visible={dialog === 'discard'} title="Discard Changes?" message="Your unsaved profile changes will be discarded." confirmLabel="Discard Changes" cancelLabel="Keep Editing" destructive onClose={() => setDialog(null)} onConfirm={() => { setDialog(null); clearPin(); dispatch({ type: 'discard' }); setLeaving(true); disablePrevention(); pendingExit.current(); }} />
  </ProfileFrame>;
}

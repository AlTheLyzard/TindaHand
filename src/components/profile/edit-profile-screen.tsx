import { useCallback, useReducer, useRef, useState } from 'react';
import { router, useFocusEffect, usePreventRemove } from 'expo-router';
import { Keyboard, ScrollView, View, type TextInputInstance } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOwnerProfile } from '@/hooks/use-owner-profile';
import { useAuthFlow } from '@/state/auth-flow';
import { authenticationService } from '@/services/authentication';
import { AVATAR_IN_USE, avatarInUse } from '@/services/avatars';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { updateOwnerProfile } from '@/services/settings';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { PosDialog } from '@/components/pos/pos-dialog';
import { MotionModal } from '@/components/ui/motion-modal';
import { SuccessContent } from '@/components/ui/success-content';
import { SettingsCard } from '@/components/settings/settings-ui';
import { SettingsIcon } from '@/components/settings/settings-icon';
import { resolveOwnerAvatarId } from '@/constants/profile-avatar-ids';
import type { AvatarId, OwnerProfile, ProfileDraft } from '@/types/profile';
import { PROFILE_LIMITS, profileChanged, profileDraft, validateProfile } from '@/utils/profile';
import { createProfileEditor, profileEditor } from '@/utils/profile-editor';
import { ProfileFrame, profileRoot } from './profile-frame';
import { OwnerProfileAvatar as ProfileAvatar, ProfileError, ProfileNotice, ProfileReadOnlyValue, ProfileSection, ProfileText, ProfileUnavailable } from './profile-ui';
import { ProfilePhotoSelectionScreen } from './profile-photo-selection-screen';

export function EditProfileScreen() {
  const { profile, loading, error, reload } = useOwnerProfile();
  if (loading || error || !profile) return <ProfileFrame title="Edit Profile" subtitle="Update your personal details."><ProfileUnavailable loading={loading} error={error} retry={reload} /></ProfileFrame>;
  return <ProfileEditor profile={profile} />;
}
function ProfileEditor({ profile }: { profile: OwnerProfile }) {
  const [state, dispatch] = useReducer(profileEditor, profileDraft(profile), createProfileEditor);
  const { owner, refreshSession } = useAuthFlow();
  const [touched, setTouched] = useState<Partial<Record<keyof ProfileDraft, boolean>>>({});
  const [dialog, setDialog] = useState<'save' | 'discard' | null>(null);
  const [savedProfile, setSavedProfile] = useState<{ name: string; message: string; eventKey: string } | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinTouched, setPinTouched] = useState(false);
  const [pinEpoch, setPinEpoch] = useState(0);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pendingExit = useRef<() => void>(() => router.dismissTo(profileRoot));
  const requestLock = useRef(false);
  const active = useRef(true);
  const saveSequence = useRef(0);
  const leaveAfterSuccess = useRef(false);
  const insets = useSafeAreaInsets();
  const nameInput = useRef<TextInputInstance>(null), storeInput = useRef<TextInputInstance>(null), pinInput = useRef<TextInputInstance>(null);
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
    setTouched({ name: true, storeName: true });
    if (errors.name) { nameInput.current?.focus(); return; }
    if (errors.storeName) { storeInput.current?.focus(); return; }
    if (dirty && !requestLock.current) {
      Keyboard.dismiss();
      if (!MOCK_AUTH_ENABLED) {
        // Real session: skip PIN verification, go straight to save confirmation dialog.
        void save();
      } else {
        setDialog('save');
      }
    }
  }
  function applyAvatar(avatarId: AvatarId) {
    if (avatarInUse(authenticationService.profile.avatars.getSnapshot(), profile.ownerId, profile.ownerId, avatarId)) {
      setFailure(AVATAR_IN_USE); return;
    }
    setFailure(''); dispatch({ type: 'apply-avatar', avatarId });
  }
  async function save() {
    if (MOCK_AUTH_ENABLED) {
      // Mock path: requires PIN verification via the mock profile service.
      setPinTouched(true);
      if (!/^[0-9]{4}$/.test(pin) || requestLock.current) return;
    } else if (requestLock.current) return;
    requestLock.current = true; setBusy(true); setFailure(''); Keyboard.dismiss();
    const currentPin = pin; clearPin();
    try {
      if (MOCK_AUTH_ENABLED) {
        const result = await authenticationService.profile.save({ draft: state.draft, ownerPin: currentPin });
        if (!active.current) return;
        if (!result.ok) {
          setFailure(result.message);
          if (result.message === AVATAR_IN_USE) dispatch({ type: 'pick' });
          return;
        }
        setSavedProfile({
          name: result.value.name,
          message: result.value.pendingEmail
            ? 'Profile saved. Email verification is pending; your registered email is unchanged. No real email was sent in this development mock.'
            : 'Your profile changes have been saved successfully.',
          eventKey: `${profile.ownerId}:${++saveSequence.current}`,
        });
        setLeaving(true); disablePrevention(); setSuccessVisible(true);
      } else {
        // Real path: call PATCH /settings/profile — no PIN needed (backend uses JWT).
        await updateOwnerProfile({
          name: state.draft.name.trim(),
          storeName: state.draft.storeName.trim(),
          avatarId: state.draft.avatarId ?? undefined,
        });
        if (!active.current) return;
        // Refresh the in-memory session so the new name propagates app-wide
        // (dashboard greeting, header, etc.) without requiring a full re-login.
        await refreshSession();
        if (!active.current) return;
        setSavedProfile({
          name: state.draft.name.trim(),
          message: 'Your profile changes have been saved successfully.',
          eventKey: `${profile.ownerId}:${++saveSequence.current}`,
        });
        setLeaving(true); disablePrevention(); setSuccessVisible(true);
      }
    } catch { if (active.current) setFailure('Unable to save your profile. Please check your connection and try again.'); }
    finally { requestLock.current = false; if (active.current) setBusy(false); }
  }
  function closeSavedDialog() {
    leaveAfterSuccess.current = true;
    setSuccessVisible(false);
  }
  function handleSuccessHidden() {
    if (!leaveAfterSuccess.current) return;
    leaveAfterSuccess.current = false;
    router.dismissTo(profileRoot);
  }
  if (state.phase === 'avatar') return <ProfilePhotoSelectionScreen storeId={profile.ownerId} accountId={profile.ownerId}
    currentAvatarId={resolveOwnerAvatarId(state.preview ?? state.draft.avatarId)} failure={failure}
    onApply={applyAvatar} onCancel={cancelStep} onSelectionChange={() => setFailure('')} />;
  return <ProfileFrame title={state.phase === 'verify' ? 'Verify Your Identity' : 'Edit Profile'} subtitle={state.phase === 'verify' ? 'Enter your current PIN to confirm your identity.' : 'Update your personal details.'} onBack={back} busy={busy}>
    {state.phase === 'verify' ? <>
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-pill bg-accent-soft"><SettingsIcon name="security" size={52} /></View>
      <FormField key={pinEpoch} ref={pinInput} label="Enter your Current PIN" requiredIndicator="asterisk" pin pinIndicators pinVisibilityToggle keyboardType="number-pad" maxLength={4} autoComplete="off" textContentType="none" value={pin} editable={!busy}
        onChangeText={value => { setPin(value.replace(/[^0-9]/g, '').slice(0, 4)); setPinTouched(true); setFailure(''); }} onBlur={() => setPinTouched(true)}
        error={failure || (pinTouched && !/^[0-9]{4}$/.test(pin) ? 'Enter exactly four numeric digits.' : undefined)} help="Enter your PIN · exactly 4 numeric digits." returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
      <View className="min-h-12 flex-1" /><ProfileNotice title="Your PIN is Secure">Your PIN is only used to verify your identity. Never share it with anyone.</ProfileNotice>
      <View className="gap-3 pt-6"><Button loading={busy} disabled={!/^[0-9]{4}$/.test(pin)} onPress={() => void save()}>Verify</Button><Button variant="secondary" disabled={busy} onPress={cancelStep}>Cancel</Button></View>
    </> : <>
      <SettingsCard>
        <View className="flex-row flex-wrap items-center gap-4">
          <ProfileAvatar avatarId={state.draft.avatarId} size={76} />
          <View className="min-w-[150px] flex-1 gap-2">
            <ProfileText bold>Profile Photo</ProfileText>
            <Button compact fullWidth={false} variant="outlined" style={{ alignSelf: 'flex-start' }} onPress={() => dispatch({ type: 'pick' })}>Change Photo</Button>
          </View>
        </View>
      </SettingsCard>
      <ProfileSection>Personal Information</ProfileSection>
      <FormField ref={nameInput} label="Name" requiredIndicator="asterisk" value={state.draft.name} onChangeText={value => update('name', value)} onBlur={() => setTouched(current => ({ ...current, name: true }))} error={touched.name ? errors.name : undefined} maxLength={PROFILE_LIMITS.name} autoCapitalize="words" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => storeInput.current?.focus()} />
      <ProfileSection>Store Information</ProfileSection>
      <FormField ref={storeInput} label="Store Name" required={false} value={state.draft.storeName} onChangeText={value => update('storeName', value)} error={touched.storeName ? errors.storeName : undefined} maxLength={PROFILE_LIMITS.storeName} autoCapitalize="words" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
      <ProfileSection>Registered Email Address</ProfileSection>
      <ProfileReadOnlyValue>{profile.email}</ProfileReadOnlyValue>
      <View className="mt-4"><ProfileNotice title="Permanent Owner ID">{profile.ownerId} · Assigned once and cannot be edited.</ProfileNotice></View>
      {profile.pendingEmail && <View className="mt-3"><ProfileNotice title="Pending email verification">{profile.pendingEmail.address}. Your current registered email stays active until verification succeeds.</ProfileNotice></View>}
      {!!failure && <ProfileError message={failure} />}
      <View className="min-h-8 flex-1" /><View className="gap-3 pt-6"><Button disabled={!dirty || busy} onPress={confirmSave}>Save Changes</Button><Button variant="secondary" onPress={() => requestExit()}>Cancel</Button></View>
    </>}
    <PosDialog visible={dialog === 'save'} title="Save Changes?" message="Are you sure you want to save these changes to this profile?" confirmLabel="Save Changes" onClose={() => setDialog(null)} onConfirm={() => { setDialog(null); clearPin(); setFailure(''); dispatch({ type: 'verify' }); }} />
    <PosDialog visible={dialog === 'discard'} title="Discard Changes?" message="Your unsaved profile changes will be discarded." confirmLabel="Discard Changes" cancelLabel="Keep Editing" destructive onClose={() => setDialog(null)} onConfirm={() => { setDialog(null); clearPin(); dispatch({ type: 'discard' }); setLeaving(true); disablePrevention(); pendingExit.current(); }} />
    <MotionModal visible={successVisible} onRequestClose={closeSavedDialog} onHidden={handleSuccessHidden}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          {savedProfile && <SuccessContent testID="owner-profile-success" title="Changes Saved" value={savedProfile.name}
            message={savedProfile.message} eventKey={savedProfile.eventKey} visible={successVisible} onClose={closeSavedDialog} />}
        </ScrollView>
      </SafeAreaView>
    </MotionModal>
  </ProfileFrame>;
}

import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View, type TextInputInstance } from 'react-native';
import { AuthBackground } from './auth-background';
import { AuthHeader } from './auth-header';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { RegistrationToast } from './registration-toast';
import { SettingsIcon } from '@/components/settings/settings-icon';
import { useAuthFlow } from '@/state/auth-flow';
import { authenticationService } from '@/services/authentication';
import type { AccountRole } from '@/types/auth';
import { validateLogin } from '@/utils/account-access';
import { editOwnerId, type InputSelection } from '@/utils/owner-id';

/** One shared form for new-device password login, returning PIN unlock and Operator login. */
export function RoleLoginScreen({ role, onBack, onSuccess, loggedOut = false, pinReset = false }: {
  role: AccountRole; onBack: () => void; onSuccess: () => void; loggedOut?: boolean; pinReset?: boolean;
}) {
  const flow = useAuthFlow();
  const owner = role === 'owner';
  const returning = owner && flow.deviceSession?.role === 'owner';
  const [id, setId] = useState('');
  const [credential, setCredential] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ id: false, credential: false });
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // A new session remounts session-scoped providers. Read confirmed identity
  // from the shared session so success feedback survives that transition.
  const operatorSuccess = !owner && flow.deviceSession?.role === 'cashier' && !flow.deviceSession.locked ? flow.deviceSession.operator.name : '';
  const [idSelection, setIdSelection] = useState<InputSelection>();
  const selection = useRef<InputSelection>({ start: 0, end: 0 });
  const idInput = useRef<TextInputInstance>(null), credentialInput = useRef<TextInputInstance>(null);
  const locked = useRef(false), active = useRef(true);
  const password = owner && !returning;
  const validation = validateLogin(id, password ? '0000' : credential);
  const credentialError = password ? (!credential ? 'Enter your password.' : undefined) : validation.pin;
  useFocusEffect(useCallback(() => {
    active.current = true;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => { active.current = false; back.remove(); setCredential(''); setNotice(''); setSubmitted(false); setTouched({ id: false, credential: false }); };
  }, [onBack]));
  async function submit() {
    if (locked.current) return;
    setSubmitted(true);
    if (validation.id) { idInput.current?.focus(); return; }
    if (credentialError) { credentialInput.current?.focus(); return; }
    locked.current = true; setBusy(true); setNotice(''); Keyboard.dismiss();
    try {
      const result = password ? await authenticationService.authenticateOwner({ ownerId: id, password: credential })
        : owner ? await authenticationService.unlockOwner({ ownerId: id, pin: credential })
        : await authenticationService.loginOperator({ ownerId: id, pin: credential });
      if (!active.current) return;
      if (!result.ok) { setNotice(result.message); return; }
      setCredential(''); await flow.refreshSession(); flow.setSelectedRole(role); flow.notifyLogin();
      if (result.value.role === 'owner') onSuccess();
    } catch { if (active.current) setNotice('Unable to log in. Please try again.'); }
    finally { locked.current = false; if (active.current) setBusy(false); }
  }
  return <AuthBackground headerWave>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="w-full max-w-[460px] flex-1 self-center px-6 pb-5 pt-5">
          <AuthHeader onBack={onBack} />
          {(loggedOut || pinReset) && <Text accessibilityRole="alert" className="mt-3 font-poppins text-[12px] text-[#1D5D21]">{pinReset ? 'Your PIN has been updated. Log in to continue.' : 'Logged out successfully.'}</Text>}
          <View className="mt-12 px-2">
            <Text className="font-poppins-bold text-[12px] leading-[18px] text-[#2675DB]">{owner ? 'OWNER · STORE OWNER' : 'OPERATOR · STORE OPERATOR'}</Text>
            <Text accessibilityRole="header" className="mt-2 font-poppins-bold text-[30px] leading-[42px] text-brand">{owner ? 'Owner Login' : 'Operator Login'}</Text>
            <Text className="mt-2 font-poppins text-[10px] leading-[15px] text-text-secondary">{password ? 'Log in with your permanent Owner ID and password to authenticate this device.' : owner ? 'Welcome back. Enter your permanent Owner ID and four-digit PIN to unlock your store.' : 'Log in with your store’s Owner ID and your assigned four-digit Operator PIN.'}</Text>
            {operatorSuccess ? <View className="mt-6 gap-4">
              <RegistrationToast expiresAt={flow.loginToastExpiresAt} onDismiss={flow.dismissLoginToast} title="Login successful" message={`Welcome, ${operatorSuccess}.`} />
              <Text className="font-poppins text-[14px] text-brand">{operatorSuccess}, your Operator identity and permissions have been verified. The Operator workspace is not connected yet.</Text>
              <Button onPress={() => { flow.clear(); onBack(); }}>Back to Account Selection</Button>
            </View> : <>
              <View className="mt-5 gap-5 px-3">
                <Text className="font-poppins text-[10px] text-text-secondary">Fields marked * are required.</Text>
                <FormField ref={idInput} label="Owner ID" requiredIndicator="asterisk" value={id}
                  error={submitted || touched.id ? validation.id : undefined} editable={!busy}
                  help="Enter your permanent Owner ID." placeholder="TH-MA-0001" placeholderTextColor="#A3AFBF"
                  selection={idSelection} onSelectionChange={event => { selection.current = event.nativeEvent.selection; setIdSelection(current => current?.start === selection.current.start && current.end === selection.current.end ? undefined : current); }}
                  onChangeText={value => { const edit = editOwnerId(id, value, selection.current); setId(edit.text); selection.current = edit.selection; setIdSelection(edit.selection); setTouched(current => ({ ...current, id: true })); setNotice(''); }}
                  onBlur={() => setTouched(current => ({ ...current, id: true }))}
                  autoCapitalize="characters" smartInsertDelete={false} autoComplete="username" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => credentialInput.current?.focus()} />
                <FormField ref={credentialInput} label={password ? 'Password' : owner ? 'PIN' : 'Operator PIN'} requiredIndicator="asterisk" value={credential}
                  password={password} pin={!password} pinIndicators={!password} pinVisibilityToggle={!password}
                  error={submitted || touched.credential ? credentialError : undefined} editable={!busy}
                  onChangeText={value => { setCredential(password ? value : value.replace(/[^0-9]/g, '').slice(0, 4)); setTouched(current => ({ ...current, credential: true })); setNotice(''); }}
                  onBlur={() => setTouched(current => ({ ...current, credential: true }))}
                  placeholder={password ? 'Enter password' : undefined} placeholderTextColor="#A3AFBF"
                  help={password ? undefined : 'Enter exactly 4 numeric digits.'} keyboardType={password ? 'default' : 'number-pad'}
                  autoComplete={password ? 'current-password' : 'off'} autoCapitalize="none" maxLength={password ? undefined : 4} returnKeyType="done" onSubmitEditing={() => void submit()} />
              </View>
              <View className="mt-8 gap-2">
                <Button loading={busy} onPress={() => void submit()}>Log In</Button>
                {!!notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="font-poppins text-[12px] leading-[18px] text-[#B42318]">{notice}</Text>}
                {owner && !password && <Button variant="text" disabled={busy} onPress={() => router.navigate('/forgot-pin')}>Forgot PIN?</Button>}
                {owner && !password && <Button variant="text" disabled={busy} onPress={() => { flow.clear(); setCredential(''); setSubmitted(false); setTouched({ id: false, credential: false }); }}>Log Out and Use Password</Button>}
                {!owner && <Text className="font-poppins text-[12px] text-text-secondary">Forgot your PIN? Ask your Owner to reset it.</Text>}
                <Button variant="text" fullWidth={false} style={{ alignSelf: 'flex-start' }} disabled={busy} onPress={onBack}>← Change Role</Button>
              </View>
            </>}
          </View>
          <View className="min-h-4 flex-1" />
          <View className="mx-3 mt-5 gap-2 rounded-[10px] border border-[#7399CC] bg-[#D9E7F5CC] px-5 py-4">
            <SettingsIcon name="security" />
            <Text className="font-poppins-bold text-[12px] text-action">One ID, every time</Text>
            <Text className="font-poppins text-[10px] leading-[15px] text-brand">Your Owner ID stays the same. Logging in or resetting a PIN never creates a new ID.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </AuthBackground>;
}

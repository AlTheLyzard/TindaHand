import { PosIcon } from '@/components/pos/pos-icon';
import { SettingsIcon } from '@/components/settings/settings-icon';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { KeyboardViewport as KeyboardAvoidingView, KeyboardAwareScrollView as ScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import tokens from '@/constants/design-tokens.json';
import { loginKahera, loginOwner } from '@/services/mock-auth';
import { saveToken, markHasOwner, markHasKaheras } from '@/services/token-storage';
import { useAuthFlow } from '@/state/auth-flow';
import type { AccountRole } from '@/types/auth';
import { validateLogin } from '@/utils/account-access';
import { editOwnerId, type InputSelection } from '@/utils/owner-id';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, Text, View, useWindowDimensions, type TextInputInstance } from 'react-native';
import { AuthBackground } from './auth-background';
import { AuthHeader } from './auth-header';
import { OperatorPinHelpModal } from './operator-pin-help-modal';


type OperatorLoginState = 'idle' | 'invalid' | 'submitting' | 'failed';

/** One shared form for new-device password login, returning PIN unlock and Operator login. */
export function RoleLoginScreen({ role, onBack, onSuccess, loggedOut = false, pinReset = false }: {
  role: AccountRole; onBack: () => void; onSuccess: () => void; loggedOut?: boolean; pinReset?: boolean;
}) {
  const flow = useAuthFlow();
  const { fontScale } = useWindowDimensions();
  const owner = role === 'owner';
  const [id, setId] = useState('');
  const rememberedId = undefined; // ID is always typed by the user — never auto-filled or locked
  const [credential, setCredential] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ id: false, credential: false });
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [operatorState, setOperatorState] = useState<OperatorLoginState>('idle');
  const [helpOpen, setHelpOpen] = useState(false);
  const [idSelection, setIdSelection] = useState<InputSelection>();
  const selection = useRef<InputSelection>({ start: 0, end: 0 });
  // On Android, onSelectionChange can deliver the old position after onChangeText
  // has already committed a new caret. Block stale updates until the native view
  // catches up — same guard as MoneyInput.
  const pendingIdRestore = useRef<InputSelection | undefined>(undefined);
  const idInput = useRef<TextInputInstance>(null), credentialInput = useRef<TextInputInstance>(null);
  const locked = useRef(false), active = useRef(true);
  const password = false;
  const validation = validateLogin(id, password ? '0000' : credential);
  const credentialError = password ? (!credential ? 'Enter your password.' : undefined) : validation.pin;
  function updateOperatorValidation(nextId: string, nextCredential: string) {
    if (owner || !submitted) return;
    const next = validateLogin(nextId, nextCredential);
    setOperatorState(next.id || next.pin ? 'invalid' : 'idle');
  }
  useFocusEffect(useCallback(() => {
    active.current = true;
    locked.current = false; setBusy(false); setOperatorState('idle'); setHelpOpen(false);
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => { active.current = false; back.remove(); setCredential(''); setNotice(''); setSubmitted(false); setOperatorState('idle'); setHelpOpen(false); setTouched({ id: false, credential: false }); };
  }, [onBack]));

  async function submit() {
    if (locked.current || flow.restoring) return;
    setSubmitted(true);
    if (validation.id) { if (!owner) setOperatorState('invalid'); idInput.current?.focus(); return; }
    if (credentialError) { if (!owner) setOperatorState('invalid'); credentialInput.current?.focus(); return; }
    locked.current = true; setBusy(true); if (!owner) setOperatorState('submitting'); setNotice(''); Keyboard.dismiss();
    let completed = false;
    try {
      if (role === 'owner') {
        const result = await loginOwner(id, credential);
        if (!active.current) return;
        if (result.status === 'ok') {
          // The owner typed their ID into the form — use it directly.
          // Normalize to uppercase TH-MA-XXXX format.
          const ownerId = id.trim().toUpperCase();
          await saveToken(result.token, result.name, ownerId, 'owner');
          await markHasOwner();
          setCredential('');
          await flow.refreshSession();
          flow.setSelectedRole(role);
          flow.notifyLogin();
          completed = true;
          onSuccess();
        } else if (result.status === 'locked') {
          setNotice('Account locked due to too many failed attempts. Try again later.');
        } else if (result.status === 'invalid') {
          setNotice('Invalid ID or PIN. Check your credentials and try again.');
        } else {
          setNotice('Unable to log in. Please try again.');
        }
        return;
      }
      // Kahera (operator) login — real API
      const result = await loginKahera(id, credential);
      if (!active.current) return;
      if (result.status === 'ok') {
        await saveToken(result.token, result.name, result.ownerId, 'cashier', result.kaheraId);
        await markHasKaheras();
        setCredential('');
        await flow.refreshSession();
        flow.setSelectedRole(role);
        flow.notifyLogin();
        completed = true;
        onSuccess();
      } else if (result.status === 'locked') {
        setOperatorState('failed');
        setNotice('Account locked due to too many failed attempts. Try again later.');
      } else if (result.status === 'notFound') {
        setOperatorState('invalid');
        setNotice('No active cashier found for this store. Ask your owner to set up your account.');
      } else if (result.status === 'invalid') {
        setOperatorState('invalid');
        setNotice('Invalid Owner ID or PIN. Check your credentials and try again.');
      } else {
        setOperatorState('failed');
        setNotice('Unable to log in. Please try again.');
      }
    } catch { if (active.current) { if (!owner) setOperatorState('failed'); setNotice('Unable to log in. Please try again.'); } }
    finally { if (!completed) { locked.current = false; if (active.current) setBusy(false); } }
  }

  const identity = undefined; // No static identity display — user always types their ID
  const pinIdentity = !password && owner && rememberedId ? identity : undefined;
  const pinLoginButtonHeight = Math.max(tokens.button.height, tokens.button.lineHeight * fontScale + tokens.button.paddingVertical * 2);
  return <AuthBackground headerWave>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="w-full max-w-[460px] self-center px-6 pb-5 pt-5" style={{ flexGrow: 1, flexShrink: 0 }}>
          <AuthHeader onBack={onBack} backDisabled={busy} />
          {(loggedOut || pinReset) && <Text accessibilityRole="alert" className="mt-3 font-poppins text-[12px] text-[#1D5D21]">{pinReset ? 'PIN reset successfully.' : 'Logged out successfully.'}</Text>}
          <View className="mt-12 px-2" style={{ flexShrink: 0 }}>
            <Text className="font-poppins-bold text-[12px] text-[#2675DB]" style={{ lineHeight: 18 * fontScale }}>{owner ? 'OWNER · STORE OWNER' : 'KAHERA · STORE CASHIER'}</Text>
            <Text accessibilityRole="header" className="mt-2 font-poppins-bold text-[30px] text-brand" style={{ lineHeight: 42 * fontScale }}>{owner ? 'May-Ari Login' : 'Kahera Login'}</Text>
            <Text className="mt-2 font-poppins text-[10px] text-text-secondary" style={{ lineHeight: 15 * fontScale }}>{password ? rememberedId ? 'Log in with your password to authenticate this device.' : 'Log in with your permanent May-Ari ID and password to authenticate this device.' : owner ? 'Welcome back. Enter your four-digit PIN to unlock your store.' : rememberedId ? 'Log in with your assigned four-digit PIN.' : 'Enter your store\'s May-Ari ID and your assigned four-digit PIN.'}</Text>
            {flow.restoring ? <Text accessibilityRole="alert" className="mt-5 font-poppins text-[12px] text-brand">Restoring login details…</Text> : <>
              <View className="px-3" style={{ marginTop: tokens.spacing.four, gap: tokens.spacing.three, flexShrink: 0 }}>
                {(!rememberedId || !owner) && <FormField ref={idInput} label={owner ? 'Owner ID' : 'May-Ari ID'} requiredIndicator="asterisk" value={id}
                  error={owner ? submitted || touched.id ? validation.id : undefined : submitted && operatorState === 'invalid' ? validation.id : undefined} editable={!busy}
                  help={owner ? 'Enter your permanent Owner ID.' : 'Enter your store\'s May-Ari ID.'} placeholder="TH-MA-0001" placeholderTextColor="#A3AFBF"
                  selection={idSelection} onSelectionChange={event => {
                    const reported = event.nativeEvent.selection;
                    const pending = pendingIdRestore.current;
                    if (pending) {
                      if (reported.start === pending.start && reported.end === pending.end) {
                        pendingIdRestore.current = undefined;
                        setIdSelection(undefined);
                      }
                      // Don't overwrite selection.current until the restore lands.
                    } else {
                      selection.current = reported;
                      setIdSelection(current => current?.start === reported.start && current.end === reported.end ? undefined : current);
                    }
                  }}
                  onChangeText={value => { const edit = editOwnerId(id, value, selection.current); setId(edit.text); selection.current = edit.selection; pendingIdRestore.current = edit.selection; setIdSelection(edit.selection); setTouched(current => ({ ...current, id: true })); updateOperatorValidation(edit.text, credential); setNotice(''); }}
                  onBlur={() => setTouched(current => ({ ...current, id: true }))}
                  autoCapitalize="characters" smartInsertDelete={false} autoComplete="username" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => credentialInput.current?.focus()} />}
                {pinIdentity}
                <FormField ref={credentialInput} label={password ? 'Password' : 'PIN'} requiredIndicator="asterisk" value={credential}
                  leadingContent={pinIdentity ? undefined : identity}
                  keyboardScrollAfter={pinIdentity ? pinLoginButtonHeight + tokens.spacing.four : 0}
                  allowFontScaling
                  password={password} pin={!password} pinIndicators={!password} pinVisibilityToggle={!password}
                  error={owner ? submitted || touched.credential ? credentialError : undefined : submitted && operatorState === 'invalid' ? credentialError : undefined} editable={!busy}
                  onChangeText={value => { const next = password ? value : value.replace(/[^0-9]/g, '').slice(0, 4); setCredential(next); setTouched(current => ({ ...current, credential: true })); updateOperatorValidation(id, next); setNotice(''); }}
                  onBlur={() => setTouched(current => ({ ...current, credential: true }))}
                  placeholder={password ? 'Enter password' : undefined} placeholderTextColor="#A3AFBF"
                  help={password || credential.length === 4 ? undefined : 'Enter exactly 4 numeric digits.'} keyboardType={password ? 'default' : 'number-pad'}
                  autoComplete={password ? 'current-password' : 'off'} autoCapitalize="none" maxLength={password ? undefined : 4} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
              </View>
              <View className="gap-2" style={{ marginTop: tokens.spacing.four, flexShrink: 0 }}>
                <Button loading={busy} onPress={() => void submit()}>Log In</Button>
                {!!notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="font-poppins text-[12px] text-[#B42318]" style={{ lineHeight: 18 * fontScale }}>{notice}</Text>}
                {owner && <View className="flex-row flex-wrap items-center justify-between" style={{ gap: tokens.spacing.two }}>
                  <Button variant="text" fullWidth={false} style={{ flexShrink: 1, maxWidth: '100%' }} disabled={busy} onPress={onBack}
                    icon={({ size }) => <PosIcon name="back" size={size} color={busy ? tokens.button.secondary.disabledText : tokens.color.accentBase} />}>Change Role</Button>
                  {!password && <Button variant="text" textColor={tokens.color.textPrimary} fullWidth={false} style={{ flexShrink: 1, maxWidth: '100%' }} disabled={busy}
                    onPress={() => router.navigate('/forgot-pin')}>Forgot PIN?</Button>}
                </View>}
                {!owner && <View className="flex-row flex-wrap items-center justify-between" style={{ gap: tokens.spacing.two }}>
                  <Button variant="text" fullWidth={false} style={{ flexShrink: 1, maxWidth: '100%' }} disabled={busy} onPress={onBack}
                    icon={({ size }) => <PosIcon name="back" size={size} color={busy ? tokens.button.secondary.disabledText : tokens.color.accentBase} />}>Change Role</Button>
                  <Button variant="text" textColor={tokens.color.textPrimary} fullWidth={false} style={{ flexShrink: 1, maxWidth: '100%' }} disabled={busy}
                    onPress={() => setHelpOpen(true)}>Forgot PIN?</Button>
                </View>}
              </View>
            </>}
          </View>
          <View className="mx-3 mt-4 gap-2 rounded-[10px] border border-[#7399CC] bg-[#D9E7F5CC] px-5 py-4">
            <SettingsIcon name="security" />
            <Text className="font-poppins-bold text-[12px] text-action">One ID, every time</Text>
            <Text className="font-poppins text-[10px] text-brand" style={{ lineHeight: 15 * fontScale }}>Your Owner ID stays the same. Logging in or resetting a PIN never creates a new ID.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    <OperatorPinHelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
  </AuthBackground>;
}
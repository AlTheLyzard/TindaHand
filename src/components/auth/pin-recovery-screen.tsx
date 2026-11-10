import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, Text, View, type TextInputInstance } from 'react-native';
import { useEffect, type ReactNode } from 'react';
import { AuthBackground } from './auth-background';
import { AuthHeader } from './auth-header';
import { RegistrationToast } from './registration-toast';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { authenticationService } from '@/services/authentication';
import { useAuthFlow } from '@/state/auth-flow';
import { validateEmail } from '@/utils/registration';

const backToLogin = () => router.dismissTo({ pathname: '/login', params: { role: 'owner' } });
function RecoveryFrame({ children, onBack = backToLogin }: { children: ReactNode; onBack?: () => void }) {
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => listener.remove();
  }, [onBack]));
  return <AuthBackground><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="w-full max-w-[460px] flex-1 self-center px-6 pb-8 pt-5"><AuthHeader onBack={onBack} />{children}</View>
    </ScrollView>
  </KeyboardAvoidingView></AuthBackground>;
}
function RecoveryHeading({ title, children }: { title: string; children?: ReactNode }) {
  return <View className="mb-8 mt-12 px-2">
    <Text className="font-poppins-bold text-[12px] text-[#2675DB]">OWNER · STORE OWNER</Text>
    <Text accessibilityRole="header" className="mt-2 font-poppins-bold text-[28px] leading-[40px] text-brand">{title}</Text>
    {children && <Text className="mt-2 font-poppins text-[10px] leading-[15px] text-text-secondary">{children}</Text>}
  </View>;
}
function Notice({ children }: { children: string }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="mt-3 font-poppins text-[12px] leading-[18px] text-[#B42318]">{children}</Text>;
}
export function ForgotPinScreen() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const input = useRef<TextInputInstance>(null), locked = useRef(false), active = useRef(true);
  const dismiss = useCallback(() => setToast(null), []);
  useFocusEffect(useCallback(() => { active.current = true; return () => { active.current = false; }; }, []));
  useEffect(() => { if (!sent) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [sent]);
  const seconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  async function send() {
    if (locked.current || (sent && Date.now() < resendAt)) return;
    setTouched(true);
    if (validateEmail(email)) { input.current?.focus(); return; }
    locked.current = true; setBusy(true); setNotice('');
    try {
      const result = await authenticationService.requestPinRecovery({ email });
      if (!active.current) return;
      if (result.ok) { setSent(true); setResendAt(result.value.resendAt); setNow(Date.now()); setToast(Date.now() + 15000); }
      else setNotice(result.message);
    } catch { if (active.current) setNotice('Unable to request recovery. Please try again.'); }
    finally { locked.current = false; if (active.current) setBusy(false); }
  }
  return <RecoveryFrame>
    {!sent ? <>
      <RecoveryHeading title="Forgot PIN?">Enter your registered email address to request a PIN recovery link.</RecoveryHeading>
      <View className="mx-3 gap-3">
        <Text className="font-poppins text-[10px] text-text-secondary">Fields marked * are required.</Text>
        <FormField ref={input} label="Email Address" requiredIndicator="asterisk" value={email} placeholder="name@gmail.com" placeholderTextColor="#A3AFBF"
          onChangeText={value => { setEmail(value); setTouched(true); setNotice(''); }} onBlur={() => setTouched(true)}
          error={touched ? validateEmail(email) : undefined} editable={!busy} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCapitalize="none" returnKeyType="send" onSubmitEditing={() => void send()} />
        {!!notice && <Notice>{notice}</Notice>}
      </View>
      <View className="mt-12 gap-3"><Button loading={busy} onPress={() => void send()}>Send Recovery Link</Button><Button variant="secondary" disabled={busy} onPress={backToLogin}>Back to Login</Button></View>
    </> : <>
      <View className="mt-10"><RegistrationToast expiresAt={toast} onDismiss={dismiss} title="Recovery link requested" message="Check your email for the next steps." /></View>
      <View className="mt-3 items-center px-4">
        <View accessible={false} style={{ width: 100, height: 76, borderWidth: 4, borderColor: '#28549A', borderRadius: 9, overflow: 'hidden' }}>
          <View style={{ width: 68, height: 68, borderWidth: 4, borderColor: '#28549A', transform: [{ rotate: '45deg' }], position: 'absolute', top: -39, left: 12 }} />
          <View style={{ width: 68, height: 68, borderWidth: 3, borderColor: '#28549A', transform: [{ rotate: '45deg' }], position: 'absolute', top: 35, left: 12 }} />
        </View>
        <Text accessibilityRole="header" className="mt-8 text-center font-poppins-bold text-[28px] leading-[40px] text-brand">Check Your Email</Text>
        <Text className="mt-3 text-center font-poppins text-[12px] leading-[20px] text-text-secondary">If an account matches this email, we’ll send a PIN recovery link.</Text>
      </View>
      {!!notice && <Notice>{notice}</Notice>}
      <View className="min-h-24 flex-1" />
      <View className="mt-12 gap-3"><Button onPress={backToLogin}>Back to Login</Button><Button loading={busy} disabled={seconds > 0} variant="secondary" onPress={() => void send()}>{seconds > 0 ? `Resend Recovery Link (${seconds}s)` : 'Resend Recovery Link'}</Button></View>
    </>}
  </RecoveryFrame>;
}
export function ResetPinScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [status, setStatus] = useState<'verifying' | 'ready' | 'invalid'>('verifying');
  const [notice, setNotice] = useState('');
  const [pin, setPin] = useState(''), [confirmPin, setConfirmPin] = useState('');
  const [touched, setTouched] = useState({ pin: false, confirm: false });
  const [busy, setBusy] = useState(false);
  const pinInput = useRef<TextInputInstance>(null), confirmInput = useRef<TextInputInstance>(null);
  const locked = useRef(false), active = useRef(true);
  const flow = useAuthFlow();
  useFocusEffect(useCallback(() => {
    active.current = true;
    let mounted = true;
    setStatus('verifying'); setNotice('');
    void authenticationService.verifyRecoveryToken({ token }).then(result => {
      if (!mounted) return;
      if (result.ok) setStatus('ready'); else { setStatus('invalid'); setNotice(result.message); }
    }).catch(() => { if (mounted) { setStatus('invalid'); setNotice('Unable to verify this link. Please request a new link.'); } });
    return () => { mounted = false; active.current = false; setPin(''); setConfirmPin(''); setTouched({ pin: false, confirm: false }); };
  }, [token]));
  const pinError = !pin ? 'Enter your new PIN.' : /^[0-9]{4}$/.test(pin) ? undefined : 'Enter exactly 4 numeric digits.';
  const confirmError = !confirmPin ? 'Confirm your new PIN.' : !/^[0-9]{4}$/.test(confirmPin) ? 'Enter exactly 4 numeric digits.' : confirmPin !== pin ? 'PINs do not match. Please enter the correct PIN.' : undefined;
  function finish() { router.dismissAll(); router.replace({ pathname: '/login', params: { role: 'owner', pinReset: '1' } }); }
  async function save() {
    if (locked.current || status !== 'ready') return;
    setTouched({ pin: true, confirm: true });
    if (pinError) { pinInput.current?.focus(); return; }
    if (confirmError) { confirmInput.current?.focus(); return; }
    locked.current = true; setBusy(true); setNotice('');
    try {
      const result = await authenticationService.resetOwnerPin({ token, pin });
      if (!active.current) return;
      if (result.ok) { setPin(''); setConfirmPin(''); await flow.refreshSession(); finish(); }
      else { setNotice(result.message); if (['missing', 'invalid', 'used', 'expired'].includes(result.code)) { setStatus('invalid'); setPin(''); setConfirmPin(''); } }
    } catch { if (active.current) setNotice('Unable to save your PIN. Please try again.'); }
    finally { locked.current = false; if (active.current) setBusy(false); }
  }
  return <RecoveryFrame>
    <RecoveryHeading title="Create New PIN">Enter a new four-digit PIN for your Owner account.</RecoveryHeading>
    {status === 'verifying' && <Text accessibilityRole="alert" className="font-poppins text-[14px] text-brand">Verifying recovery link…</Text>}
    {status === 'ready' && <>
      <Text className="mb-4 font-poppins text-[10px] text-text-secondary">Fields marked * are required.</Text>
      <View className="mx-3 gap-6">
        <FormField ref={pinInput} label="New PIN" requiredIndicator="asterisk" pin pinIndicators pinVisibilityToggle value={pin} editable={!busy} error={touched.pin ? pinError : undefined}
          onChangeText={value => { setPin(value.replace(/[^0-9]/g, '').slice(0, 4)); setTouched(current => ({ ...current, pin: true })); }} onBlur={() => setTouched(current => ({ ...current, pin: true }))}
          keyboardType="number-pad" autoComplete="off" textContentType="none" maxLength={4} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => confirmInput.current?.focus()} />
        <FormField ref={confirmInput} label="Confirm New PIN" requiredIndicator="asterisk" pin pinIndicators pinVisibilityToggle value={confirmPin} editable={!busy} error={touched.confirm ? confirmError : undefined}
          onChangeText={value => { setConfirmPin(value.replace(/[^0-9]/g, '').slice(0, 4)); setTouched(current => ({ ...current, confirm: true })); }} onBlur={() => setTouched(current => ({ ...current, confirm: true }))}
          keyboardType="number-pad" autoComplete="off" textContentType="none" maxLength={4} returnKeyType="done" onSubmitEditing={() => void save()} />
      </View>
    </>}
    {!!notice && <Notice>{notice}</Notice>}
    <View className="min-h-24 flex-1" />
    <View className="mt-12 gap-3">
      {status === 'ready' && <Button loading={busy} onPress={() => void save()}>Save New PIN</Button>}
      {status === 'invalid' && <Button onPress={() => router.replace('/forgot-pin')}>Request a New Link</Button>}
      {status === 'invalid' && <Button variant="secondary" onPress={backToLogin}>Back to Login</Button>}
    </View>
  </RecoveryFrame>;
}

/**
 * ReauthModal — session-expired overlay for May-Ari (store owner).
 *
 * Shown automatically when apiFetch receives a 401 (expired JWT).
 * The owner re-enters their password to get a fresh token without
 * losing their place in the app. Only "Sign Out" triggers a full logout.
 *
 * Mount once inside the root layout. It is invisible by default and
 * surfaces itself when the global 401 event fires.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { MotionModal } from '@/components/ui/motion-modal';
import tokens from '@/constants/design-tokens.json';
import { ApiError } from '@/services/api';
import { postReauth } from '@/services/reauth-api';
import { on401 } from '@/services/reauth-event';
import { getOwnerId, getOwnerName, getRole, saveToken } from '@/services/token-storage';
import { useAuthFlow } from '@/state/auth-flow';

export function ReauthModal() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const insets = useSafeAreaInsets();
  const { clear: fullLogout, refreshSession } = useAuthFlow();

  // Subscribe to global 401 signal — show when token expires
  useEffect(() => {
    const unsub = on401(() => {
      // Avoid showing again if already visible (e.g. parallel requests all 401)
      setVisible(prev => {
        if (prev) return prev;
        // Reset form state on each fresh appearance
        setEmail('');
        setPassword('');
        setError(null);
        setTouched(false);
        setBusy(false);
        return true;
      });
    });
    return unsub;
  }, []);

  const handleSignIn = useCallback(async () => {
    setTouched(true);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      const result = await postReauth({ email: trimmedEmail, password });
      // Persist fresh token — keep role, owner name, and owner ID intact
      const [ownerName, ownerId, role] = await Promise.all([getOwnerName(), getOwnerId(), getRole()]);
      await saveToken(result.access_token, ownerName ?? result.full_name, ownerId ?? '', role ?? 'owner');
      // Let auth-flow rebuild the DeviceSession with the fresh token
      await refreshSession(false);
      setVisible(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Incorrect email or password.');
      } else {
        setError('Could not connect. Check your internet and try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [email, password, refreshSession]);

  const handleSignOut = useCallback(() => {
    setVisible(false);
    // Small delay so the modal closes before navigation resets
    setTimeout(() => { fullLogout(); }, 300);
  }, [fullLogout]);

  return (
    <MotionModal
      visible={visible}
      onRequestClose={() => { /* back button should not dismiss — must sign in or sign out */ }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: '100%',
              maxWidth: 412,
              backgroundColor: tokens.color.surfaceCard,
              borderRadius: tokens.radius.card,
              padding: 24,
              gap: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            {/* Header */}
            <View style={{ gap: 6 }}>
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: 'Poppins_600SemiBold',
                  fontSize: 18,
                  color: tokens.color.darkNavy,
                  lineHeight: 24,
                }}
              >
                Session Expired
              </Text>
              <Text
                style={{
                  fontFamily: 'Poppins_400Regular',
                  fontSize: 13,
                  color: tokens.color.textSecondary,
                  lineHeight: 20,
                }}
              >
                Your session has expired. Enter your password to continue where you left off.
              </Text>
            </View>

            {/* Email field */}
            <FormField
              label="Email"
              value={email}
              onChangeText={v => { setEmail(v); if (touched) setError(null); }}
              placeholder="your@email.com"
              placeholderTextColor={tokens.color.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!busy}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            {/* Password field */}
            <FormField
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={v => { setPassword(v); if (touched) setError(null); }}
              placeholder="Your account password"
              placeholderTextColor={tokens.color.textDisabled}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              error={touched && error ? error : undefined}
            />

            {/* Error message (shown only if not on password field) */}
            {touched && error && !password && (
              <Text
                accessibilityRole="alert"
                style={{
                  fontFamily: 'Poppins_400Regular',
                  fontSize: 12,
                  color: tokens.color.errorBase,
                  lineHeight: 18,
                }}
              >
                {error}
              </Text>
            )}

            {/* Continue button */}
            <Button
              onPress={handleSignIn}
              loading={busy}
              disabled={busy}
            >
              Continue
            </Button>

            {/* Sign out link */}
            <TouchableOpacity
              onPress={handleSignOut}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              style={{ alignItems: 'center', paddingVertical: 4 }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins_500Medium',
                  fontSize: 13,
                  color: busy ? tokens.color.textDisabled : tokens.color.textSecondary,
                  textDecorationLine: 'underline',
                }}
              >
                Sign out instead
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </MotionModal>
  );
}

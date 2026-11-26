/**
 * KaheraChangePinScreen
 *
 * Shown when Kahera logs in with a temporary PIN (pin_is_temporary=true).
 * She must set a new permanent PIN before she can access the POS.
 * Uses the Kahera's own JWT (already saved in token storage at this point).
 */
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { KeyboardViewport as KeyboardAvoidingView, KeyboardAwareScrollView as ScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import tokens from "@/constants/design-tokens.json";
import { kaheraChangePin } from "@/services/settings";
import { useAuthFlow } from "@/state/auth-flow";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { AuthBackground } from "./auth-background";
import { AuthHeader } from "./auth-header";

export function KaheraChangePinScreen({ onSuccess }: { onSuccess: () => void }) {
  const flow = useAuthFlow();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);

  const submit = useCallback(async () => {
    if (locked.current) return;
    setError('');

    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match. Please re-enter.');
      return;
    }

    locked.current = true;
    setBusy(true);
    try {
      await kaheraChangePin(newPin);
      // Refresh session so the app picks up the cleared pin_is_temporary flag.
      await flow.refreshSession();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save PIN. Check your connection and try again.';
      setError(msg);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, [newPin, confirmPin, flow, onSuccess]);

  return (
    <AuthBackground>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <AuthHeader />

          <View style={{ flex: 1, justifyContent: 'center', gap: 24, paddingTop: 16 }}>
            {/* Icon / badge */}
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: tokens.color.royalBlue + '1A',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 36 }}>🔐</Text>
              </View>
            </View>

            <View style={{ gap: 6, alignItems: 'center' }}>
              <Text style={{
                fontFamily: 'Poppins_600SemiBold',
                fontSize: 20,
                color: tokens.color.darkNavy,
                textAlign: 'center',
              }}>
                Set Your New PIN
              </Text>
              <Text style={{
                fontFamily: 'Poppins_400Regular',
                fontSize: 14,
                color: tokens.color.textSecondary,
                textAlign: 'center',
                lineHeight: 20,
              }}>
                Your May-Ari has set a temporary PIN for you.{'\n'}
                Please create a new permanent PIN to continue.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <FormField
                label="New PIN"
                value={newPin}
                onChangeText={setNewPin}
                pin
                pinVisibilityToggle
                keyboardType="number-pad"
                maxLength={4}
                placeholder="4-digit PIN"
                editable={!busy}
              />
              <FormField
                label="Confirm New PIN"
                value={confirmPin}
                onChangeText={setConfirmPin}
                pin
                pinVisibilityToggle
                keyboardType="number-pad"
                maxLength={4}
                placeholder="Repeat PIN"
                editable={!busy}
              />
            </View>

            {!!error && (
              <Text style={{
                fontFamily: 'Poppins_400Regular',
                fontSize: 13,
                color: tokens.color.errorBase ?? '#D32F2F',
                textAlign: 'center',
              }}>
                {error}
              </Text>
            )}

            <Button loading={busy} disabled={busy} onPress={() => void submit()}>
              Save New PIN
            </Button>

            <Text style={{
              fontFamily: 'Poppins_400Regular',
              fontSize: 12,
              color: tokens.color.textSecondary,
              textAlign: 'center',
              lineHeight: 18,
            }}>
              You must set a new PIN before you can use the POS.{'\n'}
              Contact your May-Ari if you need help.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

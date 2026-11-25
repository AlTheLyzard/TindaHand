import { SettingsIcon } from "@/components/settings/settings-icon";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  KeyboardViewport as KeyboardAvoidingView,
  KeyboardAwareScrollView as ScrollView,
} from "@/components/ui/keyboard-aware-scroll-view";
import tokens from "@/constants/design-tokens.json";
import { loginKahera, loginOwner } from "@/services/mock-auth";
import {
  markHasKaheras,
  markHasOwner,
  saveToken,
} from "@/services/token-storage";
import { useAuthFlow } from "@/state/auth-flow";
import type { AccountRole } from "@/types/auth";
import { validateLogin } from "@/utils/account-access";
import { editOwnerId, type InputSelection } from "@/utils/owner-id";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  BackHandler,
  Keyboard,
  Platform,
  Text,
  View,
  useWindowDimensions,
  type TextInputInstance,
} from "react-native";
import { AuthBackground } from "./auth-background";
import { AuthHeader } from "./auth-header";
import { OperatorPinHelpModal } from "./operator-pin-help-modal";

type OperatorLoginState = "idle" | "invalid" | "submitting" | "failed";

/** One shared form for new-device password login, returning PIN unlock and Operator login. */
export function RoleLoginScreen({
  role,
  onBack,
  onSuccess,
  pinReset = false,
}: {
  role: AccountRole;
  onBack: () => void;
  onSuccess: () => void;
  pinReset?: boolean;
}) {
  const flow = useAuthFlow();
  const { fontScale } = useWindowDimensions();
  const owner = role === "owner";
  const [id, setId] = useState("");
  const rememberedId = undefined; // ID is always typed by the user — never auto-filled or locked
  const [credential, setCredential] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ id: false, credential: false });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [operatorState, setOperatorState] =
    useState<OperatorLoginState>("idle");
  const [helpOpen, setHelpOpen] = useState(false);
  const [idSelection, setIdSelection] = useState<InputSelection>();
  const selection = useRef<InputSelection>({ start: 0, end: 0 });
  // On Android, onSelectionChange can fire with the OLD position after onChangeText
  // has already committed a new caret. We hold the target selection in pendingIdRestore
  // and also remember the formatted text it was computed for. If the text has changed
  // since we set the pending restore (e.g. a dash was inserted by formatOwnerId),
  // the position offsets are stale — discard them and trust the reported position.
  const pendingIdRestore = useRef<
    { selection: InputSelection; forText: string } | undefined
  >(undefined);
  const idInput = useRef<TextInputInstance>(null),
    credentialInput = useRef<TextInputInstance>(null);
  const locked = useRef(false),
    active = useRef(true);
  const password = false;
  const validation = validateLogin(id, password ? "0000" : credential);
  const credentialError = password
    ? !credential
      ? "Enter your password."
      : undefined
    : validation.pin;
  function updateOperatorValidation(nextId: string, nextCredential: string) {
    if (owner || !submitted) return;
    const next = validateLogin(nextId, nextCredential);
    setOperatorState(next.id || next.pin ? "invalid" : "idle");
  }
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      locked.current = false;
      setBusy(false);
      setOperatorState("idle");
      setHelpOpen(false);
      const back = BackHandler.addEventListener("hardwareBackPress", () => {
        onBack();
        return true;
      });
      return () => {
        active.current = false;
        back.remove();
        setCredential("");
        setNotice("");
        setSubmitted(false);
        setOperatorState("idle");
        setHelpOpen(false);
        setTouched({ id: false, credential: false });
      };
    }, [onBack]),
  );

  async function submit() {
    if (locked.current || flow.restoring) return;
    setSubmitted(true);
    if (validation.id) {
      if (!owner) setOperatorState("invalid");
      idInput.current?.focus();
      return;
    }
    if (credentialError) {
      if (!owner) setOperatorState("invalid");
      credentialInput.current?.focus();
      return;
    }
    locked.current = true;
    setBusy(true);
    if (!owner) setOperatorState("submitting");
    setNotice("");
    Keyboard.dismiss();
    let completed = false;
    try {
      if (role === "owner") {
        const result = await loginOwner(id, credential);
        if (!active.current) return;
        if (result.status === "ok") {
          // The owner typed their ID into the form — use it directly.
          // Normalize to uppercase TH-MA-XXXX format.
          const ownerId = id.trim().toUpperCase();
          await saveToken(result.token, result.name, ownerId, "owner");
          await markHasOwner();
          setCredential("");
          await flow.refreshSession();
          flow.setSelectedRole(role);
          flow.notifyLogin();
          completed = true;
          onSuccess();
        } else if (result.status === "locked") {
          setNotice(
            "Account locked due to too many failed attempts. Try again later.",
          );
        } else if (result.status === "invalid") {
          setNotice("Invalid ID or PIN. Check your credentials and try again.");
        } else {
          setNotice("Unable to log in. Please try again.");
        }
        return;
      }
      // Kahera (operator) login — real API
      const result = await loginKahera(id, credential);
      if (!active.current) return;
      if (result.status === "ok") {
        await saveToken(
          result.token,
          result.name,
          result.ownerId,
          "cashier",
          result.kaheraId,
        );
        await markHasKaheras();
        setCredential('');
        // showRestoring=true keeps the operator-pos layout in its "loading" state
        // while the new Kahera session is being built, preventing a premature
        // redirect back to choose-account.
        await flow.refreshSession(true);
        flow.setSelectedRole(role);
        flow.notifyLogin();
        completed = true;
        onSuccess();
      } else if (result.status === "locked") {
        setOperatorState("failed");
        setNotice(
          "Account locked due to too many failed attempts. Try again later.",
        );
      } else if (result.status === "notFound") {
        setOperatorState("invalid");
        setNotice(
          "No active Kahera found for this store. Ask your May-Ari to set up your account.",
        );
      } else if (result.status === "invalid") {
        setOperatorState("invalid");
        setNotice(
          "Invalid May-Ari ID or PIN. Check your credentials and try again.",
        );
      } else {
        setOperatorState("failed");
        setNotice("Unable to log in. Please try again.");
      }
    } catch {
      if (active.current) {
        if (!owner) setOperatorState("failed");
        setNotice("Unable to log in. Please try again.");
      }
    } finally {
      if (!completed) {
        locked.current = false;
        if (active.current) setBusy(false);
      }
    }
  }

  const identity = undefined; // No static identity display — user always types their ID
  const pinIdentity = !password && owner && rememberedId ? identity : undefined;
  const pinLoginButtonHeight = Math.max(
    tokens.button.height,
    tokens.button.lineHeight * fontScale + tokens.button.paddingVertical * 2,
  );
  return (
    <AuthBackground headerWave>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            className="w-full max-w-[460px] self-center px-6 pb-5 pt-5"
            style={{ flexGrow: 1, flexShrink: 0 }}
          >
            <AuthHeader onBack={onBack} backDisabled={busy} />
            {pinReset && (
              <Text
                accessibilityRole="alert"
                className="mt-3 font-poppins text-[12px] text-[#1D5D21]"
              >
                PIN reset successfully.
              </Text>
            )}
            <View className="mt-16 px-2" style={{ flexShrink: 0 }}>
              <Text
                accessibilityRole="header"
                className="type-large-metric text-brand"
                style={{ lineHeight: 42 * fontScale }}
              >
                {owner ? "May-Ari Login" : "Kahera Login"}
              </Text>
              <Text
                className="mt-2 type-helper text-text-secondary"
                style={{ lineHeight: 15 * fontScale }}
              >
                {password
                  ? rememberedId
                    ? "Log in with your password to authenticate this device."
                    : "Log in with your permanent May-Ari ID and password to authenticate this device."
                  : owner
                    ? "Welcome back. Log in with your permanent May-Ari ID and PIN to access your store dashboard."
                    : rememberedId
                      ? "Log in with your assigned four-digit PIN."
                      : "Log in with the May-Ari ID for your store and your role's four-digit PIN."}
              </Text>
              {flow.restoring ? (
                <Text
                  accessibilityRole="alert"
                  className="mt-5 type-micro-caption text-brand"
                >
                  Restoring login details…
                </Text>
              ) : (
                <>
                  <View
                    className="px-3"
                    style={{
                      marginTop: 12,
                      gap: tokens.spacing.three,
                      flexShrink: 0,
                    }}
                  >
                    {(!rememberedId || !owner) && (
                      <FormField
                        ref={idInput}
                        label={owner ? "May-Ari ID" : "May-Ari ID"}
                        requiredIndicator="asterisk"
                        value={id}
                        error={
                          owner
                            ? submitted || touched.id
                              ? validation.id
                              : undefined
                            : submitted && operatorState === "invalid"
                              ? validation.id
                              : undefined
                        }
                        editable={!busy}
                        help={
                          owner
                            ? "Enter your permanent May-Ari ID."
                            : "Enter your store's May-Ari ID."
                        }
                        placeholder="TH-MA-0001"
                        placeholderTextColor={tokens.color.textDisabled}
                        selection={idSelection}
                        onSelectionChange={(event) => {
                          const reported = event.nativeEvent.selection;
                          const pending = pendingIdRestore.current;
                          if (pending) {
                            // If the text has changed since we computed the restore target,
                            // the position offsets are stale — drop the pending and trust Android.
                            if (pending.forText !== id) {
                              pendingIdRestore.current = undefined;
                              selection.current = reported;
                              setIdSelection(undefined);
                            } else if (
                              reported.start === pending.selection.start &&
                              reported.end === pending.selection.end
                            ) {
                              // Android caught up — the caret is exactly where we wanted it.
                              pendingIdRestore.current = undefined;
                              setIdSelection(undefined);
                            }
                            // Otherwise still waiting for the restore to land; ignore the report.
                          } else {
                            selection.current = reported;
                            setIdSelection((current) =>
                              current?.start === reported.start &&
                              current.end === reported.end
                                ? undefined
                                : current,
                            );
                          }
                        }}
                        onChangeText={(value) => {
                          const edit = editOwnerId(
                            id,
                            value,
                            selection.current,
                          );
                          setId(edit.text);
                          selection.current = edit.selection;
                          pendingIdRestore.current = {
                            selection: edit.selection,
                            forText: edit.text,
                          };
                          setIdSelection(edit.selection);
                          setTouched((current) => ({ ...current, id: true }));
                          updateOperatorValidation(edit.text, credential);
                          setNotice("");
                        }}
                        onBlur={() =>
                          setTouched((current) => ({ ...current, id: true }))
                        }
                        autoCapitalize="characters"
                        smartInsertDelete={false}
                        autoComplete="username"
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => credentialInput.current?.focus()}
                      />
                    )}
                    {pinIdentity}
                    <FormField
                      ref={credentialInput}
                      label={password ? "Password" : "PIN"}
                      requiredIndicator="asterisk"
                      value={credential}
                      leadingContent={pinIdentity ? undefined : identity}
                      keyboardScrollAfter={
                        pinIdentity
                          ? pinLoginButtonHeight + tokens.spacing.four
                          : 0
                      }
                      allowFontScaling
                      password={password}
                      pin={!password}
                      pinIndicators={!password}
                      pinVisibilityToggle={!password && credential.length > 0}
                      pinLengthIndicator={!password && credential.length === 0}
                      error={
                        owner
                          ? submitted || touched.credential
                            ? credentialError
                            : undefined
                          : submitted && operatorState === "invalid"
                            ? credentialError
                            : undefined
                      }
                      editable={!busy}
                      onChangeText={(value) => {
                        const next = password
                          ? value
                          : value.replace(/[^0-9]/g, "").slice(0, 4);
                        setCredential(next);
                        setTouched((current) => ({
                          ...current,
                          credential: true,
                        }));
                        updateOperatorValidation(id, next);
                        setNotice("");
                      }}
                      onBlur={() =>
                        setTouched((current) => ({
                          ...current,
                          credential: true,
                        }))
                      }
                      placeholder={password ? "Enter password" : undefined}
                      placeholderTextColor={tokens.color.textDisabled}
                      help={
                        password || credential.length === 4
                          ? undefined
                          : "Enter your PIN · exactly 4 numeric digits."
                      }
                      keyboardType={password ? "default" : "number-pad"}
                      autoComplete={password ? "current-password" : "off"}
                      autoCapitalize="none"
                      maxLength={password ? undefined : 4}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>
                  <View
                    className="gap-2"
                    style={{ marginTop: tokens.spacing.four, flexShrink: 0 }}
                  >
                    <Button loading={busy} onPress={() => void submit()}>
                      Log In
                    </Button>
                    {!!notice && (
                      <Text
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite"
                        className=" type-micro-caption text-error-base"
                        style={{ lineHeight: 18 * fontScale }}
                      >
                        {notice}
                      </Text>
                    )}
                    {owner && (
                      <View
                        className="flex-row flex-wrap items-center justify-between"
                        style={{ gap: tokens.spacing.two }}
                      >
                        <Button
                          variant="text"
                          fullWidth={false}
                          style={{ flexShrink: 1, maxWidth: "100%" }}
                          disabled={busy}
                          onPress={onBack}
                        >
                          Change Role
                        </Button>
                        {!password && (
                          <Button
                            variant="text"
                            textColor={tokens.color.textPrimary}
                            fullWidth={false}
                            style={{ flexShrink: 1, maxWidth: "100%" }}
                            disabled={busy}
                            onPress={() => router.navigate("/forgot-pin")}
                          >
                            Forgot PIN?
                          </Button>
                        )}
                      </View>
                    )}
                    {!owner && (
                      <View
                        className="flex-row flex-wrap items-center justify-between"
                        style={{ gap: tokens.spacing.two }}
                      >
                        <Button
                          variant="text"
                          fullWidth={false}
                          style={{ flexShrink: 1, maxWidth: "100%" }}
                          disabled={busy}
                          onPress={onBack}
                        >
                          Change Role
                        </Button>
                        <Button
                          variant="text"
                          textColor={tokens.color.textPrimary}
                          fullWidth={false}
                          style={{ flexShrink: 1, maxWidth: "100%" }}
                          disabled={busy}
                          onPress={() => setHelpOpen(true)}
                        >
                          Forgot PIN?
                        </Button>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
            <View className="mx-3 mt-4 gap-2 rounded-[10px] border border-bright-blue bg-ice-container px-4 py-3">
              <View className="flex-row items-center gap-2">
                <SettingsIcon name="security" />
                <Text className="type-label-nav leading-[18px] text-action">
                One ID, every time!
                </Text>
              </View>
              <Text
                className=" type-helper text-brand"
                style={{ lineHeight: 15 * fontScale }}
              >
                Your ID stays the same. Logging in never creates a new May-Ari ID.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <OperatorPinHelpModal
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </AuthBackground>
  );
}

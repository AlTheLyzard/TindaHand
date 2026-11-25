import tokens from '@/constants/design-tokens.json';
import { RegistrationToast } from "@/components/auth/registration-toast";
import { PosDialog } from "@/components/pos/pos-dialog";
import { PosIcon } from "@/components/pos/pos-icon";
import { CredentialForm } from "@/components/settings/credential-form";
import { SettingsCard } from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { MotionPressable as Pressable } from "@/components/ui/motion-pressable";
import { useKaheraList } from "@/hooks/use-kahera-list";
import { useProfileSnapshot } from "@/hooks/use-owner-profile";
import { authenticationService } from "@/services/authentication";
import { createKahera } from "@/services/kahera-api";
import { MOCK_AUTH_ENABLED } from "@/config/mock-auth";
import { updateCashier, getCashierPermissions, updateCashierPermissions, setTempCashierPin } from "@/services/settings";
import { useAuthFlow } from "@/state/auth-flow";
import { useSettings } from "@/state/settings";
import type { OperatorPermission } from "@/types/auth";
import type { AvatarId } from "@/types/profile";
import type { Cashier } from "@/types/settings";
import {
  permissionGroups,
  updatePermission,
  type PermissionGroup,
} from "@/utils/operator-access";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { ProfileFrame, operatorsRoot } from "./profile-frame";
import {
  AccountBadge,
  ProfileAvatar,
  ProfileError,
  ProfileNotice,
  ProfileText,
} from "./profile-ui";

function OperatorIdentity({ operator }: { operator: Cashier }) {
  return (
    <View className="flex-row flex-wrap items-center gap-3">
      <ProfileAvatar avatarId={operator.avatarId} size={48} />
      <View className="min-w-[110px] flex-1">
        <ProfileText bold>{operator.name}</ProfileText>
      </View>
      <AccountBadge status={operator.status} />
    </View>
  );
}
function openOperator(id: string) {
  router.push({
    pathname: "/owner-menu/profile/operators/[operatorId]",
    params: { operatorId: id },
  });
}

export function OperatorListScreen() {
  const { owner } = useAuthFlow();
  const profiles = useProfileSnapshot();
  const { cashiers: operators } = useKaheraList();
  if (!owner) return null;
  const storeName = profiles.get(owner.id)?.storeName;
  return (
    <ProfileFrame title="Kahera Management" subtitle="Control access to your store"
      footer={<Button onPress={() => router.push(`${operatorsRoot}/new`)}>Add Kahera</Button>}>
      <View className="mt-4 gap-3">
        {operators.length ? (
          operators.map((operator) => (
            <Pressable
              key={operator.id}
              accessibilityRole="button"
              accessibilityLabel={`View Account for ${operator.name}, ${operator.status}`}
              className="rounded-control active:opacity-90"
              style={{
                shadowColor: tokens.color.darkNavy,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.16,
                shadowRadius: 5,
                elevation: 4,
              }}
              onPress={() => openOperator(operator.id)}
            >
              <SettingsCard>
                <OperatorIdentity operator={operator} />
                <View className="mt-3 min-h-12 flex-row items-center gap-3">
                <View className="flex-1">
                  <ProfileText bold>View Account</ProfileText>
                  <ProfileText small>
                    Permissions and PIN management
                  </ProfileText>
                </View>
                <PosIcon name="chevronRight" size={20} color={tokens.color.royalBlue} />
                </View>
              </SettingsCard>
            </Pressable>
          ))
        ) : (
          <SettingsCard>
            <View className="py-4">
              <ProfileAvatar size={72} />
              <Text
                accessibilityRole="header"
                className="mb-3 mt-4 type-title-accent leading-[32px] text-brand"
              >
                No operators yet
              </Text>
              <ProfileText>
                Add an operator to help with daily store operations.
              </ProfileText>
            </View>
          </SettingsCard>
        )}
      </View>
      <View className="mt-4">
        <ProfileNotice title="May-Ari access only">
          Manage accounts linked to {storeName || "your store"}.
        </ProfileNotice>
      </View>
    </ProfileFrame>
  );
}
export function OperatorDetailsScreen() {
  const { operatorId, created } = useLocalSearchParams<{
    operatorId?: string;
    created?: string;
  }>();
  const { owner } = useAuthFlow();
  const { cashiers } = useKaheraList();
  const operator = owner
    ? cashiers.find((item) => item.id === operatorId)
    : null;
  if (!operator)
    return (
      <ProfileFrame title="View Account">
        <ProfileError message="This Kahera is unavailable or does not belong to your store." />
        <Button onPress={() => router.dismissTo(operatorsRoot)}>
          Back to Kahera Management
        </Button>
      </ProfileFrame>
    );
  return (
    <OperatorDetails
      key={operator.id}
      operator={operator}
      created={created === "1"}
    />
  );
}
function OperatorDetails({
  operator,
  created,
}: {
  operator: Cashier;
  created: boolean;
}) {
  const service = useSettings();
  // For mock sessions, canonical permissions come from the in-memory service.
  // For real sessions, we fetch from the backend and store in realPermissions.
  const mockCanonical = service.operatorPermissions(operator.id);
  const [realPermissions, setRealPermissions] = useState<
    readonly OperatorPermission[] | null
  >(null);
  const canonical: readonly OperatorPermission[] = MOCK_AUTH_ENABLED
    ? mockCanonical
    : (realPermissions ?? []);
  const [optimistic, setOptimistic] = useState<
    readonly OperatorPermission[] | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failure, setFailure] = useState("");
  const [retry, setRetry] = useState<{
    group: PermissionGroup;
    allowed: boolean;
  } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [toast, setToast] = useState<number | null>(() =>
    created ? Date.now() + 15000 : null,
  );
  const dismissToast = useCallback(() => setToast(null), []);
  const lock = useRef(false);
  const active = useRef(true);
  useEffect(
    () => () => {
      active.current = false;
    },
    [],
  );

  // Real sessions: load persisted permissions from the backend on mount.
  useEffect(() => {
    if (MOCK_AUTH_ENABLED) return;
    let mounted = true;
    getCashierPermissions(operator.id)
      .then(perms => {
        if (mounted) setRealPermissions(perms as readonly OperatorPermission[]);
      })
      .catch(() => {
        // Silently fall back to empty list; user will see all toggles off.
        if (mounted) setRealPermissions([]);
      });
    return () => { mounted = false; };
  }, [operator.id]);

  const permissions = optimistic ?? canonical;
  const inactive = operator.status === "inactive";
  async function changePermission(group: PermissionGroup, allowed: boolean) {
    if (lock.current || inactive) return;
    lock.current = true;
    setSaving(true);
    setFailure("");
    setRetry(null);
    setFeedback("Saving…");
    const nextPermissions = updatePermission(canonical, group, allowed);
    setOptimistic(nextPermissions);
    try {
      if (MOCK_AUTH_ENABLED) {
        const result = await authenticationService.setOperatorPermission({
          operatorId: operator.id,
          group,
          allowed,
        });
        if (!active.current) return;
        if (!result.ok) {
          setFailure(result.message);
          setRetry({ group, allowed });
          setFeedback("");
        } else {
          setFeedback("Saved");
        }
      } else {
        const saved = await updateCashierPermissions(operator.id, nextPermissions);
        if (!active.current) return;
        setRealPermissions(saved as readonly OperatorPermission[]);
        setFeedback("Saved");
      }
    } catch {
      if (active.current) {
        setFailure(
          "Permission update failed. The previous setting has been restored.",
        );
        setRetry({ group, allowed });
        setFeedback("");
      }
    } finally {
      lock.current = false;
      if (active.current) {
        setSaving(false);
        setOptimistic(null);
      }
    }
  }
  async function changeStatus() {
    if (lock.current) return;
    lock.current = true;
    setConfirm(false);
    setStatusBusy(true);
    setStatusError("");
    try {
      if (MOCK_AUTH_ENABLED) {
        const result = await authenticationService.setOperatorActive({
          operatorId: operator.id,
          active: inactive,
        });
        if (!active.current) return;
        if (!result.ok) { setStatusError(result.message); return; }
      } else {
        await updateCashier(operator.id, { isActive: inactive });
        if (!active.current) return;
      }
      setFeedback(
        inactive
          ? "Operator reactivated with saved permissions."
          : "Operator deactivated. Stored permissions and transaction history are preserved.",
      );
    } catch {
      if (active.current)
        setStatusError("Unable to change account status. Please retry.");
    } finally {
      lock.current = false;
      if (active.current) setStatusBusy(false);
    }
  }
  return (
    <ProfileFrame title="View Account" busy={statusBusy} footer={<>
      {!!statusError && <ProfileError message={statusError} retry={() => setConfirm(true)} />}
      <Button
        variant={inactive ? "primary" : "destructive"}
        disabled={saving}
        loading={statusBusy}
        onPress={() => setConfirm(true)}
      >
        {inactive ? "Reactivate Account" : "Deactivate Account"}
      </Button>
    </>}>
      {created && (
        <RegistrationToast
          expiresAt={toast}
          onDismiss={dismissToast}
          title="Operator created"
          message={`${operator.name} can log in with the May-Ari ID and assigned PIN.`}
        />
      )}
      <SettingsCard>
        <OperatorIdentity operator={operator} />
        <View className="mt-4 gap-1">
          <ProfileText small bold>Linked Owner ID</ProfileText>
          <ProfileText>{operator.ownerId}</ProfileText>
        </View>
      </SettingsCard>
      <View className="mt-4">
        <SettingsCard>
        {permissionGroups.map((group, index) => {
          const checked =
            !inactive &&
            group.capabilities.every((capability) =>
              permissions.includes(capability),
            );
          return (
            <View
              key={group.id}
              className={`min-h-[70px] flex-row items-center gap-3 py-3 ${index ? "border-t border-outline" : ""}`}
            >
              <View className="min-w-0 flex-1">
                <ProfileText bold>{group.title}</ProfileText>
                <ProfileText small>{group.description}</ProfileText>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel={`${group.title} for ${operator.name}`}
                accessibilityHint={
                  inactive
                    ? "Reactivate this account to change permissions."
                    : "Saves immediately"
                }
                accessibilityState={{
                  checked,
                  disabled: inactive || saving || statusBusy,
                }}
                aria-checked={checked}
                aria-disabled={inactive || saving || statusBusy}
                disabled={inactive || saving || statusBusy}
                onPress={() => void changePermission(group.id, !checked)}
                className="min-h-12 min-w-12 items-center justify-center rounded-control focus:outline focus:outline-2 focus:outline-action"
              >
                <View
                  accessible={false}
                  style={{
                    width: 38,
                    height: 22,
                    borderRadius: 11,
                    padding: 2,
                    backgroundColor: inactive
                      ? tokens.color.surfaceSubtle
                      : checked
                        ? tokens.color.royalBlue
                        : tokens.color.surfaceSubtle,
                    justifyContent: "center",
                    alignItems: checked ? "flex-end" : "flex-start",
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: inactive ? tokens.color.textDisabled : tokens.color.surfaceCard,
                    }}
                  />
                </View>
              </Pressable>
            </View>
          );
        })}
        </SettingsCard>
      </View>
      {!!feedback && (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-2 type-micro-caption leading-[18px] text-success-base"
        >
          {feedback}
        </Text>
      )}
      {!!failure && (
        <ProfileError
          message={failure}
          retry={
            retry
              ? () => void changePermission(retry.group, retry.allowed)
              : undefined
          }
        />
      )}
      <View className="mt-4">
        <ProfileNotice title="Reserved for the May-Ari">
          Financial statements, store debts, expenses and access control cannot
          be assigned. Inventory excludes creating/deleting products and
          modifying assets.
        </ProfileNotice>
      </View>
      {inactive && (
        <View className="mt-3">
          <ProfileNotice title="Account inactive">
            Access is blocked. Saved permissions will be restored on
            reactivation.
          </ProfileNotice>
        </View>
      )}
      <PosDialog
        visible={confirm}
        title={
          inactive ? "Reactivate this Account?" : "Deactivate this Account?"
        }
        message={
          inactive
            ? `Are you sure you want to reactivate this operator's account?`
            : "Are you sure you want to deactivate this operator's account? They will lose access to TindaHand."
        }
        confirmLabel={inactive ? "Reactivate Account" : "Deactivate"}
        cancelLabel={inactive ? "Cancel" : "Keep Active"}
        destructive={!inactive}
        onClose={() => setConfirm(false)}
        onConfirm={() => void changeStatus()}
      />
    </ProfileFrame>
  );
}

export function AddOperatorScreen() {
  const { owner } = useAuthFlow();
  if (!owner) return null;
  return (
    <ProfileFrame
      title="Add Operator"
      subtitle="Add an operator to help you manage your store."
      onBack={() => router.dismissTo(operatorsRoot)}
    >
      <ProfileNotice title="Linked May-Ari ID">
        {owner.name} · {owner.id}
      </ProfileNotice>
      <View className="mt-5 flex-1">
        <CredentialForm
          mode="create"
          fieldsCard
          onCancel={() => router.dismissTo(operatorsRoot)}
          onSave={async (values) => {
            const result = await createKahera({
              name: values.name,
              pin: values.pin,
            });
            if (!result.ok) return result;
            const operator: Cashier = {
              id: result.value.id,
              ownerId: result.value.ownerId,
              name: result.value.name,
              status: result.value.status,
              avatarId: (result.value.avatarId ?? "avatar-01") as AvatarId,
            };
            return { ok: true as const, value: operator };
          }}
          onSuccess={(operator) =>
            router.replace({
              pathname: "/owner-menu/profile/operators/[operatorId]",
              params: { operatorId: operator.id, created: "1" },
            })
          }
        />
      </View>
      <ProfileText small>
        Kahera login uses the May-Ari ID and assigned four-digit PIN. Active
        Kaheras in a store must have distinct PINs.
      </ProfileText>
    </ProfileFrame>
  );
}
export function ResetOperatorPinScreen() {
  const { operatorId } = useLocalSearchParams<{ operatorId?: string }>();
  const { owner } = useAuthFlow();
  const { cashiers } = useKaheraList();
  const operator = owner
    ? cashiers.find((item) => item.id === operatorId)
    : null;
  const [toast, setToast] = useState<number | null>(null);
  const [ownerPin, setOwnerPin] = useState('');
  const [tempPin, setTempPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dismiss = useCallback(() => setToast(null), []);

  async function save() {
    setError('');
    if (!ownerPin || ownerPin.length !== 4) { setError('Enter your 4-digit May-Ari PIN.'); return; }
    if (!tempPin || tempPin.length !== 4)   { setError('Enter a 4-digit temporary PIN for Kahera.'); return; }
    if (tempPin !== confirmPin)              { setError('Temporary PINs do not match.'); return; }
    if (!operator) return;
    setBusy(true);
    try {
      await setTempCashierPin(operator.id, ownerPin, tempPin);
      setOwnerPin('');
      setTempPin('');
      setConfirmPin('');
      setToast(Date.now() + 15000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not set temporary PIN. Please try again.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfileFrame
      title="Set Temporary PIN"
      subtitle="Kahera will be prompted to create a new PIN when they next log in."
    >
      {!operator ? (
        <ProfileError message="Kahera unavailable in this store." />
      ) : (
        <>
          <SettingsCard>
            <OperatorIdentity operator={operator} />
          </SettingsCard>
          {toast !== null && (
            <RegistrationToast
              expiresAt={toast}
              onDismiss={dismiss}
              title="Temporary PIN set"
              message={`${operator.name} will be asked to set a new PIN on next login.`}
            />
          )}
          <View className="mt-5 gap-4">
            <SettingsCard>
              <ProfileText small bold>Your May-Ari PIN</ProfileText>
              <FormField
                label="May-Ari PIN"
                value={ownerPin}
                onChangeText={setOwnerPin}
                pin
                keyboardType="number-pad"
                maxLength={4}
                placeholder="Your 4-digit PIN"
                editable={!busy}
              />
            </SettingsCard>
            <SettingsCard>
              <ProfileText small bold>Temporary PIN for {operator.name}</ProfileText>
              <FormField
                label="Temporary PIN"
                value={tempPin}
                onChangeText={setTempPin}
                pin
                keyboardType="number-pad"
                maxLength={4}
                placeholder="4-digit temporary PIN"
                editable={!busy}
              />
              <FormField
                label="Confirm Temporary PIN"
                value={confirmPin}
                onChangeText={setConfirmPin}
                pin
                keyboardType="number-pad"
                maxLength={4}
                placeholder="Repeat temporary PIN"
                editable={!busy}
              />
            </SettingsCard>
            {!!error && <ProfileError message={error} />}
            <ProfileNotice title="How this works">
              Kahera logs in with this temporary PIN, then must immediately set a new permanent PIN before accessing the POS. Tell Kahera the temporary PIN in person.
            </ProfileNotice>
            <View className="gap-3">
              <Button loading={busy} disabled={busy} onPress={() => void save()}>
                Set Temporary PIN
              </Button>
              <Button variant="ghost" disabled={busy} onPress={() => router.back()}>
                Cancel
              </Button>
            </View>
          </View>
        </>
      )}
    </ProfileFrame>
  );
}

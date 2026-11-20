import { RegistrationToast } from "@/components/auth/registration-toast";
import { PosDialog } from "@/components/pos/pos-dialog";
import { PosIcon } from "@/components/pos/pos-icon";
import { CredentialForm } from "@/components/settings/credential-form";
import { SettingsCard } from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { MotionPressable as Pressable } from "@/components/ui/motion-pressable";
import { useKaheraList } from "@/hooks/use-kahera-list";
import { useProfileSnapshot } from "@/hooks/use-owner-profile";
import { authenticationService } from "@/services/authentication";
import { createKahera } from "@/services/kahera-api";
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
    <ProfileFrame title="Manage Kahera" subtitle="Control access to your store">
      <ProfileNotice title="May-Ari access only">
        Manage accounts linked to {storeName || "your store"}.
      </ProfileNotice>
      <View className="mt-4 gap-3">
        {operators.length ? (
          operators.map((operator) => (
            <SettingsCard key={operator.id}>
              <OperatorIdentity operator={operator} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View Account for ${operator.name}, ${operator.status}`}
                className="mt-3 min-h-12 flex-row items-center gap-3"
                onPress={() => openOperator(operator.id)}
              >
                <View className="flex-1">
                  <ProfileText bold>View Account</ProfileText>
                  <ProfileText small>
                    Permissions and PIN management
                  </ProfileText>
                </View>
                <PosIcon name="chevronRight" size={20} color="#245399" />
              </Pressable>
            </SettingsCard>
          ))
        ) : (
          <SettingsCard>
            <ProfileAvatar size={64} />
            <Text
              accessibilityRole="header"
              className="mb-3 mt-4 font-poppins-bold text-[22px] leading-[32px] text-brand"
            >
              No Kahera yet
            </Text>
            <ProfileText>
              Add a Kahera to help with daily store operations.
            </ProfileText>
          </SettingsCard>
        )}
      </View>
      <View className="min-h-8 flex-1" />
      <View className="pt-6">
        <Button onPress={() => router.push(`${operatorsRoot}/new`)}>
          Add Kahera
        </Button>
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
          Back to Manage Kahera
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
  const canonical = service.operatorPermissions(operator.id);
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
  const permissions = optimistic ?? canonical;
  const inactive = operator.status === "inactive";
  async function changePermission(group: PermissionGroup, allowed: boolean) {
    if (lock.current || inactive) return;
    lock.current = true;
    setSaving(true);
    setFailure("");
    setRetry(null);
    setFeedback("Saving…");
    setOptimistic(updatePermission(canonical, group, allowed));
    try {
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
      } else setFeedback("Saved");
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
      const result = await authenticationService.setOperatorActive({
        operatorId: operator.id,
        active: inactive,
      });
      if (!active.current) return;
      if (!result.ok) setStatusError(result.message);
      else
        setFeedback(
          inactive
            ? "Kahera reactivated with saved permissions."
            : "Kahera deactivated. Stored permissions and transaction history are preserved.",
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
    <ProfileFrame title="View Account" busy={statusBusy}>
      {created && (
        <RegistrationToast
          expiresAt={toast}
          onDismiss={dismissToast}
          title="Kahera created"
          message={`${operator.name} can log in with the May-Ari ID and assigned PIN.`}
        />
      )}
      <SettingsCard>
        {created && (
          <View className="mb-4">
            <SuccessMark animate eventKey={operator.id} />
          </View>
        )}
        <OperatorIdentity operator={operator} />
        <View className="mt-4 gap-1">
          <ProfileText small bold>
            Linked May-Ari ID
          </ProfileText>
          <ProfileText>{operator.ownerId}</ProfileText>
        </View>
      </SettingsCard>
      <View className="my-4">
        <ProfileNotice title="Store operations">
          Changes apply only to this Kahera account.
        </ProfileNotice>
      </View>
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
              className={`min-h-[70px] flex-row items-center gap-3 py-3 ${index ? "border-t border-[#ADC9EE]" : ""}`}
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
                      ? "#CAD3DF"
                      : checked
                        ? "#245399"
                        : "#CAD3DF",
                    justifyContent: "center",
                    alignItems: checked ? "flex-end" : "flex-start",
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: inactive ? "#A3AFBF" : "#FFFFFF",
                    }}
                  />
                </View>
              </Pressable>
            </View>
          );
        })}
      </SettingsCard>
      {!!feedback && (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-2 font-poppins text-[12px] leading-[18px] text-[#28733A]"
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
      <View className="my-5">
        <Button
          variant="secondary"
          disabled={saving || statusBusy}
          onPress={() =>
            router.push({
              pathname: "/owner-menu/profile/operators/reset-pin",
              params: { operatorId: operator.id },
            })
          }
        >
          Set / Reset Kahera PIN
        </Button>
      </View>
      <View className="min-h-5 flex-1" />
      {!!statusError && (
        <ProfileError message={statusError} retry={() => setConfirm(true)} />
      )}
      <Button
        variant={inactive ? "primary" : "destructive"}
        disabled={saving}
        loading={statusBusy}
        onPress={() => setConfirm(true)}
      >
        {inactive ? "Reactivate Account" : "Deactivate Account"}
      </Button>
      <PosDialog
        visible={confirm}
        title={
          inactive ? "Reactivate Kahera Account?" : "Deactivate Kahera Account?"
        }
        message={
          inactive
            ? `Restore ${operator.name}'s access to TindaHand with their saved permissions?`
            : `Deactivate ${operator.name}'s Kahera account? They will lose access to TindaHand. Transaction history and saved permissions will be preserved.`
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
      title="Add Kahera"
      subtitle="Add a Kahera to help you manage your store."
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
  const dismiss = useCallback(() => setToast(null), []);
  return (
    <ProfileFrame
      title="Set / Reset Kahera PIN"
      subtitle="Verify your May-Ari identity, then assign a new four-digit PIN."
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
              title="PIN updated"
              message={`The PIN for ${operator.name} has been reset. Previous sessions are invalidated.`}
            />
          )}
          <View className="mt-5 flex-1">
            <CredentialForm
              key={operator.id}
              mode="cashier"
              onCancel={() => router.back()}
              onSave={(values) =>
                authenticationService.resetOperatorPin({
                  ...values,
                  operatorId: operator.id,
                })
              }
              onSuccess={() => setToast(Date.now() + 15000)}
            />
          </View>
        </>
      )}
    </ProfileFrame>
  );
}

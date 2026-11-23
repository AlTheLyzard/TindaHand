import { RegistrationToast } from "@/components/auth/registration-toast";
import { PosDialog } from "@/components/pos/pos-dialog";
import { SettingsCard } from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { useOwnerProfile } from "@/hooks/use-owner-profile";
import { authenticationService } from "@/services/authentication";
import { useAuthFlow } from "@/state/auth-flow";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { ProfileFrame, profileRoot } from "./profile-frame";
import {
  AccountBadge,
  OwnerProfileAvatar as ProfileAvatar,
  ProfileError,
  ProfileNotice,
  ProfileReadOnlyValue,
  ProfileSection,
  ProfileText,
  ProfileUnavailable,
} from "./profile-ui";

export function ProfileScreen() {
  const { updated } = useLocalSearchParams<{ updated?: string }>();
  const { profile, loading, error, reload } = useOwnerProfile();
  const flow = useAuthFlow();
  const [logout, setLogout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const logoutLock = useRef(false);
  const [feedback, setFeedback] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const dismissFeedback = useCallback(() => setFeedback(null), []);
  useFocusEffect(
    useCallback(() => {
      if (!updated) return;
      setFeedback({
        id: Date.now(),
        message:
          updated === "pending"
            ? "Profile saved. Email verification is pending; your registered email is unchanged. No real email was sent in this development mock."
            : "Your profile changes have been saved.",
      });
      // Consume the receipt so repeated saves of the same kind show fresh feedback.
      router.setParams({ updated: undefined });
    }, [updated]),
  );
  return (
    <ProfileFrame
      title="Profile"
      subtitle="Your account and store information"
      busy={busy}
      footer={!loading && !error && profile ? <>
        {!!failure && <ProfileError message={failure} />}
        <Button variant="destructive" loading={busy} onPress={() => setLogout(true)}>
          Log Out
        </Button>
      </> : undefined}
    >
      {feedback && (
        <ProfileSuccess
          key={feedback.id}
          message={feedback.message}
          onDismiss={dismissFeedback}
        />
      )}
      {loading || error || !profile ? (
        <ProfileUnavailable loading={loading} error={error} retry={reload} />
      ) : (
        <>
          <SettingsCard>
            <View className="flex-row flex-wrap items-center gap-3">
              <ProfileAvatar avatarId={profile.avatarId} size={60} />
              <View className="min-w-[120px] flex-1">
                <ProfileText bold>{profile.name}</ProfileText>
              </View>
              <AccountBadge status="May-Ari" />
            </View>
            <View className="my-4 h-px bg-outline" />
            <ProfileText small>May-Ari ID</ProfileText>
            <ProfileText bold>{profile.ownerId}</ProfileText>
            <View className="mb-4 mt-1">
              <ProfileText small>
                ⓘ Assigned once · Cannot be changed
              </ProfileText>
            </View>
            <Button
              variant="outlined"
              onPress={() => router.push(`${profileRoot}/edit`)}
            >
              Edit Profile
            </Button>
          </SettingsCard>
          <ProfileSection>Store</ProfileSection>
          <ProfileReadOnlyValue>{profile.storeName || "Not set"}</ProfileReadOnlyValue>
          <ProfileSection>Registered Email Address</ProfileSection>
          <ProfileReadOnlyValue>{profile.email}</ProfileReadOnlyValue>
          {profile.pendingEmail && (
            <View className="mt-3 gap-3">
              <ProfileNotice
                title={`Email verification: ${profile.pendingEmail.status}`}
              >
                {profile.pendingEmail.address} is awaiting verification. Your
                registered email remains {profile.email}.
              </ProfileNotice>
              <Button
                variant="secondary"
                onPress={() => router.push(`${profileRoot}/email`)}
              >
                Review Email Verification
              </Button>
            </View>
          )}
          <PosDialog
            visible={logout}
            title="Log Out"
            message="Are you sure you want to log out of TindaHand?"
            confirmLabel="Log Out"
            destructive
            onClose={() => {
              if (!busy) setLogout(false);
            }}
            onConfirm={() => {
              if (logoutLock.current) return;
              logoutLock.current = true;
              setBusy(true);
              setLogout(false);
              void authenticationService
                .logout()
                .then(() => {
                  flow.clear();
                  if (router.canDismiss()) router.dismissAll();
                  router.replace({
                    pathname: "/login",
                    params: { role: "owner" },
                  });
                })
                .catch(() => {
                  logoutLock.current = false;
                  setBusy(false);
                  setFailure("Unable to log out. Please try again.");
                });
            }}
          />
        </>
      )}
    </ProfileFrame>
  );
}

/** Shared success feedback, with the existing timed/dismissible toast. */
export function ProfileSuccess({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  const [expiresAt, setExpiresAt] = useState<number | null>(
    () => Date.now() + 15000,
  );
  return (
    <RegistrationToast
      expiresAt={expiresAt}
      onDismiss={useCallback(() => {
        setExpiresAt(null);
        onDismiss?.();
      }, [onDismiss])}
      title="Profile updated"
      message={message}
    />
  );
}

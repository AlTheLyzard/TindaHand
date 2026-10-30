import type { AccountRole, MockOwnerSession, OwnerIdentity, RegistrationCompletion } from "@/types/auth";

/** Central identity/capability gate shared by routes and inventory mutations. */
export function resolveOwnerAccess(
  completion: RegistrationCompletion | null,
  role: AccountRole | null,
  onboardingComplete: boolean,
  development: boolean,
  mockSession: MockOwnerSession | null,
  mockEnabled: boolean,
): OwnerIdentity | null {
  if (mockSession) {
    if (!development || !mockEnabled || mockSession.kind !== 'mock' || mockSession.role !== 'owner' ||
      role !== 'owner' || !onboardingComplete || !mockSession.owner.id.trim() || !mockSession.owner.name.trim()) return null;
    return { ...mockSession.owner, mode: 'mock' };
  }
  return canOpenOwnerDashboard(completion, role, onboardingComplete, development) ? completion : null;
}

/** Ephemeral frontend capability only, never production authentication. */
export function canOpenOwnerDashboard(
  completion: RegistrationCompletion | null,
  role: AccountRole | null,
  onboardingComplete: boolean,
  development: boolean,
) {
  return (
    !!completion?.id.trim() &&
    !!completion.name.trim() &&
    role === "owner" &&
    onboardingComplete &&
    (completion.mode === "confirmed" ||
      (completion.mode === "preview" && development))
  );
}

export const ownerPasswordKey = (ownerId: string) => `tindahand.owner.${ownerId}.password`;
export const ownerPinKey = (ownerId: string) => `tindahand.owner.${ownerId}.pin`;
export const operatorPinKey = (operatorId: string) => `tindahand.operator.${operatorId}.pin`;

// Offline login cache — salted SHA-256 hash of the last successfully authenticated PIN,
// scoped to the owner/cashier identity so a compromised hash cannot be replayed cross-account.
// Stored in the OS keychain (expo-secure-store) and cleared on explicit logout or 5 wrong PINs.
export const ownerOfflinePinHashKey = (ownerId: string) => `tindahand.owner.${ownerId}.offline_pin_hash`;
// Kahera offline hash is keyed by (ownerId, kaheraId) so each cashier slot is independent.
export const kaheraOfflinePinHashKey = (ownerId: string, kaheraId: string) => `tindahand.kahera.${ownerId}.${kaheraId}.offline_pin_hash`;

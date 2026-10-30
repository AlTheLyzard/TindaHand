/** Opt-in only. Expo inlines this public flag; it is not a secret. */
export const MOCK_AUTH_ENABLED = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_MOCK_AUTH === 'true';

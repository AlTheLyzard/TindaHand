// BACKEND INTEGRATION: Supply an owned HTTPS origin and associated-domain/app-link
// entitlements before email delivery. app.json already registers tindahand://.
// SECURITY: Public configuration only; never put tokens or credentials in env vars.
export const recoveryLinkConfig = {
  productionOrigin: process.env.EXPO_PUBLIC_RECOVERY_ORIGIN ?? null,
  path: '/reset-pin',
  developmentLink: 'tindahand://reset-pin',
};

# Expo SDK 58 upgrade

Updated October 30, 2026 for the latest Expo Go releases supporting SDK 58 on Android and iOS.

The app now uses Expo 58.0.21, React 19.3.0 and React Native 0.88.1. Expo CLI selected compatible versions for the existing Expo modules, Router, Reanimated, Worklets, Gesture Handler, Screens, safe-area library, React types, Babel preset and lint configuration. NativeWind 4.2.7 and Tailwind 3.4.17 remain the existing styling setup.

Native refs now use `ViewInstance`, `TextInputInstance` and `ScrollViewInstance`. Theme helpers handle a null color scheme, native tabs use `expo-router/native-tabs`, and the web tab button corrects the legacy ref type still declared by Router's `TabTriggerSlotProps`.

## Changed files

- `package.json`, `package-lock.json`
- `README.md`, `docs/welcome-screen.md`, this document
- `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`
- `src/hooks/use-theme.ts`
- `src/components/auth/registration-screen.tsx`, `src/components/auth/role-login-screen.tsx`
- `src/components/dashboard/add-cash-modal.tsx`, `src/components/dashboard/dashboard-quick-add.tsx`, `src/components/dashboard/owner-dashboard-screen.tsx`, `src/components/dashboard/quick-add-modal.tsx`, `src/components/dashboard/quick-add-ui.tsx`
- `src/components/inventory/asset-screen.tsx`, `src/components/inventory/inventory-ui.tsx`, `src/components/inventory/product-screen.tsx`
- `src/components/menu/menu-frame.tsx`, `src/components/menu/owner-menu-drawer.tsx`
- `src/components/pos/credit-product-browser.tsx`, `src/components/pos/payment-screen.tsx`, `src/components/pos/product-browsing-screen.tsx`
- `src/components/ui/confirmation-content.tsx`, `src/components/ui/form-field.tsx`, `src/components/ui/motion-content.tsx`, `src/components/ui/motion-overlay.tsx`, `src/components/ui/motion-pressable.tsx`

## Validation

| Check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Passed with a freshly resolved lockfile, without forcing or ignoring peer dependency conflicts |
| `npm ls --depth=0` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, no warnings |
| `node --test tests/*.test.cjs` | 55 passed |
| `npx --yes expo-doctor` | 20/20 checks passed |
| `npx expo export --platform android --platform ios --output-dir dist/sdk58-native --clear --max-workers 2` | Both platform bundles compiled; local output is ignored by Git |
| Android native runtime | Not tested: ADB found no connected device or running emulator |
| iOS native runtime | Not tested: Windows host has no iOS simulator and no connected iPhone testing session |
| Native builds | Not run |

Bundle compilation and shared checks do not establish native runtime behavior. Both platforms still need runtime checks for navigation/back behavior, keyboard/focus, safe areas, font scaling, modals, animations and image selection.

## Preview

Update Expo Go on the phone to a version supporting SDK 58. Run `npm start -- --clear`, connect the computer and phone to the same Wi-Fi, and scan the QR code in Expo Go on Android or the Camera app on iOS. Node.js must be 22.13+ on the 22 line, 24.3+ on the 24 line, or 26+; odd-numbered releases are unsupported.

## References

- [SDK 58 release notes](https://expo.dev/changelog/sdk-58)
- [Expo upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Router SDK 57 to 58 migration](https://docs.expo.dev/router/migrate/sdk-57-to-58/)
- [React Native strict TypeScript migration](https://reactnative.dev/docs/strict-typescript-api)
- [Expo Go releases](https://github.com/expo/expo-go-releases/releases)

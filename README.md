# TindaHand

Expo/React Native coursework app for sari-sari store owners (May-Ari) and cashiers (Kahera), targeting **Android and iOS** from one codebase. This repository currently implements owner frontend flows with local demo data. It has no backend, database, real authentication, or agreed network API. Cashier access is not implemented.

Start with [Backend handoff](docs/backend-handoff.md) for actual screen status, mock behavior and integration tasks, then [API contract notes](docs/api-contract.md) for frontend data needs and explicitly **PROPOSED** contracts. [Source requirements](docs/requirements/README.md) remain the baseline; [frontend-plan.md](docs/frontend-plan.md) is a proposal, not a completion checklist.

## Stack and prerequisites

The lockfile resolves Expo **58.0.21**, Expo Router **58.0.28**, React **19.3.0**, React Native **0.88.1**, TypeScript **6.0.3**, NativeWind **4.2.7**, Tailwind **3.4.17**, Reanimated **4.7.1**, and Worklets **0.13.0**. The app uses React context/state, Poppins, safe-area handling and Expo ImagePicker. See `package.json` and `package-lock.json` for the full installed stack.

Use npm and the committed `package-lock.json`. Node **24.3+ on the 24 line** is supported (this handoff was checked on 24.21.0); Expo also supports Node 22.13+ on the 22 line and 26+. See [SDK 58 requirements](https://expo.dev/changelog/sdk-58).

```sh
npm ci
npm start -- --clear
```

No API URL or database credentials are needed. Optional demo login setup:

1. Copy `.env.example` to `.env.local` (PowerShell: `Copy-Item .env.example .env.local`).
2. Set `EXPO_PUBLIC_ENABLE_MOCK_AUTH=true` in `.env.local`.
3. Restart Metro with `npm start -- --clear`.
4. Select **I Have an Account → Demo Owner Login (development only)**. Use fictional ID `TH-DEMO-OWNER` and PIN `0123`.

The flag defaults to false and only enables login in development (`__DEV__`). The alternate development registration preview requires valid form values, then Preview → Continue → Maybe Later to enter the owner dashboard. Normal registration intentionally returns unavailable. Use fictional input only; nothing creates a real account. See [mock auth](docs/mock-auth.md).

Expo exposes `EXPO_PUBLIC_*` values in the client bundle: **never store secrets in them**. `EXPO_OS` is supplied by Expo, not user configuration. Local `.env` files are ignored. See [Expo environment variables](https://docs.expo.dev/guides/environment-variables/).

## Android and iOS development

Use Expo Go **with SDK 58 support** on either platform, or a compatible development build. Keep the device and development machine on the same network; open the Metro QR URL using Expo Go on Android or Camera on iOS. `npm run android` opens a running Android emulator/device; `npm run ios` opens an iOS simulator on macOS with Xcode. Windows cannot run an iOS simulator. See [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/).

There are no hand-maintained `android/` or `ios/` projects. Native settings live in `app.json`. Adding native libraries or changing native configuration can require rebuilding the development client. This repo has no `expo-dev-client` dependency or `eas.json` profile yet; EAS development build setup is a separate task. See [development builds](https://docs.expo.dev/develop/development-builds/introduction/). Do not hand-create native folders.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start Metro; add `-- --clear` to clear its cache |
| `npm run android` / `npm run ios` | Open Android / iOS development target |
| `npm run web` | Browser preview; does not validate native behavior |
| `npm run lint` | Expo ESLint checks |
| `npm run typecheck` | TypeScript checks |
| `npm test` | Existing Node tests, including service boundary regressions |
| `npx expo install --check` | Check SDK dependency compatibility without upgrading |
| `npx expo-doctor` | Optional dependency/configuration diagnostics |

The inherited `reset-project` script resets starter directories and is **not a handoff/setup step**. Asset preparation scripts in `scripts/prepare-*.cjs` regenerate committed artwork from supplied references; normal installation does not require them. Add packages only for an approved task, using `npx expo install <package>` to select SDK-compatible versions.

## Where to work

| Directory | Responsibility |
| --- | --- |
| `src/app/` | Expo Router routes and guarded layouts |
| `src/components/` | Existing screens, forms, motion and reusable UI |
| `src/state/` | Demo session, shared inventory/POS, cash and Quick Add state |
| `src/services/` | Typed mock reads/writes; replace here when contracts are agreed |
| `src/data/`, `src/types/`, `src/utils/` | Seeds, frontend models, validation and derived calculations |
| `docs/requirements/`, `docs/designs/` | Original requirements and visual references; preserve them |

Inventory edits, POS sales and cash additions are in memory for the current owner session. Quick Add debts/expenses survive logout for the same owner until reload; all data resets on a full app reload. POS records a manual sale/payment, deducts stock and links partial debt locally. GCash entry does not verify a transfer. No mock write is durable. See [persistence and limitations](docs/backend-handoff.md#persistence).

Before pushing, include required assets, source, tests, docs and the lockfile; review the [handoff pre-push checklist](docs/backend-handoff.md#pre-push-checklist), including source-document privacy. Nothing in this preparation commits, pushes, publishes or changes remotes.

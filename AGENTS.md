TindaHand is an Expo/React Native mobile application supporting both Android and iOS from one shared codebase. Prioritize mobile-first patterns, performance, and usability on both platforms.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

# TindaHand project instructions

## Project and workflow

- TindaHand is a React Native mobile app for SDLC coursework supporting both Android and iOS from one shared Expo codebase.
- Users are May-Ari (owner) and Kahera (cashier).
- Use Expo, Expo Router, TypeScript, and NativeWind/Tailwind with global.css.
- Inspect the existing package.json, lockfile, routing, and configuration before changing setup. Preserve compatible existing code and use the existing package manager.
- Work frontend-first, one user-selected task or Figma frame at a time. Do not build all screens merely because a roadmap lists them.
- Use static fixtures in src/data/ and shared types in src/types/. Defer backend, database, real authentication, and API integration. Backend technology remains undecided; MySQL is planned for later.

## Sources and decisions

- Scope decision (October 17, 2026): Android and iOS are both required targets, expanding the original Android-focused coursework scope. This decision supersedes Android-only implementation guidance. Preserve the original workbook and documents in docs/requirements/ unchanged; their platform scope, acceptance criteria, testing plans, and delivery assumptions may need formal revision later.

- Read relevant user stories and acceptance criteria in docs/requirements/ before implementing a feature.
- docs/frontend-plan.md is a proposed implementation map, not an approved replacement for source requirements.
- Use supplied Figma frames, sticker sheet, fonts, and assets for visual decisions. Do not invent branding or missing screens.
- Flag conflicting acceptance criteria, remarks, and designs. Do not silently turn unresolved notes into requirements.
- The workbook contains MAY-ARI MODULE, KAHERA MODULE, and Copy of MAY-ARI MODULE. Use the named role sheets as the baseline; flag differences in the copy rather than merging it automatically.

## Android and iOS implementation

- Keep the frontend-first approach and existing compatible dependencies. This scope decision does not itself authorize dependency upgrades, backend integration, or build configuration changes.
- Share screens, components, state, types, static fixtures, and Expo Router navigation structure across Android and iOS. Use platform-specific files or branches only when a demonstrated platform difference requires them, and keep them narrowly scoped.
- Account for safe areas, notches, status bars, and bottom gesture/navigation areas on both platforms. Keep content usable on small screens and with larger accessibility text; do not duplicate device chrome from Figma exports.
- Check keyboard avoidance, input types, focus progression, dismissal, scrolling, and access to form actions on both platforms.
- Respect Android system back behavior and iOS back gestures, stack transitions, and modal dismissal within the shared navigation structure.
- When a feature needs permissions, handle each platform's permission requests, explanations, denied/restricted states, and recovery. Do not assume Android permission handling also covers iOS.
- Verify font loading, weight mapping, text scaling, wrapping, and clipping on both platforms. Provide accessible touch targets, pressed feedback, and screen-reader semantics; do not rely on hover interactions.

## Implementation

- Keep routes/layouts in src/app/, reusable UI in src/components/, and domain logic outside route files.
- Prefer shared screens and components with role-specific capabilities over duplicated owner/cashier code.
- Enforce mock session and capability checks on direct route access as well as menu visibility. Frontend checks simulate access only; they are not production security.
- Kahera cannot add/delete products, modify assets, manage other users, or access owner financial tools, expenses, and payables. Authorized inventory edits/restocks, read-only assets, POS, receivables, transaction viewing, profile, and settings are supported.
- Represent money as integer centavos; format as Philippine pesos. Use stable IDs, date-only strings for due/expiration dates, and ISO timestamps for events.
- Preserve sale/debt item name and unit-price snapshots. Separate payment status from overdue state.
- Reuse fixtures across screens and derive summaries rather than duplicating totals. Keep editable demo state separate from seed fixtures.
- Use fictional demo credentials only. Never put credentials into route parameters or commit real secrets.
- Keep forms accessible, keyboard-aware, and appropriate for both Android and iOS. Implement relevant validation and empty/error/success states.

## Verification and completion

- Run existing relevant TypeScript/lint checks and targeted tests when applicable. Do not install or upgrade dependencies without a task-related reason.
- Report changed files, checks actually run, and any remaining limits. Never claim device testing that was not performed.
- Report Android and iOS validation separately, identifying the device, emulator, or simulator and behaviors actually tested. Mark any platform without runtime validation as not tested, and state environment blockers explicitly.
- Distinguish shared lint/typecheck and dependency diagnostics from platform bundle compilation, native build success, and runtime testing. A browser preview, successful bundle, or successful build does not count as native runtime validation. Android testing does not validate iOS, and vice versa.
- Preserve unrelated changes. Do not commit, push, deploy, or publish unless requested.

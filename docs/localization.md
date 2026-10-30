# English standardization and localization foundation

English (`en`) is the default for every existing owned screen except Welcome. `fil` is reserved but has no catalog and cannot become the active language yet. No locale detection, storage, translations in Tagalog, language screen, switcher, dependency, backend or API-schema change is introduced. The app keeps its explicit English formatting with Philippine peso amounts and Asia/Manila dates/times, regardless of the device/browser locale.

The original requirements workbook's named MAY-ARI MODULE MA-LOG-001/002/003/005 and MA-DASH-001, and KAHERA MODULE KH-LOG-001/002 remain the behavioral baseline. The user's English-standardization request supersedes their visible role/Tagalog wording for implemented screens. Original requirements and design exports are unchanged. The copy sheet is not merged. The same fields, validation rules, role guards, mock/backend boundaries and account-setup sequence remain.

## Translation structure

- `src/i18n/en.ts`: central English catalog with organized, typed dotted keys. Namespaces: `common`, `roles`, `fields`, `auth.choice`, `auth.login`, `auth.registration`, `auth.confirmation`, `auth.details`, `auth.toast`, `auth.progress`, `validation`, `dashboard`, `navigation` and `starter`.
- `src/i18n/index.ts`: default/reserved locale declarations, typed keys and interpolation arguments, locale registry, safe English fallback, explicit date/number formats and a future `setAppLocale` preference seam. Validation and local adapter messages call `t` here without React dependencies. Interpolation replaces `{{name}}`, `{{label}}`, `{{count}}`, `{{step}}`, `{{id}}`, `{{date}}`, `{{feature}}` and `{{help}}` through a callback, preserving literal dollar signs/braces in user content.
- `src/i18n/use-translation.ts`: `useSyncExternalStore` subscription used by localized components. A future preference update rerenders their copy without rewriting each screen or disturbing the navigation animation's effect dependencies. Notices keep keys/state rather than permanently rendered strings when they originate in the UI.

Example: `t('dashboard.greeting', { name: firstName })`. Placeholder names and required parameters are checked by TypeScript. Singular and plural item/unit labels have separate keys. Numerical calculations, integer-centavo amounts, fixtures, name/price snapshots, product names, sample IDs and internal identifiers are not translated.

To add Tagalog later: create `src/i18n/fil.ts` with an approved catalog matching `Record<TranslationKey, string>`, preserve every interpolation placeholder, import/register it beside `en` in `catalogs`, and verify localized dates, counts, grammar and text expansion on Android/iOS. A separately approved settings feature can then persist a preference and call `setAppLocale('fil')`; missing catalogs/entries still fall back to English. Today `setAppLocale('fil')` resolves to English, with no UI or persistence. Future backend error codes should map to localized client messages in the existing adapter seam; arbitrary server-provided messages are not machine-translated or treated as translation keys.

## Display terminology and preserved behavior

Dashboard: Cash in Register, Income, Expenses, Daily, Weekly, Monthly and Best-Selling Items replace the requested Tagalog labels. Income/Expenses remain the two existing cash-movement metrics; no Profit/Loss calculation or data change occurs. The graph, its `TODO(BACKEND)`, period filtering, cards, icons, colors, spacing and floating spring animation are preserved.

The existing greeting was fixed **Magandang Araw, {firstName}!**, with no time-of-day branching. It is now **Good day, {firstName}!**, preserving that behavior. Morning/afternoon/evening logic is not added. Owner and Cashier replace the visible role wording, including login headings, Owner ID, Cashier PIN, registration/details and setup notices. `owner`/`cashier` role values, `TH-MA-*` IDs, modules and route names remain unchanged.

**Utang Payment** becomes the neutral **Debt Payment**. The fixture does not distinguish customer receivables from other debt types, so no more specific accounting label or behavior is assumed. Previously ungrammatical password/PIN mismatch messages are changed to natural English; comparison rules and outcomes are unchanged. The original source requirements retain their original wording. Existing generic English sticker-sheet toast text is retained rather than reinterpreted as a real backend notification.

The existing Explore starter route and its tab/help labels are also centralized without redesigning them. Proper names and technical examples (TindaHand, Expo Starter, library names, code paths, `@2x`/`@3x`, shortcut `w`, version prefix `v`), sample ID placeholders and decorative/masking glyphs deliberately remain literal. User-entered names and fictional product names remain content, not translations.

## Welcome exclusion

`src/app/index.tsx` is byte-for-byte unchanged, including **TindaHand - Para sa iyong tindahan.**, button copy, accessibility hints and navigation callbacks. Its shared Button implementation, animation files, font loading, root layout, theme tokens, imagery and package files are unchanged in this task. A hash comparison against the pre-edit files verifies this exclusion; no localization provider is inserted around Welcome and no Welcome-only refactor occurs.

## Changed files

New: `src/i18n/en.ts`, `src/i18n/index.ts`, `src/i18n/use-translation.ts`, and this document.

Authentication UI under `src/components/auth/`: `account-role-card.tsx`, `account-choice-screen.tsx`, `role-login-screen.tsx`, `registration-screen.tsx`, `account-created-screen.tsx`, `owner-id-screen.tsx`, `registration-progress.tsx`, `registration-toast.tsx`, and `auth-header.tsx`.

Shared/starter UI: `src/components/ui/form-field.tsx`, `src/components/app-tabs.tsx`, `src/components/app-tabs.web.tsx`, `src/components/hint-row.tsx`, and `src/app/explore.tsx`.

Dashboard UI: `src/components/dashboard/dashboard-cards.tsx`, `owner-dashboard-screen.tsx` and `dashboard-navigation.tsx`. Changes are text lookup/subscriptions and typed notice keys, not animation logic or styling.

Local validation/formatting/adapter messages: `src/utils/registration.ts`, `src/utils/account-access.ts`, `src/utils/registration-request.ts`, `src/utils/dashboard.ts` and `src/services/registration.ts`. Tests: `tests/auth-validation.test.cjs` (project-module loader supports shared catalog imports; new localization tests; expected mismatch wording updated).

## Translation key index

There are 151 keys: auth 50, common 8, roles 4, fields 16, validation 13, dashboard 28, navigation 11, starter 21.

- `auth.choice.instructions`
- `auth.choice.preview`
- `auth.choice.reminder`
- `auth.choice.roleAccessibility`
- `auth.choice.roleHint`
- `auth.choice.title`
- `auth.choice.welcome`
- `auth.confirmation.preview`
- `auth.confirmation.reminder`
- `auth.confirmation.subtitle`
- `auth.confirmation.title`
- `auth.details.continueSetup`
- `auth.details.idTitle`
- `auth.details.next`
- `auth.details.ownerName`
- `auth.details.permanence`
- `auth.details.preview`
- `auth.details.reminder`
- `auth.details.reminderTitle`
- `auth.details.setupUnavailable`
- `auth.details.skip`
- `auth.details.uniqueId`
- `auth.login.cashierEyebrow`
- `auth.login.cashierInstructions`
- `auth.login.cashierTitle`
- `auth.login.forgotPin`
- `auth.login.ownerEyebrow`
- `auth.login.ownerInstructions`
- `auth.login.ownerTitle`
- `auth.login.pinHelp`
- `auth.login.preview`
- `auth.login.recoveryUnavailable`
- `auth.login.reminder`
- `auth.login.reminderTitle`
- `auth.login.submit`
- `auth.login.unavailable`
- `auth.progress`
- `auth.registration.creating`
- `auth.registration.instructions`
- `auth.registration.preview`
- `auth.registration.previewAction`
- `auth.registration.privacy`
- `auth.registration.requestFailed`
- `auth.registration.submit`
- `auth.registration.title`
- `auth.registration.unavailable`
- `auth.registration.unconfirmed`
- `auth.toast.dismiss`
- `auth.toast.message`
- `auth.toast.title`
- `common.back`
- `common.backToRegistration`
- `common.cancel`
- `common.close`
- `common.continue`
- `common.learnMore`
- `common.selectedSuffix`
- `common.viewAll`
- `dashboard.activityTitle`
- `dashboard.bestSellers`
- `dashboard.cashTitle`
- `dashboard.comingSoon`
- `dashboard.debtPayment`
- `dashboard.demoDisclosure`
- `dashboard.demoTrend`
- `dashboard.expenses`
- `dashboard.greeting`
- `dashboard.growth`
- `dashboard.identity`
- `dashboard.income`
- `dashboard.itemCount`
- `dashboard.itemCountOne`
- `dashboard.lowStock`
- `dashboard.noComparison`
- `dashboard.outOfStock`
- `dashboard.period.daily`
- `dashboard.period.monthly`
- `dashboard.period.weekly`
- `dashboard.posSale`
- `dashboard.preview`
- `dashboard.salesTitle`
- `dashboard.stockTitle`
- `dashboard.totalSales`
- `dashboard.unavailable`
- `dashboard.unitsSold`
- `dashboard.unitsSoldOne`
- `fields.cashierPin`
- `fields.confirmPassword`
- `fields.confirmPasswordPlaceholder`
- `fields.confirmPin`
- `fields.hide`
- `fields.name`
- `fields.namePlaceholder`
- `fields.ownerId`
- `fields.password`
- `fields.passwordPlaceholder`
- `fields.pin`
- `fields.pinHint`
- `fields.pinLength`
- `fields.requiredAccessibility`
- `fields.requiredLabel`
- `fields.show`
- `navigation.activityHistory`
- `navigation.dashboard`
- `navigation.docs`
- `navigation.explore`
- `navigation.home`
- `navigation.inventory`
- `navigation.main`
- `navigation.menu`
- `navigation.pos`
- `navigation.profile`
- `navigation.settings`
- `roles.cashier`
- `roles.cashierDescription`
- `roles.owner`
- `roles.ownerDescription`
- `starter.and`
- `starter.animationMiddle`
- `starter.animationPrefix`
- `starter.animationSuffix`
- `starter.animationsTitle`
- `starter.documentation`
- `starter.imagesPrefix`
- `starter.imagesSuffix`
- `starter.imagesTitle`
- `starter.intro`
- `starter.layoutPrefix`
- `starter.layoutSuffix`
- `starter.platformPrefix`
- `starter.platformSuffix`
- `starter.platformTitle`
- `starter.routingPrefix`
- `starter.routingTitle`
- `starter.themePrefix`
- `starter.themeSuffix`
- `starter.themeTitle`
- `starter.tryEditing`
- `validation.confirmPasswordRequired`
- `validation.confirmPinFormat`
- `validation.confirmPinRequired`
- `validation.correctFields`
- `validation.loginPin`
- `validation.ownerIdRequired`
- `validation.passwordHelp`
- `validation.passwordMismatch`
- `validation.passwordRequired`
- `validation.pinFormat`
- `validation.pinMismatch`
- `validation.pinRequired`
- `validation.requiredFields`

## Validation and limits

TypeScript, Expo lint and all 18 tests passed. New tests verify the English default, reserved-`fil` fallback, safe interpolation (including literal dollar/braces in names), role terminology, singular/plural counts and the requested dashboard translations. Existing registration validation, request locking, unavailable backend, credential handling, role guards and scroll-direction/bounce tests also pass. Android/iOS Hermes and web bundle exports passed.

Headless Chrome ran with a Filipino browser/Intl locale and passed the Welcome → chooser → Owner and Cashier logins → Welcome → registration → labelled success preview → confirmation → Owner ID → Skip for Now → dashboard flow. It checked original internal role parameters, required validation, unavailable login/recovery/registration/setup feedback, masked PINs, manual toast dismissal, unchanged name/ID/product content and amounts, all requested English dashboard labels, the personalized general greeting, period selection, navigation feedback and the existing compact/expanded spring states. Login, registration, ID details and dashboard screenshots at 320×568, 360×800, 390×844 and 430×932 were checked for horizontal overflow; representative screenshots were visually inspected. No browser rendering/JavaScript errors were recorded. Existing small-screen wrapping (including vertically stacked cash metrics where needed) is preserved. Welcome's Tagalog footer remains visible as intentionally excluded.

Pre/post SHA-256 comparisons passed for Welcome, its shared Button/animation files, dashboard graph and scroll-direction files, design tokens and package/lock files. Temporary checks, screenshots, baseline hashes and results are in ignored `.expo/localization-check/`; native/web exports are in `.expo/localization-export/`.

Android runtime: **not tested**; no device/emulator or ADB available. iOS runtime: **not tested**; no simulator on Windows. Separate native font scaling, keyboard, safe-area, screen-reader and gesture checks remain required. Bundle exports and browser layouts do not establish native runtime correctness. No native builds were run. Future Tagalog copy, language selection/preference persistence, catalog placeholder parity and native long-text expansion remain follow-up work, not implemented features.

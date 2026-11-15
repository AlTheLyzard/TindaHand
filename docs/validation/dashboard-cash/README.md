# Dashboard cash refinement evidence

Chrome browser component fixtures, using the source cash sheet, CashCard,
SalesCard, shared controls and mock cash service. These are not native screenshots
or final full-app layout captures. SDK 58 web routing/export resolution errors
required an isolated provider scaffold and service-hook adapter for final checks;
the source app configuration, dependencies and components were not patched for it.

- sheet-320.png: 320 x 568, full width, 305-point initial height, both actions
  visible. Add and Clear are disabled on an untouched empty form.
- sheet-ios-insets.png: 390 x 844 with injected top 47 and bottom 34 insets.
  The sheet fills the width and leaves the gesture-space inset below Clear.
- discard-confirmation.png: shared stacked confirmation actions above the sheet.
  The blue close-control ring is the shared browser keyboard-focus treatment.

Additional measured layouts: 360 x 800 with Android-style 24-point top/bottom
insets; 430 x 932; 768 x 500 with 44-point side insets; 390 x 300 as a constrained
keyboard-space proxy. Chips are 28 points high inside 48-point touch wrappers;
all labels remain on one line and bounds stay unchanged through every selection.

Form interaction checks pass for validation, mid-value insertion/deletion, blur,
Enter, clear/cancel, discard/keep editing, focus isolation, backdrop/close/touch
drag requests, real service rejection, a simulated thrown failure, retry, a held
pending request, duplicate Add taps, success toast and unchanged sales totals.
Raw local results/screenshots and browser scripts are in .tmp/dashboard-cash-*.

Android runtime: not tested; ADB enumeration is blocked by local permissions.
iOS runtime: not tested; no iOS simulator is available on Windows. Native keyboard,
Back, gesture bars, text scaling, TalkBack and VoiceOver remain device checks.

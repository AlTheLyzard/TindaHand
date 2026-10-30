# Welcome screen

Implemented reference: only the leftmost frame in designs/MA-LOG-005.png.
Baseline criteria: MA-LOG-001 and KH-LOG-001 in the original requirements workbook.
Palette, typography and CTA styling follow the supplied design sheets.
The screenshot status bar and gesture indicator are device chrome, not duplicated UI.

NativeWind 4.2.7 uses Tailwind 3, the NativeWind Babel preset, and the Expo Metro config wrapper.
Official setup: https://www.nativewind.dev/docs/getting-started/installation
Poppins Regular (400) and Bold (700) are bundled locally by @expo-google-fonts/poppins and loaded with expo-font; no runtime font download is required.

The root uses an Expo Router stack without headers so Welcome has no starter tab bar.
Existing Explore and tab component source files are preserved. The registration route is implemented at `/register`.

## Deferred actions

Get Started opens owner registration using Expo Router. I have an account opens `/choose-account`, where each role opens its login form. Authentication remains unavailable.
Registration validates local form values but does not create accounts or sessions; see registration-screen.md.

## Phone preview

Run `npm start -- --clear` in the project directory. Update Expo Go to a version supporting SDK 58 on Android or iOS, then connect the phone and computer to the same Wi-Fi. Scan the terminal QR code in Expo Go on Android or with the Camera app on iOS.
Compatible Expo Go downloads are listed at https://expo.dev/go.
The logo crop and fonts are bundled. Get Started opens registration; I have an account opens account selection. Neither flow creates accounts or authenticated sessions.

Check at a narrow phone width and with Android font/display size increased; content can scroll and touch targets are at least 48 dp tall.

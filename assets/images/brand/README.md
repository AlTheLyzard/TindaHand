# TindaHand brand mark

Finalized source: `docs/designs/TindaHandLogo.jpg` (preserved unchanged).

`tindahand-artwork.png` is the transparent background-extraction variant of the
finalized logo. `tindahand-mark.png` is its 512px in-app derivative, shared by the
welcome screen, auth header, registration progress, dashboard and POS headers.
All placements contain the full artwork and keep their existing layout and text.

Run `node scripts/prepare-brand-assets.cjs` to regenerate the production assets
using the image tooling already installed with Expo:

- `brand/tindahand-mark.png` and `splash-icon.png`: transparent, 512 x 512.
- `icon.png`: opaque white, 1024 x 1024, from the original JPG with added white
  launcher padding. Used for iOS and the fallback Android icon.
- `android-icon-foreground.png`: transparent, 1024 x 1024, full artwork contained
  within a centered 560px square to protect it from adaptive launcher masks.
- `android-icon-monochrome.png`: the foreground alpha mask for Android themed icons.
- `favicon.png`: opaque 64 x 64 derivative of the app icon.

The Android adaptive background is solid white in `app.json`. Splash background
is Alice Blue (#F0F8FF), matching the welcome screen. The old Expo `.icon` bundle
and starter background asset are no longer configured.

Native icon and splash changes require a new Android/iOS build and installation;
reloading JavaScript or an OTA update cannot replace these native resources.
Validate the splash in a release build, since Expo Go/development builds do not
fully reproduce it.

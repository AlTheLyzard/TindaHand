# Profile refinement evidence

Chrome 156, 390 × 844 unless noted. This is browser validation, not Android or iOS runtime validation.

- `before.png`, `after-first-save.png`, `after-second-save.png`: card top y=171 and subtitle-to-card gap 20px in all three; identical card height 247px. The first save changed the avatar/name and cleared Store Name; the second changed name/store text. Success feedback stays outside scroll content. A third avatar/name save and both manual/timed toast dismissal also kept y=171.
- `selected-avatar.png`: clean large preview and existing selection ring after source-crop correction.
- `all-avatars.png`: all 12 original illustrations, recropped uniformly with circular alpha edges; heads/faces and white shirts preserved.
- `animation.json`: frame samples of option opacity and fixed grid-cell bounds. Selection does not restart entrance; reopening does. Reduced motion was separately checked with every option immediately at opacity 1.
- `picker-320-actions.png`: Apply and Cancel remain reachable by scrolling at 320 × 568, without horizontal overflow.

Header selection/press checks used the existing `surfaceSubtle` token (`rgb(217, 231, 244)`), measured zero icon/backdrop center offset, and confirmed Settings retained its previous transparent surface. All 12 options were selected, Apply/Cancel/reopen were exercised, and an empty Store Name was successfully saved.

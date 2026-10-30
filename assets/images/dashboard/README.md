# Dashboard reference assets

These small PNGs are extracted without redrawing from `docs/designs/MA-DASH-001.png`: settings, money, home, cart, inventory, menu, payment and the bottle photograph. They retain the reference backgrounds and native export resolution. Replace with original transparent/high-resolution design assets when available; do not stretch beyond their intended display sizes. The existing brand mark remains in `../brand/`.

`payment-symbol.png` supersedes the old payment crop in UI. It is the exact hand/coins glyph from the approved `docs/designs/Icons.png`, region x=310, y=193, width=24, height=24. The white sheet background is mapped to alpha while keeping the black artwork and its antialiased edges; there is no pale disk, white badge, redraw or generated replacement. It displays at 24 dp inside the unchanged 40 dp activity icon area. The previous `payment.png` is preserved but unused.

Icon audit: settings 26×26 displays at 26 dp; home 34×37, cart 37×38, inventory 36×38 and menu 37×38 display in 28 dp boxes; money 40×40 displays at 40 dp. Bottle 27×56 is contained in a 40 dp box, preserving its aspect ratio. None is enlarged beyond its intrinsic pixel dimensions at 1×. Navigation animates width/spacing only, never icon transforms or image dimensions.

Missing sharp assets: approved transparent SVGs (or original 2×/3× PNG exports) for settings, money/banknote, home, cart/POS, inventory/package, menu and hand/coins payment; and 2×/3× bottle imagery. `Icons.png` and `Icons (1).png` are raster sticker sheets, not vector masters. The project's only SVG is the unrelated Expo symbol. The starter `tabIcons/home@2x/@3x` artwork has a different shape and is deliberately not substituted. High-density sharpness remains limited by the supplied exports; enlarging them would not recover missing detail.

Menu follow-up: the old opaque `menu.png` is superseded by transparent neutral/blue crops in `../menu/`. See that folder's README and `scripts/prepare-menu-assets.cjs`. The navbar's Menu glyph uses those assets across shells; the other Dashboard icons remain unchanged.

# More Tools icons

The option icons and `menu.png` are exact 24 × 24 crops of `docs/designs/Icons.png`, the neutral sticker sheet. `menu-active.png` comes from the same x=310, y=105 region in `Icons (1).png`, preserving its original blue ink. `scripts/prepare-menu-assets.cjs` records the crop coordinates and recovers the original flat ink color and antialiased alpha from the white sheet. No strokes are redrawn or tinted. `MenuIcon` uses the existing expo-image approach with contained square bounds: 24 points for sidebar options and the existing 28-point navbar icon size.

The old `assets/images/dashboard/menu.png` has 1,147 opaque white pixels and no transparent pixels. It is preserved but superseded. Both default and active navbar Menu assets now have transparent backgrounds; the intended pale-blue active circle is unchanged. The other nine option icons remain byte-for-byte unchanged.

The supplied sheets include all required icons. Individual SVGs and higher-density exports were not supplied; high-density sharpness is limited to this original raster resolution. The blue sheet is used only for the active navbar Menu glyph; all sidebar options remain neutral.

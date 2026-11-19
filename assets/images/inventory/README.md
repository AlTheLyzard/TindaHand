# Inventory illustrations

`AddAsset.png`, `AddProduct.png`, `AddExpiryDate.png`, `EditProduct.png`, and `RestockProduct.png` are unchanged copies of the supplied artwork in `docs/designs/`. They are bundled separately from the screen exports and rendered with `contain` to retain their proportions. Product photos remain dynamic.

`ReplayAppWalkthrough.png` is a new 1254 × 1254 transparent PNG illustration for the Operator Replay App Walkthrough screen. It follows the same square asset size, blue palette, rounded dark outlines, soft gradients, and contain-rendering convention as the supplied inventory illustrations. It is registered in `src/components/operator/operator-illustrations.ts` and exported as `operatorIllustrations.replayWalkthrough`.

The screen background reuses `assets/images/auth/background.png`, the existing unchanged copy of `docs/designs/ApplicationBackground.png`. It covers the visible content viewport, outside the scrolling content, without tiling or stretching. Its waves and storefront are one continuous image.

`asset-current.svg`, `asset-equipment.svg`, and `asset-furniture.svg` redraw the wallet, wrench, and cube outlines shown in the classification cards in `docs/designs/MA-AST-002.png`. They use the existing 24-unit outline-icon convention and are scoped to the asset classification field.

`edit.svg` redraws the pencil action shown on the product photo in `docs/designs/MA-INV-002.png`. It stays scoped to the Edit Product photo control.

`calendar.svg` uses the existing `assets/images/pos/calendar.svg` geometry, 24 × 24 view box, and 18 dp display size. Only its stroke width changes from 1.6 to 2.6. This variant is scoped to Inventory date inputs; other modules retain their existing icon.

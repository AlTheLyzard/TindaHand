// Run with `node scripts/prepare-brand-assets.cjs` after installing existing dependencies.
// Jimp is already supplied by Expo's image utilities; no new dependency is needed.
const Jimp = require('jimp-compact');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const asset = (name) => path.join(root, 'assets/images', name);

async function main() {
  const artwork = await Jimp.read(asset('brand/tindahand-artwork.png'));
  const original = await Jimp.read(path.join(root, 'docs/designs/TindaHandLogo.jpg'));

  // Contain the entire square source; never crop, distort, or add lettering.
  await artwork.clone().contain(512, 512).writeAsync(asset('brand/tindahand-mark.png'));
  await artwork.clone().contain(512, 512).writeAsync(asset('splash-icon.png'));

  // Preserve the supplied opaque white background for the iOS and legacy app icon.
  const icon = new Jimp(1024, 1024, 0xffffffff);
  icon.composite(original.clone().contain(860, 860), 82, 82);
  await icon.writeAsync(asset('icon.png'));
  await icon.clone().resize(64, 64).writeAsync(asset('favicon.png'));

  // Fit the complete foreground inside Android's central 66/108 safe-zone circle.
  const foreground = new Jimp(1024, 1024, 0x00000000);
  foreground.composite(artwork.clone().contain(560, 560), 232, 232);
  await foreground.writeAsync(asset('android-icon-foreground.png'));

  // Android applies the system-selected color to this alpha-only themed-icon mask.
  const monochrome = foreground.clone();
  monochrome.scan(0, 0, 1024, 1024, function (_x, _y, offset) {
    this.bitmap.data[offset] = 255;
    this.bitmap.data[offset + 1] = 255;
    this.bitmap.data[offset + 2] = 255;
  });
  await monochrome.writeAsync(asset('android-icon-monochrome.png'));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

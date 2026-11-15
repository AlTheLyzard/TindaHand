// Faithful crops of the supplied 4 x 3 sheet. No image generation or redrawing.
const fs = require('node:fs');
const path = require('node:path');
const Jimp = require('jimp-compact');
const root = path.resolve(__dirname, '..');
(async () => {
  const sheet = await Jimp.read(path.join(root, 'docs/designs/TindaHand Filipino avatar options sheet.png'));
  const output = path.join(root, 'assets/images/profile');
  fs.mkdirSync(output, { recursive: true });
  // Centers measured from the original blue discs. A 294px inscribed square
  // removes their white outer margins without stretching the slightly oval art.
  // The small blue-only inset preserves every head/face. Resize uniformly, then
  // alpha-mask the circle so image sampling cannot bring white corners back.
  const centers = [[159, 252], [471, 252], [783, 252], [1094, 252],
    [159, 626], [471, 626], [783, 626], [1095, 627],
    [159, 1005], [471, 1006], [783, 1006], [1095, 1007]];
  for (const [index, [x, y]] of centers.entries()) {
    const avatar = sheet.clone().crop(x - 147, y - 147, 294, 294).resize(320, 320);
    avatar.scan(0, 0, 320, 320, function (px, py, offset) {
      const coverage = Math.max(0, Math.min(1, 160 - Math.hypot(px + 0.5 - 160, py + 0.5 - 160)));
      this.bitmap.data[offset + 3] = Math.round(255 * coverage);
    });
    await avatar.writeAsync(path.join(output, `avatar-${String(index + 1).padStart(2, '0')}.png`));
  }
  console.log('Extracted all 12 original supplied avatar illustrations.');
})().catch(error => { console.error(error); process.exitCode = 1; });

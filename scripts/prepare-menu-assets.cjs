// Exact glyph crops from the supplied neutral/blue sheets; no redraws or tinting.
const fs = require('node:fs');
const path = require('node:path');
const Jimp = require('jimp-compact');
const root = path.resolve(__dirname, '..');
const regions = {
  financial: [261, 266], history: [163, 302], expense: [114, 149],
  customerDebt: [310, 193], settings: [457, 61], profile: [408, 61],
  logout: [163, 149], chevronRight: [261, 229], close: [457, 193], menu: [310, 105],
};
(async () => {
  const source = await Jimp.read(path.join(root, 'docs/designs/Icons.png'));
  const output = path.join(root, 'assets/images/menu');
  fs.mkdirSync(output, { recursive: true });
  async function writeGlyph(sheet, name, x, y) {
    const glyph = sheet.clone().crop(x, y, 24, 24);
    let ink = [255, 255, 255];
    glyph.scan(0, 0, 24, 24, function (_x, _y, i) {
      const rgb = [...this.bitmap.data.subarray(i, i + 3)];
      if (Math.min(...rgb) < Math.min(...ink)) ink = rgb;
    });
    // Each supplied glyph is one ink color on white. Recover that original color
    // and alpha together, preserving antialiasing without leaving a white fringe.
    glyph.scan(0, 0, 24, 24, function (_x, _y, i) {
      const shade = Math.min(this.bitmap.data[i], this.bitmap.data[i + 1], this.bitmap.data[i + 2]);
      this.bitmap.data[i] = ink[0]; this.bitmap.data[i + 1] = ink[1]; this.bitmap.data[i + 2] = ink[2];
      this.bitmap.data[i + 3] = Math.round(255 * (255 - shade) / (255 - Math.min(...ink)));
    });
    await glyph.writeAsync(path.join(output, name + '.png'));
  }
  for (const [name, [x, y]] of Object.entries(regions)) await writeGlyph(source, name, x, y);
  const clicked = await Jimp.read(path.join(root, 'docs/designs/Icons (1).png'));
  await writeGlyph(clicked, 'menu-active', 310, 105);
  console.log('Extracted ten neutral icons and the original blue active Menu icon.');
})().catch(error => { console.error(error); process.exitCode = 1; });

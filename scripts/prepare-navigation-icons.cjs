// Reuse the POS vector family, with filled counterparts and the reference's grid.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const output = path.join(root, 'assets/images/navigation');
fs.mkdirSync(output, { recursive: true });
const grid = '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
const filled = {
  home: '<path fill-rule="evenodd" d="M2.5 9.5 11 2.8a1.6 1.6 0 0 1 2 0l8.5 6.7a1 1 0 0 1-1.3 1.5l-.2-.2V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.2l-.2.2a1 1 0 0 1-1.3-1.5ZM10 14v7h4v-7z"/>',
  cart: '<path d="M2 2.2h3a.8.8 0 0 1 .8.65L6.4 6.2H21a1 1 0 0 1 .97 1.24l-1.8 7a2 2 0 0 1-1.94 1.5H8.3l.26 1.26h10.9a.8.8 0 0 1 0 1.6H7.9a.8.8 0 0 1-.78-.65L4.34 3.8H2a.8.8 0 0 1 0-1.6Z"/><circle cx="9" cy="21" r="1.4"/><circle cx="19" cy="21" r="1.4"/>',
  // Separate faces leave transparent seams; tinting cannot fill them in.
  inventory: '<path d="m12 2 8.3 4.6-3.2 1.8-8.3-4.6ZM7.2 4.7l8.3 4.6-3.5 1.9-8.2-4.6ZM3 8l8.2 4.6v9L3 17ZM12.8 12.6 21 8v9l-8.2 4.6Z"/>',
  menu: grid,
};
for (const name of Object.keys(filled)) {
  const outline = name === 'menu'
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4A607A" stroke-width="1.6">${grid}</svg>\n`
    : fs.readFileSync(path.join(root, `assets/images/pos/${name}.svg`), 'utf8');
  fs.writeFileSync(path.join(output, `${name}.svg`), outline);
  fs.writeFileSync(path.join(output, `${name}-active.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2F6CC9">${filled[name]}</svg>\n`);
}

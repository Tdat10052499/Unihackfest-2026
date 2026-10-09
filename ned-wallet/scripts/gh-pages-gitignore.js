// The gh-pages branch still has an old .gitignore ("*/node_modules/"), so git skipped the text and icon fonts Expo exports to
// dist/assets/node_modules/… → the web lost its icons and fell back to system fonts. Overwritten with an empty .gitignore in dist
// (gh-pages runs with -t, so dot files are copied).
const fs = require('fs');
const path = require('path');

const dist = path.resolve(process.cwd(), 'dist'); // npm runs the script from the ned-wallet folder
fs.writeFileSync(path.join(dist, '.gitignore'), '# gh-pages: publish everything in dist (fonts live under assets/node_modules)\n');

const fonts = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.ttf')) fonts.push(full);
  }
})(dist);
if (!fonts.length) throw new Error('No .ttf files in dist — fonts and icons would be missing on web.');
console.log(`gh-pages: ${fonts.length} font files will be published`);

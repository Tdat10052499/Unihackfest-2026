// Nhánh gh-pages còn .gitignore cũ ("*/node_modules/"), khiến git bỏ qua font chữ + font icon mà Expo xuất vào
// dist/assets/node_modules/… → web mất icon và rơi về font hệ thống. Ghi đè bằng .gitignore rỗng trong dist
// (gh-pages chạy với -t nên file dấu chấm được chép sang).
const fs = require('fs');
const path = require('path');

const dist = path.resolve(process.cwd(), 'dist'); // npm chạy script từ thư mục ned-wallet
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

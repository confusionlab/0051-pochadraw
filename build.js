/* Pochadraw — dependency-free static site build for GitHub Pages. */
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
for (const folder of ['docs', 'dist']) {
  const out = path.join(root, folder);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const file of ['index.html', 'editor.html', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) fs.copyFileSync(path.join(root, file), path.join(out, file));
  for (const dir of ['js', 'css', 'vendor']) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  console.log('Built ' + folder + '/ — game, studio, bundled physics, and 100 levels.');
}

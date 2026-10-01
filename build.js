/* Pochadraw — static frontend with a bundled Convex client. */
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const cloud = fs.existsSync(path.join(root, 'cloud.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'cloud.json'), 'utf8')).url : '';
require('./tools/prepare-client')(process.env.CONVEX_URL || cloud);
for (const folder of ['docs', 'dist']) {
  const out = path.join(root, folder);
  fs.mkdirSync(out, { recursive: true });
  for (const file of ['index.html', 'editor.html', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) fs.copyFileSync(path.join(root, file), path.join(out, file));
  for (const dir of ['js', 'css', 'vendor']) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  console.log('Built ' + folder + '/ — game, studio, bundled physics, and 100 levels.');
}

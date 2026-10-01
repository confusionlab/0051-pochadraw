const fs = require('node:fs');
const path = require('node:path');
module.exports = function prepareClient(url) {
  const root = path.join(__dirname, '..');
  require('esbuild').buildSync({ absWorkingDir: root, entryPoints: ['tools/cloud-client.js'], outfile: 'vendor/convex-client.js', bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2022' });
  fs.writeFileSync(path.join(root, 'js/cloud-config.js'), 'window.POCHADRAW_CONVEX_URL = ' + JSON.stringify(url || '') + ';\n');
};

const fs = require('node:fs');
let bad = 0;
for (const f of fs.readdirSync('js').filter(f => f.endsWith('.js'))) {
  try { new Function(fs.readFileSync('js/' + f, 'utf8')); console.log('ok', f); }
  catch (e) { bad++; console.error('ERROR', f, e.message); }
}
process.exitCode = bad ? 1 : 0;

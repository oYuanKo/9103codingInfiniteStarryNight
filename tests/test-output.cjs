// Keep generated evidence separate from committed fixtures and historical screenshots.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
module.exports = filename => {
  const base = process.env.TEST_OUTPUT_DIR || path.join(os.tmpdir(), 'starry-night-tests');
  fs.mkdirSync(base, {recursive: true});
  const output = fs.mkdtempSync(path.join(base, path.basename(filename, '.cjs') + '-'));
  console.log('Test artifacts:', output);
  return output;
};

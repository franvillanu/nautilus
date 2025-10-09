// generate_manifest.js
// Scans the current folder for .jpg/.jpeg/.png files and writes list.json
// Usage: node generate_manifest.js

const fs = require('fs');
const path = require('path');

const dir = __dirname; // lock/easter
const out = path.join(dir, 'list.json');

fs.readdir(dir, (err, files) => {
  if (err) {
    console.error('Failed to read easter directory', err);
    process.exit(1);
  }

  const imgs = files.filter(f => /\.(jpe?g|png)$/i.test(f)).map(f => path.posix.join('lock/easter', f));
  if (imgs.length === 0) {
    console.log('No images found in', dir);
  }
  fs.writeFileSync(out, JSON.stringify(imgs, null, 2));
  console.log('Wrote', out, 'with', imgs.length, 'entries');
});

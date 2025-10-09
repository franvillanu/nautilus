// watch_manifest.js
// Watch the current folder for image add/remove and regenerate list.json automatically.
// Run with: node lock/easter/watch_manifest.js

const fs = require('fs');
const path = require('path');
const dir = __dirname;
const out = path.join(dir, 'list.json');

function generate() {
  try {
    const files = fs.readdirSync(dir);
    const imgs = files.filter(f => /\.(jpe?g|png)$/i.test(f)).map(f => path.posix.join('lock/easter', f));
    fs.writeFileSync(out, JSON.stringify(imgs, null, 2));
    console.log(new Date().toISOString(), 'Wrote', out, 'with', imgs.length, 'entries');
  } catch (e) {
    console.error('Error generating manifest', e);
  }
}

let timer = null;
function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { generate(); timer = null; }, 250);
}

// initial
generate();

console.log('Watching', dir, 'for image changes. Press Ctrl+C to stop.');

const watcher = fs.watch(dir, { persistent: true }, (eventType, filename) => {
  if (!filename) return schedule();
  if (/\.(jpe?g|png)$/i.test(filename) || filename === 'list.json') schedule();
});

process.on('SIGINT', () => {
  console.log('\nStopping watcher.');
  watcher.close();
  process.exit(0);
});

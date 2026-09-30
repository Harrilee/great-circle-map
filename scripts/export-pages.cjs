/* Build first, then export the same application under a static site's subdirectory. */
const fs = require('fs');
const path = require('path');
const target = process.argv[2];
if (!target) throw new Error('Usage: node scripts/export-pages.cjs /path/to/pages/tools/great-circle-map');
const source = path.resolve(__dirname, '../public');
fs.mkdirSync(target, { recursive: true });
for (const file of ['bundle.js', 'bundle.js.LICENSE.txt', 'airports.csv']) fs.copyFileSync(path.join(source, file), path.join(target, file));
const html = fs.readFileSync(path.join(source, 'index.html'), 'utf8').replace('data-atlas src="/bundle.js"', 'data-atlas src="/tools/great-circle-map/bundle.js"');
for (const mode of ['', 'globe', 'satellite', 'roadmap', 'leaflet', 'google-satellite', 'google-roadmap']) {
  const dir = path.join(target, mode);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}
console.log(`Exported flight atlas to ${target}`);

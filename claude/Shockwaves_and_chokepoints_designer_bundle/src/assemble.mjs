// Rebuilds the single-file prototype: node assemble.mjs
// Reads template.html and map.json from this folder, writes ../Shockwaves_and_chokepoints_mockup.html
import fs from 'node:fs';
const dir = new URL('.', import.meta.url);
const t = fs.readFileSync(new URL('template.html', dir), 'utf8');
const map = fs.readFileSync(new URL('map.json', dir), 'utf8');
if (!t.includes('/*__MAP__*/null')) throw new Error('placeholder missing in template');
fs.writeFileSync(new URL('../Shockwaves_and_chokepoints_mockup.html', dir), t.replace('/*__MAP__*/null', () => map));
console.log('written');

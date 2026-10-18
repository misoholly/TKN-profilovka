// Vyrobí favicon-32.png a apple-touch-icon.png (180 px) z favicon.svg (logo TKN z logo/tkn-logo.svg bez metadát).
// Spustenie: node skripty/favicony.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = fs.readFileSync(path.join(KOREN, 'favicon.svg'));
for (const [n, px] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180]]) {
  await sharp(svg, { density: 600 }).resize(px, px, { fit: 'contain', background: '#fff' }).png().toFile(path.join(KOREN, n));
  console.log(n, px);
}

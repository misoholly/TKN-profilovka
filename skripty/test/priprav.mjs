// Vyrobí testovacie súbory pre skripty/overenie.mjs. Spustenie: node skripty/test/priprav.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const D=path.dirname(fileURLToPath(import.meta.url))+path.sep;
// Portrét z telefónu: pixely uložené naležato 1600×1200, EXIF Orientation 6 => má sa zobraziť na výšku 1200×1600.
// Uložené: vľavo modrý pás 600 px, hore zelený 400 px, vpravo červený 200 px. Po otočení (90° v smere hodín) je modrá hore, zelená vpravo, červená dole.
const w=1600,h=1200;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#dddddd"/>
<rect x="${w-200}" y="0" width="200" height="${h}" fill="#ff0000"/><rect x="0" y="0" width="600" height="${h}" fill="#0000ff"/><rect x="0" y="0" width="${w}" height="400" fill="#00aa00"/></svg>`;
await sharp(Buffer.from(svg)).jpeg({quality:90}).withMetadata({orientation:6}).toFile(D+'exif-portret.jpg');
// veľká fotka 4000×3000 (zmenšenie na 3200)
await sharp({create:{width:4000,height:3000,channels:3,background:'#888888'}}).jpeg().toFile(D+'velka.jpg');
fs.writeFileSync(D+'pokazena.jpg','toto nie je obrazok');
console.log(await sharp(D+'exif-portret.jpg').metadata().then(m=>[m.width,m.height,m.orientation]));

// Jednoduchý statický server na lokálne overenie (správa sa ako Vercel s cleanUrls: /kandidati -> kandidati/index.html).
// Použitie: node skripty/server.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPY = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.mjs': 'text/javascript' };
export function server(port = 8787) {
  const s = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(KOREN, p);
    if (!f.startsWith(KOREN)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    else if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f = f + '.html';
    if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('404'); }
    res.writeHead(200, { 'content-type': TYPY[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => s.listen(port, '127.0.0.1', () => r(s)));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.argv[2] || 8787);
  server(port).then(() => console.log('http://127.0.0.1:' + port));
}

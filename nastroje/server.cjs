// Jednoduchý statický server na lokálne testovanie (správa sa ako Vercel s cleanUrls).
// Použitie: node nastroje/server.cjs [port]
const http = require('http');
const fs = require('fs');
const path = require('path');

const KOREN = path.resolve(__dirname, '..');
// Rovnaké hlavičky ako na Verceli (vrátane Content-Security-Policy) – z vercel.json.
const HLAVICKY = {};
try {
  const konfig = JSON.parse(fs.readFileSync(path.join(KOREN, 'vercel.json'), 'utf8'));
  (konfig.headers || []).forEach((h) => h.headers.forEach((x) => (HLAVICKY[x.key] = x.value)));
} catch (e) {}
const TYPY = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json'
};

function najdi(cesta) {
  const p = path.join(KOREN, decodeURIComponent(cesta));
  if (!p.startsWith(KOREN)) return null;
  const kandidati = [p, p + '.html', path.join(p, 'index.html')];
  for (const k of kandidati) {
    try {
      if (fs.statSync(k).isFile()) return k;
    } catch (e) {}
  }
  return null;
}

function spusti(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const subor = najdi(url.pathname);
    if (!subor) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('404');
    }
    res.writeHead(200, Object.assign({ 'content-type': TYPY[path.extname(subor)] || 'application/octet-stream' }, HLAVICKY));
    fs.createReadStream(subor).pipe(res);
  });
  return new Promise((ok) => server.listen(port || 0, '127.0.0.1', () => ok(server)));
}

module.exports = { spusti };

if (require.main === module) {
  const port = Number(process.argv[2]) || 8080;
  spusti(port).then(() => console.log('http://127.0.0.1:' + port));
}

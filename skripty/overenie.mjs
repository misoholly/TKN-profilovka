// Overenie stránky podľa zadania 133, časť 7 (Playwright + Chrome, desktop 1280 px a mobil 390 px).
// Spustenie: node skripty/overenie.mjs
// Testovacie súbory v skripty/test/: exif-portret.jpg (1600×1200, EXIF orientácia 6 – po otočení hore modrý pás, vpravo zelený),
// velka.jpg (4000×3000), pokazena.jpg (text). Výstupy (PNG a snímky) idú do overenie/ (nie je v gite).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { server } from './server.mjs';
const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = path.join(KOREN, 'skripty', 'test');
const OUT = path.join(KOREN, 'overenie'); fs.mkdirSync(OUT, { recursive: true });
const vysledky = []; let chyby = 0;
function ok(c, nazov, pozn) { vysledky.push({ c, ok: true, nazov, pozn }); console.log(`OK  ${c}. ${nazov}${pozn ? ' – ' + pozn : ''}`); }
function zle(c, nazov, pozn) { chyby++; vysledky.push({ c, ok: false, nazov, pozn }); console.log(`ZLE ${c}. ${nazov}${pozn ? ' – ' + pozn : ''}`); }
function over(c, podm, nazov, pozn) { (podm ? ok : zle)(c, nazov, pozn); }

const port = 8791; const srv = await server(port); const URL_ = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ channel: 'chrome' });

async function stiahni(page) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#stiahnut')]);
  const buf = fs.readFileSync(await dl.path());
  return { nazov: dl.suggestedFilename(), png: PNG.sync.read(buf), buf };
}
const px = (png, x, y) => { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const blizko = (a, b, tol = 6) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
async function nahraj(page, subor) { await page.setInputFiles('#subor', subor); await page.waitForTimeout(400); }
const stav = page => page.evaluate(() => ({
  typ: document.getElementById('typ-kandidat').getAttribute('aria-pressed') === 'true' ? 'kandidat' : 'cibrik',
  forma: [...document.querySelectorAll('.formy .volba')].find(b => b.getAttribute('aria-pressed') === 'true')?.textContent.trim(),
  kandidatSkryty: document.getElementById('cast-kandidat').hidden,
  zoom: document.getElementById('zoom').value,
  doraz: document.getElementById('doraz').classList.contains('vidno'),
  stiahnut: document.getElementById('stiahnut').disabled,
  zdielat: document.getElementById('zdielat').hidden,
  info: document.getElementById('subor-info').textContent,
  listok: document.getElementById('listok').innerText.replace(/\s+/g, ' ').trim(),
  obvod: [...document.querySelectorAll('#obvody .obvod')].find(b => b.getAttribute('aria-pressed') === 'true')?.textContent,
  kand: [...document.querySelectorAll('.kand')].find(b => b.getAttribute('aria-pressed') === 'true')?.innerText.replace(/\s+/g, ' '),
  pocetKand: document.querySelectorAll('.kand').length,
  chyba: document.getElementById('chyba').hidden ? null : document.getElementById('chyba').textContent,
  url: location.href,
}));
const nahladPixel = (page, x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('platno'); const d = c.getContext('2d').getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; }, [x, y]);
const hashCanvas = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0; return h; };
// Snímka náhľadu a počet odlišných pixelov. Chrome mení po čase rasterizáciu plátna, takže vyhladené hrany sa líšia o pár tisíc pixelov –
// „rovnaké“ = menej ako 25 000 odlišných pixelov (1,4 % plátna), „iné“ = viac ako 60 000.
const snimka = page => page.evaluate(() => { const c = document.getElementById('platno'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); });
const rozdiel = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) { if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) n++; } return n; };
const rovnake = (a, b) => rozdiel(a, b) < 25000, ine = (a, b) => rozdiel(a, b) > 60000;
const miniHash = page => page.evaluate(`[...document.querySelectorAll('.formy canvas')].map(${hashCanvas})`);
const zoomHodnota = page => page.evaluate(() => document.getElementById('zoom').value);

// ===== desktop =====
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, locale: 'sk-SK' });
  const page = await ctx.newPage();
  const konzola = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') konzola.push(m.text()); }); page.on('pageerror', e => konzola.push('pageerror: ' + e.message));
  const poziadavky = new Set(); page.on('request', r => { const u = new URL(r.url()); if (u.host !== `127.0.0.1:${port}`) poziadavky.add(u.host); });
  let alertVolany = false; page.on('dialog', d => { alertVolany = true; d.dismiss(); });
  await page.goto(URL_); await page.waitForFunction(() => document.querySelectorAll('.formy canvas').length === 3);
  await page.waitForTimeout(500);
  over(1, konzola.length === 0, 'Načítanie bez chýb v konzole', konzola.join(' | '));
  const font = await page.evaluate(() => document.fonts.check('900 80px "Reddit Sans"', 'ČIBRIKA ZA PRIMÁTORA') && document.fonts.check('700 30px "Reddit Sans"', 'TÍM KRAJ NITRA KRÚŽKUJTE'));
  over(1, font, 'Reddit Sans vrátane latin-ext (Č, Í, Á) načítaný pred kreslením miniatúr');
  over('4.8', [...poziadavky].every(h => /fonts\.(googleapis|gstatic)\.com$/.test(h)), 'Z internetu sa načítava len Google Fonts', [...poziadavky].join(', '));
  let s = await stav(page);
  const viditelne = await page.evaluate(() => ['motivy', 'cast-kandidat', 'zdielat', 'chyba'].filter(id => getComputedStyle(document.getElementById(id)).display !== 'none'));
  over(2, viditelne.length === (s.zdielat ? 0 : 1), 'Prvky s atribútom hidden sú naozaj skryté (výber textu, kandidáti, chybová hláška)', viditelne.join(', ') || 'všetky skryté');
  over(2, s.typ === 'cibrik' && s.forma?.startsWith('B') && s.kandidatSkryty, 'Po načítaní „Volím Čibrika“, tvar B, kandidátske ovládanie skryté', `${s.typ}, ${s.forma}`);
  { const can = await page.evaluate(() => { try { return !!navigator.canShare && navigator.canShare({ files: [new File([new Blob()], 'a.png', { type: 'image/png' })] }); } catch (e) { return false; } }); over(8, can ? !s.zdielat : s.zdielat, 'Desktop: tlačidlo zdieľať sa riadi navigator.canShare({files})', `canShare ${can}, skryté ${s.zdielat}`); }

  // 3. prepnutie tvarov prekreslí náhľad aj miniatúry
  const h0 = await snimka(page), m0 = await miniHash(page);
  await page.click('.formy .volba:nth-child(1)'); const hA = await snimka(page);
  await page.click('.formy .volba:nth-child(3)'); const hC = await snimka(page);
  await page.click('.formy .volba:nth-child(2)'); const hB = await snimka(page);
  over(3, ine(h0, hA) && ine(h0, hC) && ine(hA, hC) && rovnake(h0, hB) && new Set(m0).size === 3, 'Prepnutie tvaru A → C → B prekreslí náhľad, 3 rôzne miniatúry', `odlišné px: B→A ${rozdiel(h0, hA)}, B→C ${rozdiel(h0, hC)}, B→B ${rozdiel(h0, hB)}`);

  // 4. EXIF
  await nahraj(page, path.join(TEST, 'exif-portret.jpg'));
  s = await stav(page);
  const m1 = await miniHash(page);
  over(3, m1.every((h, i) => h !== m0[i]), 'Po nahratí fotky sa miniatúry prekreslia s fotkou');
  // po otočení: hore zelená, vľavo červená (fotka na výšku 1200×1600 → do kruhu sa vojde šírka, výška pretŕča)
  const hore = await nahladPixel(page, 672, 240), vpravo = await nahladPixel(page, 1120, 672), vlavo = await nahladPixel(page, 224, 672);
  over(4, blizko(hore, [0, 0, 255], 40) && blizko(vpravo, [0, 170, 0], 40) && blizko(vlavo, [221, 221, 221], 20), 'JPEG s EXIF otočením sa zobrazí správne otočený (hore modrá, vpravo zelená)', `hore ${hex(hore)}, vpravo ${hex(vpravo)}, vľavo ${hex(vlavo)}`);
  // 3b. zmena tvaru zachová výrez
  await page.evaluate(() => document.getElementById('nahlad').scrollIntoView());
  const box = await page.locator('#nahlad').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx, cy - 60, { steps: 5 }); await page.mouse.up();
  const hPred = await snimka(page);
  await page.click('.formy .volba:nth-child(1)'); await page.click('.formy .volba:nth-child(2)');
  const hPo = await snimka(page);
  over(3, rovnake(hPred, hPo) && (await zoomHodnota(page)) === '1', 'Po nahratí fotky zmena tvaru zachová výrez', `odlišné px ${rozdiel(hPred, hPo)}`);

  // 5. doraz
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 400, cy, { steps: 8 }); await page.mouse.up();
  s = await stav(page);
  over(5, s.doraz, 'Ťahanie mimo kruhu narazí na doraz a zobrazí hlášku', (await page.locator('#doraz').textContent()).trim());
  await page.click('#stred');

  // 6. koliesko okolo kurzora, +/− okolo stredu, Vycentrovať
  await page.mouse.move(cx + 100, cy + 100); await page.mouse.wheel(0, -200); await page.waitForTimeout(150);
  const zW = parseFloat(await zoomHodnota(page));
  await page.click('#stred'); const zS = await zoomHodnota(page);
  await page.click('#plus'); await page.click('#plus'); const zP = await zoomHodnota(page);
  await page.click('#minus'); const zM = await zoomHodnota(page);
  await page.click('#stred');
  over(6, zW > 1 && zS === '1' && zP === '1.5' && zM === '1.25', 'Koliesko približuje, +/− po 0,25, Vycentrovať vráti 1', `koliesko ${zW.toFixed(2)}, + ${zP}, − ${zM}, stred ${zS}`);

  // 7. stiahnutý PNG pre A, B, C
  for (const [i, f] of [[1, 'A'], [2, 'B'], [3, 'C']]) {
    await page.click(`.formy .volba:nth-child(${i})`);
    const { nazov, png, buf } = await stiahni(page);
    fs.writeFileSync(path.join(OUT, `cibrik-${f}.png`), buf);
    const rohy = [[2, 2], [797, 2], [2, 797], [797, 797]].map(([x, y]) => hex(px(png, x, y)));
    over(7, nazov === 'profilovka-tkn.png' && png.width === 800 && png.height === 800 && rohy.every(r => r === '#28408E'), `PNG tvar ${f}: profilovka-tkn.png, 800 × 800, rohy #28408E`, `${nazov} ${png.width}×${png.height} rohy ${rohy.join(' ')}`);
    // lem: pod pásom na okraji kruhu nesmie byť svetlý pixel – vzorka po oblúku v dolnej časti (r = 399 z 400)
    let svetle = 0;
    for (let a = 100; a <= 260; a += 2) { const r = a * Math.PI / 180; const p = px(png, Math.round(400 + 399 * Math.cos(r)), Math.round(400 + 399 * Math.sin(r))); if (p[0] + p[1] + p[2] > 600) svetle++; }
    over(7, svetle === 0, `PNG tvar ${f}: na okraji kruhu pod pásom nie je svetlý lem`, `${svetle} svetlých pixelov`);
  }
  await page.click('.formy .volba:nth-child(2)');

  // 10. kandidát
  await page.click('#typ-kandidat'); s = await stav(page);
  over(10, s.typ === 'kandidat' && s.obvod === '1. obvod' && /7 Róbert Čibrik/.test(s.kand) && !s.stiahnut && s.info.includes('profilovka-tkn-cibrik-7.png'), 'Prepnutie na kandidáta: 1. obvod, č. 7 Róbert Čibrik, Stiahnuť aktívne', `${s.obvod}, ${s.kand}, info: ${s.info}`);
  over(10, /Na hlasovacom lístku: číslo 7 – Mgr\. Róbert Čibrik Voľba poslancov, 1\. volebný obvod\./.test(s.listok), 'Potvrdenie lístka pre č. 7', s.listok);
  { const { nazov, png, buf } = await stiahni(page); fs.writeFileSync(path.join(OUT, 'kandidat-B-cibrik-7.png'), buf); over(10, nazov === 'profilovka-tkn-cibrik-7.png' && png.width === 800, 'Stiahnutie kandidátskeho PNG', nazov); }
  // 13. prepnutie zachová fotku a výrez
  await page.click('#plus'); const hK = await snimka(page);
  await page.click('#typ-cibrik'); await page.click('#typ-kandidat');
  { const hK2 = await snimka(page); over(13, rovnake(hK, hK2) && (await zoomHodnota(page)) === '1.25', 'Prepnutie typu zachová fotku aj výrez', `odlišné px ${rozdiel(hK, hK2)}`); }
  await page.click('#stred');

  // 11. obvody
  await page.click('#obvody .obvod:nth-child(4)'); s = await stav(page);
  over(11, s.obvod === 'Primátor' && /2 Róbert Čibrik/.test(s.kand) && s.pocetKand === 1 && /Voľba primátora\./.test(s.listok) && !s.stiahnut, '„Primátor“ automaticky vyberie Čibrika č. 2', `${s.kand}, ${s.listok}`);
  for (const [n, poc] of [[2, 6], [3, 6]]) {
    await page.click(`#obvody .obvod:nth-child(${n})`); s = await stav(page);
    over(11, s.obvod === `${n}. obvod` && s.kand === undefined && s.pocetKand === poc && s.stiahnut && s.info === 'Najprv vyberte kandidáta.' && /Vyberte kandidáta – číslo z hlasovacieho lístka sa doplní samo\./.test(s.listok), `${n}. obvod nechá kandidáta nevybraného, Stiahnuť neaktívne`, `${s.pocetKand} kandidátov, info: ${s.info}`);
  }
  const hNikto = await snimka(page);
  await page.click('.kand:nth-child(1)'); over(11, rozdiel(hNikto, await snimka(page)) > 5000, 'Po výbere kandidáta sa rámček prekreslí (pred výberom zástupný „?“ / MENO KANDIDÁTA)');

  // 12. všetkých 19 kandidátov × 3 tvary – stiahnuť a overiť názov a rozmer (text je len jeden: Krúžkujte)
  const KAND = await page.evaluate(() => [...document.querySelectorAll('#obvody .obvod')].map(b => b.textContent));
  let pocet = 0, zlyNazov = [];
  const ocak = { '1. obvod': ['cibrik-7', 'kantorova-9', 'kovac-10', 'matajs-11', 'petrusek-15', 'suran-18'], '2. obvod': ['balaz-1', 'gabarik-3', 'marekova-8', 'novakova-11', 'schreiber-13', 'vlk-19'], '3. obvod': ['baca-2', 'elekova-4', 'kovacs-11', 'kovacova-12', 'plenta-15', 'sedlarova-18'], 'Primátor': ['cibrik-primator-2'] };
  const prehlad = [];
  for (let o = 1; o <= 4; o++) {
    await page.click(`#obvody .obvod:nth-child(${o})`);
    const n = await page.locator('.kand').count();
    for (let k = 1; k <= n; k++) {
      await page.click(`.kand:nth-child(${k})`);
      const nazovK = (await page.locator(`.kand:nth-child(${k})`).innerText()).replace(/\s+/g, ' ');
      for (let t = 1; t <= 1; t++) {
        for (let f = 1; f <= 3; f++) {
          await page.click(`#formy-kandidat .volba:nth-child(${f})`);
          const { nazov, png, buf } = await stiahni(page); pocet++;
          const c = ocak[KAND[o - 1]][k - 1];
          if (nazov !== `profilovka-tkn-${c}.png` || png.width !== 800) zlyNazov.push(nazov);
          if (t === 1 && f === 2) { prehlad.push({ obvod: KAND[o - 1], kandidat: nazovK, subor: nazov }); fs.writeFileSync(path.join(OUT, `kandidat-B-${c}.png`), buf); }
        }
      }
    }
  }
  over(12, pocet === 19 * 3 && zlyNazov.length === 0, 'Všetkých 19 kandidátov × 3 tvary sa stiahne so správnym názvom (číslom)', `${pocet} súborov${zlyNazov.length ? ', zle: ' + zlyNazov.join(', ') : ''}`);
  fs.writeFileSync(path.join(OUT, 'kandidati-prehlad.json'), JSON.stringify(prehlad, null, 2));

  // 15. dlhé mená – text sa zmenší, nie oreže (rovnaký algoritmus ako text() v stránke)
  await page.click('#obvody .obvod:nth-child(3)');
  for (const [k, meno] of [[4, 'kovacova-12'], [3, 'kovacs-11']]) {
    await page.click(`.kand:nth-child(${k})`);
    for (const [f, tvar] of [[1, 'A'], [3, 'C']]) {
      await page.click(`#formy-kandidat .volba:nth-child(${f})`);
      const { buf } = await stiahni(page); fs.writeFileSync(path.join(OUT, `kandidat-${tvar}-${meno}.png`), buf);
    }
  }
  const sirky = await page.evaluate(() => { const c = document.createElement('canvas').getContext('2d'); const F = "'Reddit Sans', Arial, sans-serif";
    function sirkaZm(s, vaha, v, maxW) { c.font = `${vaha} ${v}px ${F}`; let w = c.measureText(s).width; while (w > maxW && v > 10) { v -= 1; c.font = `${vaha} ${v}px ${F}`; w = c.measureText(s).width; } return { v, w: Math.round(w), maxW }; }
    return { 'A Kováčová': sirkaZm('KATARÍNA KOVÁČOVÁ', 900, 40, 540), 'B Kováčová': sirkaZm('KATARÍNA KOVÁČOVÁ', 900, 38, 500), 'C Kováčová': sirkaZm('KATARÍNA KOVÁČOVÁ', 900, 32, 380), 'C Kovács': sirkaZm('FRANTIŠEK KOVÁCS', 900, 32, 380), 'A pás primátor': sirkaZm('ZA PRIMÁTORA KRÚŽKUJTE', 900, 58, 800), 'B pás primátor': sirkaZm('ZA PRIMÁTORA KRÚŽKUJTE', 900, 46, 780) }; });
  over(15, Object.values(sirky).every(x => x.w <= x.maxW && x.v >= 24), 'Dlhé mená sa zmestia (text sa zmenší cez maxW, nie oreže)', Object.entries(sirky).map(([k, v]) => `${k}: ${v.v}px, ${v.w} ≤ ${v.maxW}`).join('; '));

  // 14. odkazy
  await page.goto('about:blank'); await page.goto(URL_ + '#kandidati'); await page.waitForTimeout(500); s = await stav(page);
  over(14, s.typ === 'kandidat' && s.obvod === '1. obvod' && /7 Róbert Čibrik/.test(s.kand), '#kandidati otvorí „S číslom kandidáta“ (1. obvod, č. 7)', `${s.obvod}, ${s.kand}`);
  await page.goto('about:blank'); await page.goto(URL_ + '#o1-09'); await page.waitForTimeout(500); s = await stav(page);
  over(14, s.typ === 'kandidat' && /9 Ingrid Kántorová/.test(s.kand) && s.info.includes('profilovka-tkn-kantorova-9.png'), '#o1-09 predvolí Ingrid Kántorovú', s.kand);
  await page.goto(URL_ + '?k=o3-12'); await page.waitForTimeout(500); s = await stav(page);
  over(14, s.typ === 'kandidat' && s.obvod === '3. obvod' && /12 Katarína Kováčová/.test(s.kand), '?k=o3-12 predvolí Katarínu Kováčovú', s.kand);
  konzola.length = 0;
  await page.goto('about:blank'); await page.goto(URL_ + '#nezname-xyz'); await page.waitForTimeout(500); s = await stav(page);
  over(14, s.typ === 'cibrik' && konzola.length === 0, 'Neznámy kód sa ignoruje bez chyby (ostane Volím Čibrika)', konzola.join(' | '));
  await page.goto(URL_); await page.waitForTimeout(400);
  await page.click('#typ-kandidat'); await page.click('#obvody .obvod:nth-child(2)'); await page.click('.kand:nth-child(2)'); await page.click('.formy .volba:nth-child(3)');
  s = await stav(page);
  over(14, s.url === URL_, 'Adresa sa pri klikaní nemení', s.url);
  await page.evaluate(() => { location.hash = '#o2-19'; }); await page.waitForTimeout(300); s = await stav(page);
  over(14, /19 Ivan Vlk/.test(s.kand), 'Zmena hashu za behu (hashchange) prepne kandidáta', s.kand);

  // 17. chybná fotka
  await page.goto(URL_); await page.waitForTimeout(400);
  await nahraj(page, path.join(TEST, 'pokazena.jpg')); s = await stav(page);
  over(17, !alertVolany && s.chyba === 'Túto fotku sa nepodarilo otvoriť. Skúste JPEG alebo PNG.', 'Chybná fotka zobrazí hlášku na stránke, žiadny alert()', s.chyba);
  await nahraj(page, path.join(TEST, 'velka.jpg')); s = await stav(page);
  over(17, s.chyba === null, 'Po ďalšom (platnom) nahratí sa hláška skryje');
  { const { png } = await stiahni(page); over(7, png.width === 800, 'Veľká fotka 4000×3000 sa spracuje (zmenšenie zdroja na 3200 px) a výstup je 800 px'); }

  // 16. texty
  const zdroj = fs.readFileSync(path.join(KOREN, 'index.html'), 'utf8');
  const telo = await page.evaluate(() => document.body.innerText);
  const zakazane = ['Kto ste', 'Vaše meno', 'svoje meno', 'Kde kandidujete', 'napíšte nám', 'moratórium', 'PROTOTYP', '22:00', 'DOPLNIŤ'];
  const kandidujem = /kandidujem/i.test(zdroj) || /kandidujem/i.test(telo) || (await page.evaluate(() => document.querySelectorAll('#motivy-kandidat').length)) > 0;
  over(16, !kandidujem, 'Variant „Kandidujem“ nie je v zdroji, na stránke ani ako voľba');
  const najdene = zakazane.filter(z => zdroj.includes(z) || telo.includes(z));
  over(16, najdene.length === 0, 'Zdroj ani stránka neobsahujú zakázané texty', najdene.join(', '));
  { const ti = await page.evaluate(async () => { const img = document.querySelector('.titulka'); await img.decode(); const a = document.getElementById('titulka-stiahnut'); const r = await fetch(a.href, { cache: 'no-store' }); return { w: img.naturalWidth, h: img.naturalHeight, ok: r.ok, typ: r.headers.get('content-type'), dl: a.getAttribute('download'), odkaz: !!document.querySelector('a[href="#titulna-fotka"]') && !!document.getElementById('titulna-fotka') }; });
    over('–', ti.w === 1702 && ti.h === 630 && ti.ok && ti.typ === 'image/png' && ti.dl === 'titulna-fotka-tkn.png' && ti.odkaz, 'Titulná fotka: obrázok sa načíta, tlačidlo Stiahnuť má download, odkaz z úvodu vedie na sekciu', JSON.stringify(ti)); }
  over(16, telo.includes('Objednávateľ: Tím Kraj Nitra – Zmena pre Šaľu · Dodávateľ: Tím Kraj Nitra – Zmena pre Šaľu') && telo.includes('© Copyright 2026 - Zmena pre Šaľu. Všetky práva vyhradené.') && zdroj.includes('href="https://www.zmenapresalu.sk/ochrana-udajov-gdpr"'), 'Pätička: objednávateľ, dodávateľ, copyright a odkaz na ochranu osobných údajov');
  over('4.8', !/analytics|gtag|fbq|document\.cookie/i.test(zdroj), 'Žiadna analytika ani cookies v zdroji');
  over('4.3', /<meta property="og:image"/.test(zdroj) && /<link rel="canonical"/.test(zdroj) && /twitter:card" content="summary_large_image"/.test(zdroj) && /og:locale" content="sk_SK"/.test(zdroj), 'Meta: canonical, og:*, twitter:card');

  await page.goto(URL_); await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'desktop-1280.png'), fullPage: true });
  await page.click('#typ-kandidat'); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'desktop-1280-kandidat.png'), fullPage: true });
  await ctx.close();
}

// ===== mobil 390 px =====
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true, locale: 'sk-SK' });
  const page = await ctx.newPage();
  await page.goto(URL_); await page.waitForFunction(() => document.querySelectorAll('.formy canvas').length === 3); await page.waitForTimeout(500);
  const pretece = async () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, nahlad: document.getElementById('nahlad').getBoundingClientRect().width, main: document.querySelector('main').clientWidth }));
  let m = await pretece();
  over(9, m.sw <= m.cw && m.nahlad >= 340, 'Mobil 390 px, Volím Čibrika: nič nepretečie, náhľad na celú šírku', `scrollWidth ${m.sw} / ${m.cw}, náhľad ${m.nahlad}px`);
  await page.screenshot({ path: path.join(OUT, 'mobil-390.png'), fullPage: true });
  await page.click('#typ-kandidat'); await page.waitForTimeout(400); m = await pretece();
  over(9, m.sw <= m.cw, 'Mobil 390 px, S číslom kandidáta: tlačidlá obvodov a kandidátov sa zalomia, nič nepretečie', `scrollWidth ${m.sw} / ${m.cw}`);
  await page.screenshot({ path: path.join(OUT, 'mobil-390-kandidat.png'), fullPage: true });
  over(9, await page.evaluate(() => document.getElementById('dnd-hint').hidden), 'Na dotykovom zariadení je skrytá nápoveda o pretiahnutí');
  const share = await page.evaluate(() => { let can = false; try { can = !!navigator.canShare && navigator.canShare({ files: [new File([new Blob()], 'a.png', { type: 'image/png' })] }); } catch (e) {} return { can, hidden: document.getElementById('zdielat').hidden }; });
  over(8, share.can ? !share.hidden : share.hidden, 'Tlačidlo zdieľať sa riadi navigator.canShare({files})', `canShare ${share.can}, skryté ${share.hidden}`);
  await ctx.close();
}

await browser.close(); srv.close();
fs.writeFileSync(path.join(OUT, 'vysledky.json'), JSON.stringify(vysledky, null, 2));
console.log(`\n${vysledky.length - chyby} / ${vysledky.length} kontrol prešlo${chyby ? ', ' + chyby + ' ZLYHALO' : ''}`);
process.exit(chyby ? 1 : 0);

// Automatické overenie oboch stránok v Chromiu (Playwright): desktop 1280 px a mobil 390 px.
// Kontroluje body 1–11 zo zadania. Spustenie: cd nastroje && npm install && npx playwright install chromium && npm run overenie
// Voliteľne: SNIMKY=/cesta/k/priecinku uloží snímky obrazoviek.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { spusti } = require('./server.cjs');

const SNIMKY = process.env.SNIMKY || '';
const vysledky = [];
function over(bod, nazov, podmienka, detail) {
  vysledky.push({ bod, nazov, ok: !!podmienka, detail: detail === undefined ? '' : String(detail) });
}

// Nezávislý prepis čísel kandidátov TKN z oficiálneho zoznamu (f8007.pdf, f8008.pdf, 10. 9. 2026).
const OCAKAVANI = {
  P: { 'Mgr. Róbert Čibrik': 2 },
  1: { 'Mgr. Róbert Čibrik': 7, 'Ing. Ingrid Kántorová': 9, 'Milan Kováč': 10, 'Jakub Matajs': 11, 'Mgr. Boris Petrušek': 15, 'Ing. Róbert Šuran': 18 },
  2: { 'Bc. Peter Baláž': 1, 'MUDr. Martin Gabarík': 3, 'Ing. Zuzana Mareková': 8, 'Mgr. Zuzana Nováková': 11, 'Peter Schreiber': 13, 'Ing. Ivan Vlk': 19 },
  3: { 'Mgr. Peter Bača': 2, 'Ing. Martina Eleková': 4, 'František Kovács': 11, 'MUDr., MPH Katarína Kováčová': 12, 'PhD. Peter Plenta': 15, 'Ing. Erika Sedlárová': 18 }
};

// ---------- Testovacie obrázky ----------

/** Vloží do JPEG-u EXIF so značkou Orientation (6 = otočiť o 90° v smere hodín). */
function pridajExifOrientaciu(jpeg, orientacia) {
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // MM, 42, IFD na offsete 8
    0x00, 0x01, // 1 položka
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientacia, 0x00, 0x00, // Orientation SHORT
    0x00, 0x00, 0x00, 0x00 // ďalšie IFD: žiadne
  ]);
  const data = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (data.length + 2) >> 8, (data.length + 2) & 0xff]), data]);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

async function vyrobTestovacieObrazky(page, priecinok) {
  const d = await page.evaluate(() => {
    // 900 × 600 uložené na šírku: ľavá polovica červená, pravá modrá.
    const a = document.createElement('canvas');
    a.width = 900;
    a.height = 600;
    const x = a.getContext('2d');
    x.fillStyle = '#ff0000';
    x.fillRect(0, 0, 450, 600);
    x.fillStyle = '#0000ff';
    x.fillRect(450, 0, 450, 600);
    // 1600 × 800 široká fotka s mriežkou (na dorazy a zoom).
    const b = document.createElement('canvas');
    b.width = 1600;
    b.height = 800;
    const y = b.getContext('2d');
    const g = y.createLinearGradient(0, 0, 1600, 800);
    g.addColorStop(0, '#2e7d32');
    g.addColorStop(1, '#f9a825');
    y.fillStyle = g;
    y.fillRect(0, 0, 1600, 800);
    y.strokeStyle = 'rgba(0,0,0,.35)';
    for (let i = 0; i <= 1600; i += 100) {
      y.beginPath();
      y.moveTo(i, 0);
      y.lineTo(i, 800);
      y.stroke();
    }
    for (let j = 0; j <= 800; j += 100) {
      y.beginPath();
      y.moveTo(0, j);
      y.lineTo(1600, j);
      y.stroke();
    }
    y.fillStyle = '#fff';
    y.beginPath();
    y.arc(1250, 330, 120, 0, Math.PI * 2);
    y.fill();
    return { exif: a.toDataURL('image/jpeg', 0.95), siroka: b.toDataURL('image/png') };
  });
  const exif = pridajExifOrientaciu(Buffer.from(d.exif.split(',')[1], 'base64'), 6);
  const cesty = {
    exif: path.join(priecinok, 'portret-exif6.jpg'),
    siroka: path.join(priecinok, 'siroka.png'),
    heic: path.join(priecinok, 'fotka.heic')
  };
  fs.writeFileSync(cesty.exif, exif);
  fs.writeFileSync(cesty.siroka, Buffer.from(d.siroka.split(',')[1], 'base64'));
  fs.writeFileSync(cesty.heic, Buffer.from('toto nie je obrazok'));
  return cesty;
}

// ---------- Pomocné funkcie ----------

async function pripravStranku(context, base, adresa) {
  const page = await context.newPage();
  const chyby = [];
  const hostitelia = new Set();
  page.on('console', (m) => {
    if (m.type() === 'error') chyby.push(m.text());
  });
  page.on('pageerror', (e) => chyby.push(String(e)));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error('CSP: ' + e.violatedDirective + ' ' + e.blockedURI));
  });
  page.on('request', (r) => hostitelia.add(new URL(r.url()).hostname));
  await page.goto(base + adresa);
  await page.waitForFunction(() => document.documentElement.classList.contains('ramcek-pripraveny'));
  await page.waitForTimeout(200);
  return { page, chyby, hostitelia };
}

const stav = (page) => page.evaluate(() => window.ramcekDebug.stav());
const odtlacok = (page, sel) =>
  page.evaluate((s) => {
    const c = document.querySelector(s);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
    return h;
  }, sel);

async function nahraj(page, subor) {
  await page.setInputFiles('#fotka', subor);
  await page.waitForFunction(() => !document.getElementById('ovladanie').hidden);
  await page.waitForTimeout(250);
}

async function bodPlatna(page, ix, iy) {
  // ix, iy = súradnice v plátne náhľadu (0 = stred, rozsah ±520) → body na obrazovke
  await page.locator('#nahlad').scrollIntoViewIfNeeded();
  const b = await page.locator('#nahlad').boundingBox();
  return { x: b.x + ((ix + 520) / 1040) * b.width, y: b.y + ((iy + 520) / 1040) * b.height, b };
}

/** Stiahne PNG a vráti { nazov, sirka, vyska, pixely: {meno: [r,g,b]} , rozlozenie } */
async function stiahniAZmeraj(page, body) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#stiahnut')]);
  const buf = fs.readFileSync(await dl.path());
  const meranie = await page.evaluate(
    async ({ b64, body }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const pixely = {};
      for (const [meno, [px, py]] of Object.entries(body)) {
        const d = x.getImageData(px, py, 1, 1).data;
        pixely[meno] = [d[0], d[1], d[2]];
      }
      return { sirka: img.naturalWidth, vyska: img.naturalHeight, pixely, rozlozenie: window.ramcekDebug.vystup };
    },
    { b64: buf.toString('base64'), body }
  );
  return Object.assign({ nazov: dl.suggestedFilename() }, meranie);
}

const blizko = (a, b, tol = 12) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
const MODRA = [0x28, 0x40, 0x8e];

/** Overí, že každý riadok sa zmestí do šírky a celý leží vnútri kruhu (A, B) alebo nálepky (C). */
function textCely(rozl) {
  const h = rozl.hranica;
  const problemy = [];
  rozl.riadky.forEach((r) => {
    if (r.sirka > r.dostupne + 0.5) problemy.push(r.text + ': širší než priestor');
    for (const [px, py] of [
      [r.x, r.hore],
      [r.x + r.sirka, r.hore],
      [r.x, r.dole],
      [r.x + r.sirka, r.dole]
    ]) {
      if (Math.hypot(px - h.x, py - h.y) > h.r + 0.5) {
        problemy.push(r.text + ': mimo kruhu');
        break;
      }
    }
  });
  return problemy;
}

// ---------- Testy ----------

async function testHlavna(browser, base, obrazky, nazovZariadenia, moznosti) {
  const context = await browser.newContext(Object.assign({ acceptDownloads: true }, moznosti));
  const { page, chyby, hostitelia } = await pripravStranku(context, base, '/');
  const z = '[' + nazovZariadenia + '] ';

  // 1. načítanie, písmo, siete
  const prve = await page.evaluate(() => window.ramcekDebug.prveKreslenie);
  over(1, z + 'Reddit Sans načítaný pred prvým kreslením', prve && prve.pismoNacitane, JSON.stringify(prve));
  const cudzi = [...hostitelia].filter((h) => !['127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(h));
  over(9, z + 'stránka nenačítava nič okrem Google Fonts', cudzi.length === 0, cudzi.join(', ') || 'len 127.0.0.1 + fonts.googleapis.com + fonts.gstatic.com');
  const meta = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    og: [...document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')].map((m) => m.getAttribute('property') || m.getAttribute('name')),
    canonical: !!document.querySelector('link[rel=canonical]'),
    proto: !!document.querySelector('.proto')
  }));
  over('meta', z + 'title, lang=sk, OG/Twitter, canonical, bez žltého prúžku',
    meta.title === 'Rámček do profilovej fotky – Zmena pre Šaľu' && meta.lang === 'sk' && meta.canonical && !meta.proto &&
      ['og:title', 'og:description', 'og:type', 'og:url', 'og:locale', 'og:image', 'twitter:card'].every((k) => meta.og.includes(k)),
    meta.title);

  // 2. prepínanie tvarov bez fotky
  const tvarOdtlacky = [];
  for (const t of ['A', 'B', 'C']) {
    await page.click('.tvar:has(input[value="' + t + '"])');
    await page.waitForTimeout(150);
    tvarOdtlacky.push(await odtlacok(page, '#nahlad'));
  }
  over(2, z + 'prepnutie A → B → C prekreslí náhľad', new Set(tvarOdtlacky).size === 3, tvarOdtlacky.join(' / '));
  await page.click('.tvar:has(input[value="A"])');
  await page.waitForTimeout(150);

  // chybný súbor (HEIC)
  await page.setInputFiles('#fotka', obrazky.heic);
  await page.waitForTimeout(400);
  const chybaHeic = await page.evaluate(() => !document.getElementById('chyba').hidden && document.getElementById('chyba').textContent);
  over('extra', z + 'nečitateľný súbor (HEIC) ukáže hlášku', chybaHeic && chybaHeic.includes('HEIC'), chybaHeic);

  // nahratie širokej fotky
  const miniPred = await odtlacok(page, '.tvar:has(input[value="B"]) canvas');
  await nahraj(page, obrazky.siroka);
  const miniPo = await odtlacok(page, '.tvar:has(input[value="B"]) canvas');
  over(2, z + 'miniatúry sa po nahratí fotky prekreslia s fotkou', miniPred !== miniPo);
  const zdielanieDesktop = await page.isVisible('#zdielat');

  // 4. dorazy – ťahanie
  const st = await bodPlatna(page, 0, 0);
  await page.mouse.move(st.x, st.y);
  await page.mouse.down();
  await page.mouse.move(st.x + st.b.width * 0.6, st.y, { steps: 12 });
  await page.waitForTimeout(100);
  const poTahu = await stav(page);
  const hlaska = await page.evaluate(() => !document.getElementById('hlaska').hidden && document.getElementById('hlaska').textContent);
  await page.mouse.up();
  over(4, z + 'ťahanie mimo kruhu narazí na doraz (posun x = 400 pri zoome 1)', Math.abs(poTahu.posun.x - 400) < 0.01 && poTahu.posun.y === 0, JSON.stringify(poTahu.posun));
  over(4, z + 'pri doraze sa zobrazí hláška', hlaska === 'Ďalej to nejde – najprv priblížte (+)', hlaska);

  // 5. koliesko okolo kurzora
  await page.click('#vycentrovat');
  await page.waitForTimeout(100);
  const kurzor = { x: -150, y: 90 };
  const pk = await bodPlatna(page, kurzor.x, kurzor.y);
  const pred = await stav(page);
  await page.mouse.move(pk.x, pk.y);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(200);
  const po = await stav(page);
  const ux0 = (kurzor.x - pred.posun.x) / pred.priblizenie;
  const uy0 = (kurzor.y - pred.posun.y) / pred.priblizenie;
  const ux1 = (kurzor.x - po.posun.x) / po.priblizenie;
  const uy1 = (kurzor.y - po.posun.y) / po.priblizenie;
  over(5, z + 'koliesko približuje okolo kurzora (bod pod kurzorom ostane)', po.priblizenie > 1.05 && Math.abs(ux0 - ux1) < 1 && Math.abs(uy0 - uy1) < 1,
    'zoom ' + po.priblizenie.toFixed(3) + ', odchýlka ' + Math.abs(ux0 - ux1).toFixed(2) + ' / ' + Math.abs(uy0 - uy1).toFixed(2) + ' px');

  // 5. tlačidlo + okolo stredu
  const pred2 = await stav(page);
  await page.click('#priblizit');
  await page.waitForTimeout(150);
  const po2 = await stav(page);
  const k = po2.priblizenie / pred2.priblizenie;
  over(5, z + 'tlačidlo + približuje okolo stredu', Math.abs(po2.priblizenie - pred2.priblizenie - 0.25) < 1e-6 &&
    Math.abs(po2.posun.x - pred2.posun.x * k) < 0.5 && Math.abs(po2.posun.y - pred2.posun.y * k) < 0.5,
    pred2.priblizenie.toFixed(2) + ' → ' + po2.priblizenie.toFixed(2));
  // posuvník okolo stredu
  const pred3 = await stav(page);
  await page.evaluate(() => {
    const r = document.getElementById('priblizenie');
    r.value = '3';
    r.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(150);
  const po3 = await stav(page);
  const k3 = po3.priblizenie / pred3.priblizenie;
  over(5, z + 'posuvník približuje okolo stredu', Math.abs(po3.priblizenie - 3) < 1e-6 && Math.abs(po3.posun.x - pred3.posun.x * k3) < 0.5 && Math.abs(po3.posun.y - pred3.posun.y * k3) < 0.5,
    'zoom 3, posun ' + po3.posun.x.toFixed(1) + ', ' + po3.posun.y.toFixed(1));
  await page.click('#oddialit');
  await page.waitForTimeout(100);
  over(5, z + 'tlačidlo − oddiali o 0,25', Math.abs((await stav(page)).priblizenie - 2.75) < 1e-6);

  // 2. zmena tvaru zachová výrez
  const predTvarom = await stav(page);
  await page.click('.tvar:has(input[value="B"])');
  await page.waitForTimeout(150);
  const poB = await stav(page);
  await page.click('.tvar:has(input[value="C"])');
  await page.waitForTimeout(150);
  const poC = await stav(page);
  over(2, z + 'zmena tvaru po nahratí fotky zachová výrez',
    [poB, poC].every((s) => s.priblizenie === predTvarom.priblizenie && s.posun.x === predTvarom.posun.x && s.posun.y === predTvarom.posun.y),
    JSON.stringify(predTvarom.posun) + ' @ ' + predTvarom.priblizenie);

  // 5. Vycentrovať
  await page.click('#vycentrovat');
  await page.waitForTimeout(100);
  const vc = await stav(page);
  over(5, z + '„Vycentrovať“ vráti zoom 1 a stred', vc.priblizenie === 1 && vc.posun.x === 0 && vc.posun.y === 0);

  // klávesnica
  await page.focus('#nahlad');
  await page.keyboard.press('ArrowRight');
  const k1 = await stav(page);
  await page.keyboard.press('Shift+ArrowLeft');
  const k2 = await stav(page);
  await page.keyboard.type('+');
  const k3s = await stav(page);
  await page.keyboard.type('0');
  const k4 = await stav(page);
  over(8, z + 'klávesnica: šípky (Shift = 40), +, 0', k1.posun.x === 10 && k2.posun.x === -30 && Math.abs(k3s.priblizenie - 1.1) < 1e-6 && k4.priblizenie === 1 && k4.posun.x === 0,
    [k1.posun.x, k2.posun.x, k3s.priblizenie.toFixed(2), k4.priblizenie].join(' / '));

  // pretiahnutie súboru do náhľadu
  const prijaty = await page.evaluate(async () => {
    const blob = await new Promise((r) => document.querySelector('.tvar canvas').toBlob(r, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'drop.png', { type: 'image/png' }));
    document.getElementById('nahlad-obal').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 400));
    return !document.getElementById('ovladanie').hidden;
  });
  over(8, z + 'pretiahnutie súboru do náhľadu načíta fotku', prijaty);
  await nahraj(page, obrazky.siroka);

  // 6. stiahnutý PNG pre A, B, C
  for (const t of ['A', 'B', 'C']) {
    await page.click('.tvar:has(input[value="' + t + '"])');
    await page.waitForTimeout(150);
    const m = await stiahniAZmeraj(page, { lh: [1, 1], ph: [798, 1], ld: [1, 798], pd: [798, 798], linka: t === 'A' ? [400, 452] : [400, 400] });
    const rohy = ['lh', 'ph', 'ld', 'pd'].every((r) => blizko(m.pixely[r], MODRA, 2));
    const problemy = textCely(m.rozlozenie);
    const pocet = m.rozlozenie.riadky.length;
    over(6, z + 'PNG tvar ' + t + ': 800 × 800, názov profilovka-tkn.png, rohy #28408E',
      m.sirka === 800 && m.vyska === 800 && m.nazov === 'profilovka-tkn.png' && rohy, m.sirka + '×' + m.vyska + ', ' + m.nazov + ', roh ' + m.pixely.lh.join(','));
    over(6, z + 'PNG tvar ' + t + ': ' + (t === 'C' ? 6 : 5) + ' riadkov, žiadny orezaný ani mimo kruhu',
      pocet === (t === 'C' ? 6 : 5) && problemy.length === 0, problemy.join('; ') || m.rozlozenie.riadky.map((r) => r.text).join(' | '));
    if (t === 'A') over(6, z + 'PNG tvar A: rámček je v obrázku (žltá linka)', blizko(m.pixely.linka, [0xfe, 0xe3, 0x3d], 6), m.pixely.linka.join(','));
  }

  // 3. EXIF otočenie
  await nahraj(page, obrazky.exif);
  const ex = await stiahniAZmeraj(page, { hore: [560, 200], dole: [200, 600] });
  over(3, z + 'JPEG s EXIF otočením (portrét z telefónu) je správne otočený',
    blizko(ex.pixely.hore, [255, 0, 0], 40) && blizko(ex.pixely.dole, [0, 0, 255], 40), 'hore ' + ex.pixely.hore.join(',') + ', dole ' + ex.pixely.dole.join(','));

  // 7. / 8. rozloženie
  const rozlozenie = await page.evaluate(() => {
    const tops = [...document.querySelectorAll('.tvar')].map((e) => Math.round(e.getBoundingClientRect().top));
    const n = document.getElementById('nahlad').getBoundingClientRect();
    const obal = document.querySelector('main').getBoundingClientRect();
    return { scroll: document.documentElement.scrollWidth, okno: window.innerWidth, riadkyMiniatur: new Set(tops).size, nahlad: n.width, main: obal.width };
  });
  if (SNIMKY) await page.screenshot({ path: path.join(SNIMKY, 'hlavna-' + nazovZariadenia + '.png'), fullPage: true });
  over('konzola', z + 'žiadne chyby v konzole', chyby.length === 0, chyby.join(' | '));
  await context.close();
  return { zdielanieDesktop, rozlozenie };
}

async function testMobil(browser, base, obrazky) {
  const mobil = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 };
  const v = await testHlavna(browser, base, obrazky, 'mobil 390', mobil);
  over(8, '[mobil 390] nič nepretečie do strany', v.rozlozenie.scroll <= 390, 'scrollWidth ' + v.rozlozenie.scroll);
  over(8, '[mobil 390] miniatúry sa zalomia', v.rozlozenie.riadkyMiniatur > 1, v.rozlozenie.riadkyMiniatur + ' riadky');
  over(8, '[mobil 390] náhľad je na celú šírku', v.rozlozenie.nahlad >= 390 - 32 - 1, Math.round(v.rozlozenie.nahlad) + ' px z ' + (390 - 32));

  // 7. tlačidlo zdieľania: bez podpory skryté, s podporou viditeľné
  const c1 = await browser.newContext(mobil);
  const p1 = await pripravStranku(c1, base, '/');
  const podpora = await p1.page.evaluate(() => ({ share: typeof navigator.share, canShare: typeof navigator.canShare, coarse: matchMedia('(pointer: coarse)').matches }));
  await nahraj(p1.page, obrazky.siroka);
  const vidno1 = await p1.page.isVisible('#zdielat');
  over(7, '[mobil 390] bez navigator.canShare({files}) je tlačidlo zdieľania skryté', podpora.canShare === 'function' || !vidno1, JSON.stringify(podpora) + ', viditeľné: ' + vidno1);
  await c1.close();

  const c2 = await browser.newContext(mobil);
  await c2.addInitScript(() => {
    navigator.canShare = () => true;
    navigator.share = async () => {
      window.__zdielane = true;
    };
  });
  const p2 = await pripravStranku(c2, base, '/');
  const pred = await p2.page.isVisible('#zdielat');
  await nahraj(p2.page, obrazky.siroka);
  const vidno2 = await p2.page.isVisible('#zdielat');
  await p2.page.click('#zdielat');
  await p2.page.waitForTimeout(300);
  const zdielane = await p2.page.evaluate(() => !!window.__zdielane);
  over(7, '[mobil 390] s canShare({files}) sa „Uložiť do fotiek / zdieľať“ zobrazí po nahratí a zavolá share', !pred && vidno2 && zdielane, 'pred: ' + pred + ', po: ' + vidno2 + ', share: ' + zdielane);
  await c2.close();
}

async function testKandidati(browser, base, obrazky, nazovZariadenia, moznosti) {
  const z = '[' + nazovZariadenia + '] ';
  const context = await browser.newContext(Object.assign({ acceptDownloads: true }, moznosti));
  const { page, chyby, hostitelia } = await pripravStranku(context, base, '/kandidati');

  const prve = await page.evaluate(() => window.ramcekDebug.prveKreslenie);
  over(1, z + 'kandidáti: Reddit Sans načítaný pred prvým kreslením', prve && prve.pismoNacitane);
  const cudzi = [...hostitelia].filter((h) => !['127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(h));
  over(9, z + 'kandidáti: nič okrem Google Fonts', cudzi.length === 0, cudzi.join(', '));
  const title = await page.title();
  over('meta', z + 'kandidáti: title', title === 'Rámček pre kandidátov – Tím Kraj Nitra', title);

  // 9. obvody a čísla
  let spolu = 0;
  const zle = [];
  for (const obvod of ['P', '1', '2', '3']) {
    await page.selectOption('#obvod', obvod);
    await page.waitForTimeout(80);
    const moznostiMien = await page.$$eval('#kandidat option', (o) => o.map((x) => x.textContent));
    spolu += moznostiMien.length;
    const ocak = OCAKAVANI[obvod];
    if (moznostiMien.length !== Object.keys(ocak).length) zle.push(obvod + ': ' + moznostiMien.length + ' mien');
    for (const text of moznostiMien) {
      const m = text.match(/^č\. (\d+) – (.+)$/);
      if (!m || ocak[m[2]] !== Number(m[1])) zle.push(obvod + ': ' + text);
    }
    if (obvod === 'P') over(9, z + '„Primátor“ ponúkne len Čibrika (č. 2)', moznostiMien.length === 1 && moznostiMien[0] === 'č. 2 – Mgr. Róbert Čibrik', moznostiMien.join(', '));
  }
  over(9, z + 'výber obvodu zúži zoznam; všetkých 19 kandidátov má správne číslo', spolu === 19 && zle.length === 0, zle.join('; ') || spolu + ' kandidátov');

  // text na rámčeku sleduje výber
  await page.selectOption('#obvod', '2');
  await page.selectOption('#kandidat', 'o2-19');
  await page.waitForTimeout(200);
  const nahladTexty = await page.evaluate(() => window.ramcekDebug.nahlad.riadky.map((r) => r.text));
  over(9, z + 'rámček ukazuje vybraného kandidáta a číslo', nahladTexty.includes('Ing. Ivan Vlk') && nahladTexty.includes('Č. 19'), nahladTexty.join(' | '));
  const adresa = await page.evaluate(() => location.search);
  over(10, z + 'adresa sa pri výbere zmení na ?k=…', adresa === '?k=o2-19', adresa);
  await page.check('input[name="text"][value="kandidujem"]');
  await page.waitForTimeout(150);
  const kandTexty = await page.evaluate(() => window.ramcekDebug.nahlad.riadky.map((r) => r.text));
  over(9, z + 'prepínač „Kandidujem“ zmení text', kandTexty[0] === 'KANDIDUJEM', kandTexty.join(' | '));

  // 11. dlhé mená – všetky tvary a texty
  const dlhe = await page.evaluate(() => {
    const out = [];
    for (const k of KANDIDATI) {
      for (const text of ['kruzkujte', 'kandidujem']) {
        for (const t of ['A', 'B', 'C']) {
          const c = document.createElement('canvas');
          c.width = 800;
          c.height = 800;
          const r = Ramcek.vykresli(c.getContext('2d'), 800, t, riadky(k, text, t), null, null);
          out.push({ id: k.id, text, t, rozl: r });
        }
      }
    }
    return out;
  });
  const problemy = [];
  dlhe.forEach((d) => textCely(d.rozl).forEach((p) => problemy.push(d.id + '/' + d.text + '/' + d.t + ': ' + p)));
  over(11, z + 'všetkých 19 × 2 texty × 3 tvary: text sa zmestí, nič nie je orezané', problemy.length === 0, problemy.slice(0, 5).join('; ') || dlhe.length + ' rámčekov');
  const kovacova = dlhe.filter((d) => d.id === 'o3-12');
  const menoRiadok = (d) => d.rozl.riadky.find((r) => r.text.includes('MUDr., MPH'));
  const zmensene = kovacova.every((d) => menoRiadok(d).velkost < menoRiadok(d).navrhovanaVelkost * 0.95);
  over(11, z + '„MUDr., MPH Katarína Kováčová“ sa automaticky zmenší (maxW), neoreže', zmensene,
    kovacova.map((d) => d.t + '/' + d.text + ' ' + menoRiadok(d).navrhovanaVelkost.toFixed(1) + ' → ' + menoRiadok(d).velkost.toFixed(1) + ' px').join(', '));

  // stiahnutie z kandidátskej stránky
  await nahraj(page, obrazky.siroka);
  const m = await stiahniAZmeraj(page, { lh: [1, 1] });
  over(6, z + 'kandidáti: stiahnutý PNG 800 × 800, profilovka-tkn.png, rohy #28408E', m.sirka === 800 && m.nazov === 'profilovka-tkn.png' && blizko(m.pixely.lh, MODRA, 2));

  const sirka = await page.evaluate(() => document.documentElement.scrollWidth);
  over(8, z + 'kandidáti: nič nepretečie do strany', sirka <= (moznosti.viewport ? moznosti.viewport.width : 1280), 'scrollWidth ' + sirka);
  if (SNIMKY) await page.screenshot({ path: path.join(SNIMKY, 'kandidati-' + nazovZariadenia + '.png'), fullPage: true });
  over('konzola', z + 'kandidáti: žiadne chyby v konzole', chyby.length === 0, chyby.join(' | '));
  await context.close();

  // 10. odkaz s predvoleným kandidátom
  const c2 = await browser.newContext(moznosti);
  const p = await pripravStranku(c2, base, '/kandidati?k=o1-09');
  const vyber = await p.page.evaluate(() => ({
    obvod: document.getElementById('obvod').value,
    kandidat: document.getElementById('kandidat').value,
    texty: window.ramcekDebug.nahlad.riadky.map((r) => r.text)
  }));
  over(10, z + '?k=o1-09 predvolí Ingrid Kántorovú (1. obvod, č. 9)', vyber.obvod === '1' && vyber.kandidat === 'o1-09' && vyber.texty.includes('Ing. Ingrid Kántorová') && vyber.texty.includes('Č. 9'), vyber.texty.join(' | '));
  const p3 = await pripravStranku(c2, base, '/kandidati?k=neexistuje');
  const v3 = await p3.page.evaluate(() => document.getElementById('kandidat').value);
  over(10, z + 'neznáme k sa ignoruje bez chyby', v3 === 'p-02' && p3.chyby.length === 0, 'predvolený ' + v3 + ', chyby: ' + p3.chyby.length);
  await c2.close();
}

(async () => {
  const server = await spusti(0);
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'tkn-overenie-'));
  try {
    const p = await browser.newPage();
    await p.goto(base + '/');
    const obrazky = await vyrobTestovacieObrazky(p, tmp);
    await p.close();

    const desktop = { viewport: { width: 1280, height: 900 } };
    const v = await testHlavna(browser, base, obrazky, 'desktop 1280', desktop);
    over(7, '[desktop 1280] tlačidlo zdieľania je na desktope skryté', !v.zdielanieDesktop);
    await testMobil(browser, base, obrazky);
    await testKandidati(browser, base, obrazky, 'desktop 1280', desktop);
    await testKandidati(browser, base, obrazky, 'mobil 390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  } finally {
    await browser.close();
    server.close();
  }

  const zle = vysledky.filter((r) => !r.ok);
  for (const r of vysledky) console.log((r.ok ? 'OK   ' : 'CHYBA') + '  [' + r.bod + '] ' + r.nazov + (r.detail ? '  — ' + r.detail : ''));
  console.log('\n' + (vysledky.length - zle.length) + ' / ' + vysledky.length + ' kontrol prešlo.');
  if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify(vysledky, null, 2));
  process.exit(zle.length ? 1 : 0);
})();

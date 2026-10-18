// Vyrobí og-image.png, og-image-kandidati.png (1200 × 630), favicon-32.png a apple-touch-icon.png.
// Profilovky v OG obrázku sa kreslia priamo na stránke tým istým kódom ako rámček (Reddit Sans),
// takže po zmene textu rámčeka stačí tento skript spustiť znova.
//
// Spustenie (treba Node 18+ a Playwright s Chromiom):
//   cd nastroje && npm install && npx playwright install chromium && npm run obrazky
const path = require('path');
const { chromium } = require('playwright');
const { spusti } = require('./server.cjs');

const KOREN = path.resolve(__dirname, '..');

// Ktoré profilovky dať do OG obrázka (bez fotiek TKN sa použijú siluety).
const OG_HLAVNA = {
  stitok: 'TÍM KRAJ NITRA · ZMENA PRE ŠAĽU',
  nadpis: 'VYROBTE SI RÁMČEK',
  text: 'A ukážte známym, koho 24. októbra volíte. Fotka ostáva u vás v prehliadači.',
  profilovky: [{ tvar: 'A' }, { tvar: 'B' }, { tvar: 'C' }]
};
const OG_KANDIDATI = {
  stitok: 'TÍM KRAJ NITRA · ZMENA PRE ŠAĽU',
  nadpis: 'RÁMČEK PRE KANDIDÁTOV',
  text: 'Krúžkujte alebo Kandidujem – s vaším menom, číslom a obvodom. Fotka ostáva u vás v prehliadači.',
  profilovky: [
    { tvar: 'A', kandidat: 'p-02', text: 'kruzkujte' },
    { tvar: 'B', kandidat: 'o1-09', text: 'kandidujem' },
    { tvar: 'C', kandidat: 'o2-03', text: 'kruzkujte' }
  ]
};

// Rozloženie troch profiloviek vpravo (px v obrázku 1200 × 630).
const POLOHY = [
  { x: 640, y: 214, d: 300 },
  { x: 892, y: 56, d: 262 },
  { x: 902, y: 338, d: 240 }
];

async function vyrobOG(page, nastavenie, subor) {
  await page.evaluate(
    ({ n, polohy }) => {
      const og = document.createElement('div');
      og.id = 'og';
      og.style.cssText =
        "position:fixed;left:0;top:0;width:1200px;height:630px;z-index:99999;background:#28408E;overflow:hidden;font-family:'Reddit Sans',sans-serif;color:#fff";
      og.innerHTML =
        '<div style="position:absolute;left:0;top:0;width:100%;height:16px;background:#FEE33D"></div>' +
        '<div style="position:absolute;left:0;bottom:0;width:100%;height:16px;background:#E52C3B"></div>' +
        '<div style="position:absolute;left:72px;top:0;bottom:0;width:540px;display:flex;flex-direction:column;justify-content:center">' +
        '<div style="font-size:24px;font-weight:700;letter-spacing:.06em;color:#FEE33D">' + n.stitok + '</div>' +
        '<div style="margin-top:26px;font-size:76px;line-height:1;font-weight:900">' + n.nadpis + '</div>' +
        '<div style="margin-top:28px;font-size:30px;line-height:1.3;font-weight:400">' + n.text + '</div>' +
        '</div>';
      n.profilovky.forEach((p, i) => {
        const pol = polohy[i];
        const c = document.createElement('canvas');
        c.width = 800;
        c.height = 800;
        let riadky;
        if (p.kandidat) {
          const k = KANDIDATI.find((x) => x.id === p.kandidat);
          riadky = window.riadky(k, p.text, p.tvar);
        } else {
          riadky = p.tvar === 'C' ? MOTIVY[0].c : MOTIVY[0].ab;
        }
        Ramcek.vykresli(c.getContext('2d'), 800, p.tvar, riadky, null, null);
        c.style.cssText =
          'position:absolute;left:' + pol.x + 'px;top:' + pol.y + 'px;width:' + pol.d + 'px;height:' + pol.d +
          'px;border-radius:50%;box-shadow:0 0 0 6px #fff,0 18px 40px rgba(0,0,0,.35)';
        og.appendChild(c);
      });
      document.body.appendChild(og);
    },
    { n: nastavenie, polohy: POLOHY }
  );
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(KOREN, subor), clip: { x: 0, y: 0, width: 1200, height: 630 } });
}

async function vyrobIkony(browser, base) {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  for (const [subor, velkost, podklad] of [
    ['favicon-32.png', 32, 'transparent'],
    ['apple-touch-icon.png', 180, '#28408E']
  ]) {
    await page.setContent(
      '<html><body style="margin:0;background:' + podklad + '">' +
        '<img src="' + base + '/favicon.svg" width="' + velkost + '" height="' + velkost + '" style="display:block"></body></html>'
    );
    await page.waitForFunction(() => document.querySelector('img').complete);
    await page.screenshot({
      path: path.join(KOREN, subor),
      clip: { x: 0, y: 0, width: velkost, height: velkost },
      omitBackground: podklad === 'transparent'
    });
  }
  await page.close();
}

(async () => {
  const server = await spusti(0);
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    for (const [adresa, nastavenie, subor] of [
      ['/', OG_HLAVNA, 'og-image.png'],
      ['/kandidati', OG_KANDIDATI, 'og-image-kandidati.png']
    ]) {
      await page.goto(base + adresa);
      await page.waitForFunction(() => document.documentElement.classList.contains('ramcek-pripraveny'));
      const pismo = await page.evaluate(() => window.ramcekDebug.prveKreslenie.pismoNacitane);
      if (!pismo) throw new Error('Reddit Sans sa nenačítal – OG obrázok by mal náhradné písmo.');
      await vyrobOG(page, nastavenie, subor);
      console.log('hotovo:', subor);
    }
    await vyrobIkony(browser, base);
    console.log('hotovo: favicon-32.png, apple-touch-icon.png');
  } finally {
    await browser.close();
    server.close();
  }
})();

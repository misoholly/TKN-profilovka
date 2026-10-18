// Vyrobí og-image.png (1200×630) z finálneho rámčeka „Volím Čibrika“ – kreslí ho ten istý kód ako stránka (vytiahnutý z index.html).
// Spustenie: node skripty/og-image.mjs   (potrebuje playwright-core v node_modules a Chrome/Chromium; internet kvôli Reddit Sans)
// Fotky do profiloviek: skripty/og-fotky/1.jpg, 2.jpg, 3.jpg (ak existujú), inak sivé siluety.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { server } from './server.mjs';
const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(KOREN, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)\/\/ ---------- stav ----------/)[1].trim().replace(/^\(function\(\)\{\s*'use strict';/, '');
if (/^\(function/.test(js)) throw new Error('nepodarilo sa vytiahnuť kód rámčeka z index.html');
const fotky = [1, 2, 3].map(i => path.join(KOREN, 'skripty', 'og-fotky', i + '.jpg')).map(f => fs.existsSync(f) ? 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64') : null);
const page_html = `<!doctype html><html lang="sk"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Reddit+Sans:wght@400;700;900&display=swap">
<style>
body{margin:0;width:1200px;height:630px;overflow:hidden;background:#28408E;font-family:'Reddit Sans',Arial,sans-serif;color:#fff;position:relative}
.h{position:absolute;left:0;top:0;width:1200px;height:16px;background:#FEE33D}
.d{position:absolute;left:0;bottom:0;width:1200px;height:16px;background:#D51C16}
.t{position:absolute;left:72px;top:68px;width:600px}
.n{font-weight:900;font-size:22px;letter-spacing:3px;color:#FEE33D;text-transform:uppercase}
h1{margin:22px 0 0;font-weight:900;font-size:92px;line-height:.95;text-transform:uppercase;letter-spacing:-1px}
.p{width:110px;height:10px;background:#FEE33D;margin:34px 0 30px}
.s{font-weight:700;font-size:32px;line-height:1.25}
canvas{position:absolute;border-radius:50%;box-shadow:0 0 0 7px rgba(255,255,255,.22)}
</style></head><body>
<div class="h"></div><div class="d"></div>
<div class="t"><div class="n">Tím Kraj Nitra · Zmena pre Šaľu</div><h1>Vyrobte si rámček</h1><div class="p"></div>
<div class="s">A ukážte známym, koho 24. októbra volíte. Fotka ostáva u vás v prehliadači.</div></div>
<canvas id="c1" width="680" height="680" style="left:710px;top:35px;width:340px;height:340px"></canvas>
<canvas id="c2" width="460" height="460" style="left:960px;top:315px;width:230px;height:230px"></canvas>
<canvas id="c3" width="460" height="460" style="left:675px;top:365px;width:230px;height:230px"></canvas>
<script>${js}
const FOTKY=${JSON.stringify(fotky)};
function silueta(ctx){ ctx.fillStyle='#D5DAE3'; ctx.fillRect(0,0,R,R); ctx.fillStyle='#A9B0BF';
  ctx.beginPath(); ctx.arc(512,400,170,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(512,900,330,300,0,Math.PI,0); ctx.fill(); }
async function fotkaAlebo(ctx,i){
  if(!FOTKY[i]) return silueta(ctx);
  const img=new Image(); img.src=FOTKY[i]; await img.decode();
  const m=Math.max(R/img.width,R/img.height); const w=img.width*m,h=img.height*m;
  ctx.drawImage(img,(R-w)/2,(R-h)/2,w,h);
}
async function nakresli(id, forma, i){
  const c=document.getElementById(id); const ctx=c.getContext('2d'); const px=c.width;
  ctx.fillStyle=BLUE; ctx.fillRect(0,0,px,px);
  ctx.save(); ctx.scale(px/R,px/R); ctx.beginPath(); ctx.arc(512,512,512,0,Math.PI*2); ctx.clip(); await fotkaAlebo(ctx,i); ctx.restore();
  ctx.save(); ctx.scale(px/R,px/R); ctx.beginPath(); ctx.arc(512,512,515,0,Math.PI*2); ctx.clip(); kresliRamcekCibrik(ctx,forma,MOTIVY[0]); ctx.restore();
}
window.hotovo=(async()=>{ await Promise.all([document.fonts.load('900 80px "Reddit Sans"'),document.fonts.load('700 30px "Reddit Sans"'),document.fonts.load('400 30px "Reddit Sans"')]);
  await nakresli('c1','B',0); await nakresli('c2','C',1); await nakresli('c3','A',2); return document.fonts.check('900 80px "Reddit Sans"'); })();
</script></body></html>`;
fs.writeFileSync(path.join(KOREN, 'skripty', '.og.html'), page_html);
const port = 8790; const srv = await server(port);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('Chyba v stránke:', e.message); process.exitCode = 1; });
await page.goto(`http://127.0.0.1:${port}/skripty/.og.html`);
const font = await page.evaluate(() => window.hotovo);
await page.screenshot({ path: path.join(KOREN, 'og-image.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close(); srv.close(); fs.unlinkSync(path.join(KOREN, 'skripty', '.og.html'));
console.log('og-image.png hotový, Reddit Sans:', font);

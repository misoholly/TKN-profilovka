# Rámček do profilovky – Tím Kraj Nitra

Jedna statická stránka, na ktorej si človek pridá do profilovej fotky rámček „Volím Čibrika za primátora a kandidátov Tím Kraj Nitra za poslancov“ (tvary A, B, C). Druhá voľba v prepínači je rámček s obvodom a číslom ktoréhokoľvek z 19 kandidátov TKN.

Všetko beží v prehliadači. Fotka sa nikam neposiela, stránka nemá server, databázu, analytiku ani cookies. Z internetu načíta len písmo Reddit Sans z Google Fonts.

Zdrojový kód: súkromný repozitár <https://github.com/misoholly/TKN-profilovka>, vetva `main`.

## Čo je v priečinku

| Súbor | Na čo je |
|---|---|
| `index.html` | celá stránka (HTML, CSS aj JavaScript v jednom súbore) |
| `og-image.png` | obrázok 1200 × 630, ktorý sa ukáže pri zdieľaní odkazu na Facebooku |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | ikonky webu z loga TKN |
| `robots.txt` | povolenie pre vyhľadávače |
| `vercel.json`, `.vercelignore` | len pre prípad nasadenia na Vercel (presmerovanie `/kandidati`); inde sa nepoužijú |
| `OVERENIE.md` | čo sa otestovalo a čo nie |
| `skripty/` | pomocné skripty pre vývojára (OG obrázok, ikonky, test); web ich nepotrebuje |

## Odkazy, ktoré sa dajú posielať

| Odkaz | Čo otvorí |
|---|---|
| `https://ADRESA/` | rámček Volím Čibrika (hlavný) |
| `https://ADRESA/#kandidati` | rámček s číslom, predvybraný 1. obvod, č. 7 Róbert Čibrik |
| `https://ADRESA/#o1-09` | rámček s číslom pre konkrétneho kandidáta (tu Ingrid Kántorová) |

Kódy kandidátov: 1. obvod `o1-07` Čibrik, `o1-09` Kántorová, `o1-10` Kováč, `o1-11` Matajs, `o1-15` Petrušek, `o1-18` Šuran · 2. obvod `o2-01` Baláž, `o2-03` Gabarík, `o2-08` Mareková, `o2-11` Nováková, `o2-13` Schreiber, `o2-19` Vlk · 3. obvod `o3-02` Bača, `o3-04` Eleková, `o3-11` Kovács, `o3-12` Kováčová, `o3-15` Plenta, `o3-18` Sedlárová · primátor `prim-2` Čibrik. Funguje aj tvar `?k=o1-09`.

---

## Nasadenie (pre developera TKN)

Stránka je čisto statická: žiadny build, server, databáza ani premenné prostredia. Funguje na akomkoľvek statickom hostingu (vlastný webserver, Netlify, Cloudflare Pages, GitHub Pages, FTP na existujúci web…).

### Čo nahrať

Do koreňa webu (alebo do podpriečinka) stačí nahrať tieto súbory:

```
index.html
og-image.png
favicon.svg
favicon-32.png
apple-touch-icon.png
robots.txt
```

Priečinok `skripty/`, `README.md`, `OVERENIE.md`, `vercel.json` a `.vercelignore` na web nepatria.

### Požiadavky na server

- **HTTPS je nutné.** Tlačidlo „Uložiť do fotiek / zdieľať“ (Web Share API) a spoľahlivé sťahovanie na mobiloch fungujú len na zabezpečenej adrese.
- `index.html` posielať s `Content-Type: text/html; charset=utf-8`.
- Stránka načítava z internetu len Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`). Ak server posiela Content-Security-Policy, musí ich povoliť pre `style-src` a `font-src`, a povoliť inline `<script>` a `<style>` (všetko je v `index.html`). Obrázok fotky sa spracúva cez `blob:` a `canvas`, takže `img-src` potrebuje `'self' blob: data:`.
- Žiadne cookies ani analytika – pätička to sľubuje. Nepridávať meracie kódy hostingu.

### Adresa webu

V `index.html` je na 4 miestach adresa `https://profilovka.zmenapresalu.sk` (`canonical`, `og:url`, `og:image`, `twitter:image`). Ak bude web na inej adrese, treba ju prepísať všade, inak nebude fungovať náhľad pri zdieľaní na Facebooku. `og:image` musí byť absolútna adresa s `https://`.

### Voliteľné presmerovanie `/kandidati`

Odkaz `/#kandidati` funguje bez nastavenia. Ak má fungovať aj kratšia adresa `/kandidati`, treba presmerovanie `/kandidati` → `/#kandidati` (302). Príklady:

| Hosting | Nastavenie |
|---|---|
| Vercel | už je v `vercel.json` |
| Netlify, Cloudflare Pages | súbor `_redirects` s riadkom `/kandidati /#kandidati 302` |
| Apache | v `.htaccess`: `Redirect 302 /kandidati /#kandidati` |
| nginx | `location = /kandidati { return 302 /#kandidati; }` |

### Po nasadení

1. Otvoriť web na počítači aj na telefóne: nahrať fotku, posunúť a priblížiť ju (aj dvoma prstami), stiahnuť; na mobile „Uložiť do fotiek / zdieľať“.
2. Vyskúšať odkaz `/#o1-09` (musí sa predvoliť Ingrid Kántorová, č. 9).
3. Vložiť adresu do <https://developers.facebook.com/tools/debug/> a kliknúť **Scrape Again**, nech si Facebook načíta náhľad.

Zoznam toho, čo sa už otestovalo automaticky a čo treba skúsiť ručne, je v `OVERENIE.md`.

## Do piatka zmeniť text rámčeka

Text rámčeka Volím Čibrika je v `index.html` v poli `MOTIVY` (riadky `r1` – `r5` pre tvary A a B, `c` pre nálepku C). Texty kandidátskych rámčekov sú vo funkcii `riadky()`. Čísla kandidátov sú v poli `KANDIDATI` – **nemeniť bez overenia** v oficiálnom zozname mesta.

---

## Pre vývojára

```bash
cd skripty
```

```bash
npm install
```

Ďalšie príkazy sa spúšťajú z koreňa projektu (o priečinok vyššie).

```bash
node skripty/server.mjs 8787
```

```bash
node skripty/og-image.mjs
```

```bash
node skripty/overenie.mjs
```

- `server.mjs` spustí lokálny server na `http://127.0.0.1:8787`.
- `og-image.mjs` vyrobí `og-image.png` tým istým kódom rámčeka ako stránka. Ak do `skripty/og-fotky/` dáte `1.jpg`, `2.jpg`, `3.jpg` (so súhlasom ľudí na nich), použijú sa namiesto siluet.
- `favicony.mjs` vyrobí PNG ikonky z `favicon.svg`.
- `overenie.mjs` prejde kontroly zo zadania (Playwright so systémovým Google Chrome). Testovacie fotky vyrobí `skripty/test/priprav.mjs`.

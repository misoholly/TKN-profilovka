# Rámček do profilovky – Tím Kraj Nitra

Jedna statická stránka, na ktorej si človek pridá do profilovej fotky rámček „Volím Čibrika za primátora a kandidátov Tím Kraj Nitra za poslancov“ (tvary A, B, C). Druhá voľba v prepínači je rámček s obvodom a číslom ktoréhokoľvek z 19 kandidátov TKN.

Všetko beží v prehliadači. Fotka sa nikam neposiela, stránka nemá server, databázu, analytiku ani cookies. Z internetu načíta len písmo Reddit Sans z Google Fonts.

## Čo je v priečinku

| Súbor | Na čo je |
|---|---|
| `index.html` | celá stránka (HTML, CSS aj JavaScript v jednom súbore) |
| `og-image.png` | obrázok 1200 × 630, ktorý sa ukáže pri zdieľaní odkazu na Facebooku |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | ikonky webu z loga TKN |
| `robots.txt`, `vercel.json`, `.vercelignore` | nastavenia pre hosting (adresa `/kandidati` presmeruje na `/#kandidati`) |
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

## Postup nasadenia (pre Michala, len klikanie)

### Krok 1 – Repozitár na GitHube (hotové)

Kód je v súkromnom repozitári <https://github.com/misoholly/TKN-profilovka>, vo vetve **main**, ktorá je nastavená ako hlavná. Netreba nič robiť.

V repozitári je aj staršia vetva `claude/gallant-lamport-l6j1t6`. To je predchádzajúca verzia podľa zadania 120 s dvoma stránkami. Nepoužíva sa, ale ostala zachovaná. Jej súbor NASADENIE.md (premenovanie vetvy) už neplatí.

### Krok 2 – Vercel (preview adresa na testovanie)

1. Otvorte <https://vercel.com/new> a prihláste sa cez **Continue with GitHub**.
2. V zozname **Import Git Repository** nájdite `TKN-profilovka` a kliknite **Import**. Ak ho nevidíte, kliknite **Adjust GitHub App Permissions** a povoľte prístup k tomuto repozitáru.
3. **Framework Preset:** nechajte **Other**. **Build Command** a **Output Directory** nechajte prázdne.
4. Kliknite **Deploy**. Po pár sekundách dostanete adresu typu `tkn-profilovka.vercel.app`.
5. Otvorte ju na počítači aj na mobile a vyskúšajte: nahrať fotku, stiahnuť, na mobile „Uložiť do fotiek / zdieľať“.

Každá ďalšia zmena v repozitári sa na Vercel nasadí sama do minúty.

### Krok 3 – Vlastná doména (až keď ju TKN potvrdí)

Navrhovaná adresa: `profilovka.zmenapresalu.sk`.

1. Vo Verceli otvorte projekt `tkn-profilovka` → **Settings** → **Domains**.
2. Napíšte `profilovka.zmenapresalu.sk` a kliknite **Add**.
3. Vercel ukáže záznam, ktorý treba pridať u správcu domény. Bude to **CNAME** s hodnotou podobnou `cname.vercel-dns.com` (presnú hodnotu skopírujte z Vercelu).
4. Tento jeden riadok pošlite tomu, kto v TKN spravuje doménu `zmenapresalu.sk`. Pridá ho v administrácii domény (typicky „DNS záznamy“ → „Pridať záznam“ → typ CNAME, názov `profilovka`).
5. Keď sa záznam prejaví (zvyčajne do hodiny), Vercel ukáže zelené **Valid Configuration** a sám zapne HTTPS.

Ak TKN bude chcieť inú adresu, treba ju prepísať aj v `index.html` (krok 4, bod 2).

### Krok 4 – Pred ostrým spustením (povinné)

1. **Pätička – zákonné označenie** (zákon č. 181/2014 Z. z.). V `index.html` nájdite riadok s `Objednávateľ: [DOPLNIŤ] · Dodávateľ: [DOPLNIŤ]` a nahraďte ho textom od TKN.
2. **Adresa webu v hlavičke.** V `index.html` je na 4 miestach `https://profilovka.zmenapresalu.sk`. Ak bude adresa iná, nahraďte ju všade (bez toho nebude fungovať obrázok pri zdieľaní na Facebooku).
3. Úprava sa robí priamo na GitHube: otvorte `index.html` → ikonka ceruzky (**Edit this file**) → zmeňte text → **Commit changes**. Vercel to nasadí sám.
4. Po nasadení vložte adresu do <https://developers.facebook.com/tools/debug/> a kliknite **Scrape Again**, nech si Facebook načíta nový náhľad.

### Do piatka zmeniť text rámčeka

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

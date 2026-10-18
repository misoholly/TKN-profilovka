# Rámček do profilovky – Tím Kraj Nitra · Zmena pre Šaľu

Malý statický web na komunálne voľby 24. 10. 2026 v Šali. Fotka sa spracuje len v prehliadači (canvas) a nikam sa neposiela. Web nemá backend, databázu, build, cookies ani analytiku. Z internetu načíta iba písmo Reddit Sans z Google Fonts.

| Adresa | Pre koho | Čo robí |
|---|---|---|
| `/` | voliči | text „Volím Čibrika za primátora a kandidátov Tím Kraj Nitra za poslancov“, tvar A / B / C, fotka, výrez, stiahnutie PNG 800 × 800 |
| `/kandidati` | 19 kandidátov TKN | výber obvod → meno, text „Krúžkujte“ / „Kandidujem“, tvar A / B / C, fotka, výrez, stiahnutie; odkaz s predvoleným kandidátom `?k=o1-09` |

## Súbory

```
index.html              hlavná stránka; texty rámčeka sú v poli MOTIVY
kandidati/index.html    stránka kandidátov; zoznam KANDIDATI a texty vo funkcii riadky()
ramcek.js               kreslenie rámčekov A/B/C (Reddit Sans) a editor výrezu (spoločný pre obe stránky)
styl.css                vzhľad stránok (brand TKN)
og-image.png            náhľad odkazu 1200 × 630 pre hlavnú stránku
og-image-kandidati.png  náhľad odkazu 1200 × 630 pre stránku kandidátov
favicon.svg, favicon-32.png, apple-touch-icon.png   ikony z loga TKN
logo/                   logo TKN (farebné, s bielym písmom)
robots.txt
vercel.json             čisté adresy + bezpečnostné hlavičky (povolené sú len Google Fonts)
nastroje/               lokálny server, automatické overenie a generovanie obrázkov (nenasadzuje sa)
NASADENIE.md            klikací postup: GitHub → Vercel → doména
OVERENIE.md             čo bolo overené a čo treba skúsiť ručne
```

## Zmena textu

- **Voliči:** v `index.html` je pole `MOTIVY`. Riadky `ab` sú pre tvary A a B, riadky `c` pre nálepku C.
- **Kandidáti:** v `kandidati/index.html` je funkcia `riadky()`.
- Časť textu medzi `*hviezdičkami*` je zvýraznená, žltou na modrej a červenou na nálepke.
- Pole `s` je relatívna veľkosť riadku. Príliš dlhý riadok sa automaticky zmenší a nikdy sa neoreže.

Čísla a obvody kandidátov v poli `KANDIDATI` sú prepísané z oficiálneho zoznamu mesta Šaľa z 10. 9. 2026 (`f8007.pdf`, `f8008.pdf`). Meniť ich len po overení.

## Mechanika výrezu

Mechanika je prevzatá 1:1 z profilovky na salareferendum.sk (verzia v10):

- dorazy, aby fotka vždy celá pokryla kruh,
- zoom 1–4×: kolieskom okolo kurzora, dvoma prstami okolo stredu medzi prstami, posuvníkom a tlačidlami +/− okolo stredu,
- tlačidlo „Vycentrovať“ a ovládanie klávesnicou,
- pretiahnutie súboru do náhľadu,
- „Uložiť do fotiek / zdieľať“, ak to mobil vie,
- zmenšenie zdroja na 3200 px a EXIF otočenie.

Výstup je PNG 800 × 800 s modrými rohmi `#28408E` a súbor sa volá `profilovka-tkn.png`.

## Lokálne spustenie a testy (pre vývojára)

```
cd nastroje
npm install
npx playwright install chromium
npm run server      # http://127.0.0.1:8080
npm run overenie    # 86 kontrol, desktop 1280 px + mobil 390 px
npm run obrazky     # znova vyrobí OG obrázky a favicony
```

## Stav

- Pätička čaká na znenie „Objednávateľ / Dodávateľ“ od TKN. Vyznačené je ako `[DOPLNIŤ]` v oboch HTML súboroch.
- OG značky a `canonical` sú nastavené na `https://profilovka.zmenapresalu.sk/`.
- Vzhľad tvarov A / B / C je nakreslený podľa zadania 120, lebo pôvodné prototypy neboli k dispozícii. Podrobnosti sú v `OVERENIE.md`.

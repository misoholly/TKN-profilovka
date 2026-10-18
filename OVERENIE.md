# Overenie – Rámček do profilovky (TKN)

**Dátum:** 18. 10. 2026 · **Prostredie:** Chromium (Playwright 1.56), desktop 1280 px a mobil 390 px (dotyk, `pointer: coarse`)
**Výsledok:** 86 / 86 automatických kontrol prešlo, bez chýb v konzole, s rovnakými bezpečnostnými hlavičkami ako na Verceli (`vercel.json`, vrátane Content-Security-Policy).

Test si vie ktokoľvek zopakovať: `cd nastroje && npm install && npx playwright install chromium && npm run overenie`.

## Dôležité upozornenie k dizajnu rámčekov

Prototypy `prototyp.html` a `prototyp-kandidati.html` z priečinka `Mesto Sala/grafika/113-tkn-profilovka/` neboli pri tejto práci k dispozícii (nie sú na Google Drive ani v žiadnom repozitári). Web je preto **postavený podľa zadania 120**:

- **Mechanika výrezu** je prenesená 1:1 zo živej profilovky na salareferendum.sk (verzia v10). Dorazy, zoom, klávesnica, pretiahnutie súboru, zdieľanie, 3200 px a výstup 800 × 800 sú rovnaké, zmenené sú len modré rohy a názov súboru.
- **Texty** sú podľa zadania: jeden text „Volím Čibrika za primátora a kandidátov Tím Kraj Nitra za poslancov“, 5 riadkov pri A a B, 6 riadkov na nálepke C. Kandidáti majú texty „Krúžkujte“ a „Kandidujem“.
- **Vzhľad tvarov A / B / C** (pás, oblúk, nálepka) je nakreslený nanovo v brande TKN. **Nemusí sa zhodovať s odsúhlaseným prototypom.** Ak sa má zhodovať, stačí prototypy nahrať do repa a kresliace funkcie `tvarA / tvarB / tvarC` v `ramcek.js` sa prepíšu podľa nich. Ostatné časti webu ostanú, ako sú.

## Hlavná stránka (`/`)

| # | Čo sa overovalo | Desktop | Mobil |
|---|---|---|---|
| 1 | Bez chýb v konzole; Reddit Sans je načítaný (aj s diakritikou) skôr, než sa nakreslí prvá miniatúra | ✅ | ✅ |
| 2 | Prepnutie A → B → C prekreslí náhľad aj miniatúry; po nahratí fotky zmena tvaru zachová výrez | ✅ | ✅ |
| 3 | JPEG s EXIF otočením (Orientation 6, portrét z telefónu) je správne otočený | ✅ | ✅ |
| 4 | Ťahanie mimo kruhu narazí na doraz a zobrazí „Ďalej to nejde – najprv priblížte (+)“ | ✅ | ✅ |
| 5 | Koliesko približuje okolo kurzora (odchýlka pod 1 px); posuvník a +/− okolo stredu; „Vycentrovať“ vráti zoom 1 a stred | ✅ | ✅ |
| 6 | Stiahnutý PNG pre A, B aj C: 800 × 800, `profilovka-tkn.png`, rohy `#28408E`, rámček je celý, 5 / 5 / 6 riadkov a žiadny nie je orezaný ani mimo kruhu | ✅ | ✅ |
| 7 | „Uložiť do fotiek / zdieľať“ je skryté bez `navigator.canShare({files})` aj na desktope; ak prehliadač zdieľanie vie, objaví sa po nahratí fotky a zavolá `navigator.share` | ✅ | ✅ |
| 8 | Pri 390 px nič nepretečie, miniatúry sa zalomia do 2 riadkov a náhľad je na celú šírku | – | ✅ |
| 9 | Stránka nenačítava nič okrem `fonts.googleapis.com` a `fonts.gstatic.com`, nemá cookies ani analytiku | ✅ | ✅ |

Navyše overené:

- Klávesnica funguje: šípky posúvajú, so Shiftom väčším krokom, + priblíži a 0 vycentruje.
- Pretiahnutie súboru do náhľadu načíta fotku.
- Nečitateľný súbor, napríklad HEIC, ukáže hlášku s radou.
- Stránka má `title`, `lang="sk"`, všetky OG a Twitter značky a `canonical`. Žltý prúžok „PROTOTYP“ na nej nie je.

## Stránka kandidátov (`/kandidati`)

| # | Čo sa overovalo | Desktop | Mobil |
|---|---|---|---|
| 9 | Výber obvodu zúži zoznam mien; „Primátor“ ponúkne len „č. 2 – Mgr. Róbert Čibrik“; všetkých 19 kandidátov má číslo zhodné s nezávislým prepisom oficiálneho zoznamu | ✅ | ✅ |
| 10 | `?k=o1-09` predvolí Ing. Ingrid Kántorovú (1. obvod, č. 9); neznáme `k` sa ignoruje bez chyby; adresa sa pri výbere mení na `?k=…` | ✅ | ✅ |
| 11 | Dlhé mená sa zmestia: všetkých 114 kombinácií (19 kandidátov × 2 texty × 3 tvary) je bez orezania; „MUDr., MPH Katarína Kováčová“ sa automaticky zmenší, napríklad na nálepke z 35,7 na 28,0 px | ✅ | ✅ |
| 1, 6, 8, 9 | Bez chýb v konzole, písmo načítané, PNG 800 × 800 s modrými rohmi, nič nepretečie, nič okrem Google Fonts | ✅ | ✅ |

Zoznam kandidátov pochádza z dokumentov mesta Šaľa z 10. 9. 2026 (`f8007.pdf` pre primátora, `f8008.pdf` pre poslancov). Prepis je v `19-KANDIDATI-2026.md`. Zdroj je uvedený aj v komentári pri poli `KANDIDATI`.

## Čo sa nedalo overiť (treba skúsiť ručne po nasadení)

- **Zdieľanie na reálnom iPhone a Androide.** Tlačidlo „Uložiť do fotiek / zdieľať“ sa zobrazí, len ak to prehliadač vie. V teste bolo zdieľanie len simulované. Postup: otvoriť web na telefóne, vybrať fotku, priblížiť dvoma prstami a dať „Uložiť do fotiek“.
- **Safari (iPhone, Mac).** Testovalo sa len v Chromiu. Mechanika je rovnaká ako na salareferendum.sk, kde v Safari funguje. Aj tak treba web raz skúsiť na iPhone s fotkou z galérie.
- **Ovládanie dvoma prstami** na skutočnom displeji. Kód je zhodný so salareferendum.sk, ale emulácia dotyku v teste gesto dvoma prstami nevie.
- **Náhľad odkazu na Facebooku.** Dá sa overiť až na ostrej doméne cez [Sharing Debugger](https://developers.facebook.com/tools/debug/). OG značky odkazujú na `https://profilovka.zmenapresalu.sk/`.
- **Zákonné označenie** „Objednávateľ / Dodávateľ“ v pätičke je zatiaľ `[DOPLNIŤ]` a čaká na znenie od TKN.

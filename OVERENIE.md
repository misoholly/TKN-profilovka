# Overenie – Rámček do profilovky TKN

**Dátum:** 18. 10. 2026, doplnené 19. 10. 2026 · **Podľa:** zadanie 133, časť 7 · **Nástroj:** `node skripty/overenie.mjs` (Playwright, Google Chrome 1280 px a mobil 390 px s dotykom)

**Výsledok: 46 / 46 automatických kontrol prešlo.** Čo sa nedalo overiť, je na konci.

## Rámček Volím Čibrika

| # | Kontrola | Výsledok |
|---|---|---|
| 1 | Načítanie bez chýb v konzole | ✅ |
| 1 | Reddit Sans vrátane slovenských znakov (Č, Í, Á) je načítaný pred kreslením miniatúr | ✅ opravené, viď poznámku 1 |
| 2 | Po načítaní je zvolené „Volím Čibrika“ a tvar B, kandidátske ovládanie je skryté | ✅ |
| 3 | Prepnutie A → C → B prekreslí náhľad aj miniatúry; po nahratí fotky zmena tvaru zachová výrez | ✅ |
| 4 | JPEG s EXIF otočením (1600 × 1200, orientácia 6) sa zobrazí na výšku a správne otočený | ✅ |
| 5 | Ťahanie mimo kruhu narazí na doraz a ukáže „Ďalej to nejde – najprv priblížte (+)“ | ✅ |
| 6 | Koliesko približuje, +/− po 0,25 okolo stredu, „Vycentrovať“ vráti zoom 1 | ✅ |
| 7 | PNG A, B, C: `profilovka-tkn.png`, 800 × 800, všetky štyri rohy `#28408E` | ✅ |
| 7 | PNG A, B, C: na okraji kruhu pod pásom nie je svetlý lem (orez rámčeka r = 515) | ✅ 0 svetlých pixelov |
| 7 | Text je celý: 5 riadkov pri A aj B, 6 riadkov na nálepke C | ✅ vizuálne, `overenie/cibrik-*.png` |
| 7 | Veľká fotka 4000 × 3000 sa zmenší a výstup je 800 px | ✅ |
| 8 | Tlačidlo „Uložiť do fotiek / zdieľať“ sa zobrazí len pri `navigator.canShare({files})` | ✅ viď poznámku 3 |
| 9 | Pri 390 px nič nepretečie, miniatúry a tlačidlá sa zalomia, náhľad je na celú šírku | ✅ |

## Rámček s číslom kandidáta

| # | Kontrola | Výsledok |
|---|---|---|
| 10 | Po prepnutí je predvybraný 1. obvod a č. 7 Róbert Čibrik; stiahne sa `profilovka-tkn-cibrik-7.png` | ✅ |
| 11 | „Primátor“ sám vyberie Čibrika č. 2; 2. a 3. obvod nechajú kandidáta nevybraného a Stiahnuť je neaktívne | ✅ |
| 12 | Všetkých 19 kandidátov × 3 tvary = 57 súborov, každý so správnym číslom v názve | ✅ |
| 12 | Čísla a mená v rámčekoch sa zhodujú s `05-kandidati-prehlad-cisel.png` | ✅ vizuálne, všetkých 19 |
| 13 | Prepnutie „Volím Čibrika“ ↔ „S číslom kandidáta“ zachová fotku aj výrez | ✅ |
| 14 | `#kandidati`, `#o1-09`, `?k=o3-12` a zmena hashu za behu fungujú; neznámy kód sa ignoruje; adresa sa pri klikaní nemení | ✅ |
| 15 | Dlhé mená (Katarína Kováčová, František Kovács) sa zmenšia, nie orežú | ✅ |

## Texty a súkromie

| # | Kontrola | Výsledok |
|---|---|---|
| 16 | Zdroj ani stránka neobsahujú „Kto ste“, „Vaše meno“, „svoje meno“, „Kde kandidujete“, „napíšte nám“, „moratórium“, „PROTOTYP“, „22:00“, „DOPLNIŤ“ | ✅ |
| 16 | Variant „Kandidujem“ nie je v zdroji ani na stránke (odstránený 19. 10. 2026, stránka je verejná) | ✅ |
| 16 | Pätička: objednávateľ aj dodávateľ „Tím Kraj Nitra – Zmena pre Šaľu“, copyright a odkaz na ochranu osobných údajov | ✅ |
| 17 | Chybný súbor zobrazí červenú hlášku na stránke, žiadny `alert()`; ďalšie platné nahratie ju skryje | ✅ |
| 4.8 | Z internetu sa načítava len Google Fonts, žiadna analytika ani cookies | ✅ |
| 4.3 | `canonical`, `og:*`, `twitter:card=summary_large_image`, `og:locale=sk_SK` | ✅ |

## Čo sa pri overovaní opravilo oproti prototypom

1. **Písmo s diakritikou.** Google Fonts delí Reddit Sans na časti a slovenské znaky (Č, Š, Ľ…) sú v inej časti ako základná abeceda. Prototyp čakal len na základnú, takže prvé vykreslenie miniatúr mohlo mať Č, Í a Á náhradným písmom. Stránka teraz pred kreslením načíta aj časť s diakritikou.
2. **Skrytý výber textu.** Prototyp mal skrytý výber textu „Volím Čibrika…“ (pole `MOTIVY` má jeden záznam), no CSS ho zobrazovalo. Teraz je naozaj skrytý. Keď pribudne druhý text, zobrazí sa sám.

## Poznámky

3. Google Chrome na Windows podporuje zdieľanie súborov, preto sa tlačidlo „Uložiť do fotiek / zdieľať“ zobrazí aj na takom počítači. To je podľa zadania správne. Firefox ho neukáže.
4. Vyhladené hrany písma v náhľade sa môžu v Chrome po pár sekundách mierne zmeniť (iná rasterizácia). Test preto porovnáva náhľady s toleranciou na hrany, nie presne.

## Čo sa nedalo overiť

- **Zdieľanie a uloženie do fotiek na reálnom iPhone a Androide.** Treba vyskúšať ručne po nasadení na HTTPS adresu.
- **Fotka HEIC z iPhonu.** Test overil hlášku pri poškodenom súbore. HEIC hlášku treba skúsiť na počítači s Chrome alebo Firefoxom; Safari HEIC väčšinou otvorí.
- **Pinch (dva prsty)** na reálnom telefóne. Kód je prevzatý bez zmeny z prototypu a salareferendum.sk.
- **Náhľad pri zdieľaní na Facebooku.** Dá sa overiť až na verejnej adrese cez <https://developers.facebook.com/tools/debug/>.

Snímky a vyrobené PNG sú po spustení skriptu v priečinku `overenie/` (nie je v gite).

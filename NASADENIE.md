# Nasadenie – klikací postup (bez terminálu)

Web je hotový v GitHub repozitári **misoholly/TKN-profilovka**. Kód je zatiaľ vo vetve `claude/gallant-lamport-l6j1t6`. Nasadí sa na **Vercel** zadarmo, bez build kroku. Každá úprava na GitHube sa na webe objaví do minúty.

Celé to zaberie asi 15 minút. Doménu nastavuje TKN.

---

## Krok 1 – Premenovať vetvu na `main` (GitHub, 1 minúta)

Vercel nasadzuje „ostrú“ verziu z hlavnej vetvy, preto je dobré mať ju pomenovanú `main`.

1. Otvor **github.com/misoholly/TKN-profilovka**.
2. Nad zoznamom súborov klikni na rozbaľovacie tlačidlo s názvom vetvy a potom na **View all branches**.
3. Pri vetve `claude/gallant-lamport-l6j1t6` klikni na ikonu ceruzky (**Rename branch**).
4. Napíš `main` a potvrď **Rename branch**.

Ak sa niečo z toho na obrazovke volá inak, tento krok môžeš preskočiť. Vercel potom nasadí túto vetvu, lebo je v repozitári jediná.

## Krok 2 – Pripojiť Vercel (5 minút)

1. Choď na **vercel.com** a klikni **Sign Up**. Vyber **Hobby** (zadarmo) a **Continue with GitHub**, potom povoľ prístup.
2. Na nástenke klikni **Add New…** a potom **Project**.
3. V zozname **Import Git Repository** nájdi **TKN-profilovka** a klikni **Import**.
   - Ak tam nie je, klikni **Adjust GitHub App Permissions**, vyber repozitár TKN-profilovka a ulož.
4. Na obrazovke **Configure Project**:
   - **Framework Preset:** vyber **Other**.
   - **Root Directory:** nechaj `./`.
   - **Build and Output Settings:** nič nemeň a nechaj prázdne.
5. Klikni **Deploy**. Po chvíli sa objaví „Congratulations!“ a adresa v tvare **tkn-profilovka.vercel.app**. Toto je testovacia (preview) adresa.

## Krok 3 – Vyskúšať na telefóne (5 minút)

Otvor testovaciu adresu na mobile a prejdi tieto kroky:

1. Vyber tvar, nahraj fotku a skús ju posúvať a približovať dvoma prstami.
2. Klikni **Stiahnuť fotku**, prípadne **Uložiť do fotiek / zdieľať**.
3. Na konci adresy dopíš `/kandidati?k=o1-09`. Musí sa predvoliť Ingrid Kántorová, č. 9.

Kým TKN nedodá znenie „Objednávateľ / Dodávateľ“, **posielaj len túto testovaciu adresu** a web verejne nezdieľaj.

## Krok 4 – Doplniť „Objednávateľ / Dodávateľ“ (keď TKN pošle znenie)

Riadok je v pätičke **oboch** stránok. Uprav ho na oboch miestach:

1. Na GitHube otvor súbor **index.html**.
2. Vpravo hore klikni na ikonu ceruzky (**Edit this file**).
3. Stlač Ctrl+F (na Macu Cmd+F) a vyhľadaj `[DOPLNIŤ]`.
4. Riadok `Objednávateľ: [DOPLNIŤ] · Dodávateľ: [DOPLNIŤ]` prepíš presným znením od TKN.
5. Klikni zelené **Commit changes…** a potom znova **Commit changes**.
6. To isté zopakuj v súbore **kandidati/index.html**.

Vercel zmenu nasadí sám, zvyčajne do minúty.

## Krok 5 – Doména (robí TKN alebo ich správca domény)

Navrhovaná adresa je **profilovka.zmenapresalu.sk**. Na túto adresu sú už nastavené náhľady odkazov pre Facebook.

1. Vo Verceli otvor projekt, potom **Settings** a **Domains**.
2. Napíš `profilovka.zmenapresalu.sk` a klikni **Add**.
3. Vercel ukáže záznam, ktorý treba pridať do DNS. Býva to **CNAME** s názvom `profilovka` a hodnotou, ktorú Vercel zobrazí (napr. `cname.vercel-dns.com`). Hodnotu skopíruj presne z Vercelu.
4. Pošli tento záznam tomu, kto spravuje doménu zmenapresalu.sk.
5. Keď ho nastavia, Vercel do niekoľkých minút až hodín ukáže **Valid Configuration**. HTTPS zariadi sám.

**Ak TKN zvolí inú adresu**, treba ju prepísať v hlavičke oboch stránok. V `index.html` aj `kandidati/index.html` je `profilovka.zmenapresalu.sk` vždy 3×. Úprava sa robí rovnako ako v kroku 4, vyhľadaj `profilovka.zmenapresalu.sk`.

## Krok 6 – Skontrolovať náhľad na Facebooku (po nastavení domény)

1. Otvor **developers.facebook.com/tools/debug**.
2. Vlož `https://profilovka.zmenapresalu.sk/` a klikni **Debug**. Ak sa ukáže starý náhľad, klikni **Scrape Again**.
3. Musí sa ukázať modrý obrázok „VYROBTE SI RÁMČEK“.
4. To isté zopakuj pre `https://profilovka.zmenapresalu.sk/kandidati`.

---

## Bežné úpravy (všetky cez ceruzku na GitHube, ako v kroku 4)

| Čo | Kde |
|---|---|
| Text rámčeka pre voličov | `index.html`, pole `MOTIVY` blízko konca súboru. Časť medzi `*hviezdičkami*` je zvýraznená farebne. |
| Text rámčeka pre kandidátov | `kandidati/index.html`, funkcia `riadky()` |
| Zoznam a čísla kandidátov | `kandidati/index.html`, pole `KANDIDATI`. **Meniť len po overení v oficiálnom zozname mesta.** |
| Pätička, zákonné označenie | koniec oboch súborov `index.html` |
| Farby a vzhľad tvarov A / B / C | `ramcek.js`, funkcie `tvarA`, `tvarB`, `tvarC` |

Po zmene textu sa rámček na webe zmení hneď. OG obrázky (`og-image.png`, `og-image-kandidati.png`) sú statické. Pri väčšej zmene textu ich treba vyrobiť znova skriptom `nastroje/generuj-obrazky.cjs`, o čo stačí požiadať Clauda.

## Po voľbách

Vercel: projekt → **Settings** → **General** → úplne dole **Delete Project**. Alebo projekt nechaj, nič nestojí.

## Náhradné riešenie bez Vercelu (Netlify Drop)

1. Na GitHube klikni zelené **Code** a potom **Download ZIP**. Súbor rozbaľ.
2. Otvor **app.netlify.com/drop** a rozbalený priečinok tam pretiahni myšou.
3. Netlify dá adresu `*.netlify.app`.

Bezpečnostné hlavičky z `vercel.json` sa na Netlify nepoužijú. Web funguje rovnako, úpravy však treba nahrávať ručne.

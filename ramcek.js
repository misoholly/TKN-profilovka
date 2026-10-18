/*
 * Rámček do profilovky – Tím Kraj Nitra · Zmena pre Šaľu
 * Spoločný kód pre hlavnú stránku (/) aj stránku kandidátov (/kandidati).
 *
 *   1. kresliRamcek()  – kreslí rámček (tvary A / B / C) do canvasu fontom Reddit Sans.
 *   2. spustiEditor()  – výber tvaru, nahratie fotky, výrez, stiahnutie, zdieľanie.
 *
 * TEXTY RÁMČEKA TU NIE SÚ. Sú priamo v stránkach:
 *   - index.html            → pole MOTIVY
 *   - kandidati/index.html  → funkcia riadky()
 *
 * Mechanika výrezu je prevzatá 1:1 z salareferendum.sk (profilovka, verzia v10):
 * dorazy, zoom okolo kurzora / medzi prstami, posuvník a +/− okolo stredu,
 * klávesnica, pretiahnutie súboru, zdieľanie na mobile, zmenšenie zdroja na 3200 px,
 * výstup 800 × 800. Je to overené správanie – NEMENIŤ bez nového overenia.
 *
 * Nič sa neposiela na server. Fotka sa spracuje len v prehliadači.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Konštanty
  // ---------------------------------------------------------------------------

  var VYSTUP = 800; // výstupný PNG: 800 × 800 px
  var NAHLAD = 1040; // plátno náhľadu (kruh 800 + okraj 120 na každej strane)
  var OKRAJ = (NAHLAD - VYSTUP) / 2;
  var R = VYSTUP / 2;
  var ZOOM_MIN = 1;
  var ZOOM_MAX = 4;
  var ZOOM_KROK = 0.25;
  var MAX_ZDROJ = 3200; // väčšie fotky sa po načítaní zmenšia
  var NAZOV_SUBORU = 'profilovka-tkn.png';
  var POCIATOCNY_VYREZ = { priblizenie: 1, posun: { x: 0, y: 0 } };

  // Brand TKN
  var FARBY = {
    modra: '#28408E', // podklad, rohy výstupu
    cervena: '#D51C16', // tlačidlo Stiahnuť, „ZMENA“, zvýraznenie na nálepke
    cervenaLogo: '#E52C3B', // oblúk ako v logu
    zlta: '#FEE33D', // linka, zvýraznenie na modrej
    zlata: '#F2BE48', // „PRE ŠAĽU“
    biela: '#FFFFFF'
  };
  var FARBA_ROHOV = FARBY.modra;

  var TVARY = [
    { id: 'A', nazov: 'Pás' },
    { id: 'B', nazov: 'Oblúk' },
    { id: 'C', nazov: 'Nálepka' }
  ];

  // Znaky, pre ktoré sa musí načítať Reddit Sans (latin aj latin-ext podmnožina).
  var VZORKA_ZNAKOV = 'AÁÄBCČDĎEÉFGHIÍJKLĹĽMNŇOÓÔPQRŔSŠTŤUÚVWXYÝZŽaáäbcčdďeéfghiíjklĺľmnňoóôpqrŕsštťuúvwxyýzž0123456789.,·–';

  function pismo(vaha, velkost) {
    return vaha + ' ' + velkost.toFixed(2) + "px 'Reddit Sans', sans-serif";
  }

  var pismaSlub = null;
  /** Počká na Reddit Sans 400/700/900 (aj s diakritikou). Po 5 s pustí kreslenie aj bez neho. */
  function pockajNaPisma() {
    if (pismaSlub) return pismaSlub;
    var nacitanie = Promise.resolve();
    if (document.fonts && document.fonts.load) {
      nacitanie = Promise.all(
        [400, 700, 900].map(function (v) {
          return document.fonts.load(v + " 40px 'Reddit Sans'", VZORKA_ZNAKOV);
        })
      ).catch(function () {});
    }
    var limit = new Promise(function (hotovo) {
      setTimeout(hotovo, 5000);
    });
    pismaSlub = Promise.race([nacitanie, limit]);
    return pismaSlub;
  }

  function pismoNacitane() {
    try {
      return !!(document.fonts && document.fonts.check("900 40px 'Reddit Sans'", 'ČŠŽ'));
    } catch (e) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Kreslenie rámčeka (súradnice 0–800, kruh so stredom 400,400 a polomerom 400)
  // ---------------------------------------------------------------------------

  function stupne(d) {
    return (d * Math.PI) / 180;
  }

  /** Šírka tetivy kruhu s polomerom r vo vzdialenosti dy od stredu. */
  function tetiva(r, dy) {
    return Math.abs(dy) >= r ? 0 : 2 * Math.sqrt(r * r - dy * dy);
  }

  function oblukCiara(c, x, y, r, od, po, farba, hrubka) {
    c.beginPath();
    c.arc(x, y, r, od, po);
    c.strokeStyle = farba;
    c.lineWidth = hrubka;
    c.lineCap = 'butt';
    c.stroke();
  }

  function orezKruhom(c) {
    c.beginPath();
    c.arc(R, R, R, 0, Math.PI * 2);
    c.clip();
  }

  /** '*ČIBRIKA*' = zvýraznená časť riadku (žltá na modrej, červená na nálepke). */
  function rozdelCasti(text) {
    return String(text)
      .split('*')
      .map(function (t, i) {
        return { t: t, zvyraznene: i % 2 === 1 };
      })
      .filter(function (c) {
        return c.t.length > 0;
      });
  }

  /**
   * Rozloží riadky do oblasti. Každý riadok má svoj pruh výšky podľa „s“ (relatívna veľkosť).
   * Ak sa riadok nezmestí do šírky (maxW), najprv sa mierne zmenší celý blok (aby riadky
   * ostali vyrovnané), a ak to nestačí, zmenší sa len daný riadok – text sa nikdy neoreže.
   *
   * o = { cx, hore, dole, maxW(yHore, yDole), farba, zvyraznenie, ukotvenie: 'hore' | 'stred' }
   * Vracia rozloženie (pre kontrolu v testoch): text, veľkosť, šírka, dostupná šírka, poloha.
   */
  var RIADKOVANIE = 1.12;

  function zmerajRiadky(c, riadky, o, zaklad) {
    var suma = riadky.reduce(function (s, r) {
      return s + (r.s || 1);
    }, 0);
    var vyska = suma * zaklad * RIADKOVANIE;
    var y = o.ukotvenie === 'stred' ? o.hore + (o.dole - o.hore - vyska) / 2 : o.hore;
    return riadky.map(function (r) {
      var s = r.s || 1;
      var vaha = r.v || 900;
      var pruh = s * zaklad * RIADKOVANIE;
      var casti = rozdelCasti(r.t);
      var text = casti
        .map(function (x) {
          return x.t;
        })
        .join('');
      var velkost = s * zaklad;
      var m, sirka, hore, dole, dostupne, zakladna;
      for (var pokus = 0; pokus < 12; pokus++) {
        c.font = pismo(vaha, velkost);
        m = c.measureText(text);
        sirka = m.width;
        zakladna = y + pruh / 2 + velkost * 0.36; // stred verzálok v strede pruhu
        hore = zakladna - m.actualBoundingBoxAscent;
        dole = zakladna + m.actualBoundingBoxDescent;
        dostupne = o.maxW(hore, dole);
        if (sirka <= dostupne) break;
        velkost *= Math.max(0.5, dostupne / sirka) * 0.995;
      }
      y += pruh;
      return {
        text: text,
        casti: casti,
        velkost: velkost,
        povodnaVelkost: s * zaklad,
        vaha: vaha,
        x: o.cx - sirka / 2,
        sirka: sirka,
        dostupne: dostupne,
        hore: hore,
        dole: dole,
        zakladna: zakladna
      };
    });
  }

  function rozlozText(c, riadky, o) {
    var suma = riadky.reduce(function (s, r) {
      return s + (r.s || 1);
    }, 0);
    var zaklad = (o.dole - o.hore) / (suma * RIADKOVANIE);
    var faktor = 1;
    var lay;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    for (var i = 0; i < 20; i++) {
      lay = zmerajRiadky(c, riadky, o, zaklad * faktor);
      var najmensi = lay.reduce(function (m, l) {
        return Math.min(m, l.velkost / l.povodnaVelkost);
      }, 1);
      if (najmensi >= 0.86 || faktor <= 0.74) break;
      faktor *= 0.97;
    }
    lay.forEach(function (l, i) {
      l.navrhovanaVelkost = (riadky[i].s || 1) * zaklad; // veľkosť pred akýmkoľvek zmenšením
      c.font = pismo(l.vaha, l.velkost);
      var x = l.x;
      l.casti.forEach(function (cast) {
        c.fillStyle = cast.zvyraznene ? o.zvyraznenie : o.farba;
        c.fillText(cast.t, x, l.zakladna);
        x += c.measureText(cast.t).width;
      });
      delete l.casti;
    });
    return lay;
  }

  // --- Tvar A: modrý pás v dolnej časti kruhu, žltá linka hore, červený oblúk dole ---
  function tvarA(c, riadky) {
    var Y0 = 452; // horný okraj pásu
    c.save();
    orezKruhom(c);
    c.fillStyle = FARBY.modra;
    c.fillRect(0, Y0, VYSTUP, VYSTUP - Y0);
    c.fillStyle = FARBY.zlta;
    c.fillRect(0, Y0 - 7, VYSTUP, 14);
    c.restore();
    oblukCiara(c, R, R, R - 10, stupne(28), stupne(152), FARBY.cervenaLogo, 16);

    var rText = R - 36; // text drží odstup od červeného oblúka
    var lay = rozlozText(c, riadky, {
      cx: R,
      hore: Y0 + 22,
      dole: 768,
      maxW: function (yh, yd) {
        return Math.min(tetiva(rText, yh - R), tetiva(rText, yd - R)) - 20;
      },
      farba: FARBY.biela,
      zvyraznenie: FARBY.zlta
    });
    return { tvar: 'A', hranica: { x: R, y: R, r: rText }, riadky: lay };
  }

  // --- Tvar B: modrý oblúk okolo menšieho okna s fotkou, linka hore žltá a dole červená (ako logo) ---
  var OKNO_B = { x: 400, y: 268, r: 246 };
  function tvarB(c, riadky) {
    var o = OKNO_B;
    c.beginPath();
    c.arc(R, R, R, 0, Math.PI * 2);
    c.moveTo(o.x + o.r, o.y);
    c.arc(o.x, o.y, o.r, 0, Math.PI * 2, true);
    c.fillStyle = FARBY.modra;
    c.fill('evenodd');
    oblukCiara(c, o.x, o.y, o.r + 6, stupne(196), stupne(344), FARBY.zlta, 14);
    oblukCiara(c, o.x, o.y, o.r + 6, stupne(16), stupne(164), FARBY.cervenaLogo, 14);

    var rText = R - 26;
    var lay = rozlozText(c, riadky, {
      cx: R,
      hore: o.y + o.r + 30,
      dole: 772,
      maxW: function (yh, yd) {
        return Math.min(tetiva(rText, yh - R), tetiva(rText, yd - R)) - 16;
      },
      farba: FARBY.biela,
      zvyraznenie: FARBY.zlta
    });
    return { tvar: 'B', hranica: { x: R, y: R, r: rText }, riadky: lay };
  }

  // --- Tvar C: žltá okrúhla nálepka vpravo dole, tenký modrý prstenec okolo fotky ---
  var NALEPKA = { x: 538, y: 545, r: 186, uhol: -8 };
  function tvarC(c, riadky) {
    var n = NALEPKA;
    oblukCiara(c, R, R, R - 7, 0, Math.PI * 2, FARBY.modra, 14);

    c.save();
    c.translate(n.x, n.y);
    c.rotate(stupne(n.uhol));

    c.save();
    c.shadowColor = 'rgba(0, 0, 0, 0.35)';
    c.shadowBlur = 24;
    c.shadowOffsetY = 8;
    c.beginPath();
    c.arc(0, 0, n.r, 0, Math.PI * 2);
    c.fillStyle = FARBY.zlta;
    c.fill();
    c.restore();

    oblukCiara(c, 0, 0, n.r - 6, 0, Math.PI * 2, FARBY.modra, 12);
    oblukCiara(c, 0, 0, n.r - 21, 0, Math.PI * 2, FARBY.cervenaLogo, 4);

    var rText = n.r - 30;
    var lay = rozlozText(c, riadky, {
      cx: 0,
      hore: -rText + 8,
      dole: rText - 8,
      maxW: function (yh, yd) {
        return Math.min(tetiva(rText, yh), tetiva(rText, yd)) - 10;
      },
      farba: FARBY.modra,
      zvyraznenie: FARBY.cervena,
      ukotvenie: 'stred'
    });
    c.restore();
    return { tvar: 'C', hranica: { x: 0, y: 0, r: rText }, nalepka: n, riadky: lay };
  }

  /**
   * Nakreslí rámček daného tvaru do kontextu v súradniciach 0–800.
   * riadky = [{ t: 'VOLÍM *ČIBRIKA*', v: 900, s: 1.2 }, …]
   */
  function kresliRamcek(c, tvar, riadky) {
    c.save();
    var vysledok = tvar === 'B' ? tvarB(c, riadky) : tvar === 'C' ? tvarC(c, riadky) : tvarA(c, riadky);
    c.restore();
    return vysledok;
  }

  /** Šedá silueta namiesto fotky (miniatúry pred nahratím, OG obrázok). */
  function kresliSiluetu(c) {
    c.fillStyle = '#D9DEEA';
    c.fillRect(0, 0, VYSTUP, VYSTUP);
    c.fillStyle = '#A3AECB';
    c.beginPath();
    c.arc(400, 318, 132, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(400, 800, 300, 330, 0, Math.PI, Math.PI * 2);
    c.fill();
  }

  // ---------------------------------------------------------------------------
  // Výrez (prevzaté z salareferendum.sk)
  // ---------------------------------------------------------------------------

  function obmedz(hodnota, min, max) {
    return Math.min(max, Math.max(min, hodnota));
  }
  function pokrytie(obr) {
    return Math.max(VYSTUP / obr.width, VYSTUP / obr.height);
  }
  function rozmer(obr, priblizenie) {
    var k = pokrytie(obr) * priblizenie;
    return { w: obr.width * k, h: obr.height * k };
  }
  /** Dorazy: fotka musí vždy celá pokryť kruh. */
  function obmedzVyrez(v, obr) {
    var p = obmedz(v.priblizenie, ZOOM_MIN, ZOOM_MAX);
    var d = rozmer(obr, p);
    var mx = Math.max(0, (d.w - VYSTUP) / 2);
    var my = Math.max(0, (d.h - VYSTUP) / 2);
    return { priblizenie: p, posun: { x: obmedz(v.posun.x, -mx, mx), y: obmedz(v.posun.y, -my, my) } };
  }
  /** Zmena priblíženia tak, aby bod „okolo“ ostal na mieste. */
  function priblizOkolo(v, nove, okolo) {
    var k = nove / v.priblizenie;
    return {
      priblizenie: nove,
      posun: { x: okolo.x + (v.posun.x - okolo.x) * k, y: okolo.y + (v.posun.y - okolo.y) * k }
    };
  }
  function vzdialenost(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function stred(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  /** Načíta fotku s EXIF otočením a zmenší ju na max. 3200 px. */
  function nacitajFotku(subor) {
    return createImageBitmap(subor, { imageOrientation: 'from-image' })
      .catch(function () {
        return createImageBitmap(subor);
      })
      .then(function (bmp) {
        var naj = Math.max(bmp.width, bmp.height);
        if (naj <= MAX_ZDROJ) return bmp;
        var k = MAX_ZDROJ / naj;
        return createImageBitmap(bmp, {
          resizeWidth: Math.round(bmp.width * k),
          resizeHeight: Math.round(bmp.height * k),
          resizeQuality: 'high'
        }).then(
          function (mensia) {
            bmp.close();
            return mensia;
          },
          function () {
            return bmp;
          }
        );
      });
  }

  /**
   * Vykreslí hotovú profilovku (rohy, fotka v kruhu, rámček) do kontextu veľkosti `velkost`.
   * Bez fotky nakreslí siluetu. Používa sa pre výstup, miniatúry aj OG obrázok.
   */
  function vykresli(c, velkost, tvar, riadky, obr, vyrez) {
    c.save();
    c.scale(velkost / VYSTUP, velkost / VYSTUP);
    c.fillStyle = FARBA_ROHOV;
    c.fillRect(0, 0, VYSTUP, VYSTUP);
    c.save();
    orezKruhom(c);
    if (obr) {
      var v = vyrez || POCIATOCNY_VYREZ;
      var d = rozmer(obr, v.priblizenie);
      c.drawImage(obr, R + v.posun.x - d.w / 2, R + v.posun.y - d.h / 2, d.w, d.h);
    } else {
      kresliSiluetu(c);
    }
    c.restore();
    var rozlozenie = kresliRamcek(c, tvar, riadky);
    c.restore();
    return rozlozenie;
  }

  // ---------------------------------------------------------------------------
  // Editor
  // ---------------------------------------------------------------------------

  /**
   * cfg = {
   *   riadky: function (tvar) { return [...] },   // texty rámčeka pre daný tvar
   *   tvar: 'A'                                    // predvolený tvar
   * }
   * Očakáva v stránke prvky s id: tvary, fotka, fotka-text, chyba, nahlad-obal, nahlad,
   * hlaska, ovladanie, priblizenie, oddialit, priblizit, vycentrovat, stiahnut, zdielat.
   */
  function spustiEditor(cfg) {
    function $(id) {
      return document.getElementById(id);
    }
    var platno = $('nahlad');
    var ctx = platno.getContext('2d');
    var vstup = $('fotka');
    var tvar = cfg.tvar || 'A';

    var zdroj = null; // ImageBitmap
    var vyrez = POCIATOCNY_VYREZ;
    var prsty = new Map();
    var gesto = null;
    var maFotku = false;
    var uzPosunul = false;
    var tahaSa = false;
    var naDoraze = false;
    var pripravene = false;
    var mozeZdielat = false;
    var debug = (window.ramcekDebug = {
      prveKreslenie: null,
      nahlad: null,
      vystup: null,
      miniatury: {},
      stav: function () {
        return { priblizenie: vyrez.priblizenie, posun: { x: vyrez.posun.x, y: vyrez.posun.y }, tvar: tvar };
      },
      riadky: cfg.riadky
    });

    // --- Miniatúry tvarov (radio tlačidlá) ---
    var obalTvarov = $('tvary');
    var miniatury = {};
    TVARY.forEach(function (t) {
      var label = document.createElement('label');
      label.className = 'tvar';
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'tvar';
      input.value = t.id;
      input.className = 'sr-only';
      input.checked = t.id === tvar;
      input.addEventListener('change', function () {
        if (input.checked) nastavTvar(t.id);
      });
      var mini = document.createElement('canvas');
      mini.width = 240;
      mini.height = 240;
      mini.setAttribute('aria-hidden', 'true');
      var popis = document.createElement('span');
      popis.textContent = t.id + ' · ' + t.nazov;
      label.appendChild(input);
      label.appendChild(mini);
      label.appendChild(popis);
      obalTvarov.appendChild(label);
      miniatury[t.id] = mini;
    });

    function nastavTvar(id) {
      tvar = id;
      var r = obalTvarov.querySelectorAll('input[name="tvar"]');
      for (var i = 0; i < r.length; i++) r[i].checked = r[i].value === id;
      naplanuj(true);
    }

    // --- Kreslenie ---
    function kresliFotku(c, cx, cy) {
      if (!zdroj) return;
      var d = rozmer(zdroj, vyrez.priblizenie);
      c.drawImage(zdroj, cx + vyrez.posun.x - d.w / 2, cy + vyrez.posun.y - d.h / 2, d.w, d.h);
    }

    function kresliNahlad() {
      var s = NAHLAD / 2;
      ctx.clearRect(0, 0, NAHLAD, NAHLAD);
      if (zdroj) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, NAHLAD, NAHLAD);
        kresliFotku(ctx, s, s);
        ctx.beginPath();
        ctx.rect(0, 0, NAHLAD, NAHLAD);
        ctx.moveTo(s + R, s);
        ctx.arc(s, s, R, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fill('evenodd');
      } else {
        ctx.fillStyle = '#e6e6e6';
        ctx.fillRect(0, 0, NAHLAD, NAHLAD);
        ctx.save();
        ctx.translate(OKRAJ, OKRAJ);
        orezKruhom(ctx);
        kresliSiluetu(ctx);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(OKRAJ, OKRAJ);
      debug.nahlad = kresliRamcek(ctx, tvar, cfg.riadky(tvar));
      ctx.restore();
    }

    function kresliMiniatury() {
      TVARY.forEach(function (t) {
        var m = miniatury[t.id];
        var c = m.getContext('2d');
        c.clearRect(0, 0, m.width, m.height);
        debug.miniatury[t.id] = vykresli(c, m.width, t.id, cfg.riadky(t.id), zdroj, vyrez);
      });
    }

    function aktualizujOvladanie() {
      $('ovladanie').hidden = !maFotku;
      $('fotka-text').textContent = maFotku ? 'Vybrať inú fotku' : 'Vybrať fotku';
      var rozsah = $('priblizenie');
      rozsah.value = String(vyrez.priblizenie);
      $('oddialit').disabled = vyrez.priblizenie <= ZOOM_MIN;
      $('priblizit').disabled = vyrez.priblizenie >= ZOOM_MAX;
      $('vycentrovat').disabled = vyrez.priblizenie === 1 && vyrez.posun.x === 0 && vyrez.posun.y === 0;
      $('stiahnut').disabled = !maFotku;
      $('zdielat').hidden = !(maFotku && mozeZdielat);

      var hlaska = $('hlaska');
      var ukaz = maFotku && (naDoraze || !uzPosunul);
      hlaska.hidden = !ukaz;
      if (ukaz) {
        hlaska.textContent = naDoraze
          ? 'Ďalej to nejde – najprv priblížte (+)'
          : 'Potiahnite fotku, aby bola tvár v kruhu';
      }

      platno.style.cursor = maFotku ? (tahaSa ? 'grabbing' : 'grab') : 'default';
      platno.tabIndex = maFotku ? 0 : -1;
      platno.setAttribute(
        'aria-label',
        maFotku
          ? 'Náhľad profilovej fotky s rámčekom. Šípkami posuniete fotku, plusom a mínusom priblížite, nulou vrátite na stred.'
          : 'Náhľad rámčeka. Fotku vyberte tlačidlom Vybrať fotku.'
      );
    }

    var naplanovane = false;
    var miniaturyCasovac = null;
    /** Prekreslí náhľad hneď (v najbližšom snímku), miniatúry s malým oneskorením (šetrí mobil pri ťahaní). */
    function naplanuj(ajMiniaturyHned) {
      if (!pripravene) return;
      if (!naplanovane) {
        naplanovane = true;
        requestAnimationFrame(function () {
          naplanovane = false;
          kresliNahlad();
          aktualizujOvladanie();
        });
      }
      clearTimeout(miniaturyCasovac);
      miniaturyCasovac = setTimeout(kresliMiniatury, ajMiniaturyHned ? 0 : 120);
    }

    /** Nastaví výrez s dorazmi. Vráti true, ak fotka narazila na doraz. */
    function nastavVyrez(v) {
      var o = zdroj ? obmedzVyrez(v, zdroj) : POCIATOCNY_VYREZ;
      vyrez = o;
      naplanuj(false);
      return Math.abs(o.posun.x - v.posun.x) > 1 || Math.abs(o.posun.y - v.posun.y) > 1;
    }

    // --- Nahratie fotky ---
    function zobrazChybu(text) {
      var el = $('chyba');
      el.textContent = text || '';
      el.hidden = !text;
    }

    function spracujSubor(subor) {
      if (!subor) return;
      zobrazChybu(null);
      nacitajFotku(subor).then(
        function (bmp) {
          if (zdroj && zdroj.close) zdroj.close();
          zdroj = bmp;
          prsty.clear();
          gesto = null;
          uzPosunul = false;
          naDoraze = false;
          maFotku = true;
          nastavVyrez(POCIATOCNY_VYREZ);
          naplanuj(true);
        },
        function () {
          zobrazChybu(
            'Túto fotku sa nepodarilo načítať. Ak je z iPhonu, býva vo formáte HEIC – skúste ju uložiť ako JPG, alebo si z nej spravte snímku obrazovky.'
          );
        }
      );
    }

    vstup.addEventListener('change', function () {
      spracujSubor(vstup.files && vstup.files[0]);
      vstup.value = '';
    });

    var obalNahladu = $('nahlad-obal');
    obalNahladu.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    obalNahladu.addEventListener('drop', function (e) {
      e.preventDefault();
      spracujSubor(e.dataTransfer.files && e.dataTransfer.files[0]);
    });

    // --- Ťahanie a dva prsty ---
    function bodVPlatne(e) {
      var r = platno.getBoundingClientRect();
      var k = NAHLAD / r.width;
      return { x: (e.clientX - r.left) * k - NAHLAD / 2, y: (e.clientY - r.top) * k - NAHLAD / 2 };
    }

    function zacniGesto() {
      var body = Array.from(prsty.values());
      var a = body[0];
      var b = body[1];
      if (!a) {
        gesto = null;
        return;
      }
      gesto = { vyrez: vyrez, stred: b ? stred(a, b) : a, vzdialenost: b ? vzdialenost(a, b) : 0 };
    }

    platno.addEventListener('pointerdown', function (e) {
      if (!maFotku) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        platno.setPointerCapture(e.pointerId);
      } catch (x) {}
      prsty.set(e.pointerId, bodVPlatne(e));
      zacniGesto();
      tahaSa = true;
      aktualizujOvladanie();
    });

    platno.addEventListener('pointermove', function (e) {
      if (!prsty.has(e.pointerId) || !gesto) return;
      prsty.set(e.pointerId, bodVPlatne(e));
      var g = gesto;
      var body = Array.from(prsty.values());
      var a = body[0];
      var b = body[1];
      if (!a) return;
      if (b && g.vzdialenost > 0) {
        var st = stred(a, b);
        var p = obmedz((g.vyrez.priblizenie * vzdialenost(a, b)) / g.vzdialenost, ZOOM_MIN, ZOOM_MAX);
        var k = p / g.vyrez.priblizenie;
        nastavVyrez({
          priblizenie: p,
          posun: { x: st.x + (g.vyrez.posun.x - g.stred.x) * k, y: st.y + (g.vyrez.posun.y - g.stred.y) * k }
        });
        naDoraze = false;
      } else {
        naDoraze = nastavVyrez({
          priblizenie: g.vyrez.priblizenie,
          posun: { x: g.vyrez.posun.x + (a.x - g.stred.x), y: g.vyrez.posun.y + (a.y - g.stred.y) }
        });
      }
      uzPosunul = true;
    });

    function koniecPrsta(e) {
      if (prsty.delete(e.pointerId)) {
        zacniGesto();
        if (prsty.size === 0) {
          tahaSa = false;
          aktualizujOvladanie();
        }
      }
    }
    platno.addEventListener('pointerup', koniecPrsta);
    platno.addEventListener('pointercancel', koniecPrsta);
    platno.addEventListener('contextmenu', function (e) {
      if (maFotku) e.preventDefault();
    });

    // --- Koliesko myši: približuje okolo kurzora ---
    platno.addEventListener(
      'wheel',
      function (e) {
        if (!maFotku) return;
        e.preventDefault();
        var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        var p = obmedz(vyrez.priblizenie * Math.exp(-dy * 0.002), ZOOM_MIN, ZOOM_MAX);
        nastavVyrez(priblizOkolo(vyrez, p, bodVPlatne(e)));
        uzPosunul = true;
        naDoraze = false;
      },
      { passive: false }
    );

    // --- Posuvník, +/−, Vycentrovať: okolo stredu ---
    function priblizNa(p) {
      nastavVyrez(priblizOkolo(vyrez, obmedz(p, ZOOM_MIN, ZOOM_MAX), { x: 0, y: 0 }));
      naDoraze = false;
    }
    function vycentruj() {
      nastavVyrez(POCIATOCNY_VYREZ);
      naDoraze = false;
    }
    function posun(dx, dy) {
      naDoraze = nastavVyrez({
        priblizenie: vyrez.priblizenie,
        posun: { x: vyrez.posun.x + dx, y: vyrez.posun.y + dy }
      });
      uzPosunul = true;
    }

    $('priblizenie').addEventListener('input', function (e) {
      priblizNa(Number(e.target.value));
    });
    $('oddialit').addEventListener('click', function () {
      priblizNa(vyrez.priblizenie - ZOOM_KROK);
    });
    $('priblizit').addEventListener('click', function () {
      priblizNa(vyrez.priblizenie + ZOOM_KROK);
    });
    $('vycentrovat').addEventListener('click', vycentruj);

    // --- Klávesnica: šípky posúvajú (Shift = väčší krok), + / − približujú, 0 vycentruje ---
    platno.addEventListener('keydown', function (e) {
      if (!maFotku) return;
      var krok = e.shiftKey ? 40 : 10;
      switch (e.key) {
        case 'ArrowLeft':
          posun(-krok, 0);
          break;
        case 'ArrowRight':
          posun(krok, 0);
          break;
        case 'ArrowUp':
          posun(0, -krok);
          break;
        case 'ArrowDown':
          posun(0, krok);
          break;
        case '+':
        case '=':
          priblizNa(vyrez.priblizenie + 0.1);
          break;
        case '-':
        case '_':
          priblizNa(vyrez.priblizenie - 0.1);
          break;
        case '0':
          vycentruj();
          break;
        default:
          return;
      }
      e.preventDefault();
    });

    // --- Výstup ---
    function vystupnePlatno() {
      var c = document.createElement('canvas');
      c.width = VYSTUP;
      c.height = VYSTUP;
      var x = c.getContext('2d');
      if (!x) return null;
      debug.vystup = vykresli(x, VYSTUP, tvar, cfg.riadky(tvar), zdroj, vyrez);
      return c;
    }

    $('stiahnut').addEventListener('click', function () {
      var c = vystupnePlatno();
      if (!c) return;
      c.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = NAZOV_SUBORU;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);
      }, 'image/png');
    });

    $('zdielat').addEventListener('click', function () {
      var c = vystupnePlatno();
      if (!c) return;
      var bin = atob(c.toDataURL('image/png').split(',')[1] || '');
      var bajty = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bajty[i] = bin.charCodeAt(i);
      var subor = new File([bajty], NAZOV_SUBORU, { type: 'image/png' });
      navigator.share({ files: [subor] }).catch(function () {});
    });

    // Tlačidlo „Uložiť do fotiek / zdieľať“ len ak prehliadač vie zdieľať súbory (iPhone, Android).
    try {
      var skusobny = new File([''], NAZOV_SUBORU, { type: 'image/png' });
      mozeZdielat =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [skusobny] }) &&
        window.matchMedia('(pointer: coarse)').matches;
    } catch (x) {
      mozeZdielat = false;
    }

    // --- Štart: až po načítaní písma ---
    aktualizujOvladanie();
    pockajNaPisma().then(function () {
      pripravene = true;
      debug.prveKreslenie = { pismoNacitane: pismoNacitane(), cas: performance.now() };
      kresliNahlad();
      kresliMiniatury();
      aktualizujOvladanie();
      document.documentElement.classList.add('ramcek-pripraveny');
    });
    // Ak písmo dorazí až po limite, prekreslí sa.
    if (document.fonts && document.fonts.addEventListener) {
      document.fonts.addEventListener('loadingdone', function () {
        naplanuj(true);
      });
    }

    return {
      nastavTvar: nastavTvar,
      prekresli: function () {
        naplanuj(true);
      },
      tvar: function () {
        return tvar;
      }
    };
  }

  window.Ramcek = {
    FARBY: FARBY,
    TVARY: TVARY,
    VYSTUP: VYSTUP,
    kresliRamcek: kresliRamcek,
    vykresli: vykresli,
    pockajNaPisma: pockajNaPisma,
    spustiEditor: spustiEditor
  };
})();
